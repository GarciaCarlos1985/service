import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/modules/ui/primitives/dialog'
import { getSupabase } from '~/lib/supabase'
import { useAuth } from '~/modules/auth/auth-context'
import { guideRpc } from '../api'
import { text } from '../admin'
import type { AdminRow } from '../admin'

export function RoleDialog({
  row,
  onClose,
  onSaved,
}: {
  row: AdminRow
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [useMfa, setUseMfa] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  async function check() {
    const result = await getSupabase().auth.mfa.listFactors()
    if (result.error) throw result.error
    const factor = result.data.totp[0]
    setUseMfa(!!factor)
    setLoaded(true)
    return factor
  }
  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const factor = await check()
      if (factor) {
        if (!code) {
          setBusy(false)
          return
        }
        const result = await getSupabase().auth.mfa.challengeAndVerify({
          factorId: factor.id,
          code,
        })
        if (result.error) throw result.error
      } else {
        if (!password) {
          setBusy(false)
          return
        }
        const result = await getSupabase().auth.signInWithPassword({
          email: user?.email ?? '',
          password,
        })
        setPassword('')
        if (result.error) throw result.error
      }
      await guideRpc('guide_admin_set_role', { p_user_id: text(row, 'id'), p_admin: !row.is_admin })
      await onSaved()
      onClose()
    } catch (failure) {
      setPassword('')
      setCode('')
      setError(
        failure instanceof Error && failure.name === 'GuideError'
          ? failure.message
          : 'Não foi possível confirmar o acesso. Revise a senha ou o código atual do autenticador.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="app-dialog">
        <DialogTitle>
          {row.is_admin ? 'Remover acesso administrativo' : 'Conceder acesso administrativo'}
        </DialogTitle>
        <DialogDescription>
          {text(row, 'email') || text(row, 'name')}{' '}
          {row.is_admin
            ? 'continuará com uma conta de consumidor.'
            : 'poderá alterar o catálogo, configurações e acessos. Esta ação será auditada.'}
        </DialogDescription>
        <div className="status-note">
          <ShieldCheck size={24} />
          <p>
            Confirme sua identidade. Sua própria conta e o último acesso administrativo são
            protegidos contra remoção.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void confirm()
          }}
          className="admin-role-form"
        >
          {!loaded ? (
            <button
              className="btn outline"
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void check()
                  .catch(() => {
                    setError('Não foi possível conferir sua conta. Tente novamente.')
                  })
                  .finally(() => {
                    setBusy(false)
                  })
              }}
            >
              Continuar para confirmação
            </button>
          ) : useMfa ? (
            <label>
              Código do seu autenticador
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                maxLength={6}
                pattern="[0-9]{6}"
                required
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''))
                }}
              />
            </label>
          ) : (
            <label>
              Sua senha para confirmar
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                }}
                required
                maxLength={72}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="wizard-actions">
            <button className="btn outline" type="button" disabled={busy} onClick={onClose}>
              Voltar
            </button>
            {loaded && (
              <button className="btn primary" disabled={busy}>
                {busy ? 'Confirmando…' : 'Confirmar alteração de acesso'}
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
