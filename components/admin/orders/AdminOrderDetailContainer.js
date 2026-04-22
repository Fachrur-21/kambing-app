'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOrderById } from '@/lib/order'
import OrderDetail from '@/components/orders/OrderDetail'
import OrderItemsList from '@/components/orders/OrderItemsList'

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

export default function AdminOrderDetailContainer({ id }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadOrderDetail() {
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
        const data = await getOrderById(id)

        if (!isMounted) {
          return
        }

        if (!data) {
          setNotFound(true)
          return
        }

        setOrder(data)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        const status = loadError?.status
        const message = loadError instanceof Error ? loadError.message : 'Gagal mengambil data order'

        if (status === 401) {
          router.replace('/login')
          return
        }

        if (status === 403) {
          router.replace('/')
          return
        }

        if (status === 404 || message === 'Order tidak ditemukan') {
          setNotFound(true)
          return
        }

        setError(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadOrderDetail()

    return () => {
      isMounted = false
    }
  }, [id, router])

  if (loading) {
    return <p>Loading...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  if (notFound) {
    return <p>Order tidak ditemukan</p>
  }

  if (!order) {
    return <p>Order tidak ditemukan</p>
  }

  return (
    <section>
      <OrderDetail order={order} />
      <OrderItemsList items={order.order_items || []} />
    </section>
  )
}
