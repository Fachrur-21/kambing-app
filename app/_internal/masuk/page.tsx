'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import MySidebar, { type AppRole } from '@/app/components/navigation/MySidebar'

type MeResponse = {
	data?: {
		nama?: string
		role?: string
	}
	error?: string
}

const allowedRoles: AppRole[] = ['admin', 'owner', 'pegawai', 'pembeli']

export default function InternalMasukPage() {
	const [loading, setLoading] = useState(true)
	const [nama, setNama] = useState('User')
	const [role, setRole] = useState<AppRole>('pembeli')
	const router = useRouter()

	useEffect(() => {
		const token = localStorage.getItem('access_token')
		if (!token) {
			router.push('/login')
			return
		}

		async function fetchProfile() {
			try {
				const response = await fetch('/api/me', {
					headers: {
						Authorization: `Bearer ${token}`
					}
				})
				const result: MeResponse = await response.json()

				if (!response.ok || !result?.data) {
					localStorage.removeItem('access_token')
					router.push('/login')
					return
				}

				const roleFromApi = String(result.data.role || '').toLowerCase()
				if (allowedRoles.includes(roleFromApi as AppRole)) {
					setRole(roleFromApi as AppRole)
				}

				setNama(result.data.nama || 'User')
			} catch {
				localStorage.removeItem('access_token')
				router.push('/login')
			} finally {
				setLoading(false)
			}
		}

		fetchProfile()
	}, [router])

	const initial = useMemo(() => (nama || 'U').trim().charAt(0).toUpperCase(), [nama])

	function handleLogout() {
		localStorage.removeItem('access_token')
		router.push('/login')
	}

	if (loading) {
		return (
			<main className="grid min-h-screen place-items-center bg-[#f4f5f8]">
				<div className="text-center">
					<div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
					<p className="text-slate-700">Memuat dashboard...</p>
				</div>
			</main>
		)
	}

	return (
		<main className="flex min-h-screen bg-[#edeff4] text-slate-800">
			<MySidebar role={role} onLogout={handleLogout} userInitial={initial} />

			<section className="flex-1 p-6 lg:p-8">
				<header className="mb-5 flex items-center justify-end gap-3">
					<button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
						<Icon icon="solar:translation-linear" className="text-lg" />
					</button>
					<button className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
						<Icon icon="solar:sun-2-linear" className="text-lg" />
					</button>
					<div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500 font-semibold text-white shadow-sm">
						{initial}
					</div>
				</header>

				<div className="mb-6 flex items-center gap-4 rounded-xl bg-[#cdefff] px-5 py-4 text-cyan-700 shadow-sm">
					<span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500 text-white">
						<Icon icon="solar:info-circle-bold" className="text-xl" />
					</span>
					<p className="text-xl font-medium">Selamat Datang di Kambing App, {nama}.</p>
				</div>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{[
						{ title: 'Aplikasi Akademik', value: 835, color: 'bg-indigo-100 text-indigo-500', icon: 'solar:book-2-linear' },
						{ title: 'Aplikasi Manajemen', value: 329, color: 'bg-amber-100 text-amber-500', icon: 'solar:briefcase-linear' },
						{ title: 'Pengguna Aktif', value: 1170, color: 'bg-lime-100 text-lime-500', icon: 'solar:user-linear' },
						{ title: 'Jumlah Aplikasi', value: 1890, color: 'bg-sky-100 text-sky-500', icon: 'solar:widget-4-linear' }
					].map((item) => (
						<article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="mb-3 flex items-center gap-3">
								<span className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}>
									<Icon icon={item.icon} className="text-xl" />
								</span>
								<p className="text-4xl font-bold text-slate-700">{item.value}</p>
							</div>
							<p className="text-lg text-slate-700">{item.title}</p>
						</article>
					))}
				</div>
			</section>
		</main>
	)
}
