import { createFileRoute, Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Card, CardBody, Input } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { resetPasswordSchema } from '~/modules/auth/schemas'
import type { ResetPasswordInput } from '~/modules/auth/schemas'

export const Route = createFileRoute('/recuperar-senha')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(values: ResetPasswordInput) {
    setError(null)
    setStatus('sending')
    try {
      await resetPassword(values.email)
      setStatus('sent')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível enviar o e-mail. Tente novamente.',
      )
      setStatus('idle')
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Recuperar senha</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enviaremos um link de redefinição para o seu e-mail
            </p>
          </div>

          {status === 'sent' ? (
            <p
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              E-mail enviado. Verifique sua caixa de entrada (e o spam).
            </p>
          ) : (
            <>
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
                <Button type="submit" fullWidth loading={status === 'sending'}>
                  Enviar link
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-500">
            <Link to="/entrar" className="font-semibold text-brand-blue-600 hover:underline">
              Voltar para entrar
            </Link>
          </p>
        </CardBody>
      </Card>
    </main>
  )
}
