import { query, queryOne } from '@/lib/db'
import { hasAdminOrOwnerRole, hasBuyerRole, hasEmployeeRole, verifyAuthToken } from '@/lib/auth'

const TRACKED_STATUSES = ['diproses', 'dikirim', 'selesai']

function ensureAuthorized(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  const decoded = auth.decoded

  if (hasBuyerRole(decoded)) {
    return { decoded, role: 'pembeli' }
  }

  if (hasAdminOrOwnerRole(decoded)) {
    return { decoded, role: 'manager' }
  }

  if (hasEmployeeRole(decoded)) {
    return { decoded, role: 'pegawai' }
  }

  return { error: Response.json({ message: 'Forbidden', data: null }, { status: 403 }) }
}

function buildWhereClause(role, userId, statusParam = '') {
  if (role === 'pembeli') {
    return {
      clause: 'o.user_id = ? AND o.payment_status = ? AND o.status IN (?, ?, ?)',
      params: [userId, 'paid', ...TRACKED_STATUSES]
    }
  }

  if (role === 'pegawai') {
    if (statusParam === 'selesai' || statusParam === 'riwayat') {
      return {
        clause: 'o.payment_status = ? AND o.status = ?',
        params: ['paid', 'selesai']
      }
    }

    return {
      clause: 'o.payment_status = ? AND o.status = ?',
      params: ['paid', 'dikirim']
    }
  }

  return {
    clause: 'o.payment_status = ? AND o.status IN (?, ?, ?)',
    params: ['paid', ...TRACKED_STATUSES]
  }
}

function toNumber(value) {
  return Number(value || 0)
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

export async function GET(request) {
  try {
    const access = ensureAuthorized(request)
    if (access.error) {
      return access.error
    }

    const userId = Number(access.decoded.id)
    const statusParam = String(request.nextUrl?.searchParams?.get('status') || '').trim().toLowerCase()
    const where = buildWhereClause(access.role, userId, statusParam)
    const availableColumns = await getAvailableOrderColumns(['shipping_name', 'shipping_phone', 'shipping_note', 'completion_image_urls'])

    const shippingNameSelect = availableColumns.has('shipping_name')
      ? 'o.shipping_name AS shipping_name'
      : "NULL AS shipping_name"
    const shippingPhoneSelect = availableColumns.has('shipping_phone')
      ? 'o.shipping_phone AS shipping_phone'
      : "NULL AS shipping_phone"
    const shippingNoteSelect = availableColumns.has('shipping_note')
      ? 'o.shipping_note AS shipping_note'
      : "NULL AS shipping_note"
    const completionImageUrlsSelect = availableColumns.has('completion_image_urls')
      ? 'o.completion_image_urls AS completion_image_urls'
      : "NULL AS completion_image_urls"

    const orders = await query(
      `SELECT o.id, o.user_id, o.total, o.status, o.payment_status, o.shipping_address, o.created_at,
              o.completed_at, o.completion_image_url, o.completion_description,
              ${completionImageUrlsSelect},
              ${shippingNameSelect},
              ${shippingPhoneSelect},
              ${shippingNoteSelect},
              u.nama AS buyer_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE ${where.clause}
       ORDER BY o.created_at DESC`,
      where.params
    )

    if (!orders.length) {
      return Response.json({ message: 'Daftar pesanan', data: [] })
    }

    const orderIds = orders.map((row) => Number(row.id))
    const placeholders = orderIds.map(() => '?').join(', ')

    const items = await query(
      `SELECT oi.id, oi.order_id, oi.kambing_id, oi.qty, oi.harga,
              k.nama AS kambing_nama, k.jenis AS kambing_jenis, k.berat AS kambing_berat, k.imageUrl AS kambing_image_url
       FROM order_items oi
       JOIN kambing k ON k.id = oi.kambing_id
       WHERE oi.order_id IN (${placeholders})
       ORDER BY oi.id ASC`,
      orderIds
    )

    const itemsByOrderId = items.reduce((acc, item) => {
      const key = Number(item.order_id)
      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push({
        id: toNumber(item.id),
        kambingId: toNumber(item.kambing_id),
        qty: toNumber(item.qty),
        harga: toNumber(item.harga),
        subtotal: toNumber(item.qty) * toNumber(item.harga),
        kambing: {
          nama: item.kambing_nama,
          jenis: item.kambing_jenis,
          berat: Number(item.kambing_berat || 0),
          imageUrl: item.kambing_image_url || null
        }
      })

      return acc
    }, {})

    const data = orders.map((row) => {
      const orderId = Number(row.id)

      return {
        id: orderId,
        userId: Number(row.user_id),
        buyerName: row.buyer_name,
        total: toNumber(row.total),
        status: String(row.status || ''),
        paymentStatus: String(row.payment_status || ''),
        shippingAddress: row.shipping_address || null,
        shippingName: row.shipping_name || null,
        shippingPhone: row.shipping_phone || null,
        shippingNote: row.shipping_note || null,
        createdAt: row.created_at,
        completedAt: row.completed_at || null,
        completionImageUrl: row.completion_image_url || null,
        completionImageUrls: parseCompletionImageUrls(row.completion_image_urls, row.completion_image_url),
        completionDescription: row.completion_description || null,
        items: itemsByOrderId[orderId] || []
      }
    })

    return Response.json({ message: 'Daftar pesanan', data })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error saat memuat pesanan', data: null }, { status: 500 })
  }
}
