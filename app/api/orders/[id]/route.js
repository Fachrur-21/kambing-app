import prisma from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth'

async function resolveOrderId(params) {
  const { id: rawId } = await params
  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

function isManagerRole(role) {
  const normalizedRole = String(role || '').toLowerCase()
  return normalizedRole === 'admin' || normalizedRole === 'owner'
}

const orderDetailInclude = {
  order_items: {
    include: {
      kambing: {
        select: {
          id: true,
          nama: true,
          harga: true
        }
      }
    }
  }
}

export async function GET(request, { params }) {
  try {
    const auth = verifyAuthToken(request)

    if (auth.error) {
      if (auth.status === 401) {
        return Response.json({ message: 'Unauthorized', data: null }, { status: 401 })
      }

      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    const id = await resolveOrderId(params)
    if (!id) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const userId = Number(auth.decoded?.id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ message: 'Unauthorized', data: null }, { status: 401 })
    }

    const role = auth.decoded?.role
    const managerRole = isManagerRole(role)

    const order = managerRole
      ? await prisma.orders.findUnique({
          where: { id },
          include: orderDetailInclude
        })
      : await prisma.orders.findFirst({
          where: {
            id,
            user_id: userId
          },
          include: orderDetailInclude
        })

    if (!order) {
      return Response.json({ message: 'Order tidak ditemukan', data: null }, { status: 404 })
    }

    return Response.json({
      message: 'Detail order',
      data: order
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
