'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'
import UserManagementTable from '@/app/components/admin/UserManagementTable'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('User')
  const [role, setRole] = useState<AppRole>('pembeli')
  const [token, setToken] = useState('')

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    if (!storedToken) {
      router.push('/login')
      return
    }

    async function verifyUser() {
      try {
        const response = await fetch('/api/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        })

        const result: MeResponse = await response.json()
        const userRole = String(result?.data?.role || '').toLowerCase()

        if (!response.ok || userRole !== 'admin') {
          router.push('/dashboard')
          return
        }

        setToken(storedToken)
        setRole('admin')
        setNama(result?.data?.nama || 'Admin')
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyUser()
  }, [router])

  const initial = useMemo(() => (nama || 'A').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat manajemen user...</p>
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
        <UserManagementTable token={token} />
      </section>
    </main>
  )
}
