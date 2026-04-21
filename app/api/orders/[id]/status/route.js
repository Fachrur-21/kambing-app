import prisma from '@/lib/prisma'
import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'

const ALLOWED_STATUSES = ['pending', 'paid', 'shipped', 'completed']

const ALLOWED_TRANSITIONS = {
  pending: ['paid'],
  paid: ['shipped'],
  shipped: ['completed'],
  completed: []
}

async function resolveOrderId(params) {
  const { id: rawId } = await params
  const id = Number(rawId)
  return Number.isInteger(id) && id > 0 ? id : null
}

function parseNextStatus(body) {
  if (!body || typeof body !== 'object' || typeof body.nextStatus !== 'string') {
    return null
  }

  return body.nextStatus.trim().toLowerCase()
}

export async function PATCH(request, { params }) {
  try {
    const auth = verifyAuthToken(request)

    if (auth.error) {
      if (auth.status === 401) {
        return Response.json({ message: 'Unauthorized', data: null }, { status: 401 })
      }

      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    if (!hasProductManagerRole(auth.decoded)) {
      return Response.json({ message: 'Forbidden', data: null }, { status: 403 })
    }

    const orderId = await resolveOrderId(params)
    if (!orderId) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const body = await request.json()
    const nextStatus = parseNextStatus(body)

    if (!nextStatus || !ALLOWED_STATUSES.includes(nextStatus)) {
      return Response.json({ message: 'Status tidak valid', data: null }, { status: 400 })
    }

    const currentOrder = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true
      }
    })

    if (!currentOrder) {
      return Response.json({ message: 'Order tidak ditemukan', data: null }, { status: 404 })
    }

    const currentStatus = String(currentOrder.status || '').toLowerCase()
    if (!ALLOWED_STATUSES.includes(currentStatus)) {
      return Response.json({ message: 'Transisi status tidak valid', data: null }, { status: 400 })
    }

    if (nextStatus === currentStatus) {
      return Response.json({
        message: 'Status tidak berubah',
        data: {
          id: orderId,
          status: currentStatus
        }
      })
    }

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || []
    if (!allowedNext.includes(nextStatus)) {
      return Response.json({ message: 'Transisi status tidak valid', data: null }, { status: 400 })
    }

    const updateResult = await prisma.orders.updateMany({
      where: {
        id: orderId,
        status: currentOrder.status
      },
      data: {
        status: nextStatus
      }
    })

    if (updateResult.count === 0) {
      return Response.json({ message: 'Gagal update status, coba lagi', data: null }, { status: 409 })
    }

    const actorId = Number(auth.decoded?.id)
    console.log('Order status updated', {
      orderId,
      oldStatus: currentStatus,
      newStatus: nextStatus,
      actorId
    })

    return Response.json({
      message: 'Status order berhasil diupdate',
      data: {
        id: orderId,
        status: nextStatus
      }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
