import { query, queryOne } from '@/lib/db'
import { hasAdminOrOwnerRole, verifyAuthToken } from '@/lib/auth'

export const runtime = 'nodejs'

const VALID_GROUP_BY = new Set(['day', 'month', 'year'])
const TRACKED_STATUSES = ['diproses', 'dikirim', 'selesai']
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
]

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

function toNumber(value) {
  return Number(value || 0)
}

function isValidDateText(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseDate(value, fallback) {
  const text = String(value || '').trim()
  if (!isValidDateText(text)) {
    return fallback
  }

  const date = new Date(`${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return text
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultRange() {
  const toDate = new Date()
  const fromDate = new Date(toDate)
  fromDate.setDate(fromDate.getDate() - 29)

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate)
  }
}

function formatDateLabel(dateText) {
  const [year, month, day] = String(dateText || '').split('-').map((value) => Number(value || 0))
  if (!year || !month || !day) {
    return String(dateText || '-')
  }

  const monthName = MONTH_NAMES[month - 1] || String(month)
  return `${day} ${monthName} ${year}`
}

function formatMonthLabel(dateText) {
  const [year, month] = String(dateText || '').split('-').map((value) => Number(value || 0))
  if (!year || !month) {
    return String(dateText || '-')
  }

  const monthName = MONTH_NAMES[month - 1] || String(month)
  return `${monthName} ${year}`
}

function buildPeriodLabel(groupBy, from, to) {
  if (groupBy === 'year') {
    const fromYear = Number(String(from).slice(0, 4))
    const toYear = Number(String(to).slice(0, 4))
    if (fromYear && toYear && fromYear === toYear) {
      return String(fromYear)
    }

    return `${fromYear || String(from)} - ${toYear || String(to)}`
  }

  if (groupBy === 'month') {
    const fromMonth = String(from).slice(0, 7)
    const toMonth = String(to).slice(0, 7)
    if (fromMonth === toMonth) {
      return formatMonthLabel(fromMonth)
    }

    return `${formatMonthLabel(fromMonth)} - ${formatMonthLabel(toMonth)}`
  }

  if (from === to) {
    return formatDateLabel(from)
  }

  return `${formatDateLabel(from)} - ${formatDateLabel(to)}`
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

    const { searchParams } = new URL(request.url)
    const defaultRange = getDefaultRange()

    const groupByParam = String(searchParams.get('groupBy') || 'day').trim().toLowerCase()
    const groupBy = VALID_GROUP_BY.has(groupByParam) ? groupByParam : 'day'

    const from = parseDate(searchParams.get('from'), defaultRange.from)
    const to = parseDate(searchParams.get('to'), defaultRange.to)

    if (from > to) {
      return Response.json({ message: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir', data: null }, { status: 400 })
    }

    const periodLabel = buildPeriodLabel(groupBy, from, to)
    const hasHargaModal = await hasHargaModalColumn()
    const modalExpression = hasHargaModal ? 'COALESCE(MAX(k.harga_modal), 0)' : '0'
    const modalItemExpression = hasHargaModal ? 'COALESCE(k.harga_modal, 0)' : '0'

    const rows = await query(
      `SELECT
         oi.kambing_id AS produk_id,
         COALESCE(MAX(k.nama), CONCAT('Produk #', oi.kambing_id)) AS nama_produk,
         ${modalExpression} AS harga_modal,
         COALESCE(MAX(oi.harga), 0) AS harga_jual,
         COALESCE(SUM(oi.qty), 0) AS qty_terjual
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN kambing k ON k.id = oi.kambing_id
       WHERE o.payment_status = ?
         AND o.status IN (?, ?, ?)
         AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY oi.kambing_id
       ORDER BY nama_produk ASC`,
      ['paid', ...TRACKED_STATUSES, from, to]
    )

    const dataProduk = rows.map((row) => {
      const hargaModal = toNumber(row.harga_modal)
      const hargaJual = toNumber(row.harga_jual)
      const qtyTerjual = toNumber(row.qty_terjual)
      const profitPerItem = hargaJual - hargaModal
      const totalProfit = profitPerItem * qtyTerjual

      return {
        produk_id: toNumber(row.produk_id),
        nama_produk: String(row.nama_produk || ''),
        harga_modal: hargaModal,
        harga_jual: hargaJual,
        qty_terjual: qtyTerjual,
        profit_per_item: profitPerItem,
        total_profit: totalProfit
      }
    })

    const transaksiRows = await query(
      `SELECT
         o.id AS transaksi_id,
         o.created_at AS tanggal_transaksi,
         COALESCE(MAX(u.nama), '-') AS nama_pembeli,
         oi.kambing_id AS produk_id,
         COALESCE(MAX(k.nama), CONCAT('Produk #', oi.kambing_id)) AS nama_produk,
         ${modalItemExpression} AS harga_modal,
         COALESCE(MAX(oi.harga), 0) AS harga_jual,
         COALESCE(SUM(oi.qty), 0) AS qty_terjual,
         COALESCE(SUM((oi.harga - ${modalItemExpression}) * oi.qty), 0) AS total_profit
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN kambing k ON k.id = oi.kambing_id
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.payment_status = ?
         AND o.status IN (?, ?, ?)
         AND DATE(o.created_at) BETWEEN ? AND ?
       GROUP BY o.id, o.created_at, oi.kambing_id
       ORDER BY o.created_at DESC, o.id DESC, nama_produk ASC`,
      ['paid', ...TRACKED_STATUSES, from, to]
    )

    const itemCountByTransaksi = transaksiRows.reduce((acc, row) => {
      const transaksiId = toNumber(row.transaksi_id)
      acc[transaksiId] = (acc[transaksiId] || 0) + 1
      return acc
    }, {})

    const dataTransaksi = transaksiRows.map((row) => {
      const transaksiId = toNumber(row.transaksi_id)
      return {
        transaksi_id: transaksiId,
        tanggal_transaksi: String(row.tanggal_transaksi || ''),
        nama_pembeli: String(row.nama_pembeli || '-'),
        produk_id: toNumber(row.produk_id),
        nama_produk: String(row.nama_produk || ''),
        harga_modal: toNumber(row.harga_modal),
        harga_jual: toNumber(row.harga_jual),
        jumlah_item: toNumber(itemCountByTransaksi[transaksiId] || 0),
        qty_terjual: toNumber(row.qty_terjual),
        total_profit: toNumber(row.total_profit)
      }
    })

    const totalProfit = dataProduk.reduce((acc, row) => acc + toNumber(row.total_profit), 0)
    const totalQty = dataProduk.reduce((acc, row) => acc + toNumber(row.qty_terjual), 0)
    const totalProduk = dataProduk.length
    const totalTransaksi = dataTransaksi.length

    return Response.json({
      message: 'Laporan keuntungan',
      meta: {
        groupBy,
        from,
        to
      },
      summary: {
        total_profit: totalProfit,
        total_terjual: totalQty,
        total_produk: totalProduk,
        total_transaksi: totalTransaksi,
        periode: periodLabel
      },
      data: dataProduk,
      data_produk: dataProduk,
      data_transaksi: dataTransaksi,
      grand_total: {
        label: 'TOTAL KESELURUHAN',
        total_qty: totalQty,
        total_profit: totalProfit
      }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error saat memuat laporan keuntungan', data: null }, { status: 500 })
  }
}
