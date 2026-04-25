import { query, queryOne } from '@/lib/db'
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

function mapCartRow(row) {
  const imageUrls = normalizeImageUrls(row.imageUrls)
  const fallbackImageUrl = typeof row.imageUrl === 'string' ? row.imageUrl.trim() : ''
  const normalizedImageUrls = imageUrls.length > 0 ? imageUrls : fallbackImageUrl ? [fallbackImageUrl] : []

  const qty = Number(row.qty || 0)
  const harga = Number(row.harga || 0)

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    kambingId: Number(row.kambing_id),
    qty,
    harga,
    subtotal: qty * harga,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    kambing: {
      id: Number(row.kambing_id),
      nama: row.nama,
      jenis: row.jenis,
      berat: Number(row.berat || 0),
      stok: Number(row.stok || 0),
      status: row.status,
      imageUrl: normalizedImageUrls[0] || null,
      imageUrls: normalizedImageUrls
    }
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

async function parseCartId(context) {
  const params = await context?.params
  const rawId = String(params?.id || '')
  const id = Number.parseInt(rawId, 10)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

function toSafeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

async function getOwnedCartRow(userId, cartId) {
  return queryOne(
    `SELECT c.id, c.user_id, c.kambing_id, c.qty, c.harga, c.created_at, c.updated_at,
            k.nama, k.jenis, k.berat, k.stok, k.status, k.imageUrl, k.imageUrls
     FROM keranjang c
     JOIN kambing k ON k.id = c.kambing_id
     WHERE c.id = ? AND c.user_id = ?
     LIMIT 1`,
    [cartId, userId]
  )
}

export async function PUT(request, context) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const userId = Number(access.decoded.id)
    const cartId = await parseCartId(context)

    if (!cartId) {
      return Response.json({ message: 'ID keranjang tidak valid', data: null }, { status: 400 })
    }

    const current = await queryOne(
      'SELECT c.id, c.user_id, c.kambing_id, k.stok, k.status, k.harga FROM keranjang c JOIN kambing k ON k.id = c.kambing_id WHERE c.id = ? AND c.user_id = ? LIMIT 1',
      [cartId, userId]
    )

    if (!current) {
      return Response.json({ message: 'Item keranjang tidak ditemukan', data: null }, { status: 404 })
    }

    const normalizedStatus = String(current.status || '').trim().toLowerCase()

    if (normalizedStatus !== 'ready' || Number(current.stok) <= 0) {
      return Response.json({ message: 'Hewan sudah tidak tersedia', data: null }, { status: 400 })
    }

    const body = await request.json()
    const qty = toSafeInteger(body?.qty)

    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'qty wajib angka lebih dari 0', data: null }, { status: 400 })
    }

    if (qty > Number(current.stok)) {
      return Response.json({ message: 'Qty melebihi stok tersedia', data: null }, { status: 400 })
    }

    await query(
      'UPDATE keranjang SET qty = ?, harga = ?, updated_at = NOW(3) WHERE id = ? AND user_id = ?',
      [qty, Number(current.harga), cartId, userId]
    )

    const updated = await getOwnedCartRow(userId, cartId)

    return Response.json({
      message: 'Item keranjang berhasil diupdate',
      data: mapCartRow(updated)
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function DELETE(request, context) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const userId = Number(access.decoded.id)
    const cartId = await parseCartId(context)

    if (!cartId) {
      return Response.json({ message: 'ID keranjang tidak valid', data: null }, { status: 400 })
    }

    const existing = await queryOne('SELECT id FROM keranjang WHERE id = ? AND user_id = ? LIMIT 1', [cartId, userId])

    if (!existing) {
      return Response.json({ message: 'Item keranjang tidak ditemukan', data: null }, { status: 404 })
    }

    await query('DELETE FROM keranjang WHERE id = ? AND user_id = ?', [cartId, userId])

    return Response.json({
      message: 'Item keranjang berhasil dihapus',
      data: { id: cartId }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
