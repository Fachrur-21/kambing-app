import { queryOne, query } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = String(searchParams.get('token') || '').trim()

    if (!token) {
      return Response.json({ error: 'Token verifikasi wajib diisi' }, { status: 400 })
    }

    const user = await queryOne(
      'SELECT id, nama, email, username, role, email_verified_at FROM users WHERE email_verification_token = ? LIMIT 1',
      [token]
    )

    if (!user) {
      return Response.json({ error: 'Token verifikasi tidak valid' }, { status: 400 })
    }

    if (user.email_verified_at) {
      return Response.json({ message: 'Email sudah terverifikasi sebelumnya' })
    }

    await query(
      'UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL WHERE id = ?',
      [user.id]
    )

    return Response.json({
      message: 'Email berhasil diverifikasi',
      data: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Terjadi error' }, { status: 500 })
  }
}