import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold text-brand-blue-500">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl brand-gradient px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
