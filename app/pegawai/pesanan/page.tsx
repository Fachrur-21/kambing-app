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

export default function PegawaiPesananPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Pegawai')
  const [role, setRole] = useState<AppRole>('pegawai')
  const [token, setToken] = useState('')
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [message, setMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [descriptionByOrderId, setDescriptionByOrderId] = useState<Record<number, string>>({})
  const [filesByOrderId, setFilesByOrderId] = useState<Record<number, File[]>>({})

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
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

        await loadOrders(storedToken)
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
      setMessage(result?.message || 'Gagal memuat pesanan siap kirim')
      return
    }

    setOrders(result?.data || [])
    setMessage('')
  }

  async function completeOrder(orderId: number) {
    if (!token) return

    const description = String(descriptionByOrderId[orderId] || '').trim()
    const images = filesByOrderId[orderId] || []

    if (images.length === 0) {
      setMessage('Bukti gambar wajib diupload sebelum menyelesaikan pesanan')
      return
    }

    if (!description) {
      setMessage('Deskripsi bukti pengiriman wajib diisi')
      return
    }

    setBusyId(orderId)
    setMessage('')
    setSuccessMessage('')

    try {
      const formData = new FormData()
      images.forEach((image) => {
        formData.append('images', image)
      })
      formData.append('description', description)

      const response = await fetch(`/api/pesanan/${orderId}/selesai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result?.message || 'Gagal menyelesaikan pesanan')
        return
      }

      setSuccessMessage(`Order #${orderId} berhasil diselesaikan`)
      setDescriptionByOrderId((current) => ({ ...current, [orderId]: '' }))
      setFilesByOrderId((current) => ({ ...current, [orderId]: [] }))
      await loadOrders(token)
    } catch {
      setMessage('Terjadi error saat menyelesaikan pesanan')
    } finally {
      setBusyId(null)
    }
  }

  const initial = useMemo(() => (nama || 'P').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat pesanan siap dikirim...</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Update Status Pesanan</h1>
          <p className="mt-1 text-sm text-slate-500">Akhiri proses pesanan dengan upload gambar bukti dan deskripsi.</p>
        </div>

        {message ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
        {successMessage ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}

        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              Belum ada pesanan berstatus dikirim.
            </div>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">Order #{order.id} • {formatDateTime(order.createdAt)}</p>
                    <p className="text-lg font-bold text-slate-900">{order.buyerName}</p>
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Dikirim</span>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <p><span className="font-semibold">Total:</span> {formatRupiah(order.total)}</p>
                  <p><span className="font-semibold">Penerima:</span> {order.shippingName || '-'}</p>
                  <p><span className="font-semibold">No Telepon:</span> {order.shippingPhone || '-'}</p>
                  <p><span className="font-semibold">Alamat:</span> {order.shippingAddress || '-'}</p>
                  <p className="lg:col-span-3"><span className="font-semibold">Deskripsi Pengantaran:</span> {order.shippingNote || '-'}</p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
                    {order.items.map((item) => (
                      <article key={item.id} className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-200">
                          {item.kambing.imageUrl ? (
                            <Image
                              src={item.kambing.imageUrl}
                              alt={item.kambing.nama}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.kambing.nama}</p>
                          <p className="text-[11px] text-slate-500">{item.kambing.jenis}</p>
                          <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                            <p><span className="font-semibold">Berat:</span> {Number(item.kambing.berat || 0)} kg</p>
                            <p><span className="font-semibold">Harga:</span> {formatRupiah(item.harga)}</p>
                            <p><span className="font-semibold">Qty:</span> x{item.qty}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <label className="block text-sm font-medium text-slate-700">Upload Bukti Gambar</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files || [])
                      setFilesByOrderId((current) => ({ ...current, [order.id]: files }))
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />

                  {filesByOrderId[order.id]?.length ? (
                    <p className="text-xs text-slate-500">{filesByOrderId[order.id].length} foto dipilih</p>
                  ) : null}

                  <label className="block text-sm font-medium text-slate-700">Deskripsi Bukti</label>
                  <textarea
                    rows={3}
                    value={descriptionByOrderId[order.id] || ''}
                    onChange={(event) =>
                      setDescriptionByOrderId((current) => ({
                        ...current,
                        [order.id]: event.target.value
                      }))
                    }
                    placeholder="Contoh: Hewan sudah diterima pembeli dalam kondisi sehat"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />

                  <button
                    type="button"
                    onClick={() => completeOrder(order.id)}
                    disabled={busyId === order.id}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busyId === order.id ? 'Memproses...' : 'Selesaikan Pesanan'}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
