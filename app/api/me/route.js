import { queryOne } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(request) {
  try {
    const auth = verifyAuthToken(request)
    if (auth.error) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }

    const decoded = auth.decoded
    const user = await queryOne(
      'SELECT id, nama, email, username, role, no_tlpn, alamat, is_active, email_verified_at, created_at FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    )

    if (!user) {
      return Response.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    return Response.json({
      message: 'Data user',
      data: user
    })

  } catch {
    return Response.json({ error: 'Token tidak valid' }, { status: 401 })
  }
}