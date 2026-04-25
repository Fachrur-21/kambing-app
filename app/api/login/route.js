import { queryOne } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signAccessToken } from '@/lib/auth'

export async function POST(request) {
  try {
    const body = await request.json()
    const username = String(body?.username || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!username || !password) {
      return Response.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const user = await queryOne(
      'SELECT id, nama, email, username, password, role, is_active, email_verified_at FROM users WHERE username = ? LIMIT 1',
      [username]
    )

    if (!user) {
      return Response.json({ error: 'Username tidak ditemukan' }, { status: 404 })
    }

    if (Number(user.is_active) !== 1) {
      return Response.json({ error: 'Akun tidak aktif' }, { status: 403 })
    }

    const role = String(user.role || '').toLowerCase()
    if (role === 'pembeli' && !user.email_verified_at) {
      return Response.json({ error: 'Email belum diverifikasi. Cek inbox untuk verifikasi akun.' }, { status: 403 })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return Response.json({ error: 'Password salah' }, { status: 401 })
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    })

    return Response.json({
      message: 'Login berhasil',
      token,
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