'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'

type MeResponse = {
  data?: {
    nama?: string
    role?: string
  }
}

type UserDetail = {
  id: number
  nama: string | null
  alamat: string | null
  no_tlpn: string | null
  email: string | null
  username: string
  role: string
  role_id: number | null
  is_active: number
  email_verified_at: string | null
  created_at: string
}

type DetailResponse = {
  data?: UserDetail
  message?: string
}

export default function AdminUserDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const userId = String(params?.id || '')

  const [loading, setLoading] = useState(true)
  const [nama, setNama] = useState('Admin')
  const [role, setRole] = useState<AppRole>('admin')
  const [token, setToken] = useState('')
  const [user, setUser] = useState<UserDetail | null>(null)
  const [error, setError] = useState('')

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

        setToken(storedToken)
        setNama(meResult?.data?.nama || 'Admin')
        setRole('admin')

        const response = await fetch(`/api/admin/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        })
        const result: DetailResponse = await response.json()

        if (!response.ok || !result?.data) {
          setError(result?.message || 'Gagal memuat detail user')
          setUser(null)
          return
        }

        setUser(result.data)
      } catch {
        setError('Terjadi error saat memuat detail user')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, userId])

  const initial = useMemo(() => (nama || 'A').trim().charAt(0).toUpperCase(), [nama])

  function handleLogout() {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
          <p className="text-slate-700">Memuat detail user...</p>
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
            <h1 className="text-2xl font-semibold text-sky-800">Detail User</h1>
          </div>

          <div className="space-y-3 px-5 py-5 text-slate-700">
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            {user ? (
              <>
                <p><span className="inline-block w-44 font-medium">Nama</span>: {user.nama || '-'}</p>
                <p><span className="inline-block w-44 font-medium">Username</span>: {user.username}</p>
                <p><span className="inline-block w-44 font-medium">Email</span>: {user.email || '-'}</p>
                <p><span className="inline-block w-44 font-medium">Role</span>: <span className="capitalize">{user.role}</span></p>
                <p><span className="inline-block w-44 font-medium">No. Telepon</span>: {user.no_tlpn || '-'}</p>
                <p><span className="inline-block w-44 font-medium">Alamat</span>: {user.alamat || '-'}</p>
                <p><span className="inline-block w-44 font-medium">Status</span>: {Number(user.is_active) === 1 ? 'Aktif' : 'Nonaktif'}</p>
                <p><span className="inline-block w-44 font-medium">Verifikasi Email</span>: {user.email_verified_at ? 'Terverifikasi' : 'Belum verifikasi'}</p>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => router.push('/admin/users')}
              className="mt-2 inline-flex items-center gap-2 text-indigo-600 transition hover:text-indigo-500 cursor-pointer"
            >
              <ArrowBackOutlinedIcon className="text-[20px]" />
              Kembali
            </button>
          </div>
        </article>
      </section>
    </main>
  )
}
