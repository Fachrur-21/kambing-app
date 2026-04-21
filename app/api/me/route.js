import jwt from 'jsonwebtoken'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7).trim()
    const secret = process.env.JWT_SECRET

    if (!secret) {
      return Response.json({ error: 'JWT secret belum diset' }, { status: 500 })
    }

    const decoded = jwt.verify(token, secret)

    return Response.json({
      message: 'Data user',
      data: decoded
    })

  } catch {
    return Response.json({ error: 'Token tidak valid' }, { status: 401 })
  }
}