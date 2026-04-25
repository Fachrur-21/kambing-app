import db, { queryOne } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendBuyerVerificationEmail } from '@/lib/mailer'

export async function POST(request) {
  try {
    const body = await request.json()
    const nama = String(body?.nama || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const username = String(body?.username || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const alamat = String(body?.alamat || '').trim()
    const noTlpn = String(body?.no_tlpn || '').trim()

    if (!nama || !email || !username || !password || !alamat || !noTlpn) {
      return Response.json({ error: 'nama, email, username, password, alamat, no_tlpn wajib diisi' }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return Response.json({ error: 'Format email tidak valid' }, { status: 400 })
    }

    const phonePattern = /^[0-9+\-\s()]{8,20}$/
    if (!phonePattern.test(noTlpn)) {
      return Response.json({ error: 'Format no_tlpn tidak valid' }, { status: 400 })
    }

    const existingEmail = await queryOne(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    )

    if (existingEmail) {
      return Response.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    const existingUsername = await queryOne(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    )

    if (existingUsername) {
      return Response.json({ error: 'Username sudah dipakai' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const verificationToken = randomBytes(32).toString('hex')

    const [result] = await db.execute(
      'INSERT INTO users (nama, email, username, password, role, alamat, no_tlpn, email_verification_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nama, email, username, hashedPassword, 'pembeli', alamat, noTlpn, verificationToken]
    )

    await sendBuyerVerificationEmail({ to: email, nama, token: verificationToken })

    return Response.json({
      message: 'Register berhasil. Cek email untuk verifikasi akun.',
      data: {
        id: result.insertId,
        nama,
        email,
        username,
        alamat,
        no_tlpn: noTlpn,
        role: 'pembeli'
      }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Terjadi error' }, { status: 500 })
  }
}