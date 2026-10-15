import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, Button, Card, CardBody, Input } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { signUpSchema } from '~/modules/auth/schemas'
import type { SignUpInput } from '~/modules/auth/schemas'
import { GuideAuthLayout } from '~/modules/guide/GuideShell'

export const Route = createFileRoute('/cadastro')({
  component: SignUpPage,
})

function SignUpPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmation, setConfirmation] = useState(false)

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
      const result = await signUp(values)
      if (result.requiresConfirmation) setConfirmation(true)
      else await router.navigate({ to: '/conta' })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível criar a conta. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <GuideAuthLayout>
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
            <p className="mt-1 text-sm text-slate-500">
              Guarde seus favoritos e descubra negócios locais.
            </p>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}
          {confirmation ? (
            <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">
              Confira seu e-mail para confirmar a conta. Depois, entre com sua senha.
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
              label="Telefone com DDD"
              type="tel"
              autoComplete="tel"
              placeholder="(69) 99999-9999"
              error={errors.phone?.message}
              {...register('phone')}
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
    </GuideAuthLayout>
  )
}
