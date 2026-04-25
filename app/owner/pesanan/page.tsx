'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
}

type OrderItem = {
  id: number
  qty: number
  harga: number
  subtotal: number
  kambing: {
    nama: string
    jenis: string
    berat: number
    imageUrl: string | null
  }
}

type OrderRecord = {
  id: number
  buyerName: string
  total: number
  status: string
  shippingName: string | null
  shippingPhone: string | null
  shippingAddress: string | null
  shippingNote: string | null
  createdAt: string
  completedAt: string | null
  completionImageUrl: string | null
  completionImageUrls?: string[]
  completionDescription: string | null
  items: OrderItem[]
}

type OrderResponse = {
  data?: OrderRecord[]
  message?: string
}

type OrderFilter = 'all' | 'diproses' | 'dikirim' | 'selesai'

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID')
}

function statusBadge(status: string) {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'diproses') {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Diproses</span>
  }

  if (normalized === 'dikirim') {
    return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">Dikirim</span>
  }

  if (normalized === 'selesai') {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Selesai</span>
  }

  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{status || 'Unknown'}</span>
}

export default function OwnerPesananPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Owner')
  const [role, setRole] = useState<AppRole>('owner')
  const [token, setToken] = useState('')
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageTitle, setPreviewImageTitle] = useState('')

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
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        const meResult: MeResponse = await meResponse.json()
        const userRole = String(meResult?.data?.role || '').toLowerCase()

        if (!meResponse.ok || userRole !== 'owner') {
          router.push('/dashboard')
          return
        }

        setToken(tokenValue)
        setRole('owner')
        setNama(meResult?.data?.nama || 'Owner')

        await loadOrders(tokenValue)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyAndLoad()
  }, [router])

  async function loadOrders(currentToken: string) {
    const response = await fetch('/api/pesanan', {
      headers: { Authorization: `Bearer ${currentToken}` }
    })

    const result: OrderResponse = await response.json()
    if (!response.ok) {
      setOrders([])
      setMessage(result?.message || 'Gagal memuat daftar pesanan')
      return
    }

    setOrders(result?.data || [])
    setMessage('')
  }

  function normalizedStatus(status: string) {
    return String(status || '').toLowerCase()
  }

  async function markAsStatus(orderId: number, nextStatus: 'dikirim' | 'selesai') {
    if (!token) return

    setBusyId(orderId)
    setMessage('')

    try {
      const response = await fetch(`/api/pesanan/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result?.message || 'Gagal update status pesanan')
        return
      }

      await loadOrders(token)
    } catch {
      setMessage('Terjadi error saat update status pesanan')
    } finally {
      setBusyId(null)
    }
  }

  async function markAsDikirim(orderId: number) {
    await markAsStatus(orderId, 'dikirim')
  }

  async function markAsSelesai(orderId: number) {
    await markAsStatus(orderId, 'selesai')
  }

  const initial = useMemo(() => (nama || 'O').trim().charAt(0).toUpperCase(), [nama])
  const statusCount = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        const key = normalizedStatus(order.status)
        if (key === 'diproses') acc.diproses += 1
        if (key === 'dikirim') acc.dikirim += 1
        if (key === 'selesai') acc.selesai += 1
        return acc
      },
      { diproses: 0, dikirim: 0, selesai: 0 }
    )
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter((order) => normalizedStatus(order.status) === filter)
  }, [filter, orders])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  function openPreview(imageUrl: string, title: string) {
    setPreviewImageUrl(imageUrl)
    setPreviewImageTitle(title)
  }

  function closePreview() {
    setPreviewImageUrl('')
    setPreviewImageTitle('')
  }

  function renderOrderCard(order: OrderRecord) {
    const status = normalizedStatus(order.status)
    const isDiproses = status === 'diproses'
    const isDikirim = status === 'dikirim'
    const isSelesai = status === 'selesai'

    return (
      <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-6">
          <div>
            <p className="text-4xl font-black text-slate-900">Order #{order.id}</p>
            <p className="text-sm text-slate-600">{formatDateTime(order.createdAt)}</p>
          </div>
          <div>
            {isDiproses ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xl font-semibold text-amber-700">
                <AccessTimeOutlinedIcon className="text-[18px]" />
                Diproses
              </span>
            ) : null}
            {isDikirim ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-xl font-semibold text-sky-700">
                <LocalShippingOutlinedIcon className="text-[18px]" />
                Dikirim
              </span>
            ) : null}
            {isSelesai ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xl font-semibold text-emerald-700">
                <CheckCircleOutlineOutlinedIcon className="text-[18px]" />
                Selesai
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <PersonOutlineOutlinedIcon className="text-[20px]" />
              </span>
              <div>
                <p className="text-sm text-slate-500">Pembeli</p>
                <p className="text-2xl font-bold text-slate-900">{order.buyerName}</p>
                <p className="text-lg text-slate-600">Penerima: {order.shippingName || '-'}</p>
              </div>
            </article>

            <article className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                <LocalPhoneOutlinedIcon className="text-[20px]" />
              </span>
              <div>
                <p className="text-sm text-slate-500">No Telepon</p>
                <p className="text-2xl font-bold text-slate-900">{order.shippingPhone || '-'}</p>
              </div>
            </article>

            <article className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
                <LocationOnOutlinedIcon className="text-[20px]" />
              </span>
              <div>
                <p className="text-sm text-slate-500">Alamat</p>
                <p className="text-2xl font-bold text-slate-900">{order.shippingAddress || '-'}</p>
                <p className="text-lg text-slate-600">Catatan: {order.shippingNote || '-'}</p>
              </div>
            </article>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <article key={item.id} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <button
                    type="button"
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-200"
                    onClick={() => item.kambing.imageUrl && openPreview(item.kambing.imageUrl, item.kambing.nama)}
                    aria-label={`Lihat foto ${item.kambing.nama}`}
                  >
                    {item.kambing.imageUrl ? (
                      <Image src={item.kambing.imageUrl} alt={item.kambing.nama} fill className="object-cover" sizes="96px" />
                    ) : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-2xl font-black text-slate-900">{item.kambing.nama}</p>
                    <p className="text-lg text-slate-600">{item.kambing.jenis}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xl text-slate-700">
                      <p>Berat: <span className="font-semibold">{Number(item.kambing.berat || 0)} kg</span></p>
                      <p>Qty: <span className="font-semibold">x{item.qty}</span></p>
                      <p className="font-black text-emerald-700">{formatRupiah(item.harga)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {isSelesai ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Bukti Pengiriman</p>
                  <p className="text-xs text-emerald-700">{order.completionDescription || '-'}</p>
                </div>
                <p className="text-xs text-emerald-700">{formatDateTime(order.completedAt)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(order.completionImageUrls && order.completionImageUrls.length > 0
                  ? order.completionImageUrls
                  : order.completionImageUrl
                    ? [order.completionImageUrl]
                    : []
                ).map((imageUrl, index) => (
                  <button
                    key={`${order.id}-${index}`}
                    type="button"
                    className="relative h-20 w-20 overflow-hidden rounded-md border border-emerald-200 bg-white"
                    aria-label={`Lihat bukti selesai order ${order.id} foto ${index + 1}`}
                    onClick={() => openPreview(imageUrl, `Bukti selesai order ${order.id}`)}
                  >
                    <Image src={imageUrl} alt={`Bukti selesai order ${order.id} ${index + 1}`} fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-4">
            <div>
              <p className="text-sm text-slate-500">Total Pembayaran</p>
              <p className="text-4xl font-black text-emerald-700">{formatRupiah(order.total)}</p>
            </div>

            {isDiproses ? (
              <button
                type="button"
                onClick={() => markAsDikirim(order.id)}
                disabled={busyId === order.id}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xl font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LocalShippingOutlinedIcon className="text-[18px]" />
                {busyId === order.id ? 'Memproses...' : 'Tandai Dikirim'}
              </button>
            ) : null}

            {isDikirim ? (
              <button
                type="button"
                onClick={() => markAsSelesai(order.id)}
                disabled={busyId === order.id}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xl font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <CheckCircleOutlineOutlinedIcon className="text-[18px]" />
                {busyId === order.id ? 'Memproses...' : 'Tandai Selesai'}
              </button>
            ) : null}

            {isSelesai ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-5 py-3 text-xl font-semibold text-emerald-700">
                <CheckCircleOutlineOutlinedIcon className="text-[18px]" />
                Pesanan Selesai
              </span>
            ) : null}
          </div>
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat daftar pesanan...</p>
        </div>
      </main>
    )
  }

  if (!token) {
    return null
  }

  return (
    <main className="flex min-h-screen bg-[#edeff4] text-slate-800">
      <MySidebar role={role} onLogout={handleLogout} userInitial={initial} />

      <section className="flex-1 p-4 lg:p-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Daftar Pesanan</h1>
          <p className="mt-2 text-lg text-slate-600">Kelola dan pantau semua pesanan kambing</p>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'Semua', value: 'all', count: orders.length },
              { label: 'Diproses', value: 'diproses', count: statusCount.diproses },
              { label: 'Dikirim', value: 'dikirim', count: statusCount.dikirim },
              { label: 'Selesai', value: 'selesai', count: statusCount.selesai }
            ].map((item) => {
              const active = filter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value as OrderFilter)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xl font-semibold transition ${
                    active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-sm ${active ? 'text-white/90' : 'text-slate-500'}`}>{item.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {message ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

        <div className="space-y-3">
          {visibleOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              Tidak ada pesanan pada filter ini.
            </div>
          ) : (
            visibleOrders.map((order) => renderOrderCard(order))
          )}
        </div>

        {previewImageUrl ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
            <button
              type="button"
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              aria-label="Tutup preview bukti"
              onClick={closePreview}
            />

            <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{previewImageTitle}</p>
                  <p className="text-xs text-slate-500">Klik area gelap untuk menutup</p>
                </div>
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Tutup
                </button>
              </header>

              <div className="bg-slate-950 p-3 sm:p-4">
                <div className="relative aspect-square max-h-[58vh] w-full overflow-hidden rounded-xl bg-black">
                  <Image src={previewImageUrl} alt={previewImageTitle} fill className="object-contain" sizes="(min-width: 1024px) 50vw, 100vw" />
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}
