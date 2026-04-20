import prisma from '@/lib/prisma'
import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'

function parseKambingPayload(body) {
  const nama = typeof body.nama === 'string' ? body.nama.trim() : ''
  const jenis = typeof body.jenis === 'string' ? body.jenis.trim() : ''
  const berat = Number(body.berat)
  const harga = Number(body.harga)
  const stok = body.stok === undefined || body.stok === null || body.stok === '' ? 0 : Number(body.stok)
  const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
  const deskripsi = typeof body.deskripsi === 'string' && body.deskripsi.trim() ? body.deskripsi.trim() : null
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  return { nama, jenis, berat, harga, stok, imageUrl, deskripsi, isActive }
}

function validateKambingPayload(payload) {
  const errors = []

  if (!payload.nama) errors.push('nama wajib diisi')
  if (!payload.jenis) errors.push('jenis wajib diisi')
  if (!Number.isFinite(payload.berat)) errors.push('berat wajib berupa angka')
  if (!Number.isFinite(payload.harga)) errors.push('harga wajib berupa angka')
  if (!Number.isFinite(payload.stok)) errors.push('stok wajib berupa angka')

  return errors
}

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
    const auth = verifyAuthToken(request)
    if (auth.error) {
      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    if (!hasProductManagerRole(auth.decoded)) {
      return Response.json({ message: 'Forbidden', data: null }, { status: 403 })
    }

    const body = await request.json()
    const payload = parseKambingPayload(body)
    const errors = validateKambingPayload(payload)

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
