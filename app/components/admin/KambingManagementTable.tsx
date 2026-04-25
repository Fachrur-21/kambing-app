'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import BaseCrudTable, { type BaseTableColumn } from '@/app/components/common/BaseCrudTable'

type KambingRow = {
  id: number
  nama: string
  jenis: string
  berat: number
  harga: number
  hargaModal: number
  stok: number
  deskripsi: string | null
  imageUrl: string | null
  imageUrls?: string[]
  status: 'ready' | 'sold_out'
  createdAt: string
  updatedAt: string
}

type KambingResponse = {
  data?: KambingRow[]
  message?: string
  meta?: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

type KambingManagementTableProps = {
  token: string
  title: string
  addLabel: string
  detailPath: string
}

type FormMode = 'create' | 'edit'

type KambingForm = {
  nama: string
  jenis: string
  berat: string
  harga: string
  hargaModal: string
  stok: string
  imageUrls: string[]
  deskripsi: string
  status: 'ready' | 'sold_out'
}

const emptyForm: KambingForm = {
  nama: '',
  jenis: '',
  berat: '',
  harga: '',
  hargaModal: '',
  stok: '1',
  imageUrls: [],
  deskripsi: '',
  status: 'ready'
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0))
}

function normalizeStatus(status: string | null | undefined): 'ready' | 'sold_out' {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'sold_out' || normalized === 'sold out' || normalized === 'soldout') {
    return 'sold_out'
  }

  return 'ready'
}

function statusBadge(status: 'ready' | 'sold_out') {
  if (status === 'ready') {
    return <span className="rounded-full bg-lime-100 px-3 py-1 text-sm font-semibold text-lime-700">Ready</span>
  }

  return <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">Sold Out</span>
}

function normalizeImageUrls(value: unknown, fallback?: string | null): string[] {
  const fromArray = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter((item) => item.length > 0)
    : []

  if (fromArray.length > 0) {
    return fromArray
  }

  const fallbackValue = String(fallback || '').trim()
  return fallbackValue ? [fallbackValue] : []
}

export default function KambingManagementTable({
  token,
  title,
  addLabel,
  detailPath
}: KambingManagementTableProps) {
  const router = useRouter()
  const [rows, setRows] = useState<KambingRow[]>([])
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
  const [form, setForm] = useState<KambingForm>(emptyForm)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function loadKambing() {
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

      const response = await fetch(`/api/kambing?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const result: KambingResponse = await response.json()

      if (!response.ok) {
        setRows([])
        setTotal(0)
        setError(result?.message || 'Gagal memuat data kambing')
        return
      }

      setRows(result.data || [])
      setTotal(Number(result.meta?.total || 0))
    } catch {
      setRows([])
      setTotal(0)
      setError('Terjadi error saat memuat data kambing')
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
    const timer = setTimeout(() => {
      void loadKambing()
    }, 0)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, query])

  const columns = useMemo<BaseTableColumn<KambingRow>[]>(
    () => [
      { key: 'nama', label: 'Nama Hewan', render: (row) => <span className="text-sm">{row.nama}</span> },
      { key: 'jenis', label: 'Jenis Hewan', render: (row) => <span className="text-sm">{row.jenis}</span> },
      { key: 'berat', label: 'Berat', render: (row) => <span className="text-sm">{row.berat} Kg</span> },
      { key: 'harga', label: 'Harga', render: (row) => <span className="text-sm">{formatRupiah(row.harga)}</span> },
      { key: 'hargaModal', label: 'Harga Modal', render: (row) => <span className="text-sm">{formatRupiah(row.hargaModal)}</span> },
      { key: 'stok', label: 'Stok', render: (row) => <span className="text-sm">{row.stok}</span> },
      { key: 'status', label: 'Status', render: (row) => statusBadge(normalizeStatus(row.status)) }
    ],
    []
  )

  function openCreateModal() {
    setFormMode('create')
    setEditingId(null)
    setForm(emptyForm)
    setIsUploadingImage(false)
    setIsModalOpen(true)
  }

  function openEditModal(row: KambingRow) {
    setFormMode('edit')
    setEditingId(row.id)
    setForm({
      nama: row.nama || '',
      jenis: row.jenis || '',
      berat: String(row.berat ?? ''),
      harga: String(row.harga ?? ''),
      hargaModal: String(row.hargaModal ?? ''),
      stok: String(row.stok ?? '0'),
      imageUrls: normalizeImageUrls(row.imageUrls, row.imageUrl),
      deskripsi: row.deskripsi || '',
      status: normalizeStatus(row.status)
    })
    setIsUploadingImage(false)
    setIsModalOpen(true)
  }

  function openDetailPage(row: KambingRow) {
    router.push(`${detailPath}/${row.id}`)
  }

  function handleStatusChange(nextStatus: 'ready' | 'sold_out') {
    setForm((prev) => {
      if (nextStatus === 'sold_out') {
        return {
          ...prev,
          status: 'sold_out',
          stok: '0'
        }
      }

      const currentStok = Number(prev.stok || 0)

      return {
        ...prev,
        status: 'ready',
        stok: !Number.isFinite(currentStok) || currentStok <= 0 ? '1' : prev.stok
      }
    })
  }

  function handleStokChange(value: string) {
    setForm((prev) => {
      const numericValue = Number(value || 0)

      if (Number.isFinite(numericValue) && numericValue <= 0) {
        return {
          ...prev,
          stok: value,
          status: 'sold_out'
        }
      }

      return {
        ...prev,
        stok: value,
        status: 'ready'
      }
    })
  }

  async function handleDelete(row: KambingRow) {
    if (!confirm(`Tandai ${row.nama} sebagai sold out?`)) {
      return
    }

    try {
      const response = await fetch(`/api/kambing/${row.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (!response.ok) {
        alert(result?.message || 'Gagal ubah status kambing')
        return
      }

      await loadKambing()
    } catch {
      alert('Terjadi error saat ubah status kambing')
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    try {
      setIsUploadingImage(true)

      const formData = new FormData()
      files.forEach((file) => {
        formData.append('images', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      const result = await response.json()
      if (!response.ok || !Array.isArray(result?.data?.imageUrls)) {
        alert(result?.message || 'Gagal upload gambar')
        return
      }

      setForm((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...result.data.imageUrls]
      }))
    } catch {
      alert('Terjadi error saat upload gambar')
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.nama || !form.jenis || !form.berat || !form.harga || form.hargaModal === '') {
      alert('Nama, jenis, berat, harga, dan harga modal wajib diisi')
      return
    }

    const berat = Number(form.berat)
    const harga = Number(form.harga)
    const hargaModal = Number(form.hargaModal)
    const stok = Number(form.stok || 0)

    if (!Number.isFinite(berat) || berat <= 0) {
      alert('Berat harus angka lebih dari 0')
      return
    }

    if (!Number.isFinite(harga) || harga <= 0) {
      alert('Harga harus angka lebih dari 0')
      return
    }

    if (!Number.isFinite(hargaModal) || hargaModal < 0) {
      alert('Harga modal harus angka 0 atau lebih')
      return
    }

    if (!Number.isFinite(stok) || stok < 0) {
      alert('Stok harus angka 0 atau lebih')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        nama: form.nama,
        jenis: form.jenis,
        berat,
        harga,
        hargaModal,
        stok,
        imageUrls: form.imageUrls,
        imageUrl: form.imageUrls[0] || null,
        deskripsi: form.deskripsi,
        status: form.status
      }

      const endpoint = formMode === 'create' ? '/api/kambing' : `/api/kambing/${editingId}`
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
        alert(result?.message || 'Gagal menyimpan data kambing')
        return
      }

      setIsModalOpen(false)
      await loadKambing()
    } catch {
      alert('Terjadi error saat menyimpan data kambing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <BaseCrudTable<KambingRow>
        title={title}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Cari nama/jenis kambing..."
        addLabel={addLabel}
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

      {loading ? <p className="text-sm text-slate-500">Memuat data kambing...</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 px-4 py-6">
          <section className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between rounded-xl bg-lime-100 px-4 py-3 text-slate-800">
              <h3 className="inline-flex items-center gap-2 text-2xl font-semibold">
                {formMode === 'create' ? <AddCircleOutlineOutlinedIcon /> : <EditOutlinedIcon />}
                {formMode === 'create' ? 'Tambah Kambing' : 'Perbarui Kambing'}
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
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Upload Gambar</label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50">
                    <CloudUploadOutlinedIcon className="text-[20px]" />
                    {isUploadingImage ? 'Mengupload gambar...' : 'Pilih satu atau banyak file JPG/PNG/WEBP (max 5MB/file)'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>

                  {form.imageUrls.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-3 text-xs font-medium text-slate-500">Total gambar: {form.imageUrls.length}</p>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {form.imageUrls.map((url, index) => (
                          <div key={`${url}-${index}`} className="rounded-lg border border-slate-200 p-2">
                            <Image
                              src={url}
                              alt={`Preview gambar ${index + 1}`}
                              width={160}
                              height={120}
                              className="h-24 w-full rounded-md object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  imageUrls: prev.imageUrls.filter((_, imageIndex) => imageIndex !== index)
                                }))
                              }
                              className="mt-2 inline-flex items-center gap-1 rounded-md bg-rose-100 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200"
                            >
                              <DeleteOutlineOutlinedIcon className="text-[14px]" />
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <input
                  value={form.nama}
                  onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                  placeholder="Nama hewan *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  value={form.jenis}
                  onChange={(event) => setForm((prev) => ({ ...prev, jenis: event.target.value }))}
                  placeholder="Jenis *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.berat}
                  onChange={(event) => setForm((prev) => ({ ...prev, berat: event.target.value }))}
                  placeholder="Berat (kg) *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  type="number"
                  min="1"
                  value={form.harga}
                  onChange={(event) => setForm((prev) => ({ ...prev, harga: event.target.value }))}
                  placeholder="Harga *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  type="number"
                  min="0"
                  value={form.hargaModal}
                  onChange={(event) => setForm((prev) => ({ ...prev, hargaModal: event.target.value }))}
                  placeholder="Harga Modal *"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <input
                  type="number"
                  min="0"
                  value={form.stok}
                  onChange={(event) => handleStokChange(event.target.value)}
                  placeholder="Stok"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
                />
                <select
                  value={form.status}
                  onChange={(event) => handleStatusChange(event.target.value === 'sold_out' ? 'sold_out' : 'ready')}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-400"
                >
                  <option value="ready">Ready</option>
                  <option value="sold_out">Sold Out</option>
                </select>
              </div>

              <textarea
                value={form.deskripsi}
                onChange={(event) => setForm((prev) => ({ ...prev, deskripsi: event.target.value }))}
                placeholder="Deskripsi"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-400"
              />

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
                  disabled={isSubmitting || isUploadingImage}
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
