'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'
import BuyerBerandaContent, { type BuyerKambingItem } from '@/app/components/buyer/BuyerBerandaContent'

type MeResponse = {
	data?: {
		nama?: string
		role?: string
	}
	error?: string
}

type ProductResponse = {
	data?: BuyerKambingItem[]
	message?: string
}

const allowedRoles: AppRole[] = ['admin', 'owner', 'pegawai', 'pembeli']

export default function BerandaPembeliPage() {
	const [loading, setLoading] = useState(true)
	const [nama, setNama] = useState('Pembeli')
	const [role, setRole] = useState<AppRole>('pembeli')
	const [products, setProducts] = useState<BuyerKambingItem[]>([])
	const router = useRouter()

	useEffect(() => {
		const token = localStorage.getItem('access_token')
		if (!token) {
			router.push('/login')
			return
		}
		const accessToken = token

		async function loadData() {
			try {
				const meResponse = await fetch('/api/me', {
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				})
				const meResult: MeResponse = await meResponse.json()

				if (!meResponse.ok || !meResult?.data) {
					localStorage.removeItem('access_token')
					router.push('/login')
					return
				}

				const roleFromApi = String(meResult.data.role || '').toLowerCase()
				if (allowedRoles.includes(roleFromApi as AppRole)) {
					setRole(roleFromApi as AppRole)
				}

				if (roleFromApi !== 'pembeli') {
					router.push('/dashboard')
					return
				}

				setNama(meResult.data.nama || 'Pembeli')

				const productResponse = await fetch('/api/pembeli/kambing?perPage=24', {
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				})

				const productResult: ProductResponse = await productResponse.json()
				if (!productResponse.ok) {
					setProducts([])
					return
				}

				setProducts(productResult?.data || [])
			} catch {
				localStorage.removeItem('access_token')
				router.push('/login')
			} finally {
				setLoading(false)
			}
		}

		loadData()
	}, [router])

	const initial = useMemo(() => (nama || 'P').trim().charAt(0).toUpperCase(), [nama])
	function handleLogout() {
		localStorage.removeItem('access_token')
		router.push('/')
	}

	if (loading) {
		return (
			<main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
				<div className="text-center">
					<div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
					<p className="text-slate-700">Memuat halaman beranda...</p>
				</div>
			</main>
		)
	}

	return (
		<main className="flex min-h-screen bg-[#edeff4] text-slate-800">
			<MySidebar role={role} onLogout={handleLogout} userInitial={initial} />

			<section className="flex-1 p-4 lg:p-8">
				<BuyerBerandaContent nama={nama} initial={initial} products={products} />
			</section>
		</main>
	)
}