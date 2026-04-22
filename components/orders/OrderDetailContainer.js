'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOrderById } from '@/lib/order'
import OrderDetail from './OrderDetail'
import OrderItemsList from './OrderItemsList'

export default function OrderDetailContainer({ id }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadOrderDetail() {
      const token = localStorage.getItem('token')

      if (!token) {
        router.replace('/login')
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

        const message = loadError instanceof Error ? loadError.message : 'Gagal mengambil data order'

        if (message === 'Order tidak ditemukan') {
          setNotFound(true)
        } else {
          setError(message)
        }
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
