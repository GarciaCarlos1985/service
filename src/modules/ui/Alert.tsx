import type { ReactNode } from 'react'
import { cn } from '~/utils/cn'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const variants: Record<AlertVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-brand-blue-200 bg-brand-blue-50 text-brand-blue-800',
}

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Banner estático para mensagens curtas (erro de submit, status, info).
 * Substitui o padrão duplicado `border border-red-200 bg-red-50 px-4 py-3`
 * que aparecia em várias rotas.
 */
export function Alert({ variant = 'error', children, className, title }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3 text-sm', variants[variant], className)}
    >
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  )
}
