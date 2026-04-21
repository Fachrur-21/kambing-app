import prisma from '@/lib/prisma'
import { requireProductManager } from '@/lib/auth'
import { parsePositiveInt, validateAndNormalizeKambingPayload } from '@/lib/kambing-payload'

async function resolveRouteId(params) {
  const { id: rawId } = await params
  return parsePositiveInt(rawId)
}

export async function GET(_request, { params }) {
  const id = await resolveRouteId(params)

  if (!id) {
    return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
  }

  const data = await prisma.kambing.findUnique({ where: { id } })

  if (!data) {
    return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
  }

  return Response.json({ message: 'Detail kambing', data })
}

export async function PUT(request, { params }) {
  try {
    const auth = requireProductManager(request)
    if (auth.error) {
      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    const id = await resolveRouteId(params)
    if (!id) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const existing = await prisma.kambing.findUnique({
      where: { id }
    })

    if (!existing) {
      return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
    }

    const body = await request.json()
    const { payload, errors } = validateAndNormalizeKambingPayload(body)

    if (errors.length > 0) {
      return Response.json({ message: errors.join(', '), data: null }, { status: 400 })
    }

    const data = await prisma.kambing.update({
      where: { id },
      data: {
        nama: payload.nama,
        jenis: payload.jenis,
        berat: payload.berat,
        harga: payload.harga,
        stok: payload.stok,
        imageUrl: payload.imageUrl,
        deskripsi: payload.deskripsi,
        isActive: payload.isActive
      }
    })

    return Response.json({
      message: 'Kambing berhasil diupdate',
      data
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireProductManager(request)
    if (auth.error) {
      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    const id = await resolveRouteId(params)
    if (!id) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const existing = await prisma.kambing.findUnique({
      where: { id }
    })

    if (!existing) {
      return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
    }

    await prisma.kambing.delete({
      where: { id }
    })

    return Response.json({
      message: 'Kambing berhasil dihapus',
      data: { id }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
