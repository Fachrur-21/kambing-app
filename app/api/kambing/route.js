import db, { query, queryOne } from '@/lib/db'
import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'

const MAX_PER_PAGE = 100

function getAvailabilityStatus(stok) {
  return Number(stok || 0) > 0 ? 'ready' : 'sold_out'
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (normalized === 'ready' || normalized === 'available') {
    return 'ready'
  }

  if (normalized === 'sold_out' || normalized === 'sold out' || normalized === 'soldout') {
    return 'sold_out'
  }

  return null
}

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
    hargaModal: Number(record.harga_modal ?? record.hargaModal ?? 0),
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrls[0] || null,
    status: getAvailabilityStatus(record.stok)
  }
}

function parseKambingPayload(body) {
  const nama = typeof body.nama === 'string' ? body.nama.trim() : ''
  const jenis = typeof body.jenis === 'string' ? body.jenis.trim() : ''
  const berat = Number(body.berat)
  const harga = Number(body.harga)
  const hargaModal = Number(body.hargaModal ?? body.harga_modal)
  const requestedStatus = normalizeStatus(body.status)
  const parsedStok = body.stok === undefined || body.stok === null || body.stok === '' ? 0 : Number(body.stok)
  const stok = requestedStatus === 'sold_out' ? 0 : requestedStatus === 'ready' && parsedStok <= 0 ? 1 : parsedStok
  const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
  const imageUrls = normalizeImageUrls(body.imageUrls)
  const normalizedImageUrls = imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : []
  const deskripsi = typeof body.deskripsi === 'string' && body.deskripsi.trim() ? body.deskripsi.trim() : null
  const status = getAvailabilityStatus(stok)

  return {
    nama,
    jenis,
    berat,
    harga,
    hargaModal,
    stok,
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrls[0] || null,
    deskripsi,
    status
  }
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function normalizeString(value) {
  return String(value || '').trim()
}

function validateKambingPayload(payload) {
  const errors = []

  if (!payload.nama) errors.push('nama wajib diisi')
  if (!payload.jenis) errors.push('jenis wajib diisi')
  if (!Number.isFinite(payload.berat) || payload.berat <= 0) errors.push('berat wajib berupa angka lebih dari 0')
  if (!Number.isFinite(payload.harga) || payload.harga <= 0) errors.push('harga wajib berupa angka lebih dari 0')
  if (!Number.isFinite(payload.hargaModal) || payload.hargaModal < 0) errors.push('harga modal wajib berupa angka 0 atau lebih')
  if (!Number.isFinite(payload.stok) || payload.stok < 0) errors.push('stok wajib berupa angka 0 atau lebih')
  if (payload.status !== 'ready' && payload.status !== 'sold_out') errors.push('status harus ready atau sold_out')

  return errors
}

function ensureProductManager(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  if (!hasProductManagerRole(auth.decoded)) {
    return { error: Response.json({ message: 'Forbidden', data: null }, { status: 403 }) }
  }

  return { decoded: auth.decoded }
}

export async function GET(request) {
  try {
    const access = ensureProductManager(request)
    if (access.error) {
      return access.error
    }

    const { searchParams } = new URL(request.url)
    const q = normalizeString(searchParams.get('q')).toLowerCase()
    const status = normalizeStatus(searchParams.get('status'))
    const page = Math.max(parseInteger(searchParams.get('page'), 1), 1)
    const perPage = Math.min(Math.max(parseInteger(searchParams.get('perPage'), 10), 1), MAX_PER_PAGE)
    const offset = (page - 1) * perPage

    const whereClauses = []
    const params = []

    if (q) {
      whereClauses.push('(LOWER(nama) LIKE ? OR LOWER(jenis) LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    if (status) {
      whereClauses.push('status = ?')
      params.push(status)
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const totalRows = await queryOne(`SELECT COUNT(*) AS total FROM kambing ${whereSql}`, params)
    const total = Number(totalRows?.total || 0)

    const data = await query(
      `SELECT id, nama, jenis, berat, harga, harga_modal, stok, deskripsi, imageUrl, imageUrls, status, createdAt, updatedAt
       FROM kambing
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    )

    const mappedData = data.map(mapKambingRecord)

    return Response.json({
      message: 'Data kambing',
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      },
      data: mappedData
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const access = ensureProductManager(request)
    if (access.error) {
      return access.error
    }

    const body = await request.json()
    const payload = parseKambingPayload(body)
    const errors = validateKambingPayload(payload)

    if (errors.length > 0) {
      return Response.json({ message: errors.join(', '), data: null }, { status: 400 })
    }

    const [result] = await db.execute(
      'INSERT INTO kambing (nama, jenis, berat, harga, harga_modal, stok, imageUrl, imageUrls, deskripsi, status, isActive, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [
        payload.nama,
        payload.jenis,
        payload.berat,
        payload.harga,
        payload.hargaModal,
        payload.stok,
        payload.imageUrl,
        JSON.stringify(payload.imageUrls),
        payload.deskripsi,
        payload.status,
        payload.status === 'ready' ? 1 : 0
      ]
    )

    const data = await queryOne('SELECT * FROM kambing WHERE id = ? LIMIT 1', [result.insertId])

    return Response.json({
      message: 'Kambing berhasil ditambahkan',
      data: mapKambingRecord(data)
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
