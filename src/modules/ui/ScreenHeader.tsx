import type { ReactNode } from 'react'
import { cn } from '~/utils/cn'

interface ScreenHeaderProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Cabeçalho padrão de tela: h1 + descrição opcional + ação alinhada à direita.
 * Padroniza hierarquia visual entre as rotas internas (painel, perfil, agenda...).
 */
export function ScreenHeader({ title, description, action, className }: ScreenHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
