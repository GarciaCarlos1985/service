import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, KeyRound, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { getSupabase } from '~/lib/supabase'
import { useAuth } from '~/modules/auth/auth-context'

type Enrollment = { id: string; qr: string; secret: string }
export function SecurityPanel({
  required = false,
  onVerified,
}: {
  required?: boolean
  onVerified: () => Promise<unknown>
}) {
  const { user, signOut } = useAuth()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const factors = useQuery({
    queryKey: ['guide-security', user?.id],
    queryFn: async () => {
      const result = await getSupabase().auth.mfa.listFactors()
      if (result.error) throw result.error
      return result.data.totp
    },
    retry: false,
  })
  const verified = factors.data ?? []
  async function enroll() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await getSupabase().auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Service Guide ' + new Date().toLocaleDateString('pt-BR'),
      })
      if (result.error) throw result.error
      setEnrollment({
        id: result.data.id,
        qr: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      })
    } catch {
      setError('Não foi possível iniciar a configuração do autenticador. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }
  async function verify() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const factorId = enrollment?.id ?? verified[0]?.id
      if (!factorId) throw new Error('Autenticador indisponível.')
      const result = await getSupabase().auth.mfa.challengeAndVerify({ factorId, code })
      if (result.error) throw result.error
      setEnrollment(null)
      setCode('')
      setSuccess('Autenticador confirmado. Seu acesso está protegido por duas etapas.')
      await factors.refetch()
      await onVerified()
    } catch {
      setError('O código não foi confirmado. Confira o autenticador e tente o código atual.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-security">
      <div className="admin-security-intro">
        <ShieldCheck size={32} />
        <div>
          <h2>{required ? 'Confirme seu autenticador' : 'Segurança da sua conta'}</h2>
          <p>
            {required
              ? 'A senha foi aceita. Informe o código do seu aplicativo para liberar a administração.'
              : 'Adicione uma segunda etapa de proteção e controle o encerramento das suas sessões.'}
          </p>
        </div>
      </div>
      <div className="admin-security-account">
        <KeyRound size={20} />
        <div>
          <strong>{user?.email}</strong>
          <p>Use a senha cadastrada pelo titular. O painel não consulta ou revela senhas.</p>
          <a href="/recuperar-senha" className="text-button">
            Definir uma nova senha
          </a>
        </div>
      </div>
      {factors.isPending ? (
        <p role="status">Conferindo o autenticador…</p>
      ) : factors.isError ? (
        <div role="alert">
          <p>Não foi possível conferir os fatores da conta.</p>
          <button
            className="btn outline"
            onClick={() => {
              void factors.refetch()
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="admin-security-factor">
          <Smartphone size={23} />
          <div>
            <h3>Aplicativo autenticador</h3>
            <p>
              {verified.length
                ? 'Ativado. O banco exige a segunda etapa para as operações administrativas.'
                : 'Use Google Authenticator, Microsoft Authenticator ou outro aplicativo compatível com TOTP.'}
            </p>
          </div>
          {!required && !verified.length && !enrollment && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => {
                void enroll()
              }}
            >
              Configurar duas etapas
            </button>
          )}
          {verified.length > 0 && !required && !enrollment && (
            <span className="admin-secure-label">
              <CheckCircle2 size={18} />
              Ativado
            </span>
          )}
        </div>
      )}
      {enrollment && (
        <div className="admin-totp-setup">
          <h3>Conecte seu aplicativo</h3>
          <p>
            Escaneie o QR code no seu autenticador. Guarde esta chave em local privado se precisar
            de uma cópia de recuperação.
          </p>
          <img
            alt="QR code privado para cadastrar o autenticador"
            src={
              enrollment.qr.startsWith('data:')
                ? enrollment.qr
                : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(enrollment.qr)
            }
            width={200}
            height={200}
          />
          <details>
            <summary>Usar a chave manualmente</summary>
            <code>{enrollment.secret}</code>
          </details>
        </div>
      )}
      {(required || enrollment) && (
        <form
          className="admin-mfa-form"
          onSubmit={(event) => {
            event.preventDefault()
            void verify()
          }}
        >
          <label>
            Código do autenticador
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ''))
              }}
            />
          </label>
          <button className="btn primary" disabled={busy || code.length !== 6}>
            {busy ? 'Confirmando…' : 'Confirmar código'}
          </button>
          {enrollment && (
            <button
              type="button"
              className="btn outline"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void getSupabase()
                  .auth.mfa.unenroll({ factorId: enrollment.id })
                  .then((result) => {
                    if (result.error) throw result.error
                    setEnrollment(null)
                    setCode('')
                  })
                  .catch(() => {
                    setError('Não foi possível cancelar. Tente novamente.')
                  })
                  .finally(() => {
                    setBusy(false)
                  })
              }}
            >
              Cancelar configuração
            </button>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="admin-success-note">
          {success}
        </p>
      )}
      <div className="admin-security-session">
        <div>
          <h3>Encerrar sessões</h3>
          <p>Encerre seus acessos em todos os dispositivos. Será necessário entrar novamente.</p>
        </div>
        <button
          className="btn outline"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError('')
            void signOut()
              .then(() => {
                window.location.assign('/entrar?redirect=%2Fadmin')
              })
              .catch(() => {
                setError('Não foi possível encerrar a sessão. Confira a conexão e tente novamente.')
                setBusy(false)
              })
          }}
        >
          <LogOut size={18} />
          Sair de todos os dispositivos
        </button>
      </div>
    </section>
  )
}
