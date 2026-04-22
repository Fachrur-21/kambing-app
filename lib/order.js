function createHttpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

async function parseApiResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw createHttpError(result?.message || fallbackMessage, response.status)
  }

  return result?.data ?? null
}

export async function createOrder(items) {
  const token = localStorage.getItem('token')

  if (!token) {
    throw createHttpError('Unauthorized', 401)
  }

  const response = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  })

  return parseApiResponse(response, 'Gagal membuat order')
}

export async function getMyOrders() {
  const token = localStorage.getItem('token')

  if (!token) {
    throw createHttpError('Unauthorized', 401)
  }

  const response = await fetch('http://localhost:3000/api/orders/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await parseApiResponse(response, 'Gagal mengambil data orders')
  return Array.isArray(data) ? data : []
}

export async function getOrderById(id) {
  const token = localStorage.getItem('token')

  if (!token) {
    throw createHttpError('Unauthorized', 401)
  }

  const response = await fetch(`http://localhost:3000/api/orders/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  return parseApiResponse(response, 'Gagal mengambil data order')
}

export async function getAllOrders() {
  const token = localStorage.getItem('token')

  if (!token) {
    throw createHttpError('Unauthorized', 401)
  }

  const response = await fetch('http://localhost:3000/api/orders', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await parseApiResponse(response, 'Gagal mengambil data orders')
  return Array.isArray(data) ? data : []
}
