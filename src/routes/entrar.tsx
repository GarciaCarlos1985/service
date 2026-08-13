import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '~/modules/ui'
import { Card, CardBody } from '~/modules/ui'
import { Input } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { signInSchema } from '~/modules/auth/schemas'
import type { SignInInput } from '~/modules/auth/schemas'

export const Route = createFileRoute('/entrar')({
  component: SignInPage,
})

function SignInPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(values: SignInInput) {
    setError(null)
    setLoading(true)
    try {
      await signIn(values)
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
            <p className="mt-1 text-sm text-slate-500">Bem-vindo de volta ao SERVICE</p>
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
              autoComplete="current-password"
              placeholder="Sua senha"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth loading={loading}>
              Entrar
            </Button>
          </form>

          <div className="space-y-2 text-center text-sm">
            <p className="text-slate-500">
              Não tem conta?{' '}
              <Link to="/cadastro" className="font-semibold text-brand-blue-600 hover:underline">
                Cadastre-se
              </Link>
            </p>
            <Link to="/recuperar-senha" className="text-slate-500 hover:text-brand-blue-600">
              Esqueci minha senha
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
