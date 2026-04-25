'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function KeranjangPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/produk?cart=1')
  }, [router])

  return (
    <main className="grid min-h-screen place-items-center bg-[#f2f2f2]">
      <p className="text-sm text-slate-600">Mengalihkan ke keranjang...</p>
    </main>
  )
}
