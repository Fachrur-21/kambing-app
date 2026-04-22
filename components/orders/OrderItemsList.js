export default function OrderItemsList({ items }) {
  return (
    <section>
      {items.map((item, index) => {
        const subtotal = Number(item.harga || 0) * Number(item.qty || 0)

        return (
          <article key={`${item.id || item.kambing_id || index}`}>
            <h2>{item.kambing?.nama || '-'}</h2>
            <p>Harga: {item.harga}</p>
            <p>Qty: {item.qty}</p>
            <p>Subtotal: {subtotal}</p>
          </article>
        )
      })}
    </section>
  )
}
