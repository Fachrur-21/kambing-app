import prisma from '@/lib/prisma'
import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'

function parseId(params) {
  const id = Number(params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

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

export async function GET(_request, { params }) {
  const { id: rawId } = await params
  const id = Number(rawId)

  if (!Number.isInteger(id) || id <= 0) {
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
    const auth = verifyAuthToken(request)
    if (auth.error) {
      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    if (!hasProductManagerRole(auth.decoded)) {
      return Response.json({ message: 'Forbidden', data: null }, { status: 403 })
    }

    const { id: rawId } = await params
const id = Number(rawId)
if (!id || !Number.isInteger(id) || id <= 0) {
  return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
}

    const existing = await prisma.kambing.findUnique({
      where: { id }
    })

    if (!existing) {
      return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
    }

    const body = await request.json()
    const payload = parseKambingPayload(body)
    const errors = validateKambingPayload(payload)

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
    const auth = verifyAuthToken(request)
    if (auth.error) {
      return Response.json({ message: auth.error, data: null }, { status: auth.status })
    }

    if (!hasProductManagerRole(auth.decoded)) {
      return Response.json({ message: 'Forbidden', data: null }, { status: 403 })
    }

    const { id: rawId } = await params
const id = Number(rawId)
if (!id || !Number.isInteger(id) || id <= 0) {
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
