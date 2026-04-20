import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 🔍 CEK USER
    const user = await prisma.users.findUnique({
      where: { email }
    })

    if (!user) {
      return Response.json(
        { error: "Email tidak ditemukan" },
        { status: 404 }
      )
    }

    // 🔐 CEK PASSWORD
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return Response.json(
        { error: "Password salah" },
        { status: 401 }
      )
    }

    // 🔑 BUAT TOKEN
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    return Response.json({
      message: "Login berhasil",
      token: token
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Terjadi error" }, { status: 500 })

  }
}