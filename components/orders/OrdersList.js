import OrderCard from './OrderCard'

export default function OrdersList({ orders }) {
  return (
    <section>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </section>
  )
}
