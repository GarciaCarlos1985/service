import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardBody, LoadingState } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { chooseUserType } from '~/modules/profile/profile-api'
import type { UserType } from '~/modules/profile/types'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

const options: Array<{
  type: UserType
  title: string
  description: string
  icon: string
}> = [
  {
    type: 'client',
    title: 'Quero contratar',
    description: 'Encontre profissionais de confiança para contratar serviços.',
    icon: '🔎',
  },
  {
    type: 'professional',
    title: 'Quero oferecer serviços',
    description: 'Crie seu perfil, cadastre serviços e receba clientes.',
    icon: '🧰',
  },
]

function OnboardingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState<UserType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      void router.navigate({ to: '/entrar' })
    }
  }, [isLoading, user, router])

  async function onChoose(type: UserType) {
    setError(null)
    setSaving(type)
    try {
      await chooseUserType(type)
      await router.navigate({ to: '/painel' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar. Tente novamente.')
    } finally {
      setSaving(null)
    }
  }

  if (isLoading || !user) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <LoadingState rows={2} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Como você quer usar o SERVICE?</h1>
            <p className="mt-2 text-sm text-slate-500">Você pode mudar depois pelo painel.</p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  void onChoose(option.type)
                }}
                disabled={saving !== null}
                className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-blue-400 hover:shadow-sm disabled:opacity-60"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-blue-50 text-2xl">
                  {option.icon}
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">{option.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{option.description}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400">
            <Link to="/" className="hover:underline">
              Pular por enquanto
            </Link>
          </p>
        </CardBody>
      </Card>
    </main>
  )
}
