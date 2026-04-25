import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const DEFAULT_UPLOAD_ROOT = path.join(process.cwd(), 'storage', 'uploads')

function normalizeScope(scope) {
  const text = String(scope || '').trim().toLowerCase()
  return /^[a-z0-9_-]+$/.test(text) ? text : null
}

export function getPrivateUploadsRoot() {
  const configuredRoot = String(process.env.PRIVATE_UPLOAD_DIR || '').trim()
  if (!configuredRoot) {
    return DEFAULT_UPLOAD_ROOT
  }

  return path.resolve(configuredRoot)
}

export function getFileExtension(file) {
  const byName = path.extname(String(file?.name || '')).toLowerCase()
  if (byName && byName.length <= 5) {
    return byName
  }

  if (file?.type === 'image/jpeg') return '.jpg'
  if (file?.type === 'image/png') return '.png'
  if (file?.type === 'image/webp') return '.webp'

  return '.jpg'
}

export function buildPrivateFileUrl(storageKey) {
  const normalized = String(storageKey || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  if (normalized.length === 0) {
    return null
  }

  return `/api/files/${normalized.map((part) => encodeURIComponent(part)).join('/')}`
}

export function resolvePrivateStoragePath(storageKey) {
  const root = getPrivateUploadsRoot()
  const parts = String(storageKey || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0 || parts.some((part) => part === '.' || part === '..')) {
    return null
  }

  const absolutePath = path.resolve(root, ...parts)
  const normalizedRoot = root.endsWith(path.sep) ? root : `${root}${path.sep}`

  if (absolutePath !== root && !absolutePath.startsWith(normalizedRoot)) {
    return null
  }

  return absolutePath
}

export async function savePrivateUploadFile(file, scope) {
  const normalizedScope = normalizeScope(scope)
  if (!normalizedScope) {
    throw new Error('SCOPE_TIDAK_VALID')
  }

  const uploadRoot = getPrivateUploadsRoot()
  const uploadDir = path.join(uploadRoot, normalizedScope)
  await mkdir(uploadDir, { recursive: true })

  const ext = getFileExtension(file)
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`
  const absolutePath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())

  await writeFile(absolutePath, buffer)

  const storageKey = `${normalizedScope}/${filename}`

  return {
    storageKey,
    accessUrl: buildPrivateFileUrl(storageKey)
  }
}
