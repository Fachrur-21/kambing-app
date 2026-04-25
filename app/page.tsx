import Link from 'next/link'
import Image from 'next/image'
import { query } from '@/lib/db'

type PublicProduct = {
  id: number
  nama: string
  jenis: string
  berat: number
  harga: number
  stok: number
  deskripsi: string | null
  imageUrl: string | null
  imageUrls?: string | string[] | null
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function normalizeImageUrls(value: unknown, fallback?: string | null): string[] {
  if (!value) {
    return fallback ? [fallback] : []
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => String(item || '').trim()).filter((item) => item.length > 0)
    return items.length > 0 ? items : fallback ? [fallback] : []
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return fallback ? [fallback] : []
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        const items = parsed.map((item) => String(item || '').trim()).filter((item) => item.length > 0)
        return items.length > 0 ? items : fallback ? [fallback] : []
      }
    } catch {
      return [trimmed]
    }

    return [trimmed]
  }

  return fallback ? [fallback] : []
}

function getPreviewText(value: string | null | undefined) {
  const text = String(value || '').trim()
  if (!text) {
    return 'Kambing sehat, siap untuk kebutuhan kurban, aqiqah, atau peternakan.'
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return sentences.slice(0, 1).join(' ') || text
}

export default async function Home() {
  const rows = await query(
    `SELECT id, nama, jenis, berat, harga, stok, deskripsi, imageUrl, imageUrls
     FROM kambing
     WHERE stok > 0
     ORDER BY createdAt DESC
     LIMIT 6`
  )
  const products = (rows || []) as PublicProduct[]

  const advantages = [
    {
      title: 'Kualitas Terjamin',
      desc: 'Setiap kambing dipilih berdasarkan kondisi fisik, berat, dan kesiapan stok.'
    },
    {
      title: 'Transparan dan Jelas',
      desc: 'Harga, jenis, dan deskripsi tampil terbuka supaya kamu mudah membandingkan.'
    },
    {
      title: 'Layanan Cepat',
      desc: 'Proses pemesanan ringkas dari pilih produk sampai konfirmasi pengiriman.'
    }
  ]

  const testimonials = [
    { nama: 'Rian', text: 'Produknya bagus dan proses beli cepat. Admin responsif saat saya tanya stok.' },
    { nama: 'Nadia', text: 'Tampilannya jelas, mudah pilih produk, dan update pesanan gampang dipantau.' },
    { nama: 'Fahmi', text: 'Saya repeat order karena kualitas kambing konsisten dan pengiriman rapi.' }
  ]

  const steps = [
    'Klik Login untuk masuk sebagai pembeli.',
    'Buka katalog dan pilih kambing yang sesuai.',
    'Lakukan checkout dan isi data pengiriman.',
    'Pantau status pesanan sampai selesai.'
  ]

  return (
    <main className="bg-[radial-gradient(circle_at_15%_10%,#fef3c7_0,#fff7ed_30%,#f8fafc_55%),radial-gradient(circle_at_85%_90%,#bae6fd_0,#f0f9ff_28%,transparent_50%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[34px] border border-slate-200 bg-white/85 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Kambing App</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Pilih Kambing Terbaik Dengan Proses Beli yang Simpel
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Platform pembelian kambing yang fokus pada kualitas, transparansi harga, dan pengalaman belanja yang cepat.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-slate-700"
            >
              Login
            </Link>
            <Link
              href="/daftar"
              className="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-amber-300"
            >
              Daftar Pembeli
            </Link>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <h2 className="text-2xl font-black text-slate-900">Keunggulan Toko</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {advantages.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-bold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-[#0f172a] p-6 text-white shadow-sm lg:p-8">
          <h2 className="text-2xl font-black">Testimoni</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.nama} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-7 text-slate-200">&quot;{item.text}&quot;</p>
                <p className="mt-3 text-sm font-bold text-white">- {item.nama}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-900">Semua Produk</h2>
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Login untuk beli
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Produk belum tersedia.</p>
            ) : (
              products.map((item) => {
                const images = normalizeImageUrls(item.imageUrls, item.imageUrl)
                const previewImage = images[0]

                return (
                  <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {previewImage ? (
                        <Image src={previewImage} alt={item.nama} fill className="object-cover" sizes="(min-width: 1280px) 33vw, 100vw" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm text-slate-500">Tidak ada gambar</div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{item.nama}</h3>
                        <p className="text-sm text-slate-500">
                          {item.jenis} • {item.berat} Kg • Stok {item.stok}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">{getPreviewText(item.deskripsi)}</p>
                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-xs font-medium text-slate-500">Harga</p>
                        <p className="text-xl font-black text-emerald-600">{formatRupiah(item.harga)}</p>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <h2 className="text-2xl font-black text-slate-900">Cara Pemesanan</h2>
          <div className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">{index + 1}</div>
                <p className="pt-1 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm lg:p-8">
          <h2 className="text-3xl font-black tracking-tight">hubungi </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Butuh bantuan pilih kambing? Hubungi admin sekarang atau login untuk mulai pemesanan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://wa.me/62877795259"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
            >
              Chat WhatsApp
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              Login Sekarang
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
