"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '@/app/components/auth/LoginForm'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // If already logged in, redirect based on role. User must logout to access this page.
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const userStr = localStorage.getItem('user')
      const role = userStr ? String(JSON.parse(userStr)?.role || '').toLowerCase() : ''

      if (role === 'pegawai') {
        router.replace('/pegawai/pesanan')
      } else {
        router.replace('/dashboard')
      }
    } catch (e) {
      // ignore and allow access to login
    }
  }, [router])

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#cffafe_0,#cffafe_15%,#f8fafc_45%),radial-gradient(circle_at_85%_80%,#fde68a_0,#fde68a_12%,transparent_45%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(2,132,199,0.05),rgba(245,158,11,0.08))]" />
      <LoginForm />
    </main>
  )
}