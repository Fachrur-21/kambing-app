import AdminOrderDetailContainer from '@/components/admin/orders/AdminOrderDetailContainer'

export default async function AdminOrderDetailPage({ params }) {
  const { id } = await params

  return <AdminOrderDetailContainer id={id} />
}
