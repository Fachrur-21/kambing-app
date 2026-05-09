'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

export default function PegawaiUpdateStatusPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Pegawai')
  const [role, setRole] = useState<AppRole>('pegawai')
  const [token, setToken] = useState('')
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [message, setMessage] = useState('')
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageTitle, setPreviewImageTitle] = useState('')

  async function loadHistory(currentToken: string) {
    const response = await fetch('/api/pesanan?status=selesai', {
      headers: { Authorization: `Bearer ${currentToken}` }
    })
    const result: OrderResponse = await response.json()

    if (!response.ok) {
      setOrders([])
      setMessage(result?.message || 'Gagal memuat riwayat pesanan')
      return
    }

    setOrders(result?.data || [])
    setMessage('')
  }

  useEffect(() => {
    const storedToken = String(localStorage.getItem('access_token') || '')
    if (!storedToken) {
      router.push('/login')
      return
    }

    async function verifyAndLoad() {
      try {
        const meResponse = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
        const meResult: MeResponse = await meResponse.json()
        const userRole = String(meResult?.data?.role || '').toLowerCase()

        if (!meResponse.ok || userRole !== 'pegawai') {
          router.push('/dashboard')
          return
        }

        setToken(storedToken)
        setRole('pegawai')
        setNama(meResult?.data?.nama || 'Pegawai')

        await loadHistory(storedToken)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyAndLoad()
  }, [router])

  const initial = useMemo(() => (nama || 'P').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/')
  }

  function openPreview(imageUrl: string, title: string) {
    setPreviewImageUrl(imageUrl)
    setPreviewImageTitle(title)
  }

  function closePreview() {
    setPreviewImageUrl('')
    setPreviewImageTitle('')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat riwayat pesanan...</p>
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
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Pesanan</h1>
          <p className="mt-1 text-sm text-slate-500">Daftar pesanan yang sudah selesai diproses dan ditutup.</p>
        </div>

        {message ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              Belum ada riwayat pesanan selesai.
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">Order #{order.id} • {formatDateTime(order.createdAt)}</p>
                    <p className="text-lg font-bold text-slate-900">{order.buyerName}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Selesai</span>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <p><span className="font-semibold">Total:</span> {formatRupiah(order.total)}</p>
                  <p><span className="font-semibold">Penerima:</span> {order.shippingName || '-'}</p>
                  <p><span className="font-semibold">No Telepon:</span> {order.shippingPhone || '-'}</p>
                  <p><span className="font-semibold">Alamat:</span> {order.shippingAddress || '-'}</p>
                  <p className="lg:col-span-3"><span className="font-semibold">Deskripsi Pengantaran:</span> {order.shippingNote || '-'}</p>
                  <p><span className="font-semibold">Selesai Pada:</span> {formatDateTime(order.completedAt)}</p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <article key={item.id} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                            {item.kambing.imageUrl ? (
                              <Image
                                src={item.kambing.imageUrl}
                                alt={item.kambing.nama}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">{item.kambing.nama}</p>
                            <p className="text-xs text-slate-500">{item.kambing.jenis}</p>
                            <div className="mt-2 space-y-1 text-xs text-slate-600">
                              <p><span className="font-semibold">Berat:</span> {Number(item.kambing.berat || 0)} kg</p>
                              <p><span className="font-semibold">Harga:</span> {formatRupiah(item.harga)}</p>
                              <p><span className="font-semibold">Qty:</span> x{item.qty}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    {order.completionDescription ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-800">Bukti Selesai</p>
                        <p className="mt-1 text-xs text-emerald-700">{order.completionDescription}</p>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                          {(order.completionImageUrls && order.completionImageUrls.length > 0
                            ? order.completionImageUrls
                            : order.completionImageUrl
                              ? [order.completionImageUrl]
                              : []
                          ).map((imageUrl, index) => (
                            <button
                              key={`${order.id}-${index}`}
                              type="button"
                              onClick={() => openPreview(imageUrl, `Bukti pesanan ${order.id}`)}
                              className="relative aspect-square overflow-hidden rounded-lg border border-emerald-200 bg-white"
                              aria-label={`Lihat bukti pesanan ${order.id} foto ${index + 1}`}
                            >
                              <Image src={imageUrl} alt={`Bukti pesanan ${order.id} ${index + 1}`} fill className="object-cover" sizes="160px" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
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
