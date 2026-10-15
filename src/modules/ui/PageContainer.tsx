import type { ReactNode } from 'react'
import { cn } from '~/utils/cn'

interface PageContainerProps {
  children: ReactNode
  className?: string
  /** Conteúdo com `pb-24` para não colar no nav inferior do painel. Default true. */
  bottomNavPadding?: boolean
}

/**
 * Container padrão: largura máx 3xl, padding lateral, fundo slate-50.
 * Substitui o `<main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24">`
 * repetido em painel/index, painel/agenda, painel/perfil, painel/servicos etc.
 */
export function PageContainer({
  children,
  className,
  bottomNavPadding = true,
}: PageContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full max-w-3xl px-4 pt-6', bottomNavPadding && 'pb-24', className)}
    >
      {children}
    </div>
  )
}
