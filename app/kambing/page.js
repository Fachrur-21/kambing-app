import KambingList from '@/components/kambing/KambingList'

async function getKambingData() {
  const response = await fetch('http://localhost:3000/api/kambing', {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch kambing data')
  }

  const result = await response.json()
  return Array.isArray(result?.data) ? result.data : []
}

export default async function KambingPage() {
  let data = []
  let hasError = false

  try {
    data = await getKambingData()
  } catch {
    hasError = true
  }

  if (hasError) {
    return <p>Gagal mengambil data</p>
  }

  if (data.length === 0) {
    return <p>Belum ada kambing</p>
  }

  return <KambingList data={data} />
}
