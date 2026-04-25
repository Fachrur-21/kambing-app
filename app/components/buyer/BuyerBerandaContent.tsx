'use client'

import Link from 'next/link'
import Image from 'next/image'
import LocalMallOutlinedIcon from '@mui/icons-material/LocalMallOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined'
import StarRateRoundedIcon from '@mui/icons-material/StarRateRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

export type BuyerKambingItem = {
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

type BuyerBerandaContentProps = {
  nama: string
  initial: string
  products: BuyerKambingItem[]
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
    return 'Kambing berkualitas untuk kebutuhan kurban dan aqiqah dengan seleksi yang rapi.'
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)

  return sentences.slice(0, 2).join(' ') || text
}

function getAvailabilityStatus(stok: number) {
  return Number(stok || 0) > 0 ? 'ready' : 'sold_out'
}

export default function BuyerBerandaContent({ nama, initial, products }: BuyerBerandaContentProps) {
  const testimonials = [
    {
      nama: 'Rizky',
      role: 'Pembeli Kurban',
      rating: 5,
      text: 'Katalognya jelas, stoknya real-time, dan proses pesanannya gampang banget.'
    },
    {
      nama: 'Sinta',
      role: 'Pelanggan Tetap',
      rating: 5,
      text: 'Saya suka karena bisa lihat detail hewan sebelum checkout. Respons admin juga cepat.'
    },
    {
      nama: 'Ahmad',
      role: 'Pembeli Aqiqah',
      rating: 5,
      text: 'Pembayaran dan status pesanan gampang dipantau. Tinggal pilih, pesan, selesai.'
    }
  ]

  const advantages = [
    {
      title: 'Kualitas Terpilih',
      desc: 'Setiap hewan diseleksi berdasarkan kondisi, berat, dan ketersediaan stok.',
      icon: <CheckCircleOutlinedIcon className="text-[20px]" />
    },
    {
      title: 'Proses Cepat',
      desc: 'Cari, pilih, masukkan keranjang, lalu lanjutkan checkout tanpa ribet.',
      icon: <LocalMallOutlinedIcon className="text-[20px]" />
    },
    {
      title: 'Pilihan Jelas',
      desc: 'Detail produk, harga, berat, dan foto ditampilkan supaya mudah dibandingkan.',
      icon: <FavoriteOutlinedIcon className="text-[20px]" />
    }
  ]

  const steps = [
    'Buka menu Daftar Hewan untuk melihat katalog lengkap.',
    'Pilih produk, cek detail, lalu masukkan ke keranjang.',
    'Lengkapi data pengiriman dan lakukan checkout.',
    'Pantau pesanan kamu di menu Pesanan Saya.'
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,#fef3c7_0,#ffffff_34%,#e0f2fe_100%)] p-6 shadow-sm lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-500">Beranda pembeli</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Kambing berkualitas, proses belanja jelas, dan pesanan bisa dipantau dari satu tempat.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Selamat datang, {nama}. Dari sini kamu bisa lihat  semua produk yang tersedia, dan lanjut ke checkout.
            </p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-900 text-2xl font-black text-white shadow-lg">{initial}</div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/produk"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            <StorefrontOutlinedIcon className="text-[18px]" />
            Lihat Daftar Hewan
          </Link>
          <Link
            href="/pesanan-saya"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <LocalMallOutlinedIcon className="text-[18px]" />
            Pantau Pesanan
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {advantages.map((item) => (
          <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-800">{item.icon}</div>
            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-[#0f172a] px-6 py-7 text-white shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-300">Testimoni</p>
            <h2 className="mt-2 text-2xl font-black">Apa kata pembeli</h2>
          </div>
          <div className="text-sm text-slate-300">Rata-rata rating 5/5</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.nama} className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-1 text-amber-300">
                {Array.from({ length: item.rating }).map((_, index) => (
                  <StarRateRoundedIcon key={index} className="text-[20px]" />
                ))}
              </div>
              <p className="text-sm leading-7 text-slate-200">&quot;{item.text}&quot;</p>
              <div className="mt-4">
                <p className="font-semibold text-white">{item.nama}</p>
                <p className="text-xs text-slate-400">{item.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Cara Pemesanan</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Empat langkah sederhana</h2>
          <div className="mt-5 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl bg-slate-50 px-4 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-black text-white">{index + 1}</div>
                <p className="pt-1 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-700">Kemudahan membeli kambing berkualitas</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Pilihan terbaik untuk kebutuhan Anda</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">Temukan berbagai pilihan kambing berkualitas dengan proses pemesanan yang mudah dan layanan pengiriman yang aman.</p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-amber-100">
              <p className="text-sm font-semibold text-slate-900">Pilihan pembelian fleksibel</p>
              <p className="text-sm text-slate-600">Tersedia opsi pembelian sesuai kebutuhan, baik satuan maupun dalam jumlah lebih.</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-amber-100">
              <p className="text-sm font-semibold text-slate-900">Stok siap diproses</p>
              <p className="text-sm text-slate-600">Produk yang tersedia dapat langsung diproses dan ditampilkan secara jelas di katalog.</p>
            </div>
          </div>
        </article>
      </section>

      <section id="semua-produk" className="scroll-mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Semua Produk</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Seluruh katalog hewan yang tersedia</h2>
          </div>
          <Link href="/produk" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Buka katalog penuh
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Belum ada data produk.</p>
          ) : (
            products.map((item) => {
              const images = normalizeImageUrls(item.imageUrls, item.imageUrl)
              const previewImage = images[0]
              const availabilityStatus = getAvailabilityStatus(item.stok)

              return (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {previewImage ? (
                      <Image src={previewImage} alt={item.nama} fill className="object-cover" sizes="(min-width: 1280px) 33vw, 100vw" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm text-slate-500">Tidak ada gambar</div>
                    )}
                    <div
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${
                        availabilityStatus === 'ready' ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                    >
                      {availabilityStatus === 'ready' ? 'Ready' : 'Sold Out'}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{item.nama}</h3>
                      <p className="text-sm text-slate-500">
                        {item.jenis} • {item.berat} Kg • Stok {item.stok}
                      </p>
                    </div>
                    <p className="min-h-[48px] text-sm leading-6 text-slate-600">{getTwoSentencePreview(item.deskripsi)}</p>
                    <div className="flex items-end justify-between gap-3 border-t border-slate-200 pt-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Harga</p>
                        <p className="text-xl font-black text-emerald-600">{formatRupiah(item.harga)}</p>
                      </div>
                      <Link href="/produk" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                        Detail
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>

      <section id="kontak" className="scroll-mt-6 rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-300">Hubungi</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Butuh bantuan pilih kambing atau cek stok?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Hubungi admin toko untuk tanya stok terbaru, konfirmasi promo, atau bantuan saat proses pemesanan.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <a
              href="https://wa.me/62877795259"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
            >
              <WhatsAppIcon className="text-[18px]" />
              Chat WhatsApp
            </a>
            <Link
              href="/pesanan-saya"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              <LocalMallOutlinedIcon className="text-[18px]" />
              Cek Pesanan Saya
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}