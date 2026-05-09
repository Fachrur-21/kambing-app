'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'
import BuyerBerandaContent, { type BuyerKambingItem } from '@/app/components/buyer/BuyerBerandaContent'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
  error?: string
}

type AdminTopCards = {
  total_pesanan_hari_ini: number
  pesanan_pending: number
  pesanan_diproses: number
  total_kambing_terjual_hari_ini: number
}

type LatestOrder = {
  id: number
  created_at: string
  buyer_name: string
  total: number
  status: 'pending' | 'paid' | 'diproses' | 'dikirim' | 'selesai' | string
}

type StockByType = {
  jenis: string
  total_stok: number
}

type LowStockWarning = {
  id: number
  nama: string
  jenis: string
  stok: number
}

type OwnerSummary = {
  total_revenue: number
  total_profit: number
  total_transaksi: number
  rata_rata_transaksi: number
}

type MonthlyChartPoint = {
  month_key: string
  total_profit: number
  total_sales: number
}

type TopProduct = {
  produk_id: number
  nama_produk: string
  qty_terjual: number
  total_profit: number
  kontribusi_profit_persen: number
}

type DashboardResponse = {
  message?: string
  data?: {
    admin?: {
      top_cards?: AdminTopCards
      pesanan_terbaru?: LatestOrder[]
      stok_per_jenis?: StockByType[]
      warning_stok_menipis?: LowStockWarning[]
    }
    owner?: {
      ringkasan_keuangan?: OwnerSummary
      chart_bulanan?: MonthlyChartPoint[]
      produk_terlaris?: TopProduct[]
    }
  }
  meta?: {
    low_stock_threshold?: number
    generated_at?: string
  }
}

type ProductResponse = {
  data?: BuyerKambingItem[]
  message?: string
}

const allowedRoles: AppRole[] = ['admin', 'owner', 'pegawai', 'pembeli']
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

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
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID')
}

function formatMonthLabel(monthKey: string) {
  const [yearText, monthText] = String(monthKey || '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!year || !month) return monthKey

  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
}

function statusBadge(status: string) {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'pending') {
    return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Pending</span>
  }

  if (normalized === 'paid') {
    return <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">Paid</span>
  }

  if (normalized === 'diproses') {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Diproses</span>
  }

  if (normalized === 'dikirim') {
    return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">Dikirim</span>
  }

  if (normalized === 'selesai') {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Selesai</span>
  }

  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{status || '-'}</span>
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [nama, setNama] = useState('User')
  const [role, setRole] = useState<AppRole>('pembeli')
  const [buyerProducts, setBuyerProducts] = useState<BuyerKambingItem[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardResponse['data']>({})
  const [dashboardMeta, setDashboardMeta] = useState<DashboardResponse['meta']>({})
  const router = useRouter()

  async function loadDashboard(currentToken: string) {
    setDashboardLoading(true)
    setDashboardError('')

    try {
      const response = await fetch('/api/dashboard/summary', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      })

      const result: DashboardResponse = await response.json()
      if (!response.ok || !result?.data) {
        setDashboardData({})
        setDashboardError(result?.message || 'Gagal memuat data dashboard')
        return
      }

      setDashboardData(result.data)
      setDashboardMeta(result.meta || {})
    } catch {
      setDashboardData({})
      setDashboardError('Terjadi error saat memuat dashboard')
    } finally {
      setDashboardLoading(false)
    }
  }

  async function loadBuyerProducts(currentToken: string) {
    try {
      const response = await fetch('/api/pembeli/kambing?perPage=24', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      })

      const result: ProductResponse = await response.json()
      if (!response.ok) {
        setBuyerProducts([])
        return
      }

      setBuyerProducts(result?.data || [])
    } catch {
      setBuyerProducts([])
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    const accessToken = token

    async function fetchProfile() {
      try {
        const response = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
        const result: MeResponse = await response.json()

        if (!response.ok || !result?.data) {
          localStorage.removeItem('access_token')
          router.push('/login')
          return
        }

        const roleFromApi = String(result.data.role || '').toLowerCase()
        if (allowedRoles.includes(roleFromApi as AppRole)) {
          setRole(roleFromApi as AppRole)
        }

        setNama(result.data.nama || 'User')

        if (roleFromApi === 'admin' || roleFromApi === 'owner') {
          await loadDashboard(accessToken)
        } else if (roleFromApi === 'pembeli') {
          await loadBuyerProducts(accessToken)
        }
      } catch {
        localStorage.removeItem('access_token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const initial = useMemo(() => (nama || 'U').trim().charAt(0).toUpperCase(), [nama])

  const ownerMonthlyData = useMemo(() => {
    return dashboardData?.owner?.chart_bulanan || []
  }, [dashboardData])

  const ownerChartLabels = useMemo(() => ownerMonthlyData.map((item) => formatMonthLabel(item.month_key)), [ownerMonthlyData])

  const ownerProfitLineOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number) => formatRupiah(value)
      },
      grid: {
        left: 16,
        right: 16,
        top: 28,
        bottom: 20,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ownerChartLabels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569' }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#475569',
          formatter: (value: number) => formatNumber(value)
        },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [
        {
          name: 'Profit',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 8,
          data: ownerMonthlyData.map((item) => item.total_profit),
          lineStyle: { width: 3, color: '#059669' },
          itemStyle: { color: '#059669' },
          areaStyle: {
            color: 'rgba(5, 150, 105, 0.14)'
          }
        }
      ]
    }
  }, [ownerChartLabels, ownerMonthlyData])

  const ownerSalesBarOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number) => formatRupiah(value)
      },
      grid: {
        left: 16,
        right: 16,
        top: 28,
        bottom: 20,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ownerChartLabels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#475569' }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#475569',
          formatter: (value: number) => formatNumber(value)
        },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [
        {
          name: 'Penjualan',
          type: 'bar',
          barWidth: 28,
          data: ownerMonthlyData.map((item) => item.total_sales),
          itemStyle: {
            color: '#2563eb',
            borderRadius: [8, 8, 0, 0]
          }
        }
      ]
    }
  }, [ownerChartLabels, ownerMonthlyData])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen bg-[#edeff4] text-slate-800">
      <MySidebar role={role} onLogout={handleLogout} userInitial={initial} />

      <section className="flex-1 p-6 lg:p-8">
        <header className="mb-5 flex items-center justify-end gap-3">
          {/* <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <TranslateOutlinedIcon className="text-lg" />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <LightModeOutlinedIcon className="text-lg" />
          </button> */}
          <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500 font-semibold text-white shadow-sm">
            {initial}
          </div>
        </header>

        <div className="mb-6 flex items-center gap-4 rounded-xl bg-[#cdefff] px-5 py-4 text-cyan-700 shadow-sm">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500 text-white">
            <InfoOutlinedIcon className="text-xl" />
          </span>
          <p className="text-xl font-medium">Selamat Datang di Kambing App, {nama}.</p>
        </div>

        {dashboardError ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{dashboardError}</p> : null}

        {role === 'admin' ? (
          <>
            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: 'Total Pesanan Hari Ini',
                  value: dashboardData?.admin?.top_cards?.total_pesanan_hari_ini || 0,
                  color: 'bg-indigo-100 text-indigo-600',
                  icon: <ReceiptLongOutlinedIcon className="text-xl" />
                },
                {
                  title: 'Pesanan Pending (Belum Bayar)',
                  value: dashboardData?.admin?.top_cards?.pesanan_pending || 0,
                  color: 'bg-rose-100 text-rose-600',
                  icon: <HourglassEmptyOutlinedIcon className="text-xl" />
                },
                {
                  title: 'Pesanan Diproses',
                  value: dashboardData?.admin?.top_cards?.pesanan_diproses || 0,
                  color: 'bg-amber-100 text-amber-600',
                  icon: <Inventory2OutlinedIcon className="text-xl" />
                },
                {
                  title: 'Total Kambing Terjual Hari Ini',
                  value: dashboardData?.admin?.top_cards?.total_kambing_terjual_hari_ini || 0,
                  color: 'bg-emerald-100 text-emerald-600',
                  icon: <ShoppingCartCheckoutOutlinedIcon className="text-xl" />
                }
              ].map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}>
                      {item.icon}
                    </span>
                    <p className="text-3xl font-bold text-slate-700">{formatNumber(item.value)}</p>
                  </div>
                  <p className="text-sm text-slate-600">{item.title}</p>
                </article>
              ))}
            </div>

            <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-900">List Pesanan Terbaru</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Pembeli</th>
                      <th className="px-4 py-3 text-left font-semibold">Waktu</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.admin?.pesanan_terbaru || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          {dashboardLoading ? 'Memuat pesanan...' : 'Belum ada data pesanan.'}
                        </td>
                      </tr>
                    ) : (
                      (dashboardData?.admin?.pesanan_terbaru || []).map((order) => (
                        <tr key={order.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">#{order.id}</td>
                          <td className="px-4 py-3">{order.buyer_name}</td>
                          <td className="px-4 py-3">{formatDateTime(order.created_at)}</td>
                          <td className="px-4 py-3 text-right">{formatRupiah(order.total)}</td>
                          <td className="px-4 py-3">{statusBadge(order.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Stok Kambing per Jenis</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(dashboardData?.admin?.stok_per_jenis || []).length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Belum ada data stok.</p>
                  ) : (
                    (dashboardData?.admin?.stok_per_jenis || []).map((stock) => (
                      <div key={stock.jenis} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm text-slate-500">{stock.jenis}</p>
                        <p className="mt-1 text-2xl font-bold text-slate-800">{formatNumber(stock.total_stok)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                <h2 className="mb-1 text-base font-semibold text-amber-800">Warning Stok Menipis</h2>
                <p className="mb-3 text-xs text-amber-700">
                  Produk dengan stok kurang atau sama dengan {dashboardMeta?.low_stock_threshold || 5}
                </p>

                {(dashboardData?.admin?.warning_stok_menipis || []).length === 0 ? (
                  <p className="rounded-lg bg-white px-3 py-2 text-sm text-emerald-700">Semua stok masih aman.</p>
                ) : (
                  <ul className="space-y-2">
                    {(dashboardData?.admin?.warning_stok_menipis || []).map((item) => (
                      <li key={item.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-slate-800">{item.nama}</p>
                        <p className="text-xs text-slate-500">{item.jenis}</p>
                        <p className="text-sm font-semibold text-rose-700">Stok: {formatNumber(item.stok)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          </>
        ) : null}

        {role === 'owner' ? (
          <>
            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: 'Total Revenue',
                  value: formatRupiah(dashboardData?.owner?.ringkasan_keuangan?.total_revenue || 0),
                  color: 'bg-sky-100 text-sky-600',
                  icon: <AccountBalanceWalletOutlinedIcon className="text-xl" />
                },
                {
                  title: 'Total Profit',
                  value: formatRupiah(dashboardData?.owner?.ringkasan_keuangan?.total_profit || 0),
                  color: 'bg-emerald-100 text-emerald-600',
                  icon: <TrendingUpOutlinedIcon className="text-xl" />
                },
                {
                  title: 'Total Transaksi',
                  value: formatNumber(dashboardData?.owner?.ringkasan_keuangan?.total_transaksi || 0),
                  color: 'bg-indigo-100 text-indigo-600',
                  icon: <ReceiptLongOutlinedIcon className="text-xl" />
                },
                {
                  title: 'Rata-rata Transaksi',
                  value: formatRupiah(dashboardData?.owner?.ringkasan_keuangan?.rata_rata_transaksi || 0),
                  color: 'bg-amber-100 text-amber-600',
                  icon: <CalculateOutlinedIcon className="text-xl" />
                }
              ].map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}>
                      {item.icon}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.title}</p>
                </article>
              ))}
            </div>

            <div className="mb-5 grid gap-5 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Profit per Bulan</h2>
                <ReactECharts option={ownerProfitLineOption} style={{ height: 320 }} notMerge lazyUpdate />
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Penjualan per Bulan</h2>
                <ReactECharts option={ownerSalesBarOption} style={{ height: 320 }} notMerge lazyUpdate />
              </article>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-900">Produk Terlaris</h2>
                <p className="text-xs text-slate-500">Kambing paling laku dan kontribusi profit per produk</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Produk</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty Terjual</th>
                      <th className="px-4 py-3 text-right font-semibold">Total Profit</th>
                      <th className="px-4 py-3 text-right font-semibold">Kontribusi Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.owner?.produk_terlaris || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          {dashboardLoading ? 'Memuat data produk...' : 'Belum ada data produk terlaris.'}
                        </td>
                      </tr>
                    ) : (
                      (dashboardData?.owner?.produk_terlaris || []).map((item, index) => (
                        <tr key={item.produk_id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {index === 0 ? 'Paling Laku - ' : ''}
                              {item.nama_produk}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">{formatNumber(item.qty_terjual)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatRupiah(item.total_profit)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(item.kontribusi_profit_persen)}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        {role === 'pembeli' ? (
          <BuyerBerandaContent nama={nama} initial={initial} products={buyerProducts} />
        ) : null}

        {role !== 'admin' && role !== 'owner' && role !== 'pembeli' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-base text-slate-700">Dashboard khusus untuk role {role} sedang disiapkan.</p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
