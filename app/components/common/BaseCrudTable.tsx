'use client'

import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'

export type BaseTableColumn<T> = {
  key: string
  label: string
  className?: string
  render: (row: T) => React.ReactNode
}

type BaseCrudTableProps<T> = {
  title: string
  columns: BaseTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  addLabel?: string
  onAdd?: () => void
  onView?: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

function ActionButton({
  variant,
  onClick,
  children,
  title
}: {
  variant: 'view' | 'edit' | 'delete'
  onClick: () => void
  children: React.ReactNode
  title: string
}) {
  const colorClass =
    variant === 'view'
      ? 'bg-sky-500 hover:bg-sky-600'
      : variant === 'edit'
        ? 'bg-amber-500 hover:bg-amber-600'
        : 'bg-red-500 hover:bg-red-600'

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg text-white transition ${colorClass}`}
    >
      {children}
    </button>
  )
}

export default function BaseCrudTable<T>({
  title,
  columns,
  rows,
  rowKey,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  addLabel = 'Tambah Data',
  onAdd,
  onView,
  onEdit,
  onDelete,
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange
}: BaseCrudTableProps<T>) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const totalPages = Math.max(Math.ceil(total / perPage), 1)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-[32px] font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-[260px]">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition hover:bg-indigo-600"
          >
            <AddIcon className="text-xl" />
            {addLabel}
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-100 text-left">
              {(onView || onEdit || onDelete) ? (
                <th className="px-5 py-3 text-[16px] font-semibold uppercase tracking-wide text-slate-700">Aksi</th>
              ) : null}
              {columns.map((column) => (
                <th key={column.key} className={`px-5 py-3 text-[16px] font-semibold uppercase tracking-wide text-slate-700 ${column.className || ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + ((onView || onEdit || onDelete) ? 1 : 0)}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  Data belum tersedia.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t border-slate-200 text-slate-700">
                  {(onView || onEdit || onDelete) ? (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {onView ? (
                          <ActionButton variant="view" title="Lihat" onClick={() => onView(row)}>
                            <VisibilityOutlinedIcon className="text-[18px]" />
                          </ActionButton>
                        ) : null}
                        {onEdit ? (
                          <ActionButton variant="edit" title="Edit" onClick={() => onEdit(row)}>
                            <EditOutlinedIcon className="text-[18px]" />
                          </ActionButton>
                        ) : null}
                        {onDelete ? (
                          <ActionButton variant="delete" title="Hapus/Nonaktifkan" onClick={() => onDelete(row)}>
                            <DeleteOutlineOutlinedIcon className="text-[18px]" />
                          </ActionButton>
                        ) : null}
                      </div>
                    </td>
                  ) : null}

                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-3 text-base">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 text-[15px] text-slate-600 sm:flex-row sm:items-center sm:justify-end">
        <label className="inline-flex items-center gap-2">
          Baris per halaman:
          <select
            value={perPage}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1"
          >
            {[5, 10, 20, 50].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <span>
          {from}-{to} dari {total}
        </span>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page <= 1}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeftOutlinedIcon className="text-[20px]" />
          </button>
          <span className="px-1 text-sm text-slate-600">{page}/{totalPages}</span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            disabled={page >= totalPages}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRightOutlinedIcon className="text-[20px]" />
          </button>
        </div>
      </div>
    </section>
  )
}
