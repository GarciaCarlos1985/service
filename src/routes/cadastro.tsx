import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card, CardBody, Input } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { signUpSchema } from '~/modules/auth/schemas'
import type { SignUpInput } from '~/modules/auth/schemas'

export const Route = createFileRoute('/cadastro')({
  component: SignUpPage,
})

function SignUpPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(values: SignUpInput) {
    setError(null)
    setLoading(true)
    try {
      await signUp(values)
      await router.navigate({ to: '/onboarding' })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível criar a conta. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
            <p className="mt-1 text-sm text-slate-500">Leva menos de um minuto</p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <form
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event)
            }}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Nome completo"
              type="text"
              autoComplete="name"
              placeholder="Maria da Silva"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              hint="Use pelo menos 8 caracteres."
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth loading={loading}>
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/entrar" className="font-semibold text-brand-blue-600 hover:underline">
              Entrar
            </Link>
          </p>
        </CardBody>
      </Card>
    </main>
  )
}
