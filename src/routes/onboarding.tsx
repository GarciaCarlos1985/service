import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button, Card, CardBody, LoadingState } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      void router.navigate({ to: '/entrar' })
    }
  }, [isLoading, user, router])

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
        <CardBody className="space-y-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-green-200 text-2xl">
            ✅
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Conta criada com sucesso!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Bem-vindo(a), {user.email}. O onboarding completo chega no próximo milestone — por
              enquanto, defina se você quer contratar ou oferecer serviços.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link to="/" className="w-full">
              <Button fullWidth>Explorar serviços</Button>
            </Link>
            <Link to="/" className="w-full">
              <Button variant="outline" fullWidth>
                Quero oferecer meus serviços
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
