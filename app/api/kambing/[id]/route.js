import db, { query, queryOne } from '@/lib/db'
import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (normalized === 'ready' || normalized === 'available') {
    return 'ready'
  }

  if (normalized === 'sold_out' || normalized === 'sold out' || normalized === 'soldout') {
    return 'sold_out'
  }

  return null
}

function getAvailabilityStatus(stok) {
  return Number(stok || 0) > 0 ? 'ready' : 'sold_out'
}

function normalizeImageUrls(value) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || '').trim())
          .filter((item) => item.length > 0)
      }
    } catch {
      return [trimmed]
    }
  }

  return []
}

function mapKambingRecord(record) {
  if (!record) {
    return record
  }

  const imageUrls = normalizeImageUrls(record.imageUrls)
  const fallbackImageUrl = typeof record.imageUrl === 'string' ? record.imageUrl.trim() : ''
  const normalizedImageUrls = imageUrls.length > 0 ? imageUrls : fallbackImageUrl ? [fallbackImageUrl] : []

  return {
    ...record,
    hargaModal: Number(record.harga_modal ?? record.hargaModal ?? 0),
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrls[0] || null,
    status: getAvailabilityStatus(record.stok)
  }
}

function parseKambingPayload(body) {
  const nama = typeof body.nama === 'string' ? body.nama.trim() : ''
  const jenis = typeof body.jenis === 'string' ? body.jenis.trim() : ''
  const berat = Number(body.berat)
  const harga = Number(body.harga)
  const hargaModal = Number(body.hargaModal ?? body.harga_modal)
  const requestedStatus = normalizeStatus(body.status)
  const parsedStok = body.stok === undefined || body.stok === null || body.stok === '' ? 0 : Number(body.stok)
  const stok = requestedStatus === 'sold_out' ? 0 : requestedStatus === 'ready' && parsedStok <= 0 ? 1 : parsedStok
  const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
  const imageUrls = normalizeImageUrls(body.imageUrls)
  const normalizedImageUrls = imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : []
  const deskripsi = typeof body.deskripsi === 'string' && body.deskripsi.trim() ? body.deskripsi.trim() : null
  const status = getAvailabilityStatus(stok)

  return {
    nama,
    jenis,
    berat,
    harga,
    hargaModal,
    stok,
    imageUrls: normalizedImageUrls,
    imageUrl: normalizedImageUrls[0] || null,
    deskripsi,
    status
  }
}

function validateKambingPayload(payload) {
  const errors = []

  if (!payload.nama) errors.push('nama wajib diisi')
  if (!payload.jenis) errors.push('jenis wajib diisi')
  if (!Number.isFinite(payload.berat) || payload.berat <= 0) errors.push('berat wajib berupa angka lebih dari 0')
  if (!Number.isFinite(payload.harga) || payload.harga <= 0) errors.push('harga wajib berupa angka lebih dari 0')
  if (!Number.isFinite(payload.hargaModal) || payload.hargaModal < 0) errors.push('harga modal wajib berupa angka 0 atau lebih')
  if (!Number.isFinite(payload.stok) || payload.stok < 0) errors.push('stok wajib berupa angka 0 atau lebih')
  if (payload.status !== 'ready' && payload.status !== 'sold_out') errors.push('status harus ready atau sold_out')

  return errors
}

function ensureProductManager(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  if (!hasProductManagerRole(auth.decoded)) {
    return { error: Response.json({ message: 'Forbidden', data: null }, { status: 403 }) }
  }

  return { decoded: auth.decoded }
}

async function parseKambingId(context) {
  const params = await context?.params
  const rawId = String(params?.id || '')
  const id = Number.parseInt(rawId, 10)

  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  return id
}

export async function GET(request, context) {
  const access = ensureProductManager(request)
  if (access.error) {
    return access.error
  }

  const id = await parseKambingId(context)

  if (!id) {
    return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
  }

  const data = await queryOne('SELECT * FROM kambing WHERE id = ? LIMIT 1', [id])

  if (!data) {
    return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
  }

  return Response.json({ message: 'Detail kambing', data: mapKambingRecord(data) })
}

export async function PUT(request, context) {
  try {
    const access = ensureProductManager(request)
    if (access.error) {
      return access.error
    }

    const id = await parseKambingId(context)
    if (!id) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const existing = await queryOne('SELECT id FROM kambing WHERE id = ? LIMIT 1', [id])

    if (!existing) {
      return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
    }

    const body = await request.json()
    const payload = parseKambingPayload(body)
    const errors = validateKambingPayload(payload)

    if (errors.length > 0) {
      return Response.json({ message: errors.join(', '), data: null }, { status: 400 })
    }

    await query(
      'UPDATE kambing SET nama = ?, jenis = ?, berat = ?, harga = ?, harga_modal = ?, stok = ?, imageUrl = ?, imageUrls = ?, deskripsi = ?, status = ?, isActive = ?, updatedAt = NOW() WHERE id = ?',
      [
        payload.nama,
        payload.jenis,
        payload.berat,
        payload.harga,
        payload.hargaModal,
        payload.stok,
        payload.imageUrl,
        JSON.stringify(payload.imageUrls),
        payload.deskripsi,
        payload.status,
        payload.status === 'ready' ? 1 : 0,
        id
      ]
    )

    const data = await queryOne('SELECT * FROM kambing WHERE id = ? LIMIT 1', [id])

    return Response.json({
      message: 'Kambing berhasil diupdate',
      data: mapKambingRecord(data)
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function DELETE(request, context) {
  try {
    const access = ensureProductManager(request)
    if (access.error) {
      return access.error
    }

    const id = await parseKambingId(context)
    if (!id) {
      return Response.json({ message: 'ID tidak valid', data: null }, { status: 400 })
    }

    const existing = await queryOne('SELECT id FROM kambing WHERE id = ? LIMIT 1', [id])

    if (!existing) {
      return Response.json({ message: 'Kambing tidak ditemukan', data: null }, { status: 404 })
    }

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const [historyRows] = await connection.execute('SELECT COUNT(*) AS total FROM order_items WHERE kambing_id = ?', [id])
      const hasOrderHistory = Number(historyRows?.[0]?.total || 0) > 0

      if (hasOrderHistory) {
        await connection.execute(
          "UPDATE kambing SET stok = 0, status = 'sold_out', isActive = 0, updatedAt = NOW() WHERE id = ?",
          [id]
        )

        await connection.execute('DELETE FROM keranjang WHERE kambing_id = ?', [id])

        await connection.commit()

        return Response.json({
          message: 'Kambing memiliki riwayat pesanan, jadi hanya ditandai sold out',
          data: { id, status: 'sold_out', deleted: false }
        })
      }

      await connection.execute('DELETE FROM keranjang WHERE kambing_id = ?', [id])
      await connection.execute('DELETE FROM kambing WHERE id = ?', [id])
      await connection.commit()

    return Response.json({
      message: 'Kambing berhasil dihapus',
      data: { id, deleted: true }
    })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
