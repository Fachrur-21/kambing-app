import db from '@/lib/db'
import { hasBuyerRole, verifyAuthToken } from '@/lib/auth'
import {
  getXenditInvoiceByExternalId,
  mapXenditStatusToOrderStatus,
  normalizeXenditInvoiceStatus
} from '@/lib/xendit'

export const runtime = 'nodejs'

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

function parseOrderId(value) {
  const id = Number.parseInt(String(value || ''), 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function getPaymentReferenceColumn(connection) {
  const [rows] = await connection.query("SHOW COLUMNS FROM payments LIKE 'provider_reference'")
  return rows.length > 0 ? 'provider_reference' : 'midtrans_order_id'
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
  const access = ensureBuyer(request)
  if (access.error) {
    return access.error
  }

  const body = await request.json().catch(() => ({}))
  const orderId = parseOrderId(body?.orderId)

  if (!orderId) {
    return Response.json({ message: 'Order ID tidak valid', data: null }, { status: 400 })
  }

  const userId = Number(access.decoded.id)
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const paymentReferenceColumn = await getPaymentReferenceColumn(connection)

    const [rows] = await connection.execute(
      `SELECT o.id AS order_id, o.user_id, o.status AS order_status, o.payment_status,
              p.id AS payment_id, p.${paymentReferenceColumn} AS provider_reference
       FROM orders o
       JOIN payments p ON p.order_id = o.id
       WHERE o.id = ? AND o.user_id = ?
       ORDER BY p.id DESC
       LIMIT 1
       FOR UPDATE`,
      [orderId, userId]
    )

    const record = rows[0]

    if (!record) {
      await connection.rollback()
      return Response.json({ message: 'Data order pembayaran tidak ditemukan', data: null }, { status: 404 })
    }

    const externalId = String(record.provider_reference || '').trim()
    if (!externalId) {
      await connection.rollback()
      return Response.json({ message: 'External ID pembayaran tidak ditemukan', data: null }, { status: 400 })
    }

    const invoice = await getXenditInvoiceByExternalId(externalId)

    if (!invoice) {
      await connection.rollback()
      return Response.json({ message: 'Invoice Xendit tidak ditemukan', data: null }, { status: 404 })
    }

    const invoiceStatus = normalizeXenditInvoiceStatus(invoice.status)
    const mapped = mapXenditStatusToOrderStatus(invoiceStatus)
    const paidAmount = Number(invoice.paid_amount || invoice.amount || 0)
    const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : new Date()

    await connection.execute(
      `UPDATE payments
       SET status = ?,
           transaction_status = ?,
           payment_type = ?,
           gross_amount = ?,
           payment_time = ?
       WHERE id = ?`,
      [mapped.paymentStatus, invoiceStatus, 'invoice', paidAmount, paidAt, record.payment_id]
    )

    await connection.execute(
      'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
      [mapped.paymentStatus, mapped.orderStatus, orderId]
    )

    if (invoiceStatus === 'PAID' || invoiceStatus === 'SETTLED') {
      await removePurchasedItemsFromCart(connection, Number(record.user_id), orderId)
    }

    await connection.commit()

    return Response.json({
      message: 'Status pembayaran berhasil dikonfirmasi',
      data: {
        orderId,
        paymentStatus: mapped.paymentStatus,
        orderStatus: mapped.orderStatus,
        invoiceStatus
      }
    })
  } catch (error) {
    await connection.rollback()
    console.error(error)
    return Response.json({ message: 'Gagal mengonfirmasi pembayaran checkout', data: null }, { status: 500 })
  } finally {
    connection.release()
  }
}
