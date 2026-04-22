import KambingDetail from '@/components/kambing/KambingDetail'
import KambingCheckout from '@/components/kambing/KambingCheckout'

async function resolveKambingById(id) {
  const response = await fetch(`http://localhost:3000/api/kambing/${id}`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { state: 'not-found', data: null }
    }

    throw new Error('Failed to fetch kambing detail')
  }

  const result = await response.json()
  const data = result?.data || null

  if (!data) {
    return { state: 'not-found', data: null }
  }

  return { state: 'ok', data }
}

export default async function KambingDetailPage({ params }) {
  const rawId = Number((await params).id)

  if (!Number.isInteger(rawId) || rawId <= 0) {
    return <p>ID tidak valid</p>
  }

  let state = 'ok'
  let data = null

  try {
    const result = await resolveKambingById(rawId)
    state = result.state
    data = result.data
  } catch {
    state = 'error'
  }

  if (state === 'error') {
    return <p>Gagal mengambil data</p>
  }

  if (state === 'not-found') {
    return <p>Kambing tidak ditemukan</p>
  }

  return (
    <>
      <KambingDetail kambing={data} />
      <KambingCheckout kambingId={data.id} stok={data.stok} />
    </>
  )
}
