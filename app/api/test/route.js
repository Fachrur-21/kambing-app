import prisma from '@/lib/prisma'

export async function GET() {
  const users = await prisma.users.findMany()

  return Response.json(users)
}