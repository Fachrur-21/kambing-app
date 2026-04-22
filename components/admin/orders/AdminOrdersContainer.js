'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllOrders } from '@/lib/order'
import AdminOrdersList from './AdminOrdersList'

const ALLOWED_ROLES = ['admin', 'owner']

function getTokenRole(token) {
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload?.role === 'string' ? payload.role.toLowerCase() : null
  } catch {
    return null
  }
}

export default function AdminOrdersContainer() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadOrders() {
      const token = localStorage.getItem('token')

      if (!token) {
        router.replace('/login')
        return
      }

      const role = getTokenRole(token)
      if (!ALLOWED_ROLES.includes(String(role || '').toLowerCase())) {
        router.replace('/')
        return
      }

      try {
        const data = await getAllOrders()

        if (!isMounted) {
          return
        }

        setOrders(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        const status = loadError?.status

        if (status === 401) {
          router.replace('/login')
          return
        }

        if (status === 403) {
          router.replace('/')
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Gagal mengambil data orders')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadOrders()

    return () => {
      isMounted = false
    }
  }, [router])

  if (loading) {
    return <p>Loading...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  if (orders.length === 0) {
    return <p>Belum ada order</p>
  }

  return <AdminOrdersList orders={orders} />
}
