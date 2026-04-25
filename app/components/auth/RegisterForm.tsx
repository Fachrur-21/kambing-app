'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

type RegisterPayload = {
  nama: string
  email: string
  username: string
  password: string
  alamat: string
  no_tlpn: string
}

const initialForm: RegisterPayload = {
  nama: '',
  email: '',
  username: '',
  password: '',
  alamat: '',
  no_tlpn: ''
}

export default function RegisterForm() {
  const [form, setForm] = useState<RegisterPayload>(initialForm)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.nama || !form.email || !form.username || !form.password || !form.alamat || !form.no_tlpn) {
      setError('Semua kolom wajib diisi')
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result?.error || 'Registrasi gagal')
        return
      }

      setSuccess('Akun berhasil dibuat. Cek inbox email kamu untuk verifikasi akun.')
      setForm(initialForm)
    } catch {
      setError('Terjadi error saat daftar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Pembeli</p>
      <h1 className="mb-6 text-3xl font-black tracking-tight text-slate-900">Daftar Akun</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Nama</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            type="text"
            value={form.nama}
            onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
            placeholder="Nama lengkap"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="nama@email.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Username</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            type="text"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            placeholder="username_pembeli"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Minimal 6 karakter"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Alamat</span>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            value={form.alamat}
            onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))}
            placeholder="Alamat lengkap"
            rows={3}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">No Telepon</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            type="text"
            value={form.no_tlpn}
            onChange={(event) => setForm((prev) => ({ ...prev, no_tlpn: event.target.value }))}
            placeholder="08xxxxxxxxxx"
          />
        </label>

        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <button
          className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Memproses...' : 'Daftar'}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Sudah punya akses admin?{' '}
        <Link href="/login" className="font-semibold text-cyan-700 hover:text-cyan-600">
          Login di sini
        </Link>
      </p>
    </section>
  )
}