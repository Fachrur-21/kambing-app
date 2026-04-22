import Link from 'next/link'

export default function OrderCard({ order }) {
  const createdAt = order?.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'

  return (
    <Link href={`/orders/${order.id}`}>
      <article>
        <h2>Order #{order.id}</h2>
        <p>Total: {order.total}</p>
        <p>Status: {order.status}</p>
        <p>Tanggal: {createdAt}</p>
      </article>
    </Link>
  )
}
