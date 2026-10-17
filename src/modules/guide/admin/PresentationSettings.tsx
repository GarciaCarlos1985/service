import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Save, Eye, RotateCcw, Type, Palette, PanelsTopLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/modules/ui/primitives/tabs'
import {
  defaultTheme,
  presentationSchema,
  presentationTextFields,
  publicPresentationSchema,
  themeFields,
  themeSchema,
  themeVariables,
} from '../presentation'
import type { Presentation } from '../presentation'
import { adminCompany } from '../admin'
import type { AdminRow } from '../admin'
import { useUnsavedChanges } from './use-unsaved'
import { UnsavedNavigation } from './UnsavedNavigation'
import { SpotlightEditor } from './SpotlightEditor'

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
  const [tab, setTab] = useState('copy')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewId, setPreviewId] = useState('')
  const prefix = useId()
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
  const parsedTheme = themeSchema.safeParse(value.theme)
  const safeTheme = parsedTheme.success ? parsedTheme.data : initial.theme
  const previewSlide =
    value.spotlights.find((slide) => slide.id === previewId) ??
    value.spotlights.find((slide) => slide.enabled) ??
    value.spotlights[0]
  const previewCompany = useQuery({
    queryKey: ['guide-admin', 'spotlight-preview', previewSlide?.companyId],
    queryFn: () => {
      if (!previewSlide) throw new Error('Selecione uma empresa.')
      return adminCompany(previewSlide.companyId)
    },
    enabled: !!previewSlide,
    retry: false,
  })
  return (
    <div className="admin-settings-layout">
      <UnsavedNavigation dirty={dirty} />
      <button
        type="button"
        className="btn outline admin-preview-toggle"
        aria-expanded={previewOpen}
        aria-controls={prefix + 'preview'}
        onClick={() => {
          setPreviewOpen((previous) => !previous)
        }}
      >
        <Eye size={18} />
        {previewOpen ? 'Ocultar prévia do site' : 'Ver prévia do site'}
      </button>
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
            const field = String(parsed.error.issues[0]?.path[0] ?? '')
            const label =
              presentationTextFields.find((entry) => entry[0] === field)?.[1] ??
              (field === 'theme'
                ? 'cores'
                : field === 'spotlights'
                  ? 'vitrines'
                  : 'sugestões de busca')
            setError('Revise ' + label + '. Confira o formato e os limites indicados nos campos.')
            if (field === 'theme') setTab('colors')
            else if (field === 'spotlights') setTab('spotlights')
            else setTab('copy')
            return
          }
          void onSave({ value: parsed.data, revision: row.revision }).catch((failure: unknown) => {
            setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.')
          })
        }}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            className="admin-customization-tabs h-auto! w-full"
            aria-label="Personalizar o site"
          >
            <TabsTrigger value="copy" className="h-auto! min-h-12 whitespace-normal">
              <Type size={18} />
              Textos e títulos
            </TabsTrigger>
            <TabsTrigger value="colors" className="h-auto! min-h-12 whitespace-normal">
              <Palette size={18} />
              Cores
            </TabsTrigger>
            <TabsTrigger value="spotlights" className="h-auto! min-h-12 whitespace-normal">
              <PanelsTopLeft size={18} />
              Vitrines
            </TabsTrigger>
          </TabsList>
          <TabsContent value="copy">
            <fieldset className="admin-editor-group" disabled={busy}>
              <legend>O site com a sua voz</legend>
              <p className="secondary">
                Edite títulos, descrições e chamadas. A prévia acompanha sua edição; o público muda
                depois de salvar.
              </p>
              {presentationTextFields.map(([key, label, max, multiline]) => (
                <div className="admin-copy-field" key={key}>
                  <label htmlFor={prefix + key}>{label}</label>
                  {multiline ? (
                    <textarea
                      id={prefix + key}
                      rows={3}
                      value={value[key]}
                      maxLength={max}
                      required
                      onChange={(event) => {
                        update(key, event.target.value)
                      }}
                    />
                  ) : (
                    <input
                      id={prefix + key}
                      value={value[key]}
                      maxLength={max}
                      required
                      onChange={(event) => {
                        update(key, event.target.value)
                      }}
                    />
                  )}
                  <small>
                    {value[key].length}/{max} caracteres
                  </small>
                </div>
              ))}
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
              <div className="admin-copy-field">
                <label htmlFor={prefix + 'suggestions'}>Sugestões de busca, uma por linha</label>
                <textarea
                  id={prefix + 'suggestions'}
                  rows={5}
                  value={suggestions}
                  maxLength={650}
                  onChange={(event) => {
                    setSuggestions(event.target.value)
                  }}
                />
                <small>
                  Até oito sugestões, com 2 a 80 caracteres. Use termos do seu catálogo; sugestões
                  não confirmam disponibilidade.
                </small>
              </div>
            </fieldset>
          </TabsContent>
          <TabsContent value="colors">
            <fieldset className="admin-editor-group" disabled={busy}>
              <legend>Uma paleta do seu jeito</legend>
              <p className="secondary">
                Escolha no seletor ou informe o código da cor. A cor do texto é ajustada
                automaticamente para continuar legível.
              </p>
              <div className="admin-palette-grid">
                {themeFields.map(([key, label]) => (
                  <div className="admin-palette-field" key={key}>
                    <label htmlFor={prefix + 'color-' + key}>{label}</label>
                    <div>
                      <input
                        type="color"
                        aria-label={'Selecionar cor: ' + label}
                        value={
                          /^#[\da-fA-F]{6}$/.test(value.theme[key])
                            ? value.theme[key]
                            : defaultTheme[key]
                        }
                        onChange={(event) => {
                          update('theme', { ...value.theme, [key]: event.target.value })
                        }}
                      />
                      <input
                        id={prefix + 'color-' + key}
                        value={value.theme[key]}
                        maxLength={7}
                        pattern="#[0-9a-fA-F]{6}"
                        required
                        spellCheck={false}
                        onChange={(event) => {
                          update('theme', { ...value.theme, [key]: event.target.value })
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {!parsedTheme.success && (
                <p role="alert" className="field-error">
                  Complete os códigos com # e seis dígitos. A prévia preserva a paleta salva.
                </p>
              )}
              <button
                className="btn outline"
                type="button"
                onClick={() => {
                  update('theme', { ...defaultTheme })
                }}
              >
                <RotateCcw size={18} />
                Restaurar cores originais
              </button>
            </fieldset>
          </TabsContent>
          <TabsContent value="spotlights">
            <fieldset className="admin-editor-group" disabled={busy}>
              <legend>Direção da vitrine principal</legend>
              <label className="guide-checkbox">
                <input
                  type="checkbox"
                  checked={value.showSpotlight}
                  onChange={(event) => {
                    update('showSpotlight', event.target.checked)
                  }}
                />
                Exibir vitrine na página inicial
              </label>
              <div className="admin-copy-field">
                <label htmlFor={prefix + 'mode'}>Como escolher os destaques</label>
                <select
                  id={prefix + 'mode'}
                  value={value.spotlightMode}
                  onChange={(event) => {
                    update(
                      'spotlightMode',
                      event.target.value === 'manual' ? 'manual' : 'automatic',
                    )
                  }}
                >
                  <option value="automatic">Automático — empresas com destaque e imagem</option>
                  <option value="manual">Manual — escolher, editar e ordenar vitrines</option>
                </select>
              </div>
              {value.spotlightMode === 'automatic' ? (
                <p className="secondary">
                  O guia seleciona até 12 empresas publicadas com destaque no plano e imagem. A
                  vitrine não depende dos filtros da busca. Os visitantes avançam no próprio ritmo.
                </p>
              ) : (
                <SpotlightEditor
                  value={value}
                  busy={busy}
                  onChange={(next) => {
                    update('spotlights', next)
                  }}
                />
              )}
            </fieldset>
          </TabsContent>
        </Tabs>
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
      <aside
        id={prefix + 'preview'}
        className="admin-presentation-preview"
        data-expanded={previewOpen}
        aria-label="Prévia do site"
        style={themeVariables(safeTheme)}
      >
        <div>
          <Eye size={18} />
          <strong>Prévia do site</strong>
        </div>
        {value.spotlightMode === 'manual' && value.spotlights.length > 1 && (
          <label className="admin-preview-choice" htmlFor={prefix + 'preview-slide'}>
            Vitrine da prévia
            <select
              id={prefix + 'preview-slide'}
              value={previewSlide?.id ?? ''}
              onChange={(event) => {
                setPreviewId(event.target.value)
              }}
            >
              {value.spotlights.map((slide, index) => (
                <option value={slide.id} key={slide.id}>
                  {index + 1}. {slide.title || 'Empresa selecionada'}
                  {slide.enabled ? '' : ' — desativada'}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="admin-mini-hero">
          <h3>{value.heroTitle}</h3>
          <p>{value.heroDescription}</p>
          <div className="admin-mini-search">
            {value.searchPlaceholder}
            <span>{value.searchButtonLabel}</span>
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
          {value.showSpotlight &&
            (value.spotlightMode === 'manual' && previewSlide ? (
              <div className="admin-mini-spotlight">
                {(previewSlide.imageUrl || previewCompany.data?.image) && (
                  <img
                    src={previewSlide.imageUrl || previewCompany.data?.image}
                    alt={previewSlide.imageAlt || 'Prévia da vitrine'}
                  />
                )}
                <span className="admin-preview-badge">PREMIUM GUIDE · Destaque patrocinado</span>
                <strong>
                  {previewSlide.title || previewCompany.data?.name || 'Empresa selecionada'}
                </strong>
                <p>{previewSlide.description}</p>
                <small>
                  {previewSlide.enabled ? 'Vitrine habilitada' : 'Prévia de vitrine desativada'}
                </small>
              </div>
            ) : (
              <p className="admin-preview-auto">Vitrine automática de empresas em destaque.</p>
            ))}
        </div>
        <div className="admin-mini-content">
          <h4>{value.resultsTitle}</h4>
          <div className="admin-mini-invitation">
            <strong>{value.businessTitle}</strong>
            <p>{value.businessDescription}</p>
            <span>{value.businessButtonLabel}</span>
          </div>
          <p className="admin-mini-footer">{value.footerTagline}</p>
        </div>
        <p className="secondary">A prévia acompanha a edição. Nada é publicado antes de salvar.</p>
      </aside>
    </div>
  )
}
