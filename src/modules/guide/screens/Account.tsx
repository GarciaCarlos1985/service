import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import type { Viewer } from '../types'
import { api } from '../api'
import { useAuth } from '~/modules/auth/auth-context'

export default function Account({
  viewer,
  onSave,
  loading = false,
  error = '',
  onRetry,
}: {
  viewer: Viewer | null
  onSave: (viewer: Viewer) => void
  loading?: boolean
  error?: string
  onRetry?: () => void
}) {
  return (
    <div className="wrap account-page">
      <h1>Minha conta</h1>
      {error ? (
        <div className="state-box" role="alert">
          <p>{error}</p>
          <button className="btn primary" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <p role="status">Carregando sua conta…</p>
      ) : viewer ? (
        <AccountForm key={viewer.id} viewer={viewer} onSave={onSave} />
      ) : (
        <div className="state-box">
          <p>Entre gratuitamente para salvar empresas e avaliar serviços que você conhece.</p>
          <a className="btn primary" href="/entrar?redirect=%2Fconta">
            Entrar na minha conta
          </a>
        </div>
      )}
    </div>
  )
}
function AccountForm({ viewer, onSave }: { viewer: Viewer; onSave: (viewer: Viewer) => void }) {
  const { signOut } = useAuth()
  const [name, setName] = useState(viewer.name)
  const [phone, setPhone] = useState(viewer.phone)
  const [busy, setBusy] = useState(false)
  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      await api('/api/me', { name, phone })
      onSave({ ...viewer, name, phone })
      toast.success('Dados salvos.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }
  const logout = async () => {
    setBusy(true)
    try {
      await signOut()
      window.location.assign('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível sair.')
      setBusy(false)
    }
  }
  return (
    <>
      <p className="secondary">Seus dados e empresas favoritas em um só lugar.</p>
      <form
        className="profile-form"
        onSubmit={(event) => {
          void save(event)
        }}
      >
        <label>
          Nome
          <input
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
            required
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          E-mail
          <input autoComplete="email" value={viewer.email} readOnly />
        </label>
        <label>
          Telefone
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
            }}
            maxLength={25}
          />
        </label>
        <button className="btn primary" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar dados'}
        </button>
      </form>
      <div className="account-actions">
        <a className="btn outline" href="/favoritos">
          <Heart size={18} />
          Meus favoritos
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void logout()
          }}
        >
          Sair da conta
        </button>
      </div>
    </>
  )
}
