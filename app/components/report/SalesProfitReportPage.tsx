'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'

type AllowedRole = 'admin' | 'owner'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
}

type ReportRow = {
  produk_id: number
  nama_produk: string
  harga_modal: number
  harga_jual: number
  qty_terjual: number
  profit_per_item: number
  total_profit: number
}

type ReportTransactionRow = {
  transaksi_id: number
  tanggal_transaksi: string
  nama_pembeli: string
  produk_id: number
  nama_produk: string
  harga_modal: number
  harga_jual: number
  jumlah_item: number
  qty_terjual: number
  total_profit: number
}

type ReportResponse = {
  message?: string
  meta?: {
    groupBy?: 'day' | 'month' | 'year'
    from?: string
    to?: string
  }
  summary?: {
    total_profit?: number
    total_terjual?: number
    total_produk?: number
    total_transaksi?: number
    periode?: string
  }
  grand_total?: {
    label?: string
    total_qty?: number
    total_profit?: number
  }
  data?: ReportRow[]
  data_produk?: ReportRow[]
  data_transaksi?: ReportTransactionRow[]
}

type SalesProfitReportPageProps = {
  role: AllowedRole
  title: string
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0))
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value || '-'
  }

  return date.toLocaleString('id-ID')
}

function getTodayDateText() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultFromDateText() {
  const now = new Date()
  now.setDate(now.getDate() - 29)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getGroupByLabel(groupBy: 'day' | 'month' | 'year') {
  if (groupBy === 'month') return 'Bulanan'
  if (groupBy === 'year') return 'Tahunan'
  return 'Harian'
}

const CSV_DELIMITER = ';'

function escapeCsvValue(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

type ExportColumn = {
  header: string
  key: string
  align?: 'left' | 'right'
  width: number
}

function drawPdfTable(
  pdf: jsPDF,
  columns: ExportColumn[],
  rows: string[][],
  options?: {
    startY?: number
    marginX?: number
    marginBottom?: number
    rowFontSize?: number
    headerFontSize?: number
  }
) {
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginX = options?.marginX ?? 12
  const marginBottom = options?.marginBottom ?? 12
  const startY = options?.startY ?? 56
  const headerFontSize = options?.headerFontSize ?? 8.5
  const rowFontSize = options?.rowFontSize ?? 8.2
  const headerHeight = 8
  const paddingX = 1.6
  const paddingY = 1.8
  let y = startY

  function drawHeader() {
    let x = marginX

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(headerFontSize)

    columns.forEach((column) => {
      pdf.setFillColor(226, 232, 240)
      pdf.setDrawColor(203, 213, 225)
      pdf.rect(x, y, column.width, headerHeight, 'FD')
      pdf.text(column.header, x + paddingX, y + 5.6)
      x += column.width
    })

    y += headerHeight
  }

  function drawRow(row: string[]) {
    const cellLines = columns.map((column, index) => {
      const content = String(row[index] ?? '-')
      return pdf.splitTextToSize(content, Math.max(column.width - paddingX * 2, 8)) as string[]
    })

    const rowHeight = Math.max(...cellLines.map((lines) => lines.length), 1) * 4 + paddingY * 2

    if (y + rowHeight > pageHeight - marginBottom) {
      pdf.addPage()
      y = startY
      drawHeader()
    }

    let x = marginX
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(rowFontSize)

    columns.forEach((column, index) => {
      pdf.setDrawColor(226, 232, 240)
      pdf.setFillColor(255, 255, 255)
      pdf.rect(x, y, column.width, rowHeight, 'S')

      const lines = cellLines[index]
      const textX = column.align === 'right' ? x + column.width - paddingX : x + paddingX
      const textAlign = column.align === 'right' ? 'right' : 'left'
      const textY = y + paddingY + 3
      pdf.text(lines, textX, textY, { align: textAlign })

      x += column.width
    })

    y += rowHeight
  }

  drawHeader()
  rows.forEach((row) => drawRow(row))
}

export default function SalesProfitReportPage({ role, title }: SalesProfitReportPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState(role === 'admin' ? 'Admin' : 'Owner')
  const [token, setToken] = useState('')
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day')
  const [rincianType, setRincianType] = useState<'produk' | 'transaksi'>('produk')
  const [fromDate, setFromDate] = useState(getDefaultFromDateText())
  const [toDate, setToDate] = useState(getTodayDateText())
  const [productRows, setProductRows] = useState<ReportRow[]>([])
  const [transactionRows, setTransactionRows] = useState<ReportTransactionRow[]>([])
  const [message, setMessage] = useState('')
  const [isFetchingReport, setIsFetchingReport] = useState(false)
  const [summary, setSummary] = useState({
    totalProfit: 0,
    totalTerjual: 0,
    totalProduk: 0,
    totalTransaksi: 0,
    periode: '-'
  })
  const [grandTotal, setGrandTotal] = useState({
    label: 'TOTAL KESELURUHAN',
    totalQty: 0,
    totalProfit: 0
  })

  const exportRows = useMemo(() => {
    if (rincianType === 'produk') {
      return [
        ...productRows.map((row) => [
          formatNumber(row.produk_id),
          row.nama_produk,
          formatRupiah(row.harga_modal),
          formatRupiah(row.harga_jual),
          formatNumber(row.qty_terjual),
          formatRupiah(row.profit_per_item),
          formatRupiah(row.total_profit)
        ]),
        [
          '',
          grandTotal.label,
          '-',
          '-',
          formatNumber(grandTotal.totalQty),
          '-',
          formatRupiah(grandTotal.totalProfit)
        ]
      ]
    }

    return [
      ...transactionRows.map((row) => [
        formatNumber(row.transaksi_id),
        formatDateTime(row.tanggal_transaksi),
        row.nama_pembeli,
        row.nama_produk,
        formatRupiah(row.harga_modal),
        formatRupiah(row.harga_jual),
        formatNumber(row.jumlah_item),
        formatNumber(row.qty_terjual),
        formatRupiah(row.total_profit)
      ]),
      [
        '',
        '',
        '',
        grandTotal.label,
        '-',
        '-',
        '-',
        formatNumber(grandTotal.totalQty),
        formatRupiah(grandTotal.totalProfit)
      ]
    ]
  }, [grandTotal, productRows, rincianType, transactionRows])

  const hasExportableData = rincianType === 'produk' ? productRows.length > 0 : transactionRows.length > 0

  const exportColumns = useMemo<ExportColumn[]>(() => {
    if (rincianType === 'produk') {
      return [
        { header: 'ID Produk', key: 'produk_id', align: 'right', width: 16 },
        { header: 'Nama Produk', key: 'nama_produk', align: 'left', width: 66 },
        { header: 'Harga Modal', key: 'harga_modal', align: 'right', width: 28 },
        { header: 'Harga Jual', key: 'harga_jual', align: 'right', width: 28 },
        { header: 'Qty Terjual', key: 'qty_terjual', align: 'right', width: 18 },
        { header: 'Profit per Item', key: 'profit_per_item', align: 'right', width: 32 },
        { header: 'Total Profit', key: 'total_profit', align: 'right', width: 32 }
      ]
    }

    return [
      { header: 'ID Transaksi', key: 'transaksi_id', align: 'right', width: 16 },
      { header: 'Tanggal', key: 'tanggal_transaksi', align: 'left', width: 28 },
      { header: 'Nama Pembeli', key: 'nama_pembeli', align: 'left', width: 30 },
      { header: 'Nama Produk', key: 'nama_produk', align: 'left', width: 42 },
      { header: 'Harga Modal', key: 'harga_modal', align: 'right', width: 24 },
      { header: 'Harga Jual', key: 'harga_jual', align: 'right', width: 24 },
      { header: 'Jumlah Item', key: 'jumlah_item', align: 'right', width: 18 },
      { header: 'Qty Terjual', key: 'qty_terjual', align: 'right', width: 18 },
      { header: 'Total Profit', key: 'total_profit', align: 'right', width: 24 }
    ]
  }, [rincianType])

  const exportFileName = useMemo(() => {
    const safeRole = role === 'admin' ? 'admin' : 'owner'
    return `laporan-keuntungan-${safeRole}-${rincianType}-${fromDate}-sampai-${toDate}`
  }, [fromDate, rincianType, role, toDate])

  async function handleExportCSV() {
    if (!hasExportableData) {
      alert('Tidak ada data untuk diekspor')
      return
    }

    const csvLines = [
      exportColumns.map((column) => column.header),
      ...exportRows
    ]

    const csvContent = csvLines
      .map((line) => line.map(escapeCsvValue).join(CSV_DELIMITER))
      .join('\r\n')

    downloadTextFile(`\ufeff${csvContent}`, `${exportFileName}.csv`, 'text/csv')
  }

  function handleExportPDF() {
    if (!hasExportableData) {
      alert('Tidak ada data untuk diekspor')
      return
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    pdf.setTextColor(15, 23, 42)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.text(title, 12, 14)

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Periode: ${summary.periode}`, 12, 21)
    pdf.text(`Kelompok: ${getGroupByLabel(groupBy)}`, 12, 27)
    pdf.text(`Rentang: ${fromDate} sampai ${toDate}`, 12, 33)
    pdf.text(`Rincian: ${rincianType === 'produk' ? 'Profit per produk' : 'Profit per transaksi'}`, 12, 39)

    pdf.setFont('helvetica', 'bold')
    pdf.text(`Total Transaksi: ${formatNumber(summary.totalTransaksi)}`, pageWidth - 92, 21)
    pdf.text(`Total Item Terjual: ${formatNumber(summary.totalTerjual)}`, pageWidth - 92, 27)
    pdf.text(`Total Profit: ${formatRupiah(summary.totalProfit)}`, pageWidth - 92, 33)

    drawPdfTable(pdf, exportColumns, exportRows)
    pdf.save(`${exportFileName}.pdf`)
  }

  const initial = useMemo(() => (nama || 'U').trim().charAt(0).toUpperCase(), [nama])

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    if (!storedToken) {
      router.push('/login')
      return
    }
    const tokenValue = storedToken

    async function verifyAndLoad() {
      try {
        const meResponse = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        })

        const meResult: MeResponse = await meResponse.json()
        const userRole = String(meResult?.data?.role || '').toLowerCase()

        if (!meResponse.ok || userRole !== role) {
          router.push('/dashboard')
          return
        }

        setToken(tokenValue)
        setNama(meResult?.data?.nama || (role === 'admin' ? 'Admin' : 'Owner'))

        await loadReport(tokenValue, groupBy, fromDate, toDate)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, role])

  async function loadReport(currentToken: string, nextGroupBy: 'day' | 'month' | 'year', nextFrom: string, nextTo: string) {
    setIsFetchingReport(true)
    setMessage('')

    try {
      const params = new URLSearchParams({
        groupBy: nextGroupBy,
        from: nextFrom,
        to: nextTo
      })

      const response = await fetch(`/api/laporan/keuntungan?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      })

      const result: ReportResponse = await response.json()

      if (!response.ok) {
        setProductRows([])
        setTransactionRows([])
        setSummary({ totalProfit: 0, totalTerjual: 0, totalProduk: 0, totalTransaksi: 0, periode: '-' })
        setGrandTotal({ label: 'TOTAL KESELURUHAN', totalQty: 0, totalProfit: 0 })
        setMessage(result?.message || 'Gagal memuat laporan keuntungan')
        return
      }

      setProductRows(result.data_produk || result.data || [])
      setTransactionRows(result.data_transaksi || [])
      setSummary({
        totalProfit: Number(result.summary?.total_profit || 0),
        totalTerjual: Number(result.summary?.total_terjual || 0),
        totalProduk: Number(result.summary?.total_produk || 0),
        totalTransaksi: Number(result.summary?.total_transaksi || 0),
        periode: String(result.summary?.periode || '-')
      })
      setGrandTotal({
        label: String(result.grand_total?.label || 'TOTAL KESELURUHAN'),
        totalQty: Number(result.grand_total?.total_qty || 0),
        totalProfit: Number(result.grand_total?.total_profit || 0)
      })
    } catch {
      setProductRows([])
      setTransactionRows([])
      setSummary({ totalProfit: 0, totalTerjual: 0, totalProduk: 0, totalTransaksi: 0, periode: '-' })
      setGrandTotal({ label: 'TOTAL KESELURUHAN', totalQty: 0, totalProfit: 0 })
      setMessage('Terjadi error saat memuat laporan keuntungan')
    } finally {
      setIsFetchingReport(false)
    }
  }

  async function handleApplyFilter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) return

    if (fromDate > toDate) {
      setMessage('Tanggal mulai tidak boleh lebih besar dari tanggal akhir')
      return
    }

    await loadReport(token, groupBy, fromDate, toDate)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat laporan...</p>
        </div>
      </main>
    )
  }

  if (!token) {
    return null
  }

  return (
    <main className="flex min-h-screen bg-[#edeff4] text-slate-800">
      <MySidebar role={role as AppRole} onLogout={handleLogout} userInitial={initial} />

      <section className="flex-1 p-4 lg:p-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">Keuntungan dihitung dari harga jual - harga modal.</p>
              <p className="mt-1 text-xs text-slate-400">Periode aktif: {summary.periode}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isFetchingReport || !hasExportableData}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isFetchingReport || !hasExportableData}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                PDF
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleApplyFilter} className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Kelompok</span>
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as 'day' | 'month' | 'year')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="day">Harian</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Dari Tanggal</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Sampai Tanggal</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Rincian</span>
            <select
              value={rincianType}
              onChange={(event) => setRincianType(event.target.value as 'produk' | 'transaksi')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="produk">Profit Per Produk</option>
              <option value="transaksi">Profit Per Transaksi</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isFetchingReport}
              className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
            >
              {isFetchingReport ? 'Memproses...' : 'Terapkan Filter'}
            </button>
          </div>
        </form>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Transaksi</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(summary.totalTransaksi)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Item Terjual</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(summary.totalTerjual)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total Profit</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatRupiah(summary.totalProfit)}</p>
          </article>
        </div>

        {message ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              {rincianType === 'produk' ? 'Rincian Profit Per Produk' : 'Rincian Profit Per Transaksi'}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              {rincianType === 'produk' ? (
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ID Produk</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Produk</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Modal</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Jual</th>
                    <th className="px-4 py-3 text-right font-semibold">Qty Terjual</th>
                    <th className="px-4 py-3 text-right font-semibold">Profit per Item</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Profit</th>
                  </tr>
                </thead>
              ) : (
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ID Transaksi</th>
                    <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Pembeli</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Produk</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Modal</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Jual</th>
                    <th className="px-4 py-3 text-right font-semibold">Jumlah Item</th>
                    <th className="px-4 py-3 text-right font-semibold">Qty Terjual</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Profit</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {rincianType === 'produk'
                  ? productRows.length === 0
                    ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                          Tidak ada data pada rentang tanggal ini.
                        </td>
                      </tr>
                    )
                    : productRows.map((row) => (
                      <tr key={row.produk_id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{formatNumber(row.produk_id)}</td>
                        <td className="px-4 py-3">{row.nama_produk}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(row.harga_modal)}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(row.harga_jual)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.qty_terjual)}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(row.profit_per_item)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatRupiah(row.total_profit)}</td>
                      </tr>
                    ))
                  : transactionRows.length === 0
                    ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                          Tidak ada data transaksi pada rentang tanggal ini.
                        </td>
                      </tr>
                    )
                    : transactionRows.map((row) => (
                      <tr key={row.transaksi_id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{formatNumber(row.transaksi_id)}</td>
                        <td className="px-4 py-3">{formatDateTime(row.tanggal_transaksi)}</td>
                        <td className="px-4 py-3">{row.nama_pembeli}</td>
                        <td className="px-4 py-3">{row.nama_produk}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(row.harga_modal)}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(row.harga_jual)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.jumlah_item)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.qty_terjual)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatRupiah(row.total_profit)}</td>
                      </tr>
                    ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  {rincianType === 'produk' ? (
                    <>
                      <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-700">
                        {grandTotal.label}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{formatNumber(grandTotal.totalQty)}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">-</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatRupiah(grandTotal.totalProfit)}</td>
                    </>
                  ) : (
                    <>
                      <td colSpan={7} className="px-4 py-3 text-right font-bold text-slate-700">{grandTotal.label}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{formatNumber(grandTotal.totalQty)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatRupiah(grandTotal.totalProfit)}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}
