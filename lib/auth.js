import jwt from 'jsonwebtoken'

export function getAuthToken(request) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice(7).trim()
}

export function verifyAuthToken(request) {
  const token = getAuthToken(request)

  if (!token) {
    return { error: 'Unauthorized', status: 401 }
  }

  const secret = process.env.JWT_SECRET

  if (!secret) {
    return { error: 'JWT secret belum diset', status: 500 }
  }

  try {
    const decoded = jwt.verify(token, secret)
    return { decoded }
  } catch {
    return { error: 'Token tidak valid', status: 401 }
  }
}

export function hasProductManagerRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'admin' || role === 'owner'
}
