'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
    no_tlpn?: string | null
    alamat?: string | null
  }
}

type KambingItem = {
  id: number
  nama: string
  jenis: string
  berat: number
  harga: number
  stok: number
  deskripsi: string | null
  imageUrl: string | null
  imageUrls?: string[]
  status: 'ready' | 'sold_out'
}

type ProductResponse = {
  data?: KambingItem[]
  message?: string
}

type CartItem = {
  id: number
  kambingId: number
  qty: number
  harga: number
  subtotal: number
  kambing: {
    nama: string
    jenis: string
    imageUrl: string | null
  }
}

type CartSummary = {
  totalItem: number
  totalQty: number
  totalHarga: number
}

type CartResponse = {
  summary?: CartSummary
  data?: CartItem[]
  message?: string
}

type CheckoutResponse = {
  message?: string
  data?: {
    orderId?: number
    paymentId?: number
    externalId?: string
    invoiceId?: string
    redirectUrl?: string
    invoiceStatus?: string
    totalHarga?: number
    itemCount?: number
  }
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function normalizeImageUrls(value: unknown, fallback?: string | null): string[] {
  const fromArray = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter((item) => item.length > 0)
    : []

  if (fromArray.length > 0) {
    return fromArray
  }

  const fallbackValue = String(fallback || '').trim()
  return fallbackValue ? [fallbackValue] : []
}

function getTwoSentencePreview(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) {
    return 'Kambing berkualitas siap untuk kebutuhan kurban dan peternakan. Siap dipilih sesuai kebutuhan Anda.'
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)

  const preview = sentences.slice(0, 2).join(' ')
  return preview || text
}

function getAvailabilityStatus(stok: number) {
  return Number(stok || 0) > 0 ? 'ready' : 'sold_out'
}

export default function ProdukPembeliPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Pembeli')
  const [role, setRole] = useState<AppRole>('pembeli')
  const [products, setProducts] = useState<KambingItem[]>([])
  const [productsMessage, setProductsMessage] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartSummary, setCartSummary] = useState<CartSummary>({ totalItem: 0, totalQty: 0, totalHarga: 0 })
  const [cartOpen, setCartOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionMessageType, setActionMessageType] = useState<'success' | 'error'>('success')
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [busyCartItemId, setBusyCartItemId] = useState<number | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [shippingName, setShippingName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [shippingNote, setShippingNote] = useState('')
  const [shippingSectionOpen, setShippingSectionOpen] = useState(false)
  const [galleryProduct, setGalleryProduct] = useState<KambingItem | null>(null)
  const [activeImageByProductId, setActiveImageByProductId] = useState<Record<number, number>>({})

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    const accessToken = token

    async function loadInitialData() {
      try {
        const meResponse = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const meResult: MeResponse = await meResponse.json()
        const role = String(meResult?.data?.role || '').toLowerCase()

        if (!meResponse.ok || role !== 'pembeli') {
          router.push('/dashboard')
          return
        }

        setNama(meResult?.data?.nama || 'Pembeli')
        setRole('pembeli')
        await Promise.all([loadProducts(accessToken), loadCart(accessToken)])
      } catch {
        setProductsMessage('Gagal memuat katalog produk')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [router])

  useEffect(() => {
    if (searchParams.get('cart') === '1') {
      const openCartId = window.setTimeout(() => setCartOpen(true), 0)
      return () => window.clearTimeout(openCartId)
    }
  }, [searchParams])

  useEffect(() => {
    const checkoutState = String(searchParams.get('checkout') || '').toLowerCase()
    const orderIdRaw = searchParams.get('orderId')

    if (checkoutState !== 'success' || !orderIdRaw) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      return
    }

    const orderId = Number.parseInt(String(orderIdRaw), 10)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return
    }

    let cancelled = false

    async function confirmCheckoutPayment() {
      try {
        const response = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ orderId })
        })

        const result = await response.json().catch(() => ({}))
        if (cancelled) {
          return
        }

        if (response.ok) {
          setActionMessageType('success')
          setActionMessage('Checkout berhasil. Status pesanan sudah diperbarui.')
          return
        }

        setActionMessageType('error')
        setActionMessage(result?.message || 'Pembayaran belum terkonfirmasi. Coba refresh beberapa saat lagi.')
      } catch {
        if (cancelled) {
          return
        }
        setActionMessageType('error')
        setActionMessage('Gagal sinkronisasi status pembayaran checkout')
      }
    }

    confirmCheckoutPayment()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  async function loadProducts(token: string) {
    const response = await fetch('/api/pembeli/kambing?perPage=24', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const result: ProductResponse = await response.json()

    if (!response.ok) {
      setProductsMessage(result?.message || 'Gagal memuat katalog')
      setProducts([])
      return
    }

    setProducts(result?.data || [])
    setProductsMessage('')
  }

  async function loadCart(token: string) {
    const response = await fetch('/api/keranjang', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const result: CartResponse = await response.json()

    if (!response.ok) {
      setActionMessageType('error')
      setActionMessage(result?.message || 'Gagal memuat keranjang')
      return
    }

    setCartItems(result?.data || [])
    setCartSummary(result?.summary || { totalItem: 0, totalQty: 0, totalHarga: 0 })
  }

  async function addToCart(kambingId: number) {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    setBusyProductId(kambingId)
    setActionMessage('')

    try {
      const response = await fetch('/api/keranjang', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kambingId, qty: 1 })
      })

      const result: CartResponse = await response.json()

      if (!response.ok) {
        setActionMessageType('error')
        setActionMessage(result?.message || 'Gagal menambahkan ke keranjang')
        return
      }

      setCartItems(result?.data || [])
      setCartSummary(result?.summary || { totalItem: 0, totalQty: 0, totalHarga: 0 })
      setActionMessageType('success')
      setActionMessage('Produk berhasil ditambahkan ke keranjang')
    } catch {
      setActionMessageType('error')
      setActionMessage('Terjadi error saat menambahkan ke keranjang')
    } finally {
      setBusyProductId(null)
    }
  }

  async function updateCartQty(item: CartItem, nextQty: number) {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    if (nextQty <= 0) {
      await removeCartItem(item.id)
      return
    }

    setBusyCartItemId(item.id)
    setActionMessage('')

    try {
      const response = await fetch(`/api/keranjang/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ qty: nextQty })
      })

      const result = await response.json()

      if (!response.ok) {
        setActionMessageType('error')
        setActionMessage(result?.message || 'Gagal update qty')
        return
      }

      await loadCart(token)
    } catch {
      setActionMessageType('error')
      setActionMessage('Terjadi error saat update keranjang')
    } finally {
      setBusyCartItemId(null)
    }
  }

  async function removeCartItem(cartItemId: number) {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    setBusyCartItemId(cartItemId)
    setActionMessage('')

    try {
      const response = await fetch(`/api/keranjang/${cartItemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        setActionMessageType('error')
        setActionMessage(result?.message || 'Gagal menghapus item')
        return
      }

      await loadCart(token)
    } catch {
      setActionMessageType('error')
      setActionMessage('Terjadi error saat menghapus item keranjang')
    } finally {
      setBusyCartItemId(null)
    }
  }

  async function handleCheckout() {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    if (cartItems.length === 0) {
      setActionMessageType('error')
      setActionMessage('Keranjang masih kosong')
      return
    }

    if (!String(shippingName).trim() || !String(shippingAddress).trim() || !String(shippingPhone).trim()) {
      const message = 'Silakan isi data pengantaran terlebih dahulu'
      setActionMessageType('error')
      setActionMessage(message)
      setShippingSectionOpen(true)
      window.alert(message)
      return
    }

    setCheckoutLoading(true)
    setActionMessage('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shippingName,
          shippingAddress,
          shippingPhone,
          shippingNote
        })
      })

      const result: CheckoutResponse = await response.json()

      if (!response.ok) {
        setActionMessageType('error')
        setActionMessage(result?.message || 'Gagal memulai checkout')
        return
      }

      const checkoutData = result?.data
      if (!checkoutData?.redirectUrl) {
        setActionMessageType('error')
        setActionMessage('Checkout berhasil dibuat, tetapi link pembayaran tidak tersedia')
        return
      }

      setCartItems([])
      setCartSummary({ totalItem: 0, totalQty: 0, totalHarga: 0 })
      setCartOpen(false)
      setShippingSectionOpen(false)

      if (checkoutData?.redirectUrl) {
        window.location.href = checkoutData.redirectUrl
        return
      }
    } catch {
      setActionMessageType('error')
      setActionMessage('Terjadi error saat checkout')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const computedTotal = useMemo(
    () => cartItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0),
    [cartItems]
  )
  const galleryImages = useMemo(
    () => normalizeImageUrls(galleryProduct?.imageUrls, galleryProduct?.imageUrl),
    [galleryProduct]
  )
  const galleryActiveImageIndex = galleryProduct ? (activeImageByProductId[galleryProduct.id] ?? 0) : 0
  const initial = useMemo(() => (nama || 'P').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f2f2f2]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat katalog kambing...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen bg-[#f1f1f1] text-slate-900">
      <MySidebar role={role} onLogout={handleLogout} userInitial={initial} />

      <section className="w-full flex-1 px-4 pb-8 pt-3 lg:px-6">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#ececec] px-4 py-3">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Katalog Hewan </h1>
            <p className="text-sm text-slate-500">Pilih hewan berkualitas untuk kebutuhan Anda</p>
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <ShoppingCartOutlinedIcon className="text-[18px]" />
            Keranjang
            {cartSummary.totalItem > 0 ? (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">{cartSummary.totalItem}</span>
            ) : null}
          </button>
        </header>

        {productsMessage ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{productsMessage}</p>
        ) : null}

        {actionMessage ? (
          <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${actionMessageType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {actionMessage}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((item) => {
            const imageUrls = normalizeImageUrls(item.imageUrls, item.imageUrl)
            const activeImageIndex = activeImageByProductId[item.id] ?? 0
            const previewImage = imageUrls[activeImageIndex] || imageUrls[0] || null
            const hasMultipleImages = imageUrls.length > 1
            const availabilityStatus = getAvailabilityStatus(item.stok)
            const goToImage = (direction: -1 | 1) => {
              if (imageUrls.length === 0) {
                return
              }

              const nextIndex = (activeImageIndex + direction + imageUrls.length) % imageUrls.length
              setActiveImageByProductId((current) => ({
                ...current,
                [item.id]: nextIndex
              }))
            }

            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
                {previewImage ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setGalleryProduct(item)}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left"
                      aria-label={`Buka galeri foto ${item.nama}`}
                    >
                      <Image src={previewImage} alt={item.nama} fill className="object-cover" sizes="(min-width: 1280px) 33vw, 100vw" />
                    </button>

                    {hasMultipleImages ? (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            goToImage(-1)
                          }}
                          className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-900"
                          aria-label={`Foto sebelumnya ${item.nama}`}
                        >
                          <span className="text-lg leading-none">‹</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            goToImage(1)
                          }}
                          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-900"
                          aria-label={`Foto berikutnya ${item.nama}`}
                        >
                          <span className="text-lg leading-none">›</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center bg-slate-100 text-sm text-slate-500">Tidak ada gambar</div>
                )}

                <div className="space-y-2 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">{item.nama}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${availabilityStatus === 'ready' ? 'bg-[#000128]' : 'bg-rose-500'}`}>
                      {availabilityStatus === 'ready' ? 'Ready' : 'Sold Out'}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-[52px]">Jenis:</p>
                      <p className="text-right font-medium text-slate-900">{item.jenis}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-[52px]">Berat:</p>
                      <p className="text-right font-medium text-slate-900">{item.berat} Kg</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-[52px]">Stok:</p>
                      <p className="text-right font-medium text-slate-900">{item.stok} ekor</p>
                    </div>
                  </div>

                  <p className="min-h-[42px] text-sm leading-6 text-slate-600">
                    {getTwoSentencePreview(item.deskripsi)}
                  </p>

                  <button
                    type="button"
                    onClick={() => setGalleryProduct(item)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#000128] transition hover:translate-x-0.5 hover:text-[#0b0b3d]"
                  >
                    Selengkapnya →
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Harga</p>
                      <p className="text-2xl font-black text-[#00a53f]">{formatRupiah(item.harga).replace('IDR', 'Rp')}</p>
                    </div>

                    <div className="mx-auto flex w-full max-w-[340px] gap-2 sm:w-auto sm:max-w-none sm:justify-center">
                      <button
                        type="button"
                        onClick={() => setGalleryProduct(item)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 sm:flex-initial sm:min-w-[112px]"
                      >
                        <VisibilityOutlinedIcon className="text-[18px]" />
                        Detail
                      </button>

                      <button
                        type="button"
                        disabled={busyProductId === item.id || availabilityStatus === 'sold_out'}
                        onClick={() => addToCart(item.id)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#000128] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b0b3d] disabled:cursor-not-allowed disabled:opacity-70 sm:flex-initial sm:min-w-[124px]"
                      >
                        <ShoppingCartOutlinedIcon className="text-[18px]" />
                        {busyProductId === item.id ? 'Memproses...' : availabilityStatus === 'sold_out' ? 'Habis' : 'Tambah'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {cartOpen ? (
        <>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-30 bg-black/45"
            aria-label="Tutup keranjang"
          />

          <aside className="fixed inset-0 z-40 flex h-[100dvh] w-full flex-col border-slate-200 bg-white shadow-2xl sm:left-auto sm:w-[440px] sm:border-l">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
              <h2 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
                <ShoppingCartOutlinedIcon className="text-[22px]" />
                Keranjang Belanja
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold">{cartSummary.totalItem}</span>
              </h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                aria-label="Tutup panel keranjang"
              >
                <CloseOutlinedIcon className="text-[18px]" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {cartItems.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                  Keranjang masih kosong
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex gap-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
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
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="truncate text-lg font-bold text-slate-900">{item.kambing.nama}</p>
                              <p className="text-sm text-slate-500">{item.kambing.jenis}</p>
                              <p className="mt-1 text-lg font-bold text-[#00a53f]">{formatRupiah(item.harga).replace('IDR', 'Rp')}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCartItem(item.id)}
                              disabled={busyCartItemId === item.id}
                              className="rounded-md p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-70"
                              aria-label="Hapus item"
                            >
                              <DeleteOutlineOutlinedIcon className="text-[18px]" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item, item.qty - 1)}
                            disabled={busyCartItemId === item.id}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item, item.qty + 1)}
                            disabled={busyCartItemId === item.id}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
                          >
                            +
                          </button>
                        </div>

                        <p className="text-lg font-semibold text-slate-800">{formatRupiah(item.subtotal).replace('IDR', 'Rp')}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={() => setShippingSectionOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100"
                aria-expanded={shippingSectionOpen}
                aria-controls="shipping-section"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Data Pengantaran</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {shippingSectionOpen ? 'Sembunyikan form agar produk lebih terlihat' : 'Buka untuk isi data pengantaran'}
                  </p>
                </div>
                <span className={`text-xl leading-none transition-transform ${shippingSectionOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>

              {shippingSectionOpen ? (
                <div id="shipping-section" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="max-h-[30dvh] space-y-3 overflow-y-auto pr-1 sm:max-h-[36dvh]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nama Penerima</label>
                    <input
                      type="text"
                      value={shippingName}
                      onChange={(event) => setShippingName(event.target.value)}
                      placeholder="Nama lengkap penerima"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">No Telepon</label>
                    <input
                      type="tel"
                      value={shippingPhone}
                      onChange={(event) => setShippingPhone(event.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Alamat Pengantaran</label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(event) => setShippingAddress(event.target.value)}
                      placeholder="Alamat lengkap pengantaran"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Deskripsi (Opsional)</label>
                    <textarea
                      rows={2}
                      value={shippingNote}
                      onChange={(event) => setShippingNote(event.target.value)}
                      placeholder="Catatan tambahan untuk pengiriman"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-bold text-slate-700 sm:text-xl">Total:</p>
                <p className="text-xl font-black text-[#00a53f] sm:text-2xl">{formatRupiah(cartSummary.totalHarga || computedTotal).replace('IDR', 'Rp')}</p>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || cartItems.length === 0}
                className="mt-3 w-full rounded-xl bg-[#000128] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0b0b3d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {checkoutLoading ? 'Memproses...' : 'Checkout'}
              </button>
            </footer>
          </aside>
        </>
      ) : null}

      {galleryProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Tutup detail produk"
            onClick={() => setGalleryProduct(null)}
          />

          <section className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Detail Produk</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-2xl font-black text-slate-900 sm:text-3xl">{galleryProduct.nama}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getAvailabilityStatus(galleryProduct.stok) === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {getAvailabilityStatus(galleryProduct.stok) === 'ready' ? 'Ready' : 'Sold Out'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGalleryProduct(null)}
                className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Tutup detail produk"
              >
                <CloseOutlinedIcon className="text-[18px]" />
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr]">
                <div className="space-y-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
                    {galleryImages.length > 0 ? (
                      <>
                        <Image
                          src={galleryImages[galleryActiveImageIndex] || galleryImages[0]}
                          alt={galleryProduct.nama}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 52vw, 100vw"
                        />

                        {galleryImages.length > 1 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const nextIndex = (galleryActiveImageIndex - 1 + galleryImages.length) % galleryImages.length
                                setActiveImageByProductId((current) => ({
                                  ...current,
                                  [galleryProduct.id]: nextIndex
                                }))
                              }}
                              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-white hover:text-slate-900"
                              aria-label="Foto sebelumnya"
                            >
                              <span className="text-2xl leading-none">‹</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nextIndex = (galleryActiveImageIndex + 1) % galleryImages.length
                                setActiveImageByProductId((current) => ({
                                  ...current,
                                  [galleryProduct.id]: nextIndex
                                }))
                              }}
                              className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-white hover:text-slate-900"
                              aria-label="Foto berikutnya"
                            >
                              <span className="text-2xl leading-none">›</span>
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <div className="grid h-full min-h-[280px] place-items-center text-sm text-slate-500">Tidak ada foto yang tersedia</div>
                    )}
                  </div>

                  {galleryImages.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {galleryImages.map((imageUrl, index) => (
                        <button
                          key={`${imageUrl}-${index}`}
                          type="button"
                          onClick={() => setActiveImageByProductId((current) => ({
                            ...current,
                            [galleryProduct.id]: index
                          }))}
                          className={`relative h-20 w-24 flex-none overflow-hidden rounded-xl border transition ${galleryActiveImageIndex === index ? 'border-[#000128] ring-2 ring-[#000128]/20' : 'border-slate-200'}`}
                          aria-label={`Pilih foto ${index + 1}`}
                        >
                          <Image src={imageUrl} alt={`${galleryProduct.nama} foto ${index + 1}`} fill className="object-cover" sizes="96px" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Jenis</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{galleryProduct.jenis}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Berat</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{galleryProduct.berat} Kg</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stok</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{galleryProduct.stok} ekor</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                      <p className={`mt-1 text-lg font-bold ${getAvailabilityStatus(galleryProduct.stok) === 'ready' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {getAvailabilityStatus(galleryProduct.stok) === 'ready' ? 'Ready' : 'Sold Out'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Harga</p>
                    <p className="mt-1 text-3xl font-black text-[#00a53f]">{formatRupiah(galleryProduct.harga).replace('IDR', 'Rp')}</p>
                  </div>

                  <button
                    type="button"
                    disabled={busyProductId === galleryProduct.id}
                    onClick={() => addToCart(galleryProduct.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#000128] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b0b3d] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <ShoppingCartOutlinedIcon className="text-[18px]" />
                    {busyProductId === galleryProduct.id ? 'Memproses...' : 'Tambah ke Keranjang'}
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ringkasan</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {galleryProduct.deskripsi || 'Kambing berkualitas siap untuk kebutuhan kurban dan peternakan.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Deskripsi Lengkap</p>
                <p className="mt-3 max-w-4xl text-base leading-8 text-slate-700">
                  {galleryProduct.deskripsi || 'Kambing berkualitas siap untuk kebutuhan kurban dan peternakan.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
