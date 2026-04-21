import prisma from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(request) {
  try {
    const auth = verifyAuthToken(request)

    if (auth.error) {
      if (auth.status === 401) {
        return Response.json({ message: 'Unauthorized', data: null }, { status: 401 })
      }

      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    const userId = Number(auth.decoded?.id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ message: 'Unauthorized', data: null }, { status: 401 })
    }

    const orders = await prisma.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    })

    return Response.json({
      message: 'Data orders',
      data: orders
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
