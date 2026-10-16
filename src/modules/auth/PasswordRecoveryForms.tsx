import { Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, Button, Input } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { resetPasswordSchema, updatePasswordSchema } from '~/modules/auth/schemas'
import type { ResetPasswordInput, UpdatePasswordInput } from '~/modules/auth/schemas'

export function RequestResetForm() {
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
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Recuperar senha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enviaremos um link de redefinição para o seu e-mail
        </p>
      </div>

      {status === 'sent' ? (
        <Alert variant="success">
          Se houver uma conta com esse e-mail, você receberá um link. Verifique sua caixa de entrada
          e o spam.
        </Alert>
      ) : (
        <>
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
    </>
  )
}

export function UpdatePasswordForm() {
  const { updatePassword } = useAuth()
  const [status, setStatus] = useState<'idle' | 'updating' | 'updated'>('idle')
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  })

  async function onSubmit(values: UpdatePasswordInput) {
    setError(null)
    setStatus('updating')
    try {
      await updatePassword(values.password)
      reset()
      setStatus('updated')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível salvar a senha. Tente novamente.',
      )
      setStatus('idle')
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Definir nova senha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha uma senha com pelo menos 8 caracteres.
        </p>
      </div>

      {status === 'updated' ? (
        <>
          <Alert variant="success">
            Sua senha foi atualizada. Use a nova senha no próximo acesso.
          </Alert>
          <p className="text-center">
            <Link to="/conta" className="font-semibold text-brand-blue-600 hover:underline">
              Continuar para minha conta
            </Link>
          </p>
        </>
      ) : (
        <>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <form
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event)
            }}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" fullWidth loading={status === 'updating'}>
              Salvar nova senha
            </Button>
          </form>
        </>
      )}
    </>
  )
}
