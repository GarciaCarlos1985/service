import { Link, rootRouteId, useMatch, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">Algo deu errado</h1>
          <p className="mt-2 text-sm text-red-700">
            Ocorreu um erro inesperado ao carregar esta página.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void router.invalidate()
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Tentar novamente
            </button>
            {isRoot ? null : (
              <Link
                to="/"
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
              >
                Voltar ao início
              </Link>
            )}
          </div>
        </div>
        <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-red-200">
          {error.message}
        </pre>
      </div>
    </div>
  )
}
