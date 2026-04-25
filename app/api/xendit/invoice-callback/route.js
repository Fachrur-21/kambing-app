import db from '@/lib/db'
import { getXenditConfig, mapXenditStatusToOrderStatus, normalizeXenditInvoiceStatus } from '@/lib/xendit'

export const runtime = 'nodejs'

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

async function getPaymentReferenceColumn(connection) {
  const [rows] = await connection.query("SHOW COLUMNS FROM payments LIKE 'provider_reference'")
  return rows.length > 0 ? 'provider_reference' : 'midtrans_order_id'
}

async function restoreReservedStock(connection, orderId) {
  const [items] = await connection.execute(
    'SELECT kambing_id, qty FROM order_items WHERE order_id = ? ORDER BY id ASC',
    [orderId]
  )

  for (const item of items) {
    await connection.execute(
      `UPDATE kambing
       SET stok = stok + ?,
           status = CASE WHEN stok + ? > 0 THEN 'ready' ELSE 'sold_out' END,
           isActive = CASE WHEN stok + ? > 0 THEN 1 ELSE isActive END,
           updatedAt = NOW(3)
       WHERE id = ?`,
      [item.qty, item.qty, item.qty, item.kambing_id]
    )
  }
}

async function removePurchasedItemsFromCart(connection, userId, orderId) {
  await connection.execute(
    `DELETE c
     FROM keranjang c
     JOIN order_items oi ON oi.kambing_id = c.kambing_id
     WHERE c.user_id = ?
       AND oi.order_id = ?`,
    [userId, orderId]
  )
}

export async function POST(request) {
  const config = getXenditConfig()
  const callbackTokenHeader = String(request.headers.get('x-callback-token') || '').trim()

  if (config.callbackVerificationToken && callbackTokenHeader !== config.callbackVerificationToken) {
    return Response.json({ message: 'Token callback Xendit tidak valid', data: null }, { status: 403 })
  }

  const payload = await request.json().catch(() => ({}))
  const externalId = String(payload?.external_id || '').trim()
  const invoiceStatus = normalizeXenditInvoiceStatus(payload?.status)

  if (!externalId || !invoiceStatus) {
    return Response.json({ message: 'Payload callback Xendit tidak valid', data: null }, { status: 400 })
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()
    const paymentReferenceColumn = await getPaymentReferenceColumn(connection)

    const [paymentRows] = await connection.execute(
      `SELECT p.id, p.order_id, p.status, p.transaction_status, p.payment_type, p.gross_amount,
              o.user_id
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE p.${paymentReferenceColumn} = ?
       LIMIT 1
       FOR UPDATE`,
      [externalId]
    )

    const payment = paymentRows[0]

    if (!payment) {
      await connection.rollback()
      return Response.json({ message: 'Data pembayaran tidak ditemukan', data: null }, { status: 404 })
    }

    const mappedStatus = mapXenditStatusToOrderStatus(invoiceStatus)
    const paidAt = payload?.paid_at ? new Date(payload.paid_at) : new Date()
    const paidAmount = parseInteger(payload?.paid_amount, Number(payment.gross_amount || 0))

    const shouldRestoreStock = ['EXPIRED', 'FAILED', 'VOIDED'].includes(invoiceStatus) && String(payment.status || '').toLowerCase() === 'pending'

    if (shouldRestoreStock) {
      await restoreReservedStock(connection, Number(payment.order_id))
    }

    const shouldClearCart = ['PAID', 'SETTLED'].includes(invoiceStatus)
    if (shouldClearCart) {
      await removePurchasedItemsFromCart(connection, Number(payment.user_id), Number(payment.order_id))
    }

    await connection.execute(
      `UPDATE payments
       SET status = ?,
           transaction_status = ?,
           payment_type = ?,
           gross_amount = ?,
           payment_time = ?
       WHERE id = ?`,
      [mappedStatus.paymentStatus, invoiceStatus, 'invoice', paidAmount, paidAt, payment.id]
    )

    await connection.execute(
      'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
      [mappedStatus.paymentStatus, mappedStatus.orderStatus, payment.order_id]
    )

    await connection.commit()

    return Response.json({
      message: 'Callback Xendit berhasil diproses',
      data: {
        externalId,
        paymentId: payment.id,
        invoiceStatus,
        paymentStatus: mappedStatus.paymentStatus
      }
    })
  } catch (error) {
    await connection.rollback()
    console.error(error)
    return Response.json({ message: 'Terjadi error saat memproses callback Xendit', data: null }, { status: 500 })
  } finally {
    connection.release()
  }
}
