'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Swal from 'sweetalert2'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      Swal.fire({
        icon: 'error',
        title: 'Token Tidak Valid',
        text: 'Token verifikasi tidak ditemukan.',
        confirmButtonColor: '#667eea'
      }).then(() => {
        router.push('/login')
      })
      setLoading(false)
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/register/verify?token=${encodeURIComponent(token)}`)
        const data = await response.json()

        if (!response.ok) {
          Swal.fire({
            icon: 'error',
            title: 'Verifikasi Gagal',
            text: data.error || 'Terjadi kesalahan saat memverifikasi email.',
            confirmButtonColor: '#667eea'
          }).then(() => {
            router.push('/daftar')
          })
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Email Terverifikasi!',
            html: `
              <p style="margin: 15px 0;">Selamat ${data.data.nama}, email kamu telah berhasil diverifikasi!</p>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">Sekarang kamu bisa login menggunakan akun pembeli kamu.</p>
            `,
            confirmButtonColor: '#667eea',
            confirmButtonText: 'Lanjut ke Login'
          }).then(() => {
            router.push('/login')
          })
        }
      } catch (error) {
        console.error('Verify error:', error)
        Swal.fire({
          icon: 'error',
          title: 'Terjadi Kesalahan',
          text: 'Gagal memverifikasi email. Coba lagi nanti.',
          confirmButtonColor: '#667eea'
        }).then(() => {
          router.push('/daftar')
        })
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams, router])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Memverifikasi email...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="rounded-lg bg-white p-8 text-center shadow-lg">
        <p className="text-gray-600">Proses verifikasi sedang berlangsung...</p>
      </div>
    </main>
  )
}
