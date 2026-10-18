import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Input } from '~/modules/ui'
import { useAuth } from './auth-context'
import { resetPasswordSchema } from './schemas'
import type { ResetPasswordInput } from './schemas'
import { AuthCaptcha } from './AuthCaptcha'
import { useAuthCaptcha } from './use-auth-captcha'
import { authErrorMessage } from './captcha-options'

export function EmailConfirmationForm({ initialEmail = '' }: { initialEmail?: string }) {
  const { resendConfirmation } = useAuth()
  const captcha = useAuthCaptcha()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(!!initialEmail)
  const [sentAt, setSentAt] = useState(() => (initialEmail ? Date.now() : 0))
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const remaining = sentAt ? Math.max(0, Math.ceil((sentAt + 60000 - now) / 1000)) : 0
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: initialEmail },
  })
  useEffect(() => {
    if (!remaining) return
    const timer = setTimeout(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      clearTimeout(timer)
    }
  }, [remaining])

  async function onSubmit(values: ResetPasswordInput) {
    if (remaining || sending) return
    setSending(true)
    setError('')
    try {
      await resendConfirmation(values.email, captcha.token)
      const timestamp = Date.now()
      setNow(timestamp)
      setSentAt(timestamp)
      setSent(true)
    } catch (failure) {
      setError(
        authErrorMessage(failure, 'Não foi possível solicitar a confirmação. Tente novamente.'),
      )
    } finally {
      setSending(false)
      captcha.reset()
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Confirme seu e-mail</h1>
        <p className="mt-1 text-sm text-slate-500">
          Abra o link recebido para ativar sua conta no Service Guide.
        </p>
      </div>
      {sent && (
        <Alert variant="success">
          Confira a caixa de entrada e o spam. Se houver um cadastro aguardando confirmação, você
          receberá o link. Se já confirmou, entre com sua senha.
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event)
        }}
      >
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthCaptcha key={captcha.attempt} action="resend" onToken={captcha.setToken} />
        <Button
          type="submit"
          fullWidth
          loading={sending}
          disabled={captcha.waiting || remaining > 0}
        >
          {remaining ? `Reenviar em ${String(remaining)}s` : 'Reenviar confirmação'}
        </Button>
      </form>
      <p className="text-center text-sm text-slate-500">
        <Link to="/entrar" className="font-semibold text-brand-blue-600 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </>
  )
}
