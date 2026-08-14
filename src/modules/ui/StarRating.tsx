import { cn } from '~/utils/cn'

interface StarRatingProps {
  value: number
  max?: number
  size?: 'sm' | 'md'
  onChange?: (value: number) => void
  className?: string
}

const sizes = { sm: 'text-base', md: 'text-2xl' }

export function StarRating({ value, max = 5, size = 'sm', onChange, className }: StarRatingProps) {
  const interactive = onChange !== undefined

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', sizes[size], className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Nota da avaliação' : `Nota ${String(value)} de ${String(max)}`}
    >
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= Math.round(value)
        const label = `${String(starValue)} de ${String(max)} estrela${starValue === 1 ? '' : 's'}`

        if (!interactive) {
          return (
            <span key={starValue} aria-hidden="true" className="text-amber-400">
              <span className={filled ? '' : 'opacity-25'}>★</span>
            </span>
          )
        }

        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={starValue === value}
            aria-label={label}
            onClick={() => {
              onChange(starValue)
            }}
            className={cn(
              'cursor-pointer rounded px-0.5 transition-transform hover:scale-110',
              filled ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200',
            )}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
