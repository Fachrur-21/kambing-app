'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import BaseCrudTable, { type BaseTableColumn } from '@/app/components/common/BaseCrudTable'

type UserRole = 'admin' | 'owner' | 'pegawai' | 'pembeli'

type UserRow = {
  id: number
  nama: string | null
  alamat: string | null
  no_tlpn: string | null
  email: string | null
  username: string
  role: UserRole
  is_active: number
  email_verified_at: string | null
  created_at: string
}

type UsersResponse = {
  data?: UserRow[]
  message?: string
  meta?: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

type UserManagementTableProps = {
  token: string
}

type FormMode = 'create' | 'edit'

type UserForm = {
  nama: string
  email: string
  username: string
  password: string
  role: 'owner' | 'pegawai'
  alamat: string
  no_tlpn: string
  is_active: boolean
}

const emptyForm: UserForm = {
  nama: '',
  email: '',
  username: '',
  password: '',
  role: 'pegawai',
  alamat: '',
  no_tlpn: '',
  is_active: true
}

function statusBadge(active: number) {
  if (active === 1) {
    return <span className="rounded-full bg-lime-100 px-3 py-1 text-sm font-semibold text-lime-700">Aktif</span>
  }

  return <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">Nonaktif</span>
}

export default function UserManagementTable({ token }: UserManagementTableProps) {
  const router = useRouter()
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)
  const [total, setTotal] = useState(0)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadUsers() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage)
      })
      if (query) {
        params.set('q', query)
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const result: UsersResponse = await response.json()

      if (!response.ok) {
        setError(result?.message || 'Gagal memuat data user')
        setRows([])
        return
      }

      setRows(result.data || [])
      setTotal(Number(result.meta?.total || 0))
    } catch {
      setError('Terjadi error saat memuat data user')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(searchInput.trim())
      setPage(1)
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, query])

  const columns = useMemo<BaseTableColumn<UserRow>[]>(
    () => [
      { key: 'username', label: 'Username', render: (row) => <span className="text-sm">{row.username}</span> },
      { key: 'nama', label: 'Nama', render: (row) => <span className="text-sm">{row.nama || '-'}</span> },
      { key: 'email', label: 'Email', render: (row) => <span className="text-sm">{row.email || '-'}</span> },
      { key: 'role', label: 'Role', render: (row) => <span className="text-sm capitalize">{row.role}</span> },
      { key: 'status', label: 'Status', render: (row) => statusBadge(row.is_active) }
    ],
    []
  )

  function openCreateModal() {
    setFormMode('create')
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  function openEditModal(row: UserRow) {
    setFormMode('edit')
    setEditingId(row.id)
    setForm({
      nama: row.nama || '',
      email: row.email || '',
      username: row.username,
      password: '',
      role: row.role === 'owner' ? 'owner' : 'pegawai',
      alamat: row.alamat || '',
      no_tlpn: row.no_tlpn || '',
      is_active: Number(row.is_active) === 1
    })
    setIsModalOpen(true)
  }

  async function handleDelete(row: UserRow) {
    if (!confirm(`Nonaktifkan user ${row.username}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${row.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        alert('Gagal nonaktifkan user')
        return
      }

      await loadUsers()
    } catch {
      alert('Terjadi error saat nonaktifkan user')
    }
  }

  function openDetailPage(row: UserRow) {
    router.push(`/admin/users/${row.id}`)
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.nama || !form.email || !form.username) {
      alert('Nama, email, dan username wajib diisi')
      return
    }

    if (formMode === 'create' && !form.password) {
      alert('Password wajib diisi untuk user baru')
      return
    }

    try {
      setIsSubmitting(true)

      const payload: Record<string, string | number> = {
        nama: form.nama,
        email: form.email,
        username: form.username,
        role: form.role,
        alamat: form.alamat,
        no_tlpn: form.no_tlpn,
        is_active: form.is_active ? 1 : 0
      }

      if (form.password) {
        payload.password = form.password
      }

      const endpoint = formMode === 'create' ? '/api/admin/users' : `/api/admin/users/${editingId}`
      const method = formMode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) {
        alert(result?.message || 'Gagal menyimpan user')
        return
      }

      setIsModalOpen(false)
      await loadUsers()
    } catch {
      alert('Terjadi error saat menyimpan user')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <BaseCrudTable<UserRow>
        title="List User"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Cari nama, username, email..."
        addLabel="Tambah User"
        onAdd={openCreateModal}
        onView={openDetailPage}
        onEdit={openEditModal}
        onDelete={handleDelete}
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={(nextPerPage) => {
          setPerPage(nextPerPage)
          setPage(1)
        }}
      />

      {loading ? <p className="text-sm text-slate-500">Memuat data user...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
          <section className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between rounded-xl bg-lime-100 px-4 py-3 text-slate-800">
              <h3 className="inline-flex items-center gap-2 text-2xl font-semibold">
                {formMode === 'create' ? <AddCircleOutlineOutlinedIcon /> : <EditOutlinedIcon />}
                {formMode === 'create' ? 'Tambah User' : 'Perbarui User'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white/60"
              >
                <CloseOutlinedIcon />
              </button>
            </div>

            <form className="space-y-3" onSubmit={submitForm}>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={form.nama}
                  onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                  placeholder="Nama *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  value={form.username}
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="Username *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={formMode === 'create' ? 'Password *' : 'Password baru (opsional)'}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as 'owner' | 'pegawai' }))}
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                >
                  <option value="pegawai">Pegawai</option>
                  <option value="owner">Owner</option>
                </select>
                <input
                  value={form.no_tlpn}
                  onChange={(event) => setForm((prev) => ({ ...prev, no_tlpn: event.target.value }))}
                  placeholder="No. Telepon"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
              </div>

              <textarea
                value={form.alamat}
                onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))}
                placeholder="Alamat"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
              />

              <label className="inline-flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Status aktif
              </label>

              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-rose-500 px-7 py-2.5 text-lg font-semibold text-white transition hover:bg-rose-600"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-7 py-2.5 text-lg font-semibold text-white transition hover:bg-lime-600 disabled:opacity-60"
                >
                  <SaveOutlinedIcon className="text-[18px]" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}
