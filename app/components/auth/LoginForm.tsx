'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

type LoginPayload = {
  username: string
  password: string
}

export default function LoginForm() {
  const router = useRouter()
  const [form, setForm] = useState<LoginPayload>({ username: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.username || !form.password) {
      setError('Username dan password wajib diisi')
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result?.error || 'Login gagal')
        return
      }

      if (result?.token) {
        localStorage.setItem('access_token', result.token)
      }

      setSuccess('Login berhasil. Mengalihkan ke dashboard...')
      setTimeout(() => router.push('/dashboard'), 500)
    } catch {
      setError('Terjadi error saat login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">Portal Login</p>
      <h1 className="mb-6 text-3xl font-black tracking-tight text-slate-900">Login Akun</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Username</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            type="text"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            placeholder="Masukan username"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Masukan password"
          />
        </label>

        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <button
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Belum punya akun pembeli?{' '}
        <Link href="/daftar" className="font-semibold text-cyan-700 hover:text-cyan-600">
          Daftar sebagai pembeli
        </Link>
      </p>
    </section>
  )
}