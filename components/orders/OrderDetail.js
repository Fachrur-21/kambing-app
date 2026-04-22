export default function OrderDetail({ order }) {
  const createdAt = order?.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'

  return (
    <article>
      <h1>Order #{order.id}</h1>
      <p>Status: {order.status}</p>
      <p>Total: {order.total}</p>
      <p>Tanggal: {createdAt}</p>
    </article>
  )
}
