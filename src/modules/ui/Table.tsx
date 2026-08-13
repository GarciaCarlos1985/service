import type { ReactNode } from 'react'
import { cn } from '~/utils/cn'

interface TableColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Array<TableColumn<T>>
  rows: T[]
  rowKey: (row: T) => string
  empty?: ReactNode
  className?: string
}

export function Table<T>({ columns, rows, rowKey, empty, className }: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200', className)}>
      <table className="w-full min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3 font-semibold text-slate-600">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                {empty ?? 'Nenhum registro encontrado.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-slate-100 last:border-0">
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3 align-middle', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
