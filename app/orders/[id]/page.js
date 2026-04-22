import OrderDetailContainer from '@/components/orders/OrderDetailContainer'

export default async function OrderDetailPage({ params }) {
  const { id } = await params

  return <OrderDetailContainer id={id} />
}
