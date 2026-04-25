import path from 'path'
import { queryOne, query } from '@/lib/db'
import { hasEmployeeRole, verifyAuthToken } from '@/lib/auth'
import { savePrivateUploadFile } from '@/lib/private-upload-storage'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function getAvailableOrderColumns(columnNames) {
  if (!Array.isArray(columnNames) || columnNames.length === 0) {
    return new Set()
  }

  const placeholders = columnNames.map(() => '?').join(', ')
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'orders'
       AND COLUMN_NAME IN (${placeholders})`,
    columnNames
  )

  return new Set(rows.map((row) => String(row.COLUMN_NAME)))
}

function ensureEmployee(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  if (!hasEmployeeRole(auth.decoded)) {
    return { error: Response.json({ message: 'Forbidden', data: null }, { status: 403 }) }
  }

  return { decoded: auth.decoded }
}

async function parseOrderId(context) {
  const params = await context?.params
  const rawId = String(params?.id || '')
  const id = Number.parseInt(rawId, 10)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

function getFileExtension(file) {
  const byName = path.extname(String(file?.name || '')).toLowerCase()
  if (byName && byName.length <= 5) {
    return byName
  }

  if (file?.type === 'image/jpeg') return '.jpg'
  if (file?.type === 'image/png') return '.png'
  if (file?.type === 'image/webp') return '.webp'

  return '.jpg'
}

async function saveCompletionImage(file) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('FORMAT_TIDAK_VALID')
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error('UKURAN_TIDAK_VALID')
  }

  const ext = getFileExtension(file)
  if (!ext) {
    throw new Error('FORMAT_TIDAK_VALID')
  }

  const result = await savePrivateUploadFile(file, 'pesanan')
  return result.accessUrl
}

function normalizeUploadedFiles(formData) {
  const uploadedFiles = [
    ...formData.getAll('images'),
    ...formData.getAll('images[]')
  ]

  if (uploadedFiles.length > 0) {
    return uploadedFiles.filter((file) => file && typeof file.arrayBuffer === 'function')
  }

  const singleImage = formData.get('image')
  return singleImage && typeof singleImage.arrayBuffer === 'function' ? [singleImage] : []
}

function parseCompletionImageUrls(rawValue, fallbackUrl) {
  const rawText = String(rawValue || '').trim()

  if (rawText) {
    try {
      const parsed = JSON.parse(rawText)
      if (Array.isArray(parsed)) {
        const urls = parsed.map((item) => String(item || '').trim()).filter(Boolean)
        if (urls.length > 0) {
          return urls
        }
      }
    } catch {
      const legacyValues = rawText
        .split(',')
        .map((item) => String(item || '').trim())
        .filter(Boolean)

      if (legacyValues.length > 0) {
        return legacyValues
      }
    }
  }

  const fallback = String(fallbackUrl || '').trim()
  return fallback ? [fallback] : []
}

export async function POST(request, context) {
  try {
    const access = ensureEmployee(request)
    if (access.error) {
      return access.error
    }

    const orderId = await parseOrderId(context)
    if (!orderId) {
      return Response.json({ message: 'ID pesanan tidak valid', data: null }, { status: 400 })
    }

    const formData = await request.formData()
    const images = normalizeUploadedFiles(formData)
    const description = String(formData.get('description') || '').trim()

    if (images.length === 0) {
      return Response.json({ message: 'Bukti gambar wajib diupload', data: null }, { status: 400 })
    }

    if (!description) {
      return Response.json({ message: 'Deskripsi bukti pengiriman wajib diisi', data: null }, { status: 400 })
    }

    const existing = await queryOne(
      'SELECT id, status, payment_status FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    )

    if (!existing) {
      return Response.json({ message: 'Pesanan tidak ditemukan', data: null }, { status: 404 })
    }

    const currentStatus = String(existing.status || '').toLowerCase()
    const paymentStatus = String(existing.payment_status || '').toLowerCase()

    if (paymentStatus !== 'paid') {
      return Response.json({ message: 'Pesanan belum dibayar', data: null }, { status: 400 })
    }

    if (currentStatus !== 'dikirim') {
      return Response.json({ message: 'Pesanan belum berstatus dikirim', data: null }, { status: 400 })
    }

    const imageUrls = []
    for (const image of images) {
      imageUrls.push(await saveCompletionImage(image))
    }

    const imageUrl = imageUrls[0]
    const availableColumns = await getAvailableOrderColumns(['completion_image_urls'])
    const completionImageUrlsValue = JSON.stringify(imageUrls)

    const updateColumns = [
      'status = ?',
      'completion_image_url = ?',
      'completion_description = ?',
      'completed_by = ?',
      'completed_at = NOW(3)'
    ]
    const updateValues = ['selesai', imageUrl, description, Number(access.decoded.id)]

    if (availableColumns.has('completion_image_urls')) {
      updateColumns.splice(2, 0, 'completion_image_urls = ?')
      updateValues.splice(2, 0, completionImageUrlsValue)
    }

    await query(
      `UPDATE orders
       SET ${updateColumns.join(', ')}
       WHERE id = ?`,
      [...updateValues, orderId]
    )

    return Response.json({
      message: 'Pesanan berhasil diselesaikan',
      data: {
        id: orderId,
        status: 'selesai',
        completionImageUrl: imageUrl,
        completionImageUrls: imageUrls,
        completionDescription: description
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'FORMAT_TIDAK_VALID') {
      return Response.json({ message: 'Format gambar harus JPG, PNG, atau WEBP', data: null }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'UKURAN_TIDAK_VALID') {
      return Response.json({ message: 'Ukuran gambar maksimal 5MB', data: null }, { status: 400 })
    }

    console.error(error)
    return Response.json({ message: 'Terjadi error saat menyelesaikan pesanan', data: null }, { status: 500 })
  }
}
