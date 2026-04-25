import { hasProductManagerRole, verifyAuthToken } from '@/lib/auth'
import { savePrivateUploadFile } from '@/lib/private-upload-storage'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FILE_COUNT = 10
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

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

async function saveImageFile(file) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('FORMAT_TIDAK_VALID')
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error('UKURAN_TIDAK_VALID')
  }

  const result = await savePrivateUploadFile(file, 'kambing')
  return result.accessUrl
}

export async function POST(request) {
  try {
    const access = ensureProductManager(request)
    if (access.error) {
      return access.error
    }

    const formData = await request.formData()
    const multiFiles = formData.getAll('images')
    const singleFile = formData.get('image')

    const files = (multiFiles.length > 0 ? multiFiles : [singleFile]).filter(
      (file) => file && typeof file.arrayBuffer === 'function'
    )

    if (files.length === 0) {
      return Response.json({ message: 'File gambar tidak ditemukan', data: null }, { status: 400 })
    }

    if (files.length > MAX_FILE_COUNT) {
      return Response.json({ message: `Maksimal upload ${MAX_FILE_COUNT} gambar sekaligus`, data: null }, { status: 400 })
    }

    const imageUrls = []

    for (const file of files) {
      try {
        const imageUrl = await saveImageFile(file)
        imageUrls.push(imageUrl)
      } catch (error) {
        if (error instanceof Error && error.message === 'FORMAT_TIDAK_VALID') {
          return Response.json({ message: 'Format gambar harus JPG, PNG, atau WEBP', data: null }, { status: 400 })
        }

        if (error instanceof Error && error.message === 'UKURAN_TIDAK_VALID') {
          return Response.json({ message: 'Ukuran masing-masing gambar maksimal 5MB', data: null }, { status: 400 })
        }

        throw error
      }
    }

    return Response.json({
      message: 'Upload gambar berhasil',
      data: {
        imageUrl: imageUrls[0] || null,
        imageUrls
      }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error saat upload gambar', data: null }, { status: 500 })
  }
}
