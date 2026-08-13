import { Skeleton } from './Skeleton'

interface LoadingStateProps {
  rows?: number
  label?: string
}

export function LoadingState({ rows = 3, label = 'Carregando...' }: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-label={label} className="w-full space-y-4">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}
