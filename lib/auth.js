import jwt from 'jsonwebtoken'

function getJwtSecret() {
  return process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET
}

export function signAccessToken(payload) {
  const secret = getJwtSecret()
  if (!secret) {
    throw new Error('JWT secret belum diset')
  }

  const expiresIn = process.env.AUTH_JWT_EXPIRES_IN || '1d'
  return jwt.sign(payload, secret, { expiresIn })
}

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

  const secret = getJwtSecret()

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

export function hasAdminRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'admin'
}

export function hasProductManagerRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'admin' || role === 'owner'
}

export function hasOwnerRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'owner'
}

export function hasEmployeeRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'pegawai'
}

export function hasAdminOrOwnerRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'admin' || role === 'owner'
}

export function hasBuyerRole(decoded) {
  const role = String(decoded?.role || '').toLowerCase()
  return role === 'pembeli'
}
