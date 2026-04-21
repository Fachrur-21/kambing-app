import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.users.findFirst({
    where: { role: 'admin' }
  })

  if (admin) {
    console.log('Admin already exists:', admin.email || `id:${admin.id}`)
    return
  }

  const email = (process.env.ADMIN_EMAIL || '').trim()
  const password = process.env.ADMIN_PASSWORD || ''
  const nama = (process.env.ADMIN_NAMA || 'Administrator').trim()

  if (!email || !password) {
    throw new Error('No admin found. Set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap admin user.')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const existingUser = await prisma.users.findUnique({
    where: { email }
  })

  if (existingUser) {
    await prisma.users.update({
      where: { id: existingUser.id },
      data: {
        role: 'admin',
        password: hashedPassword,
        nama: nama || existingUser.nama
      }
    })

    console.log('Existing user promoted to admin:', email)
    return
  }

  await prisma.users.create({
    data: {
      nama: nama || 'Administrator',
      email,
      password: hashedPassword,
      role: 'admin'
    }
  })

  console.log('Admin user created:', email)
}

main()
  .catch((error) => {
    console.error(error.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
