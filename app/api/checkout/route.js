import db from '@/lib/db'
import { hasBuyerRole, verifyAuthToken } from '@/lib/auth'
import { buildXenditExternalId, createXenditInvoice } from '@/lib/xendit'

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

function normalizeAddress(value) {
  const address = String(value || '').trim()
  return address.length > 0 ? address : null
}

function normalizeOptionalText(value) {
  const text = String(value || '').trim()
  return text.length > 0 ? text : null
}

function normalizeRequiredText(value) {
  const text = String(value || '').trim()
  return text.length > 0 ? text : null
}

function buildItemDetails(rows) {
  return rows.map((row) => ({
    id: `KAMBING-${row.kambing_id}`,
    price: Number(row.harga || 0),
    quantity: Number(row.qty || 0),
    name: String(row.nama || 'Kambing').slice(0, 50)
  }))
}

function buildBaseUrl(request) {
  const configuredBaseUrl = String(process.env.APP_BASE_URL || '').trim()
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  try {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  } catch {
    return 'http://localhost:3000'
  }
}

async function getPaymentReferenceColumn(connection) {
  const [rows] = await connection.query("SHOW COLUMNS FROM payments LIKE 'provider_reference'")
  return rows.length > 0 ? 'provider_reference' : 'midtrans_order_id'
}

async function getAvailableOrderColumns(connection, columnNames) {
  if (!Array.isArray(columnNames) || columnNames.length === 0) {
    return new Set()
  }

  const placeholders = columnNames.map(() => '?').join(', ')
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'orders'
       AND COLUMN_NAME IN (${placeholders})`,
    columnNames
  )

  return new Set(rows.map((row) => String(row.COLUMN_NAME)))
}

async function reserveStock(connection, rows) {
  for (const row of rows) {
    const [result] = await connection.execute(
      `UPDATE kambing
       SET stok = stok - ?,
           status = CASE WHEN stok - ? <= 0 THEN 'sold_out' ELSE 'ready' END,
           isActive = CASE WHEN stok - ? <= 0 THEN 0 ELSE isActive END,
           updatedAt = NOW(3)
       WHERE id = ? AND stok >= ?`,
      [row.qty, row.qty, row.qty, row.kambing_id, row.qty]
    )

    if (!result.affectedRows) {
      throw new Error('STOK_TIDAK_CUKUP')
    }
  }
}

export async function POST(request) {
  const access = ensureBuyer(request)

  if (access.error) {
    return access.error
  }

  const userId = Number(access.decoded.id)
  const body = await request.json().catch(() => ({}))
  const shippingNameInput = normalizeRequiredText(body?.shippingName)
  const shippingAddressInput = normalizeAddress(body?.shippingAddress)
  const shippingPhoneInput = normalizeRequiredText(body?.shippingPhone)
  const shippingNoteInput = normalizeOptionalText(body?.shippingNote)
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [userRows] = await connection.execute(
      'SELECT id, nama, email, no_tlpn, alamat FROM users WHERE id = ? LIMIT 1',
      [userId]
    )

    const user = userRows[0]

    if (!user) {
      await connection.rollback()
      return Response.json({ message: 'Pengguna tidak ditemukan', data: null }, { status: 404 })
    }

    const [cartRows] = await connection.execute(
      `SELECT c.id AS cart_id, c.kambing_id, c.qty, c.harga, k.nama, k.stok, k.status
       FROM keranjang c
       JOIN kambing k ON k.id = c.kambing_id
       WHERE c.user_id = ?
       ORDER BY c.created_at ASC
       FOR UPDATE`,
      [userId]
    )

    if (!cartRows.length) {
      await connection.rollback()
      return Response.json({ message: 'Keranjang masih kosong', data: null }, { status: 400 })
    }

    const invalidCartIds = []

    for (const row of cartRows) {
      const normalizedStatus = String(row.status || '').trim().toLowerCase()
      if (normalizedStatus !== 'ready' || Number(row.stok) < Number(row.qty)) {
        invalidCartIds.push(Number(row.cart_id))
      }
    }

    if (invalidCartIds.length > 0) {
      const placeholders = invalidCartIds.map(() => '?').join(', ')
      await connection.execute(
        `DELETE FROM keranjang WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...invalidCartIds]
      )

      throw new Error('KERANJANG_MENGANDUNG_ITEM_TIDAK_TERSEDIA')
    }

    const totalHarga = cartRows.reduce((acc, row) => acc + Number(row.qty || 0) * Number(row.harga || 0), 0)
    const orderStatus = 'pending_payment'
    const paymentStatus = 'pending'

    const shippingName = shippingNameInput || String(user.nama || '').trim() || null
    const shippingAddress = shippingAddressInput || String(user.alamat || '').trim() || null
    const shippingPhone = shippingPhoneInput || String(user.no_tlpn || '').trim() || null
    const shippingNote = shippingNoteInput

    if (!shippingName || !shippingAddress || !shippingPhone) {
      await connection.rollback()
      return Response.json(
        {
          message: 'Nama penerima, alamat pengantaran, dan nomor telepon wajib diisi',
          data: null
        },
        { status: 400 }
      )
    }

    const availableOrderColumns = await getAvailableOrderColumns(connection, [
      'shipping_name',
      'shipping_phone',
      'shipping_note'
    ])

    const insertColumns = ['user_id', 'total', 'status', 'payment_status', 'shipping_address', 'created_at']
    const insertValues = [userId, totalHarga, orderStatus, paymentStatus, shippingAddress]

    if (availableOrderColumns.has('shipping_name')) {
      insertColumns.push('shipping_name')
      insertValues.push(shippingName)
    }

    if (availableOrderColumns.has('shipping_phone')) {
      insertColumns.push('shipping_phone')
      insertValues.push(shippingPhone)
    }

    if (availableOrderColumns.has('shipping_note')) {
      insertColumns.push('shipping_note')
      insertValues.push(shippingNote)
    }

    const dynamicPlaceholders = insertColumns
      .map((column) => (column === 'created_at' ? 'NOW(3)' : '?'))
      .join(', ')

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (${insertColumns.join(', ')})
       VALUES (${dynamicPlaceholders})`,
      insertValues
    )

    const orderId = Number(orderResult.insertId)
    const xenditExternalId = buildXenditExternalId(orderId)
    const paymentReferenceColumn = await getPaymentReferenceColumn(connection)
    const itemDetails = buildItemDetails(cartRows)

    for (const row of cartRows) {
      await connection.execute(
        'INSERT INTO order_items (order_id, kambing_id, qty, harga) VALUES (?, ?, ?, ?)',
        [orderId, row.kambing_id, row.qty, row.harga]
      )
    }

    await reserveStock(connection, cartRows)

    const [paymentResult] = await connection.execute(
      `INSERT INTO payments (
        order_id,
        metode,
        status,
        ${paymentReferenceColumn},
        payment_type,
        transaction_status,
        gross_amount,
        payment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
      [orderId, 'xendit', 'pending', xenditExternalId, 'invoice', 'PENDING', totalHarga]
    )

    const baseUrl = buildBaseUrl(request)
    const payerEmail = String(user.email || access.decoded.email || '').trim() || 'no-reply@kambing.local'

    const xenditInvoice = await createXenditInvoice({
      external_id: xenditExternalId,
      amount: totalHarga,
      currency: 'IDR',
      description: `Checkout order #${orderId} (${itemDetails.length} item)`,
      payer_email: payerEmail,
      success_redirect_url: `${baseUrl}/produk?checkout=success&orderId=${orderId}`,
      failure_redirect_url: `${baseUrl}/produk?checkout=failed&orderId=${orderId}`
    })

    await connection.execute(
      `UPDATE payments
       SET ${paymentReferenceColumn} = ?,
           status = ?,
           transaction_status = ?,
           payment_type = ?,
           gross_amount = ?,
           payment_time = NOW(3)
       WHERE id = ?`,
      [xenditExternalId, 'pending', String(xenditInvoice.status || 'PENDING').toUpperCase(), 'invoice', totalHarga, paymentResult.insertId]
    )

    await connection.commit()

    return Response.json({
      message: 'Checkout berhasil dibuat',
      data: {
        orderId,
        paymentId: Number(paymentResult.insertId),
        externalId: xenditExternalId,
        invoiceId: xenditInvoice.id,
        redirectUrl: xenditInvoice.invoice_url,
        invoiceStatus: String(xenditInvoice.status || 'PENDING').toUpperCase(),
        totalHarga,
        itemCount: cartRows.length
      }
    })
  } catch (error) {
    await connection.rollback()

    if (error instanceof Error && error.message === 'STOK_TIDAK_CUKUP') {
      return Response.json({ message: 'Stok tidak mencukupi untuk checkout', data: null }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'KERANJANG_MENGANDUNG_ITEM_TIDAK_TERSEDIA') {
      return Response.json(
        {
          message: 'Ada item keranjang yang sudah tidak tersedia. Item tersebut sudah dihapus dari keranjang.',
          data: null
        },
        { status: 400 }
      )
    }

    console.error(error)
    return Response.json({ message: 'Terjadi error saat checkout', data: null }, { status: 500 })
  } finally {
    connection.release()
  }
}