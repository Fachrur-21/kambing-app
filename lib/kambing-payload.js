export function parsePositiveInt(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

export function validateAndNormalizeKambingPayload(body) {
  const source = body && typeof body === 'object' ? body : {}
  const errors = []

  const nama = typeof source.nama === 'string' ? source.nama.trim() : ''
  if (!nama) {
    errors.push('nama wajib diisi')
  }

  const jenis = typeof source.jenis === 'string' ? source.jenis.trim() : ''
  if (!jenis) {
    errors.push('jenis wajib diisi')
  }

  const berat = Number(source.berat)
  if (!Number.isFinite(berat) || berat <= 0) {
    errors.push('berat wajib berupa angka lebih dari 0')
  }

  const harga = Number(source.harga)
  if (!Number.isFinite(harga) || harga < 0) {
    errors.push('harga wajib berupa angka lebih dari atau sama dengan 0')
  }

  const stokRaw = source.stok
  let stok = Number(stokRaw)
  if (stokRaw === undefined || stokRaw === null || stokRaw === '') {
    errors.push('stok wajib diisi')
    stok = NaN
  } else if (!Number.isInteger(stok) || stok < 0) {
    errors.push('stok wajib berupa bilangan bulat lebih dari atau sama dengan 0')
  }

  let imageUrl = null
  if (source.imageUrl !== undefined && source.imageUrl !== null && source.imageUrl !== '') {
    if (typeof source.imageUrl !== 'string') {
      errors.push('imageUrl harus berupa string')
    } else {
      imageUrl = source.imageUrl.trim() || null
    }
  }

  let deskripsi = null
  if (source.deskripsi !== undefined && source.deskripsi !== null && source.deskripsi !== '') {
    if (typeof source.deskripsi !== 'string') {
      errors.push('deskripsi harus berupa string')
    } else {
      deskripsi = source.deskripsi.trim() || null
    }
  }

  const isActive = source.isActive === undefined ? true : Boolean(source.isActive)

  return {
    errors,
    payload: {
      nama,
      jenis,
      berat,
      harga,
      stok,
      imageUrl,
      deskripsi,
      isActive
    }
  }
}
