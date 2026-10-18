import { createFileRoute, Link } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, Button } from '~/modules/ui'
import { Card, CardBody } from '~/modules/ui'
import { Input } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { signInSchema } from '~/modules/auth/schemas'
import type { SignInInput } from '~/modules/auth/schemas'
import { safeReturnPath } from '~/modules/auth/return-path'
import { GuideAuthLayout } from '~/modules/guide/GuideShell'
import { AuthCaptcha } from '~/modules/auth/AuthCaptcha'
import { useAuthCaptcha } from '~/modules/auth/use-auth-captcha'
import { authErrorMessage } from '~/modules/auth/captcha-options'

export const Route = createFileRoute('/entrar')({
  validateSearch: (input: SearchSchemaInput & { redirect?: unknown }) => ({
    redirect: safeReturnPath(input.redirect),
  }),
  component: SignInPage,
})

function SignInPage() {
  const { signIn } = useAuth()
  const { redirect } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const captcha = useAuthCaptcha()

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
      await signIn(values, captcha.token)
      window.location.assign(redirect)
    } catch (err) {
      setError(authErrorMessage(err, 'Não foi possível entrar. Tente novamente.'))
    } finally {
      setLoading(false)
      captcha.reset()
    }
  }

  return (
    <GuideAuthLayout>
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
            <p className="mt-1 text-sm text-slate-500">Bem-vindo de volta ao Service Guide</p>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

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
            <AuthCaptcha key={captcha.attempt} action="sign_in" onToken={captcha.setToken} />
            <Button type="submit" fullWidth loading={loading} disabled={captcha.waiting}>
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
            <p className="text-slate-500">
              Precisa confirmar seu e-mail?{' '}
              <Link
                to="/cadastro"
                search={{ confirmar: true }}
                className="font-semibold text-brand-blue-600 hover:underline"
              >
                Reenviar confirmação
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </GuideAuthLayout>
  )
}
