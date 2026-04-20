import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request) {
  try {
    const body = await request.json()
    const { nama, email, password } = body

    // 🔍 CEK EMAIL DULU
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return Response.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      )
    }

    // 🔐 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.users.create({
      data: {
        nama,
        email,
        password: hashedPassword,
        role: "user"
      }
    })

    return Response.json({
      message: "Register berhasil",
      data: user
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: "Terjadi error" }, { status: 500 })
  }
}