import { useEffect, useState } from 'react'
import { Save, Eye, RotateCcw } from 'lucide-react'
import { presentationSchema, publicPresentationSchema } from '../presentation'
import type { Presentation } from '../presentation'
import type { AdminRow } from '../admin'
import { useUnsavedChanges } from './use-unsaved'
import { UnsavedNavigation } from './UnsavedNavigation'

export function PresentationSettings({
  row,
  busy,
  onSave,
  onDirtyChange,
}: {
  row: AdminRow
  busy: boolean
  onSave: (payload: AdminRow) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}) {
  const [initial] = useState(() => publicPresentationSchema.parse(row.value))
  const [value, setValue] = useState(initial)
  const [suggestions, setSuggestions] = useState(initial.quickSearches.join('\n'))
  const [error, setError] = useState('')
  const dirty =
    JSON.stringify(value) !== JSON.stringify(initial) ||
    suggestions !== initial.quickSearches.join('\n')
  useUnsavedChanges(dirty)
  useEffect(() => {
    onDirtyChange(dirty)
    return () => {
      onDirtyChange(false)
    }
  }, [dirty, onDirtyChange])
  const update = <K extends keyof Presentation>(key: K, next: Presentation[K]) => {
    setValue((previous) => ({ ...previous, [key]: next }))
  }
  return (
    <div className="admin-settings-layout">
      <UnsavedNavigation dirty={dirty} />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          const parsed = presentationSchema.safeParse({
            ...value,
            quickSearches: suggestions
              .split('\n')
              .map((entry) => entry.trim())
              .filter(Boolean),
          })
          if (!parsed.success) {
            setError('Revise os textos. Use até oito sugestões, com 2 a 80 caracteres cada.')
            return
          }
          void onSave({ value: parsed.data, revision: row.revision }).catch((failure: unknown) => {
            setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.')
          })
        }}
      >
        <fieldset className="admin-editor-group" disabled={busy}>
          <legend>A primeira impressão do guia</legend>
          <p className="secondary">
            Edite a apresentação sem mexer no código. Os textos aparecem na busca pública.
          </p>
          <label>
            Título principal
            <input
              value={value.heroTitle}
              maxLength={80}
              minLength={3}
              required
              onChange={(event) => {
                update('heroTitle', event.target.value)
              }}
            />
            <small>{value.heroTitle.length}/80 caracteres</small>
          </label>
          <label>
            Descrição
            <textarea
              rows={4}
              value={value.heroDescription}
              maxLength={300}
              minLength={10}
              required
              onChange={(event) => {
                update('heroDescription', event.target.value)
              }}
            />
          </label>
          <label>
            Texto de exemplo no campo de busca
            <input
              value={value.searchPlaceholder}
              maxLength={100}
              minLength={3}
              required
              onChange={(event) => {
                update('searchPlaceholder', event.target.value)
              }}
            />
          </label>
        </fieldset>
        <fieldset className="admin-editor-group" disabled={busy}>
          <legend>Descoberta e destaques</legend>
          <label className="guide-checkbox">
            <input
              type="checkbox"
              checked={value.showSuggestions}
              onChange={(event) => {
                update('showSuggestions', event.target.checked)
              }}
            />
            Mostrar sugestões de busca
          </label>
          <label>
            Sugestões (uma por linha, até oito)
            <textarea
              rows={6}
              value={suggestions}
              maxLength={650}
              onChange={(event) => {
                setSuggestions(event.target.value)
              }}
            />
            <small>
              Use termos úteis ao catálogo. Sugestões não confirmam que um produto está disponível.
            </small>
          </label>
          <label className="guide-checkbox">
            <input
              type="checkbox"
              checked={value.showSpotlight}
              onChange={(event) => {
                update('showSpotlight', event.target.checked)
              }}
            />
            Mostrar a vitrine Premium Guide quando houver empresas elegíveis
          </label>
        </fieldset>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-savebar">
          <span role="status">
            {dirty ? 'Você tem alterações não salvas' : 'Configuração salva no site'}
          </span>
          <button
            type="button"
            className="btn outline"
            disabled={busy || !dirty}
            onClick={() => {
              setValue(initial)
              setSuggestions(initial.quickSearches.join('\n'))
              setError('')
            }}
          >
            <RotateCcw size={18} />
            Desfazer
          </button>
          <button className="btn primary" disabled={busy || !dirty}>
            <Save size={19} />
            {busy ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </form>
      <aside className="admin-presentation-preview">
        <div>
          <Eye size={18} />
          <strong>Prévia da apresentação</strong>
        </div>
        <div className="admin-mini-hero">
          <h3>{value.heroTitle}</h3>
          <p>{value.heroDescription}</p>
          <div className="admin-mini-search">
            {value.searchPlaceholder}
            <span>Buscar</span>
          </div>
          {value.showSuggestions && (
            <div className="admin-preview-suggestions">
              {suggestions
                .split('\n')
                .filter(Boolean)
                .slice(0, 8)
                .map((entry, index) => (
                  <span key={index}>{entry}</span>
                ))}
            </div>
          )}
        </div>
        <p className="secondary">A prévia acompanha sua edição. O site muda ao salvar.</p>
      </aside>
    </div>
  )
}
