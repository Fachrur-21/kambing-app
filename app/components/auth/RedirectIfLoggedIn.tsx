"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectIfLoggedIn() {
  const router = useRouter()

  useEffect(() => {
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
      // ignore and allow access
    }
  }, [router])

  return null
}
