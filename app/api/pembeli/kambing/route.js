import { query, queryOne } from '@/lib/db'
import { hasBuyerRole, verifyAuthToken } from '@/lib/auth'

const MAX_PER_PAGE = 100

function getAvailabilityStatus(stok) {
  return Number(stok || 0) > 0 ? 'ready' : 'sold_out'
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
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrls[0] || null,
    status: getAvailabilityStatus(record.stok)
  }
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function normalizeString(value) {
  return String(value || '').trim()
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

export async function GET(request) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const { searchParams } = new URL(request.url)
    const q = normalizeString(searchParams.get('q')).toLowerCase()
    const page = Math.max(parseInteger(searchParams.get('page'), 1), 1)
    const perPage = Math.min(Math.max(parseInteger(searchParams.get('perPage'), 12), 1), MAX_PER_PAGE)
    const offset = (page - 1) * perPage

    const whereClauses = ['stok > ?']
    const params = [0]

    if (q) {
      whereClauses.push('(LOWER(nama) LIKE ? OR LOWER(jenis) LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`

    const totalRows = await queryOne(`SELECT COUNT(*) AS total FROM kambing ${whereSql}`, params)
    const total = Number(totalRows?.total || 0)

    const rows = await query(
      `SELECT id, nama, jenis, berat, harga, stok, deskripsi, imageUrl, imageUrls, status, createdAt, updatedAt
       FROM kambing
       ${whereSql}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    )

    return Response.json({
      message: 'Daftar hewan untuk pembeli',
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      },
      data: rows.map(mapKambingRecord)
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
