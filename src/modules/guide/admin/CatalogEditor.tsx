import { useId, useRef, useState } from 'react'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/modules/ui/primitives/dialog'
import { adminSave, text } from '../admin'
import type { AdminAction, AdminRow, AdminSnapshot } from '../admin'
import type { Company } from '../types'
import { CompanyPicker } from './CompanyPicker'
import { editorPayload, slugFor } from './editor-model'
import { useUnsavedChanges } from './use-unsaved'
import { UnsavedNavigation } from './UnsavedNavigation'

type Field = {
  key: string
  label: string
  kind?: 'textarea' | 'select' | 'checkbox' | 'number' | 'url'
  required?: boolean
  options?: { id: string; name: string }[]
  min?: number
  max?: number
  disabled?: boolean
}
type Group = { title: string; fields: Field[] }
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'
const names: Partial<Record<AdminAction, string>> = {
  company: 'empresa',
  item: 'produto ou serviço',
  category: 'categoria',
  neighborhood: 'bairro',
  plan: 'plano',
  media: 'imagem',
}

export function Editor({
  action,
  row,
  data,
  company,
  busy,
  onClose,
  onSave,
  onRefresh,
}: {
  action: AdminAction
  row?: AdminRow
  data: AdminSnapshot
  company: Company | null
  busy: boolean
  onClose: () => void
  onSave: (payload: AdminRow) => Promise<void>
  onRefresh: () => Promise<unknown>
}) {
  const [initial] = useState<AdminRow>(() => {
    const initial: AdminRow = {
      name: '',
      description: '',
      slug: '',
      category_id: company?.category_id ?? data.catalog.categories[0]?.id ?? '',
      city_id:
        data.cities.find((city) => city.slug === 'cacoal-ro')?.id ?? data.cities[0]?.id ?? '',
      neighborhood_id: '',
      plan_id: data.catalog.plans[0]?.id ?? '',
      status: 'inactive',
      street: '',
      address_number: '',
      postal_code: '',
      phone: '',
      whatsapp: '',
      website: '',
      hours: '',
      icon: 'Store',
      is_active: true,
      type: 'product',
      company_id: company?.id ?? '',
      available: true,
      max_items: 5,
      max_media: 3,
      featured: false,
      direct_contact: false,
      url: '',
      alt: '',
      sort_order: 0,
      ...row,
      id: text(row ?? {}, 'id') || crypto.randomUUID(),
    }
    if (row && action === 'item')
      initial.price = row.price_cents === null ? '' : String(Number(row.price_cents) / 100)
    if (row && action === 'plan') {
      const limits = row.limits as Record<string, unknown> | undefined
      const features = row.features as Record<string, unknown> | undefined
      initial.max_items = limits?.items ?? 5
      initial.max_media = limits?.media ?? 3
      initial.featured = features?.featured ?? false
      initial.direct_contact = features?.direct_contact ?? false
    }
    return initial
  })
  const [form, setForm] = useState(initial)
  const [formCompany, setFormCompany] = useState(company)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  const [quick, setQuick] = useState<'category' | 'neighborhood' | null>(null)
  const [quickName, setQuickName] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)
  const [quickError, setQuickError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const fieldPrefix = useId()
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  useUnsavedChanges(dirty)
  const close = () => {
    if (busy || quickBusy) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  const update = (key: string, value: unknown) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === 'name' &&
      !text(row ?? {}, 'id') &&
      ['company', 'category'].includes(action) &&
      (!text(previous, 'slug') || text(previous, 'slug') === slugFor(text(previous, 'name')))
        ? { slug: slugFor(String(value)) }
        : {}),
      ...(key === 'city_id' ? { neighborhood_id: '' } : {}),
    }))
  }
  const categories = data.catalog.categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))
  const cities = data.cities.map((city) => ({ id: String(city.id), name: city.name }))
  const groups: Group[] =
    action === 'company'
      ? [
          {
            title: 'Perfil da empresa',
            fields: [
              { key: 'name', label: 'Nome do negócio', required: true },
              { key: 'slug', label: 'Endereço na URL', required: true },
              {
                key: 'description',
                label: 'O que esta empresa oferece?',
                kind: 'textarea',
                required: true,
              },
              {
                key: 'category_id',
                label: 'Categoria',
                kind: 'select',
                required: true,
                options: categories,
              },
            ],
          },
          {
            title: 'Endereço e contato',
            fields: [
              { key: 'city_id', label: 'Cidade', kind: 'select', required: true, options: cities },
              {
                key: 'neighborhood_id',
                label: 'Bairro',
                kind: 'select',
                options: data.neighborhoods
                  .filter((n) => String(n.city_id) === String(form.city_id))
                  .map((n) => ({ id: n.id, name: n.name })),
              },
              { key: 'street', label: 'Rua' },
              { key: 'address_number', label: 'Número' },
              { key: 'postal_code', label: 'CEP' },
              { key: 'phone', label: 'Telefone com DDD' },
              { key: 'whatsapp', label: 'WhatsApp com DDD' },
              { key: 'website', label: 'Site (https://)', kind: 'url' },
            ],
          },
          {
            title: 'Publicação e plano',
            fields: [
              {
                key: 'plan_id',
                label: 'Plano da empresa',
                kind: 'select',
                required: true,
                options: data.catalog.plans.map((plan) => ({ id: plan.id, name: plan.name })),
              },
              {
                key: 'status',
                label: 'Situação no guia',
                kind: 'select',
                options: [
                  { id: 'inactive', name: 'Rascunho — ainda não aparece no site' },
                  { id: 'active', name: 'Publicada — aparece nas buscas' },
                  { id: 'blocked', name: 'Bloqueada — não aparece no site' },
                ],
              },
              { key: 'hours', label: 'Horários de atendimento', kind: 'textarea' },
            ],
          },
        ]
      : action === 'item'
        ? [
            {
              title: 'Informações do catálogo',
              fields: [
                { key: 'name', label: 'Nome do item', required: true },
                {
                  key: 'type',
                  label: 'Tipo',
                  kind: 'select',
                  disabled: !!text(row ?? {}, 'id'),
                  options: [
                    { id: 'product', name: 'Produto' },
                    { id: 'service', name: 'Serviço' },
                  ],
                },
                {
                  key: 'category_id',
                  label: 'Categoria',
                  kind: 'select',
                  required: true,
                  options: categories,
                },
                { key: 'description', label: 'Descrição', kind: 'textarea', required: true },
                { key: 'price', label: 'Preço em reais (opcional)' },
                { key: 'available', label: 'Disponível para os clientes', kind: 'checkbox' },
              ],
            },
          ]
        : action === 'category'
          ? [
              {
                title: 'Organização do guia',
                fields: [
                  { key: 'name', label: 'Nome', required: true },
                  { key: 'slug', label: 'Endereço na URL', required: true },
                  {
                    key: 'icon',
                    label: 'Ícone',
                    kind: 'select',
                    options: [
                      { id: 'Store', name: 'Comércio' },
                      { id: 'Scissors', name: 'Beleza' },
                      { id: 'House', name: 'Casa' },
                      { id: 'Laptop', name: 'Tecnologia' },
                      { id: 'Car', name: 'Automotivo' },
                      { id: 'Utensils', name: 'Alimentação' },
                      { id: 'Wrench', name: 'Serviços' },
                    ],
                  },
                  { key: 'is_active', label: 'Categoria disponível no site', kind: 'checkbox' },
                ],
              },
            ]
          : action === 'neighborhood'
            ? [
                {
                  title: 'Localização',
                  fields: [
                    { key: 'name', label: 'Nome do bairro', required: true },
                    {
                      key: 'city_id',
                      label: 'Cidade',
                      kind: 'select',
                      required: true,
                      options: cities,
                    },
                  ],
                },
              ]
            : action === 'plan'
              ? [
                  {
                    title: 'Recursos do plano',
                    fields: [
                      { key: 'name', label: 'Nome do plano', required: true },
                      {
                        key: 'max_items',
                        label: 'Limite de produtos e serviços',
                        kind: 'number',
                        min: 0,
                        max: 500,
                      },
                      {
                        key: 'max_media',
                        label: 'Limite de imagens',
                        kind: 'number',
                        min: 0,
                        max: 100,
                      },
                      {
                        key: 'featured',
                        label: 'Destaque patrocinado Premium Guide',
                        kind: 'checkbox',
                      },
                      {
                        key: 'direct_contact',
                        label: 'Exibir telefone, WhatsApp e site',
                        kind: 'checkbox',
                      },
                    ],
                  },
                ]
              : [
                  {
                    title: 'Imagem do perfil',
                    fields: [
                      {
                        key: 'url',
                        label: 'Endereço da imagem (https://)',
                        kind: 'url',
                        required: true,
                      },
                      {
                        key: 'alt',
                        label: 'Descrição da imagem para acessibilidade',
                        required: true,
                      },
                      {
                        key: 'sort_order',
                        label: 'Posição na galeria (a primeira é a capa)',
                        kind: 'number',
                        min: 0,
                      },
                      { key: 'is_active', label: 'Imagem visível no perfil', kind: 'checkbox' },
                    ],
                  },
                ]
  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setErrors({})
    if (!formRef.current?.reportValidity()) return
    try {
      await onSave(editorPayload(action, form))
    } catch (failure) {
      if (failure instanceof z.ZodError) {
        setErrors(
          Object.fromEntries(failure.issues.map((issue) => [String(issue.path[0]), issue.message])),
        )
        setError('Revise os campos destacados antes de salvar.')
        requestAnimationFrame(() => {
          formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
        })
      } else setError(message(failure))
    }
  }
  return (
    <>
      <UnsavedNavigation dirty={dirty} />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent className="app-dialog admin-catalog-editor sm:max-w-[920px]">
          <DialogTitle>
            {text(row ?? {}, 'id') ? 'Editar' : 'Cadastrar'} {names[action] ?? 'cadastro'}
          </DialogTitle>
          <DialogDescription>
            {action === 'company'
              ? 'Preencha no seu ritmo. Salve como rascunho ou publique quando o perfil estiver pronto.'
              : company && ['item', 'media'].includes(action)
                ? `Catálogo de ${company.name}.`
                : 'Revise os dados e salve. Toda alteração fica na auditoria.'}
          </DialogDescription>
          <form
            ref={formRef}
            onSubmit={(event) => {
              void submit(event)
            }}
            className="admin-catalog-form"
          >
            {action === 'item' && !text(row ?? {}, 'id') && (
              <div className="admin-editor-company">
                <CompanyPicker
                  company={formCompany}
                  disabled={busy}
                  onChange={(selected) => {
                    setFormCompany(selected)
                    update('company_id', selected?.id ?? '')
                    if (selected) update('category_id', selected.category_id)
                  }}
                />
                {errors.company_id && (
                  <p className="field-error" role="alert">
                    {errors.company_id}
                  </p>
                )}
              </div>
            )}
            {groups.map((group) => (
              <fieldset className="admin-editor-group" key={group.title}>
                <legend>{group.title}</legend>
                <div className="admin-form">
                  {group.fields.map((field) =>
                    field.kind === 'checkbox' ? (
                      <label key={field.key} className="guide-checkbox full">
                        <input
                          type="checkbox"
                          checked={Boolean(form[field.key])}
                          disabled={busy}
                          onChange={(event) => {
                            update(field.key, event.target.checked)
                          }}
                        />
                        {field.label}
                      </label>
                    ) : (
                      <div
                        key={field.key}
                        className={
                          'admin-editor-field ' + (field.kind === 'textarea' ? 'full' : '')
                        }
                      >
                        <label htmlFor={fieldPrefix + field.key}>
                          <span>
                            {field.label}
                            {field.required && (
                              <span className="required-mark" aria-hidden="true">
                                {' '}
                                *
                              </span>
                            )}
                          </span>
                        </label>
                        {field.kind === 'textarea' ? (
                          <textarea
                            id={fieldPrefix + field.key}
                            aria-describedby={
                              errors[field.key] ? fieldPrefix + field.key + '-error' : undefined
                            }
                            rows={4}
                            value={text(form, field.key)}
                            required={field.required}
                            disabled={busy}
                            aria-invalid={!!errors[field.key]}
                            maxLength={2000}
                            onChange={(event) => {
                              update(field.key, event.target.value)
                            }}
                          />
                        ) : field.kind === 'select' ? (
                          <select
                            id={fieldPrefix + field.key}
                            aria-describedby={
                              errors[field.key] ? fieldPrefix + field.key + '-error' : undefined
                            }
                            value={text(form, field.key)}
                            required={field.required}
                            disabled={field.disabled || busy}
                            aria-invalid={!!errors[field.key]}
                            onChange={(event) => {
                              update(field.key, event.target.value)
                            }}
                          >
                            <option value="">Selecione</option>
                            {field.options?.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={fieldPrefix + field.key}
                            aria-describedby={
                              errors[field.key] ? fieldPrefix + field.key + '-error' : undefined
                            }
                            type={
                              field.kind === 'number'
                                ? 'number'
                                : field.kind === 'url'
                                  ? 'url'
                                  : 'text'
                            }
                            value={text(form, field.key)}
                            required={field.required}
                            disabled={busy}
                            aria-invalid={!!errors[field.key]}
                            min={field.min}
                            max={field.max}
                            step={1}
                            maxLength={field.kind === 'url' ? 2048 : 150}
                            inputMode={
                              ['phone', 'whatsapp', 'postal_code'].includes(field.key)
                                ? 'tel'
                                : field.key === 'price'
                                  ? 'decimal'
                                  : undefined
                            }
                            onChange={(event) => {
                              update(field.key, event.target.value)
                            }}
                          />
                        )}
                        {errors[field.key] && (
                          <small
                            id={fieldPrefix + field.key + '-error'}
                            className="field-error"
                            role="alert"
                          >
                            {errors[field.key]}
                          </small>
                        )}
                        {['category_id', 'neighborhood_id'].includes(field.key) && (
                          <button
                            type="button"
                            className="text-button admin-inline-create"
                            onClick={() => {
                              setQuick(field.key === 'category_id' ? 'category' : 'neighborhood')
                              setQuickName('')
                              setQuickError('')
                            }}
                          >
                            + Cadastrar {field.key === 'category_id' ? 'categoria' : 'bairro'} aqui
                          </button>
                        )}
                        {field.key === 'slug' && (
                          <small>Gerado pelo nome. Você pode ajustar antes de salvar.</small>
                        )}
                        {field.key === 'price' && (
                          <small>Ex.: 45,50. Deixe vazio para “Valor a consultar”.</small>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </fieldset>
            ))}
            {action === 'company' && (
              <div className="admin-editor-preview">
                <strong>{text(form, 'name') || 'Nome da empresa'}</strong>
                <p>{text(form, 'description') || 'A descrição do negócio aparecerá aqui.'}</p>
                <span>
                  {form.status === 'active'
                    ? 'Será publicada após salvar'
                    : form.status === 'blocked'
                      ? 'Permanecerá bloqueada'
                      : 'Será salva como rascunho'}
                </span>
              </div>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-savebar">
              <span role="status">
                {busy
                  ? 'Salvando com segurança…'
                  : dirty
                    ? 'Alterações ainda não salvas'
                    : 'Preencha os dados do cadastro'}
              </span>
              <button type="button" className="btn outline" disabled={busy} onClick={close}>
                <ArrowLeft size={18} />
                Voltar
              </button>
              <button type="submit" className="btn primary" disabled={busy}>
                <Save size={19} />
                {busy ? 'Salvando…' : action === 'company' ? 'Salvar empresa' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent className="app-dialog">
          <DialogTitle>Você tem alterações não salvas</DialogTitle>
          <DialogDescription>
            Continue editando para salvar o cadastro ou descarte apenas as alterações desta tela.
          </DialogDescription>
          <div className="wizard-actions">
            <button
              className="btn outline"
              onClick={() => {
                setDiscard(false)
              }}
            >
              Continuar editando
            </button>
            <button className="btn primary" onClick={onClose}>
              Descartar alterações
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!quick}
        onOpenChange={(open) => {
          if (!open && !quickBusy) setQuick(null)
        }}
      >
        <DialogContent className="app-dialog">
          <DialogTitle>Cadastrar {quick === 'category' ? 'categoria' : 'bairro'}</DialogTitle>
          <DialogDescription>
            Crie sem sair do cadastro. A alteração ficará registrada na auditoria.
          </DialogDescription>
          <label className="admin-quick-field">
            Nome
            <input
              value={quickName}
              onChange={(event) => {
                setQuickName(event.target.value)
              }}
              maxLength={100}
            />
          </label>
          {quickError && (
            <p role="alert" className="field-error">
              {quickError}
            </p>
          )}
          <div className="wizard-actions">
            <button
              className="btn outline"
              disabled={quickBusy}
              onClick={() => {
                setQuick(null)
              }}
            >
              Voltar
            </button>
            <button
              className="btn primary"
              disabled={quickBusy || quickName.trim().length < 2}
              onClick={() => {
                if (!quick) return
                setQuickBusy(true)
                setQuickError('')
                void adminSave(
                  quick,
                  quick === 'category'
                    ? {
                        name: quickName.trim(),
                        slug: slugFor(quickName),
                        icon: 'Store',
                        is_active: true,
                      }
                    : { name: quickName.trim(), city_id: Number(form.city_id) },
                )
                  .then(async (result) => {
                    await onRefresh()
                    update(quick === 'category' ? 'category_id' : 'neighborhood_id', result.id)
                    setQuick(null)
                  })
                  .catch((failure: unknown) => {
                    setQuickError(message(failure))
                  })
                  .finally(() => {
                    setQuickBusy(false)
                  })
              }}
            >
              {quickBusy ? 'Salvando…' : 'Salvar e usar no cadastro'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
