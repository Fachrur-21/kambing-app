import { query, queryOne } from '@/lib/db'
import { hasAdminOrOwnerRole, verifyAuthToken } from '@/lib/auth'

export const runtime = 'nodejs'

const LOW_STOCK_THRESHOLD = 5

function toNumber(value) {
  return Number(value || 0)
}

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

function getLast12MonthKeys() {
  const months = []
  const now = new Date()

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    months.push(`${year}-${month}`)
  }

  return months
}

async function hasHargaModalColumn() {
  const row = await queryOne(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'kambing'
       AND COLUMN_NAME = 'harga_modal'`
  )

  return Number(row?.total || 0) > 0
}

export async function GET(request) {
  try {
    const access = ensureManager(request)
    if (access.error) {
      return access.error
    }

    const hasHargaModal = await hasHargaModalColumn()
    const modalExpression = hasHargaModal ? 'COALESCE(k.harga_modal, 0)' : '0'

    const [
      ordersTodayRow,
      pendingOrdersRow,
      processingOrdersRow,
      soldTodayRow,
      latestOrdersRows,
      stockByTypeRows,
      lowStockRows,
      revenueSummaryRow,
      totalProfitRow,
      monthlyRows,
      topProductsRows
    ] = await Promise.all([
      queryOne('SELECT COUNT(*) AS total FROM orders WHERE DATE(created_at) = CURDATE()'),
      queryOne("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'pending'"),
      queryOne("SELECT COUNT(*) AS total FROM orders WHERE payment_status = 'paid' AND status = 'diproses'"),
      queryOne(
        `SELECT COALESCE(SUM(oi.qty), 0) AS total
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE o.payment_status = 'paid'
           AND DATE(o.created_at) = CURDATE()`
      ),
      query(
        `SELECT o.id, o.created_at, o.total, o.payment_status, o.status, COALESCE(u.nama, '-') AS buyer_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ORDER BY o.created_at DESC
         LIMIT 10`
      ),
      query(
        `SELECT jenis, COALESCE(SUM(stok), 0) AS total_stok
         FROM kambing
         GROUP BY jenis
         ORDER BY jenis ASC`
      ),
      query(
        `SELECT id, nama, jenis, stok
         FROM kambing
         WHERE stok > 0 AND stok <= ?
         ORDER BY stok ASC, nama ASC
         LIMIT 12`,
        [LOW_STOCK_THRESHOLD]
      ),
      queryOne(
        `SELECT
           COALESCE(SUM(o.total), 0) AS total_revenue,
           COUNT(*) AS total_transaksi,
           COALESCE(AVG(o.total), 0) AS avg_transaksi
         FROM orders o
         WHERE o.payment_status = 'paid'`
      ),
      queryOne(
        `SELECT COALESCE(SUM((oi.harga - ${modalExpression}) * oi.qty), 0) AS total_profit
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN kambing k ON k.id = oi.kambing_id
         WHERE o.payment_status = 'paid'`
      ),
      query(
        `SELECT
           DATE_FORMAT(o.created_at, '%Y-%m') AS month_key,
           COALESCE(SUM((oi.harga - ${modalExpression}) * oi.qty), 0) AS total_profit,
           COALESCE(SUM(oi.harga * oi.qty), 0) AS total_sales
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN kambing k ON k.id = oi.kambing_id
         WHERE o.payment_status = 'paid'
           AND o.created_at >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
         GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
         ORDER BY month_key ASC`
      ),
      query(
        `SELECT
           oi.kambing_id AS produk_id,
           COALESCE(MAX(k.nama), CONCAT('Produk #', oi.kambing_id)) AS nama_produk,
           COALESCE(SUM(oi.qty), 0) AS qty_terjual,
           COALESCE(SUM((oi.harga - ${modalExpression}) * oi.qty), 0) AS total_profit
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN kambing k ON k.id = oi.kambing_id
         WHERE o.payment_status = 'paid'
         GROUP BY oi.kambing_id
         ORDER BY qty_terjual DESC, total_profit DESC
         LIMIT 8`
      )
    ])

    const monthMap = new Map(
      monthlyRows.map((row) => [String(row.month_key), {
        total_profit: toNumber(row.total_profit),
        total_sales: toNumber(row.total_sales)
      }])
    )

    const monthKeys = getLast12MonthKeys()
    const monthly = monthKeys.map((monthKey) => {
      const metric = monthMap.get(monthKey)
      return {
        month_key: monthKey,
        total_profit: metric?.total_profit || 0,
        total_sales: metric?.total_sales || 0
      }
    })

    const totalProfit = toNumber(totalProfitRow?.total_profit)

    const topProducts = topProductsRows.map((row) => {
      const productProfit = toNumber(row.total_profit)
      const contribution = totalProfit > 0 ? (productProfit / totalProfit) * 100 : 0

      return {
        produk_id: toNumber(row.produk_id),
        nama_produk: String(row.nama_produk || '-'),
        qty_terjual: toNumber(row.qty_terjual),
        total_profit: productProfit,
        kontribusi_profit_persen: Number(contribution.toFixed(2))
      }
    })

    const latestOrders = latestOrdersRows.map((row) => {
      const paymentStatus = String(row.payment_status || '').toLowerCase()
      const status = String(row.status || '').toLowerCase()

      let displayStatus = status || paymentStatus || 'pending'
      if (paymentStatus !== 'paid') {
        displayStatus = 'pending'
      } else if (status === 'diproses' || status === 'dikirim' || status === 'selesai') {
        displayStatus = status
      } else {
        displayStatus = 'paid'
      }

      return {
        id: toNumber(row.id),
        created_at: row.created_at,
        buyer_name: String(row.buyer_name || '-'),
        total: toNumber(row.total),
        status: displayStatus
      }
    })

    return Response.json({
      message: 'Ringkasan dashboard',
      data: {
        admin: {
          top_cards: {
            total_pesanan_hari_ini: toNumber(ordersTodayRow?.total),
            pesanan_pending: toNumber(pendingOrdersRow?.total),
            pesanan_diproses: toNumber(processingOrdersRow?.total),
            total_kambing_terjual_hari_ini: toNumber(soldTodayRow?.total)
          },
          pesanan_terbaru: latestOrders,
          stok_per_jenis: stockByTypeRows.map((row) => ({
            jenis: String(row.jenis || '-'),
            total_stok: toNumber(row.total_stok)
          })),
          warning_stok_menipis: lowStockRows.map((row) => ({
            id: toNumber(row.id),
            nama: String(row.nama || '-'),
            jenis: String(row.jenis || '-'),
            stok: toNumber(row.stok)
          }))
        },
        owner: {
          ringkasan_keuangan: {
            total_revenue: toNumber(revenueSummaryRow?.total_revenue),
            total_profit: totalProfit,
            total_transaksi: toNumber(revenueSummaryRow?.total_transaksi),
            rata_rata_transaksi: toNumber(revenueSummaryRow?.avg_transaksi)
          },
          chart_bulanan: monthly,
          produk_terlaris: topProducts
        }
      },
      meta: {
        low_stock_threshold: LOW_STOCK_THRESHOLD,
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error saat memuat ringkasan dashboard', data: null }, { status: 500 })
  }
}
