import db, { query, queryOne } from '@/lib/db'
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

function toSafeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function toCartItem(row) {
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

async function purgeUnavailableCartItems(userId) {
  await query(
    `DELETE c
     FROM keranjang c
     LEFT JOIN kambing k ON k.id = c.kambing_id
     WHERE c.user_id = ?
       AND (
         k.id IS NULL
         OR COALESCE(k.stok, 0) <= 0
         OR LOWER(COALESCE(k.status, '')) <> 'ready'
       )`,
    [userId]
  )
}

async function getCartItems(userId) {
  const rows = await query(
    `SELECT c.id, c.user_id, c.kambing_id, c.qty, c.harga, c.created_at, c.updated_at,
            k.nama, k.jenis, k.berat, k.stok, k.status, k.imageUrl, k.imageUrls
     FROM keranjang c
     JOIN kambing k ON k.id = c.kambing_id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC`,
    [userId]
  )

  return rows.map(toCartItem)
}

function summarizeCart(items) {
  const totalQty = items.reduce((acc, item) => acc + Number(item.qty || 0), 0)
  const totalHarga = items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)

  return {
    totalItem: items.length,
    totalQty,
    totalHarga
  }
}

export async function GET(request) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const userId = Number(access.decoded.id)
    await purgeUnavailableCartItems(userId)
    const items = await getCartItems(userId)

    return Response.json({
      message: 'Data keranjang',
      summary: summarizeCart(items),
      data: items
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const userId = Number(access.decoded.id)
    await purgeUnavailableCartItems(userId)
    const body = await request.json()
    const kambingId = toSafeInteger(body?.kambingId)
    const qty = toSafeInteger(body?.qty, 1)

    if (!Number.isInteger(kambingId) || kambingId <= 0) {
      return Response.json({ message: 'kambingId tidak valid', data: null }, { status: 400 })
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'qty wajib angka lebih dari 0', data: null }, { status: 400 })
    }

    const kambing = await queryOne(
      'SELECT id, harga, stok, status, isActive FROM kambing WHERE id = ? LIMIT 1',
      [kambingId]
    )

    if (!kambing) {
      return Response.json({ message: 'Hewan tidak ditemukan', data: null }, { status: 404 })
    }

    const normalizedStatus = String(kambing.status || '').trim().toLowerCase()

    if (!Number(kambing.isActive) || normalizedStatus !== 'ready' || Number(kambing.stok) <= 0) {
      return Response.json({ message: 'Hewan tidak tersedia', data: null }, { status: 400 })
    }

    const existing = await queryOne(
      'SELECT id, qty FROM keranjang WHERE user_id = ? AND kambing_id = ? LIMIT 1',
      [userId, kambingId]
    )

    const currentQty = Number(existing?.qty || 0)
    const nextQty = currentQty + qty

    if (nextQty > Number(kambing.stok)) {
      return Response.json({ message: 'Qty melebihi stok tersedia', data: null }, { status: 400 })
    }

    if (existing) {
      await query(
        'UPDATE keranjang SET qty = ?, harga = ?, updated_at = NOW(3) WHERE id = ? AND user_id = ?',
        [nextQty, Number(kambing.harga), existing.id, userId]
      )
    } else {
      await db.execute(
        'INSERT INTO keranjang (user_id, kambing_id, qty, harga, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(3), NOW(3))',
        [userId, kambingId, qty, Number(kambing.harga)]
      )
    }

    const items = await getCartItems(userId)

    return Response.json({
      message: 'Keranjang berhasil diperbarui',
      summary: summarizeCart(items),
      data: items
    }, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const access = ensureBuyer(request)
    if (access.error) {
      return access.error
    }

    const userId = Number(access.decoded.id)
    await query('DELETE FROM keranjang WHERE user_id = ?', [userId])

    return Response.json({
      message: 'Keranjang berhasil dikosongkan',
      summary: {
        totalItem: 0,
        totalQty: 0,
        totalHarga: 0
      },
      data: []
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
