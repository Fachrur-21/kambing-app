'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
}

type KambingDetail = {
  id: number
  nama: string
  jenis: string
  berat: number
  harga: number
  hargaModal: number
  stok: number
  deskripsi: string | null
  imageUrl: string | null
  imageUrls?: string[]
  status: 'ready' | 'sold_out'
  createdAt: string
  updatedAt: string
}

type DetailResponse = {
  data?: KambingDetail
  message?: string
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function renderStatus(status: string | undefined) {
  return String(status || '').toLowerCase() === 'sold_out' ? 'Sold Out' : 'Ready'
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

export default function AdminKambingDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const kambingId = String(params?.id || '')

  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Admin')
  const [role, setRole] = useState<AppRole>('admin')
  const [kambing, setKambing] = useState<KambingDetail | null>(null)
  const [error, setError] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    if (!storedToken) {
      router.push('/login')
      return
    }

    async function loadData() {
      try {
        const meResponse = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        })

        const meResult: MeResponse = await meResponse.json()
        const userRole = String(meResult?.data?.role || '').toLowerCase()

        if (!meResponse.ok || userRole !== 'admin') {
          router.push('/dashboard')
          return
        }

        setNama(meResult?.data?.nama || 'Admin')
        setRole('admin')

        const response = await fetch(`/api/kambing/${kambingId}`, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        })

        const result: DetailResponse = await response.json()

        if (!response.ok || !result?.data) {
          setError(result?.message || 'Gagal memuat detail kambing')
          setKambing(null)
          return
        }

        setKambing(result.data)
        setActiveImageIndex(0)
      } catch {
        setError('Terjadi error saat memuat detail kambing')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, kambingId])

  const initial = useMemo(() => (nama || 'A').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  useEffect(() => {
    if (!isImagePreviewOpen) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsImagePreviewOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isImagePreviewOpen])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat detail kambing...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen bg-[#edeff4] text-slate-800">
      <MySidebar role={role} onLogout={handleLogout} userInitial={initial} />

      <section className="flex-1 p-4 lg:p-6">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-sky-100 px-5 py-4">
            <h1 className="text-2xl font-semibold text-sky-800">Detail Kambing</h1>
          </div>

          <div className="space-y-4 px-5 py-5 text-slate-700">
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            {kambing ? (
              (() => {
                const imageUrls = normalizeImageUrls(kambing.imageUrls, kambing.imageUrl)
                const safeIndex = Math.min(activeImageIndex, Math.max(imageUrls.length - 1, 0))
                const activeImage = imageUrls[safeIndex] || null

                return (
                  <>
                    <div className="space-y-3">
                      {activeImage ? (
                        <button
                          type="button"
                          onClick={() => setIsImagePreviewOpen(true)}
                          className="w-full cursor-zoom-in"
                          title="Klik untuk perbesar gambar"
                        >
                          <Image
                            src={activeImage}
                            alt={`${kambing.nama} ${safeIndex + 1}`}
                            width={900}
                            height={520}
                            className="h-64 w-full rounded-xl border border-slate-200 object-cover shadow-sm lg:h-80"
                          />
                        </button>
                      ) : (
                        <div className="grid h-64 w-full place-items-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 lg:h-80">
                          Belum ada gambar
                        </div>
                      )}

                      {imageUrls.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Katalog Foto</p>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                            {imageUrls.map((url, index) => {
                              const isActive = index === safeIndex
                              return (
                                <button
                                  key={`${url}-${index}`}
                                  type="button"
                                  onClick={() => setActiveImageIndex(index)}
                                  className={`relative overflow-hidden rounded-lg border transition ${isActive ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'}`}
                                  title={`Lihat gambar ${index + 1}`}
                                >
                                  <Image
                                    src={url}
                                    alt={`${kambing.nama} thumbnail ${index + 1}`}
                                    width={220}
                                    height={160}
                                    className="h-16 w-full object-cover"
                                  />
                                  <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">
                                    {index + 1}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}

                      {imageUrls.length > 1 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => (prev <= 0 ? imageUrls.length - 1 : prev - 1))}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Sebelumnya
                          </button>
                          <span className="text-sm text-slate-500">{safeIndex + 1} / {imageUrls.length}</span>
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => (prev >= imageUrls.length - 1 ? 0 : prev + 1))}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Berikutnya
                          </button>
                        </div>
                      ) : null}

                      {activeImage && isImagePreviewOpen ? (
                        <div
                          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
                          onClick={() => setIsImagePreviewOpen(false)}
                        >
                          <div
                            className="relative w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setIsImagePreviewOpen(false)}
                              className="absolute right-3 top-3 z-10 rounded-full bg-white/85 px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                            >
                              Tutup
                            </button>

                            {imageUrls.length > 1 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActiveImageIndex((prev) => (prev <= 0 ? imageUrls.length - 1 : prev - 1))}
                                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg font-bold leading-none text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                                  aria-label="Gambar sebelumnya"
                                >
                                  {'<'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveImageIndex((prev) => (prev >= imageUrls.length - 1 ? 0 : prev + 1))}
                                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg font-bold leading-none text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
                                  aria-label="Gambar berikutnya"
                                >
                                  {'>'}
                                </button>
                              </>
                            ) : null}

                            <Image
                              src={activeImage}
                              alt={`${kambing.nama} besar ${safeIndex + 1}`}
                              width={1600}
                              height={1000}
                              className="max-h-[60vh] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
                            />

                            {imageUrls.length > 1 ? (
                              <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">
                                {imageUrls.map((url, index) => {
                                  const isActive = index === safeIndex
                                  return (
                                    <button
                                      key={`${url}-preview-${index}`}
                                      type="button"
                                      onClick={() => setActiveImageIndex(index)}
                                      className={`overflow-hidden rounded border ${isActive ? 'border-white ring-2 ring-white/70' : 'border-white/30'}`}
                                    >
                                      <Image
                                        src={url}
                                        alt={`${kambing.nama} preview ${index + 1}`}
                                        width={150}
                                        height={110}
                                        className="h-12 w-full object-cover"
                                      />
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}

                            {imageUrls.length > 1 ? (
                              <p className="mt-3 text-center text-sm text-slate-600">
                                Gambar {safeIndex + 1} dari {imageUrls.length}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <p><span className="inline-block w-44 font-medium">Nama</span>: {kambing.nama}</p>
                    <p><span className="inline-block w-44 font-medium">Jenis</span>: {kambing.jenis}</p>
                    <p><span className="inline-block w-44 font-medium">Berat</span>: {kambing.berat} Kg</p>
                    <p><span className="inline-block w-44 font-medium">Harga</span>: {formatRupiah(kambing.harga)}</p>
                    <p><span className="inline-block w-44 font-medium">Harga Modal</span>: {formatRupiah(kambing.hargaModal)}</p>
                    <p><span className="inline-block w-44 font-medium">Stok</span>: {kambing.stok}</p>
                    <p><span className="inline-block w-44 font-medium">Status</span>: {renderStatus(kambing.status)}</p>
                    <p><span className="inline-block w-44 font-medium">Deskripsi</span>: {kambing.deskripsi || '-'}</p>
                    <p><span className="inline-block w-44 font-medium">Dibuat Pada</span>: {kambing.createdAt ? new Date(kambing.createdAt).toLocaleDateString('id-ID') : '-'}</p>

                    <button
                      type="button"
                      onClick={() => router.push('/admin/kambing')}
                      className="mt-2 inline-flex items-center gap-2 text-indigo-600 transition hover:text-indigo-500"
                    >
                      <ArrowBackOutlinedIcon className="text-[20px]" />
                      Kembali
                    </button>
                  </>
                )
              })()
            ) : (
              <p className="text-amber-600">Data kambing tidak ditemukan</p>
            )}
          </div>
        </article>
      </section>
    </main>
  )
}
