import AdminOrderCard from './AdminOrderCard'

export default function AdminOrdersList({ orders }) {
  return (
    <section>
      {orders.map((order) => (
        <AdminOrderCard key={order.id} order={order} />
      ))}
    </section>
  )
}
