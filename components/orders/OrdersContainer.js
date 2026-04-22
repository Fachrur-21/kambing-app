'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMyOrders } from '@/lib/order'
import OrdersList from './OrdersList'

export default function OrdersContainer() {
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

      try {
        const data = await getMyOrders()

        if (!isMounted) {
          return
        }

        setOrders(Array.isArray(data) ? data : [])
      } catch (loadError) {
        if (!isMounted) {
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

  return <OrdersList orders={orders} />
}
