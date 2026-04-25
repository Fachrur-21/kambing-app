import { queryOne, query } from '@/lib/db'
import { hasAdminOrOwnerRole, verifyAuthToken } from '@/lib/auth'

function ensureManager(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  if (!hasAdminOrOwnerRole(auth.decoded)) {
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

export async function PATCH(request, context) {
  try {
    const access = ensureManager(request)
    if (access.error) {
      return access.error
    }

    const orderId = await parseOrderId(context)
    if (!orderId) {
      return Response.json({ message: 'ID pesanan tidak valid', data: null }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const nextStatus = String(body?.status || '').trim().toLowerCase()

    if (nextStatus !== 'dikirim') {
      return Response.json({ message: 'Status yang diizinkan hanya dikirim', data: null }, { status: 400 })
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

    if (currentStatus === 'dikirim') {
      return Response.json({ message: 'Pesanan sudah berstatus dikirim', data: { id: orderId, status: 'dikirim' } })
    }

    if (currentStatus !== 'diproses' && currentStatus !== 'paid') {
      return Response.json({ message: 'Pesanan tidak bisa diupdate ke dikirim', data: null }, { status: 400 })
    }

    await query('UPDATE orders SET status = ? WHERE id = ?', ['dikirim', orderId])

    return Response.json({
      message: 'Status pesanan berhasil diubah menjadi dikirim',
      data: { id: orderId, status: 'dikirim' }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error saat update status pesanan', data: null }, { status: 500 })
  }
}
