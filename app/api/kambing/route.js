import prisma from '@/lib/prisma'
import { requireProductManager } from '@/lib/auth'
import { validateAndNormalizeKambingPayload } from '@/lib/kambing-payload'

export async function GET() {
  const data = await prisma.kambing.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return Response.json({
    message: 'Data kambing',
    data
  })
}

export async function POST(request) {
  try {
    const auth = requireProductManager(request)
    if (auth.error) {
      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    const body = await request.json()
    const { payload, errors } = validateAndNormalizeKambingPayload(body)

    if (errors.length > 0) {
      return Response.json({ message: errors.join(', '), data: null }, { status: 400 })
    }

    const data = await prisma.kambing.create({
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
      message: 'Kambing berhasil ditambahkan',
      data
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
