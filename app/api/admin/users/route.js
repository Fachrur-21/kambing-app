import bcrypt from 'bcryptjs'
import db, { query, queryOne } from '@/lib/db'
import { hasAdminRole, verifyAuthToken } from '@/lib/auth'

const ALLOWED_ADMIN_CREATE_ROLES = ['owner', 'pegawai']
const MAX_PER_PAGE = 100

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-\s()]{8,20}$/

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value)
  return normalized || null
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function normalizeRole(value) {
  return normalizeString(value).toLowerCase()
}

async function ensureAdmin(request) {
  const auth = verifyAuthToken(request)
  if (auth.error) {
    return { error: Response.json({ message: auth.error, data: null }, { status: auth.status }) }
  }

  if (!hasAdminRole(auth.decoded)) {
    return { error: Response.json({ message: 'Forbidden', data: null }, { status: 403 }) }
  }

  return { decoded: auth.decoded }
}

async function getRoleIdByName(roleName) {
  const role = await queryOne('SELECT id, name FROM roles WHERE name = ? LIMIT 1', [roleName])
  if (!role) {
    return null
  }

  return role.id
}

export async function GET(request) {
  try {
    const adminCheck = await ensureAdmin(request)
    if (adminCheck.error) {
      return adminCheck.error
    }

    const { searchParams } = new URL(request.url)
    const q = normalizeString(searchParams.get('q')).toLowerCase()
    const role = normalizeRole(searchParams.get('role'))
    const isActiveRaw = normalizeString(searchParams.get('is_active')).toLowerCase()
    const page = Math.max(parseInteger(searchParams.get('page'), 1), 1)
    const perPage = Math.min(Math.max(parseInteger(searchParams.get('perPage'), 20), 1), MAX_PER_PAGE)
    const offset = (page - 1) * perPage

    const whereClauses = []
    const params = []

    if (q) {
      whereClauses.push('(LOWER(nama) LIKE ? OR LOWER(email) LIKE ? OR LOWER(username) LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }

    if (role) {
      whereClauses.push('role = ?')
      params.push(role)
    }

    if (isActiveRaw === '1' || isActiveRaw === 'true' || isActiveRaw === '0' || isActiveRaw === 'false') {
      const isActive = isActiveRaw === '1' || isActiveRaw === 'true' ? 1 : 0
      whereClauses.push('is_active = ?')
      params.push(isActive)
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const totalRows = await queryOne(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params)
    const total = Number(totalRows?.total || 0)

    const users = await query(
      `SELECT id, nama, alamat, no_tlpn, email, username, role, role_id, is_active, email_verified_at, created_at
       FROM users
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    )

    return Response.json({
      message: 'Data users',
      allowedRoles: ALLOWED_ADMIN_CREATE_ROLES,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      },
      data: users
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const adminCheck = await ensureAdmin(request)
    if (adminCheck.error) {
      return adminCheck.error
    }

    const body = await request.json()
    const nama = normalizeString(body?.nama)
    const email = normalizeString(body?.email).toLowerCase()
    const username = normalizeString(body?.username).toLowerCase()
    const password = String(body?.password || '')
    const role = normalizeRole(body?.role)
    const alamat = normalizeOptionalString(body?.alamat)
    const noTlpn = normalizeOptionalString(body?.no_tlpn)

    if (!nama || !email || !username || !password || !role) {
      return Response.json({ message: 'nama, email, username, password, role wajib diisi', data: null }, { status: 400 })
    }

    if (!ALLOWED_ADMIN_CREATE_ROLES.includes(role)) {
      return Response.json({ message: 'Role tidak diizinkan untuk dibuat admin', data: null }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ message: 'Password minimal 6 karakter', data: null }, { status: 400 })
    }

    if (!EMAIL_PATTERN.test(email)) {
      return Response.json({ message: 'Format email tidak valid', data: null }, { status: 400 })
    }

    if (noTlpn && !PHONE_PATTERN.test(noTlpn)) {
      return Response.json({ message: 'Format no_tlpn tidak valid', data: null }, { status: 400 })
    }

    const existingEmail = await queryOne('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
    if (existingEmail) {
      return Response.json({ message: 'Email sudah terdaftar', data: null }, { status: 400 })
    }

    const existingUsername = await queryOne('SELECT id FROM users WHERE username = ? LIMIT 1', [username])
    if (existingUsername) {
      return Response.json({ message: 'Username sudah dipakai', data: null }, { status: 400 })
    }

    const roleId = await getRoleIdByName(role)
    if (!roleId) {
      return Response.json({ message: 'Role tidak ditemukan pada tabel roles', data: null }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const [result] = await db.execute(
      'INSERT INTO users (nama, alamat, no_tlpn, email, username, password, role, role_id, email_verified_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)',
      [nama, alamat, noTlpn, email, username, hashedPassword, role, roleId]
    )

    const createdUser = await queryOne(
      'SELECT id, nama, alamat, no_tlpn, email, username, role, role_id, is_active, email_verified_at, created_at FROM users WHERE id = ? LIMIT 1',
      [result.insertId]
    )

    return Response.json({
      message: 'User berhasil dibuat admin',
      allowedRoles: ALLOWED_ADMIN_CREATE_ROLES,
      data: createdUser
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}