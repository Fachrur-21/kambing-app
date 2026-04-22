import prisma from '@/lib/prisma'
import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'

function parseCheckoutPayload(body) {
  if (!body || typeof body !== 'object') {
    return { items: null, isValid: false }
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { items: null, isValid: false }
  }

  const items = []

  for (const rawItem of body.items) {
    const kambingId = Number(rawItem?.kambingId)
    const qty = Number(rawItem?.qty)

    if (!Number.isInteger(kambingId) || kambingId <= 0) {
      return { items: null, isValid: false }
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      return { items: null, isValid: false }
    }

    items.push({ kambingId, qty })
  }

  return { items, isValid: true }
}

function mapKnownErrorStatus(message) {
  if (message === 'Validation error') return 400
  if (message === 'Stok tidak cukup') return 400
  if (message === 'Data tidak ditemukan') return 404
  return 500
}

export async function GET(request) {
  try {
    const auth = verifyAuthToken(request)

    if (auth.error) {
      return Response.json({ message: 'Unauthorized', data: null }, { status: 401 })
    }

    if (!hasProductManagerRole(auth.decoded)) {
      return Response.json({ message: 'Forbidden', data: null }, { status: 403 })
    }

    const data = await prisma.orders.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        user_id: true,
        total: true,
        status: true,
        created_at: true
      }
    })

    return Response.json({
      message: 'Data orders',
      data
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function POST(request) {
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

    const body = await request.json()
    const { items, isValid } = parseCheckoutPayload(body)

    if (!isValid) {
      return Response.json({ message: 'Validation error', data: null }, { status: 400 })
    }

    const orderResult = await prisma.$transaction(async (tx) => {
      let total = 0
      const orderItemsData = []

      for (const item of items) {
        const kambing = await tx.kambing.findUnique({
          where: { id: item.kambingId },
          select: {
            id: true,
            harga: true,
            stok: true
          }
        })

        if (!kambing) {
          throw new Error('Data tidak ditemukan')
        }

        if (kambing.stok < item.qty) {
          throw new Error('Stok tidak cukup')
        }

        const updateResult = await tx.kambing.updateMany({
          where: {
            id: item.kambingId,
            stok: { gte: item.qty }
          },
          data: {
            stok: { decrement: item.qty }
          }
        })

        // This conditional update prevents overselling during concurrent checkouts.
        if (updateResult.count === 0) {
          throw new Error('Stok tidak cukup')
        }

        const harga = Number(kambing.harga)
        total += harga * item.qty

        orderItemsData.push({
          kambing_id: item.kambingId,
          qty: item.qty,
          harga
        })
      }

      const order = await tx.orders.create({
        data: {
          user_id: userId,
          total,
          status: 'pending'
        }
      })

      await tx.order_items.createMany({
        data: orderItemsData.map((item) => ({
          order_id: order.id,
          kambing_id: item.kambing_id,
          qty: item.qty,
          harga: item.harga
        }))
      })

      return {
        id: order.id,
        total,
        status: order.status || 'pending'
      }
    })

    return Response.json(
      {
        message: 'Order berhasil dibuat',
        data: orderResult
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi error'
    const status = mapKnownErrorStatus(message)

    if (status !== 500) {
      return Response.json({ message, data: null }, { status })
    }

    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
