import { cn } from '~/utils/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null

  const canPrevious = page > 1
  const canNext = page < pageCount

  const buttonClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav aria-label="Paginação" className={cn('flex items-center justify-center gap-2', className)}>
      <button
        type="button"
        className={buttonClass}
        disabled={!canPrevious}
        onClick={() => {
          onPageChange(page - 1)
        }}
      >
        Anterior
      </button>
      <span className="px-2 text-sm text-slate-500">
        Página {page} de {pageCount}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={!canNext}
        onClick={() => {
          onPageChange(page + 1)
        }}
      >
        Próxima
      </button>
    </nav>
  )
}
