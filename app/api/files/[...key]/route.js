import { readFile } from 'fs/promises'
import path from 'path'
import { resolvePrivateStoragePath } from '@/lib/private-upload-storage'

export const runtime = 'nodejs'

const CONTENT_TYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

function getContentType(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase()
  return CONTENT_TYPE_BY_EXTENSION[ext] || 'application/octet-stream'
}

export async function GET(request, context) {
  try {
    const params = await context?.params
    const rawParts = Array.isArray(params?.key) ? params.key : []
    const storageKey = rawParts.join('/')

    const absolutePath = resolvePrivateStoragePath(storageKey)
    if (!absolutePath) {
      return Response.json({ message: 'File tidak valid', data: null }, { status: 400 })
    }

    const buffer = await readFile(absolutePath)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': getContentType(absolutePath),
        'Cache-Control': 'private, max-age=60'
      }
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return Response.json({ message: 'File tidak ditemukan', data: null }, { status: 404 })
    }

    console.error(error)
    return Response.json({ message: 'Terjadi error saat membaca file', data: null }, { status: 500 })
  }
}
