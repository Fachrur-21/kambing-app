'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'
import KambingManagementTable from '@/app/components/admin/KambingManagementTable'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
}

export default function OwnerProdukPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Owner')
  const [role, setRole] = useState<AppRole>('owner')
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

        if (!response.ok || userRole !== 'owner') {
          router.push('/dashboard')
          return
        }

        setToken(storedToken)
        setRole('owner')
        setNama(result?.data?.nama || 'Owner')
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    verifyUser()
  }, [router])

  const initial = useMemo(() => (nama || 'O').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat data kambing...</p>
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
        <KambingManagementTable
          token={token}
          title="Daftar Produk"
          addLabel="Tambah Produk"
          detailPath="/owner/produk"
        />
      </section>
    </main>
  )
}
