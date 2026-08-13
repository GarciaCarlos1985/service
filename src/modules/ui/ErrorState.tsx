import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Tente novamente em instantes. Se o problema persistir, contate o suporte.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <p className="max-w-sm text-sm text-red-700">{description}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
