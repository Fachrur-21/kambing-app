import bcrypt from 'bcryptjs'
import { query, queryOne } from '@/lib/db'
import { hasAdminRole, verifyAuthToken } from '@/lib/auth'

const ALLOWED_ADMIN_UPDATE_ROLES = ['owner', 'pegawai', 'pembeli']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\-\s()]{8,20}$/

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value)
  return normalized || null
}

async function parseUserId(context) {
  const params = await context?.params
  const rawId = String(params?.id || '')
  const id = Number.parseInt(rawId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
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
  const role = await queryOne('SELECT id FROM roles WHERE name = ? LIMIT 1', [roleName])
  return role?.id || null
}

async function getUserById(id) {
  return queryOne(
    `SELECT id, nama, alamat, no_tlpn, email, username, role, role_id, is_active, email_verified_at, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  )
}

export async function GET(request, context) {
  try {
    const adminCheck = await ensureAdmin(request)
    if (adminCheck.error) {
      return adminCheck.error
    }

    const id = await parseUserId(context)
    if (!id) {
      return Response.json({ message: 'ID user tidak valid', data: null }, { status: 400 })
    }

    const user = await getUserById(id)
    if (!user) {
      return Response.json({ message: 'User tidak ditemukan', data: null }, { status: 404 })
    }

    return Response.json({
      message: 'Detail user',
      data: user
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function PUT(request, context) {
  try {
    const adminCheck = await ensureAdmin(request)
    if (adminCheck.error) {
      return adminCheck.error
    }

    const id = await parseUserId(context)
    if (!id) {
      return Response.json({ message: 'ID user tidak valid', data: null }, { status: 400 })
    }

    const existingUser = await getUserById(id)
    if (!existingUser) {
      return Response.json({ message: 'User tidak ditemukan', data: null }, { status: 404 })
    }

    const body = await request.json()

    const nama = normalizeString(body?.nama || existingUser.nama)
    const alamat = normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(body || {}, 'alamat') ? body?.alamat : existingUser.alamat
    )
    const noTlpn = normalizeOptionalString(
      Object.prototype.hasOwnProperty.call(body || {}, 'no_tlpn') ? body?.no_tlpn : existingUser.no_tlpn
    )
    const email = normalizeString(body?.email || existingUser.email).toLowerCase()
    const username = normalizeString(body?.username || existingUser.username).toLowerCase()
    const role = normalizeString(body?.role || existingUser.role).toLowerCase()
    const password = normalizeString(body?.password)
    const isActiveRaw = Object.prototype.hasOwnProperty.call(body || {}, 'is_active') ? body?.is_active : existingUser.is_active
    const isActive = Number(isActiveRaw) === 1 || String(isActiveRaw).toLowerCase() === 'true' ? 1 : 0

    if (!nama || !email || !username || !role) {
      return Response.json({ message: 'nama, email, username, role wajib diisi', data: null }, { status: 400 })
    }

    if (!EMAIL_PATTERN.test(email)) {
      return Response.json({ message: 'Format email tidak valid', data: null }, { status: 400 })
    }

    if (noTlpn && !PHONE_PATTERN.test(noTlpn)) {
      return Response.json({ message: 'Format no_tlpn tidak valid', data: null }, { status: 400 })
    }

    if (!ALLOWED_ADMIN_UPDATE_ROLES.includes(role) && role !== 'admin') {
      return Response.json({ message: 'Role tidak diizinkan', data: null }, { status: 400 })
    }

    const conflictEmail = await queryOne('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, id])
    if (conflictEmail) {
      return Response.json({ message: 'Email sudah dipakai user lain', data: null }, { status: 400 })
    }

    const conflictUsername = await queryOne('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [username, id])
    if (conflictUsername) {
      return Response.json({ message: 'Username sudah dipakai user lain', data: null }, { status: 400 })
    }

    const roleId = await getRoleIdByName(role)
    if (!roleId) {
      return Response.json({ message: 'Role tidak ditemukan pada tabel roles', data: null }, { status: 400 })
    }

    if (password) {
      if (password.length < 6) {
        return Response.json({ message: 'Password minimal 6 karakter', data: null }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      await query(
        `UPDATE users
         SET nama = ?, alamat = ?, no_tlpn = ?, email = ?, username = ?, role = ?, role_id = ?, is_active = ?, password = ?
         WHERE id = ?`,
        [nama, alamat, noTlpn, email, username, role, roleId, isActive, hashedPassword, id]
      )
    } else {
      await query(
        `UPDATE users
         SET nama = ?, alamat = ?, no_tlpn = ?, email = ?, username = ?, role = ?, role_id = ?, is_active = ?
         WHERE id = ?`,
        [nama, alamat, noTlpn, email, username, role, roleId, isActive, id]
      )
    }

    const updatedUser = await getUserById(id)

    return Response.json({
      message: 'User berhasil diperbarui',
      data: updatedUser
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function PATCH(request, context) {
  try {
    const adminCheck = await ensureAdmin(request)
    if (adminCheck.error) {
      return adminCheck.error
    }

    const id = await parseUserId(context)
    if (!id) {
      return Response.json({ message: 'ID user tidak valid', data: null }, { status: 400 })
    }

    const existingUser = await getUserById(id)
    if (!existingUser) {
      return Response.json({ message: 'User tidak ditemukan', data: null }, { status: 404 })
    }

    const body = await request.json()
    const isActiveRaw = body?.is_active
    const isActive = Number(isActiveRaw) === 1 || String(isActiveRaw).toLowerCase() === 'true' ? 1 : 0

    await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id])

    const updatedUser = await getUserById(id)
    return Response.json({
      message: 'Status user berhasil diubah',
      data: updatedUser
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}

export async function DELETE(request, context) {
  try {
    const adminCheck = await ensureAdmin(request)
    if (adminCheck.error) {
      return adminCheck.error
    }

    const id = await parseUserId(context)
    if (!id) {
      return Response.json({ message: 'ID user tidak valid', data: null }, { status: 400 })
    }

    const existingUser = await getUserById(id)
    if (!existingUser) {
      return Response.json({ message: 'User tidak ditemukan', data: null }, { status: 404 })
    }

    if (String(existingUser.role).toLowerCase() === 'admin') {
      return Response.json({ message: 'Admin tidak bisa dihapus lewat endpoint ini', data: null }, { status: 400 })
    }

    await query('UPDATE users SET is_active = 0 WHERE id = ?', [id])

    return Response.json({
      message: 'User berhasil dinonaktifkan',
      data: { id, is_active: 0 }
    })
  } catch (error) {
    console.error(error)
    return Response.json({ message: 'Terjadi error', data: null }, { status: 500 })
  }
}
