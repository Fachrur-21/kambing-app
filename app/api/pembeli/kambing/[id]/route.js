import { queryOne } from '@/lib/db'
import { hasBuyerRole, verifyAuthToken } from '@/lib/auth'

function normalizeImageUrls(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter((item) => item.length > 0)
      }
    } catch {
      return [trimmed]
    }
  }

  return []
}

function mapKambingRecord(record) {
  if (!record) {
    return record
  }

  const imageUrls = normalizeImageUrls(record.imageUrls)
  const fallbackImageUrl = typeof record.imageUrl === 'string' ? record.imageUrl.trim() : ''
  const normalizedImageUrls = imageUrls.length > 0 ? imageUrls : fallbackImageUrl ? [fallbackImageUrl] : []

  return {
    ...record,
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrls[0] || null
  }
}

function ensureBuyer(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  if (!hasBuyerRole(auth.decoded)) {
    return { error: Response.json({ message: 'Forbidden', data: null }, { status: 403 }) }
  }

  return { decoded: auth.decoded }
}

async function parseKambingId(context) {
  const params = await context?.params
  const rawId = String(params?.id || '')
  const id = Number.parseInt(rawId, 10)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

export async function GET(request, context) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const id = await parseKambingId(context)

    if (!id) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const row = await queryOne(
      `SELECT id, nama, jenis, berat, harga, stok, deskripsi, imageUrl, imageUrls, status, createdAt, updatedAt
       FROM kambing
       WHERE id = ? AND status = ? AND stok > ?
       LIMIT 1`,
      [id, 'ready', 0]
    )

    if (!row) {
      return Response.json({ message: 'Hewan tidak ditemukan atau tidak tersedia', data: null }, { status: 404 })
    }

    return Response.json({
      message: 'Detail hewan untuk pembeli',
      data: mapKambingRecord(row)
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
