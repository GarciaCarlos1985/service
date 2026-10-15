import { useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Store,
  Package,
  Tags,
  MapPin,
  BadgeCheck,
  Star,
  MessageCircle,
  LifeBuoy,
  Users,
  Image,
  ShieldCheck,
  Flag,
  Plus,
  Search,
  RefreshCw,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/modules/ui/primitives/dialog'
import { Header, Footer, Picker, useCatalog } from '../components/shared'
import { adminSnapshot, adminSave, text, priceCents } from '../admin'
import type { AdminAction, AdminRow, AdminSection, AdminSnapshot } from '../admin'
import { companySchema, normalize } from '../types'
import type { Company } from '../types'

const sections = [
  ['overview', 'Visão geral', BarChart3],
  ['companies', 'Empresas', Store],
  ['items', 'Produtos e serviços', Package],
  ['categories', 'Categorias', Tags],
  ['neighborhoods', 'Bairros', MapPin],
  ['plans', 'Planos', BadgeCheck],
  ['reviews', 'Avaliações', Star],
  ['contacts', 'Contatos', MessageCircle],
  ['support', 'Ajuda e inclusões', LifeBuoy],
  ['users', 'Usuários', Users],
  ['media', 'Imagens', Image],
  ['reports', 'Denúncias', Flag],
  ['audit', 'Auditoria', ShieldCheck],
] as const
const editorActions: Partial<Record<AdminSection, AdminAction>> = {
  companies: 'company',
  items: 'item',
  categories: 'category',
  neighborhoods: 'neighborhood',
  plans: 'plan',
  media: 'media',
}
const labels: Record<string, string> = {
  active: 'Ativa',
  inactive: 'Rascunho',
  blocked: 'Bloqueada',
  pending: 'Pendente',
  published: 'Publicada',
  hidden: 'Oculta',
  new: 'Nova',
  handled: 'Atendida',
  in_progress: 'Em andamento',
  resolved: 'Resolvida',
  product: 'Produto',
  service: 'Serviço',
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'

export default function Admin() {
  const { viewer, viewerLoading, viewerError, loadViewer } = useCatalog(null, undefined, false)
  const queryClient = useQueryClient()
  const [section, setSection] = useState<AdminSection>('overview')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [days, setDays] = useState('7')
  const [company, setCompany] = useState<Company | null>(null)
  const [editor, setEditor] = useState<{ action: AdminAction; row?: AdminRow } | null>(null)
  const [details, setDetails] = useState<AdminRow | null>(null)
  const [confirmation, setConfirmation] = useState<{
    action: AdminAction
    row: AdminRow
    status: string
    title: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const snapshot = useQuery({
    queryKey: ['guide-admin', section, page, query, company?.id, days],
    queryFn: () => adminSnapshot(section, page, query, company?.id, Number(days)),
    enabled: !!viewer?.admin,
    retry: false,
  })
  const data = snapshot.data
  const navigate = (next: AdminSection) => {
    setSection(next)
    setPage(1)
    setQuery('')
    setSearch('')
  }
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['guide-admin'] })
  const manage = (row: AdminRow, area: 'items' | 'media') => {
    setCompany(companySchema.parse(row))
    navigate(area)
  }
  const save = async (action: AdminAction, payload: AdminRow) => {
    setSaving(true)
    try {
      await adminSave(action, payload)
      await refresh()
      setEditor(null)
      setConfirmation(null)
      toast.success('Alteração salva e registrada na auditoria.')
    } catch (error) {
      toast.error(message(error))
      throw error
    } finally {
      setSaving(false)
    }
  }
  const exportPage = () => {
    if (!data) return
    const blob = new Blob(
      [
        JSON.stringify(
          { section, page, exported_at: new Date().toISOString(), rows: data.rows },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `service-guide-${section}-pagina-${String(page)}.json`
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
    toast.info('Exportada somente a página visível. Guarde o arquivo em local restrito.')
  }
  return (
    <>
      <Header viewer={viewer} />
      <main id="main-content" className="wrap admin-page">
        <div className="section-top">
          <div>
            <h1>Painel do guia</h1>
            <p>Cadastros, contatos e resultados do comércio local.</p>
          </div>
          {viewer?.admin && (
            <button
              className="btn outline"
              onClick={() => {
                void refresh()
              }}
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          )}
        </div>
        {viewerLoading ? (
          <div className="state-box" role="status">
            Conferindo seu acesso…
          </div>
        ) : viewerError ? (
          <div className="state-box" role="alert">
            <p>{viewerError}</p>
            <button
              className="btn primary"
              onClick={() => {
                void loadViewer()
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : !viewer ? (
          <div className="state-box">
            <h2>Entre para acessar o painel.</h2>
            <a className="btn primary" href="/entrar?redirect=%2Fadmin">
              Entrar na minha conta
            </a>
          </div>
        ) : !viewer.admin ? (
          <div className="state-box">
            <ShieldCheck />
            <h2>Acesso da administração</h2>
            <p>Sua conta pode usar o guia. Esta área é reservada à equipe autorizada.</p>
            <a className="btn outline" href="/">
              Explorar o guia
            </a>
          </div>
        ) : (
          <div className="guide-admin-layout">
            <nav className="guide-admin-nav" aria-label="Áreas administrativas">
              {sections.map(([key, label, Icon]) => (
                <button
                  key={key}
                  className={section === key ? 'selected' : ''}
                  aria-current={section === key ? 'page' : undefined}
                  onClick={() => {
                    navigate(key)
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
            <section className="guide-admin-content" aria-busy={snapshot.isFetching}>
              <div className="section-top">
                <h2>{sections.find(([key]) => key === section)?.[1]}</h2>
                {editorActions[section] && (
                  <button
                    className="btn primary"
                    disabled={!data || ((section === 'items' || section === 'media') && !company)}
                    onClick={() => {
                      const action = editorActions[section]
                      if (action) setEditor({ action })
                    }}
                  >
                    <Plus size={18} />
                    Adicionar
                  </button>
                )}
              </div>
              {(section === 'items' || section === 'media') && (
                <p className="status-note">
                  {company ? (
                    <>
                      Gerenciando <strong>{company.name}</strong>.{' '}
                      <button
                        className="text-button"
                        onClick={() => {
                          navigate('companies')
                        }}
                      >
                        Trocar empresa
                      </button>
                    </>
                  ) : (
                    <>
                      Escolha uma empresa para gerenciar seus itens e imagens.{' '}
                      <button
                        className="text-button"
                        onClick={() => {
                          navigate('companies')
                        }}
                      >
                        Escolher empresa
                      </button>
                    </>
                  )}
                </p>
              )}
              {snapshot.isError ? (
                <div className="state-box" role="alert">
                  <p>{message(snapshot.error)}</p>
                  <button
                    className="btn primary"
                    onClick={() => {
                      void snapshot.refetch()
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : !data ? (
                <div className="state-box" role="status">
                  Carregando informações…
                </div>
              ) : section === 'overview' ? (
                <>
                  <div className="section-top">
                    <p className="secondary">
                      Interesse registrado com consentimento. Cliques não comprovam vendas.
                    </p>
                    <Picker
                      label="Período das estatísticas"
                      value={days}
                      onChange={setDays}
                      options={[
                        { id: '7', name: 'Últimos 7 dias' },
                        { id: '30', name: 'Últimos 30 dias' },
                        { id: '90', name: 'Últimos 90 dias' },
                      ]}
                    />
                  </div>
                  <div className="metric-grid">
                    {[
                      ['Empresas ativas', data.metrics.companies],
                      ['Perfis visualizados', data.metrics.views],
                      ['Pesquisas', data.metrics.searches],
                      ['Cliques no WhatsApp', data.metrics.whatsapp],
                      ['Avaliações pendentes', data.metrics.pending_reviews],
                      ['Contatos novos', data.metrics.new_contacts],
                      ['Solicitações novas', data.metrics.new_support],
                    ].map(([label, value]) => (
                      <div className="metric" key={label}>
                        <span>{label}</span>
                        <strong>{value ?? 0}</strong>
                      </div>
                    ))}
                  </div>
                  <h3>O que as pessoas procuram</h3>
                  {data.metrics.top_queries?.length ? (
                    <ul className="guide-query-list">
                      {data.metrics.top_queries.map((item) => (
                        <li key={item.query}>
                          <span>{item.query}</span>
                          <strong>{item.count}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="status-note">Ainda não há pesquisas registradas neste período.</p>
                  )}
                </>
              ) : (
                <>
                  <form
                    className="guide-admin-toolbar"
                    onSubmit={(event) => {
                      event.preventDefault()
                      setQuery(search.trim())
                      setPage(1)
                    }}
                  >
                    <label className="admin-search">
                      <Search size={18} />
                      <input
                        aria-label="Pesquisar registros"
                        placeholder="Pesquisar nesta área"
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value)
                        }}
                        maxLength={150}
                      />
                    </label>
                    <button className="btn outline" type="submit">
                      Pesquisar
                    </button>
                    <button
                      className="btn outline"
                      type="button"
                      disabled={!data.rows.length}
                      onClick={exportPage}
                    >
                      <Download size={16} />
                      Exportar página
                    </button>
                  </form>
                  <p className="secondary">
                    {data.pagination.total} registro{data.pagination.total === 1 ? '' : 's'} ·
                    página {data.pagination.page} de {data.pagination.pages}
                  </p>
                  {!data.rows.length ? (
                    <div className="state-box">
                      <Store size={30} />
                      <h3>Nenhum registro nesta área.</h3>
                      <p>Os cadastros e solicitações aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="guide-table-scroll">
                      <table className="guide-admin-table">
                        <thead>
                          <tr>
                            <th>Registro</th>
                            <th>Informações</th>
                            <th>Situação</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.rows.map((row) => (
                            <tr key={text(row, 'id')}>
                              <td>
                                <strong>
                                  {text(row, 'name') ||
                                    text(row, 'company_name') ||
                                    text(row, 'action') ||
                                    text(row, 'alt') ||
                                    text(row, 'email') ||
                                    'Registro'}
                                </strong>
                                {text(row, 'email') && <p>{text(row, 'email')}</p>}
                              </td>
                              <td>
                                <p>
                                  {(
                                    text(row, 'description') ||
                                    text(row, 'message') ||
                                    text(row, 'comment') ||
                                    text(row, 'reason') ||
                                    text(row, 'slug') ||
                                    text(row, 'neighborhood') ||
                                    text(row, 'url')
                                  ).slice(0, 130)}
                                </p>
                                {section === 'items' && (
                                  <span>
                                    {labels[text(row, 'type')]} ·{' '}
                                    {row.price_cents === null
                                      ? 'Valor a consultar'
                                      : new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        }).format(Number(row.price_cents) / 100)}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className="status">
                                  {labels[text(row, 'status')] ||
                                    (typeof row.is_active === 'boolean'
                                      ? row.is_active
                                        ? 'Ativa'
                                        : 'Inativa'
                                      : text(row, 'created_at')
                                        ? new Date(text(row, 'created_at')).toLocaleDateString(
                                            'pt-BR',
                                          )
                                        : '—')}
                                </span>
                              </td>
                              <td>
                                <div className="row-actions">
                                  {editorActions[section] && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        const action = editorActions[section]
                                        if (action) setEditor({ action, row })
                                      }}
                                    >
                                      Editar
                                    </button>
                                  )}
                                  {section === 'companies' && (
                                    <>
                                      <button
                                        className="text-button"
                                        onClick={() => {
                                          manage(row, 'items')
                                        }}
                                      >
                                        Itens
                                      </button>
                                      <button
                                        className="text-button"
                                        onClick={() => {
                                          manage(row, 'media')
                                        }}
                                      >
                                        Imagens
                                      </button>
                                    </>
                                  )}
                                  {['reviews', 'contacts', 'support', 'reports', 'audit'].includes(
                                    section,
                                  ) && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setDetails(row)
                                      }}
                                    >
                                      Ver detalhes
                                    </button>
                                  )}
                                  {section === 'reviews' && (
                                    <>
                                      <button
                                        className="text-button"
                                        onClick={() => {
                                          setConfirmation({
                                            action: 'review',
                                            row,
                                            status: 'published',
                                            title: 'Publicar esta avaliação?',
                                          })
                                        }}
                                      >
                                        Publicar
                                      </button>
                                      <button
                                        className="text-button"
                                        onClick={() => {
                                          setConfirmation({
                                            action: 'review',
                                            row,
                                            status: 'hidden',
                                            title: 'Ocultar esta avaliação?',
                                          })
                                        }}
                                      >
                                        Ocultar
                                      </button>
                                    </>
                                  )}
                                  {section === 'contacts' && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setConfirmation({
                                          action: 'contact',
                                          row,
                                          status: 'handled',
                                          title: 'Marcar contato como atendido?',
                                        })
                                      }}
                                    >
                                      Atendido
                                    </button>
                                  )}
                                  {section === 'support' && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setConfirmation({
                                          action: 'support',
                                          row,
                                          status:
                                            text(row, 'status') === 'new'
                                              ? 'in_progress'
                                              : 'resolved',
                                          title:
                                            text(row, 'status') === 'new'
                                              ? 'Iniciar atendimento?'
                                              : 'Marcar solicitação como resolvida?',
                                        })
                                      }}
                                    >
                                      {text(row, 'status') === 'new' ? 'Atender' : 'Resolver'}
                                    </button>
                                  )}
                                  {section === 'reports' && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setConfirmation({
                                          action: 'report',
                                          row,
                                          status: 'handled',
                                          title: 'Concluir análise da denúncia?',
                                        })
                                      }}
                                    >
                                      Concluir
                                    </button>
                                  )}
                                  {section === 'users' && !row.is_admin && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setConfirmation({
                                          action: 'user',
                                          row,
                                          status:
                                            text(row, 'status') === 'blocked'
                                              ? 'active'
                                              : 'blocked',
                                          title:
                                            text(row, 'status') === 'blocked'
                                              ? 'Reativar esta conta?'
                                              : 'Bloquear esta conta no guia?',
                                        })
                                      }}
                                    >
                                      {text(row, 'status') === 'blocked' ? 'Reativar' : 'Bloquear'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {data.pagination.pages > 1 && (
                    <div className="guide-admin-pagination">
                      <button
                        className="btn outline"
                        disabled={page <= 1 || snapshot.isFetching}
                        onClick={() => {
                          setPage((value) => value - 1)
                        }}
                      >
                        Anterior
                      </button>
                      <span>
                        Página {page} de {data.pagination.pages}
                      </span>
                      <button
                        className="btn outline"
                        disabled={page >= data.pagination.pages || snapshot.isFetching}
                        onClick={() => {
                          setPage((value) => value + 1)
                        }}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
        {editor && data && (
          <Editor
            key={`${editor.action}-${text(editor.row ?? {}, 'id')}`}
            action={editor.action}
            row={editor.row}
            data={data}
            company={company}
            busy={saving}
            onClose={() => {
              setEditor(null)
            }}
            onSave={(payload) => save(editor.action, payload)}
          />
        )}
        <Dialog
          open={!!confirmation}
          onOpenChange={(open) => {
            if (!open && !saving) setConfirmation(null)
          }}
        >
          <DialogContent className="app-dialog">
            <DialogTitle>{confirmation?.title}</DialogTitle>
            <DialogDescription>
              A alteração será aplicada ao registro selecionado e ficará na auditoria.
            </DialogDescription>
            <div className="wizard-actions">
              <button
                className="btn outline"
                disabled={saving}
                onClick={() => {
                  setConfirmation(null)
                }}
              >
                Cancelar
              </button>
              <button
                className="btn primary"
                disabled={saving}
                onClick={() => {
                  if (confirmation)
                    void save(confirmation.action, {
                      id: text(confirmation.row, 'id'),
                      status: confirmation.status,
                    }).catch(() => undefined)
                }}
              >
                {saving ? 'Salvando…' : 'Confirmar alteração'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={!!details}
          onOpenChange={(open) => {
            if (!open) setDetails(null)
          }}
        >
          <DialogContent className="app-dialog">
            <DialogTitle>Detalhes do registro</DialogTitle>
            <DialogDescription>Informações restritas à administração.</DialogDescription>
            <dl className="guide-record-details">
              {details &&
                Object.entries(details)
                  .filter(([key]) => !['search_text', 'search_vector'].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>
                        {(
                          {
                            name: 'Nome',
                            email: 'E-mail',
                            phone: 'Telefone',
                            message: 'Mensagem',
                            comment: 'Comentário',
                            reason: 'Motivo',
                            status: 'Situação',
                            company_name: 'Empresa',
                            user_name: 'Consumidor',
                            created_at: 'Recebido em',
                          } as Record<string, string>
                        )[key] ?? key}
                      </dt>
                      <dd>
                        {typeof value === 'object'
                          ? JSON.stringify(value)
                          : typeof value === 'string' ||
                              typeof value === 'number' ||
                              typeof value === 'boolean'
                            ? String(value)
                            : 'Não informado'}
                      </dd>
                    </div>
                  ))}
            </dl>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </>
  )
}

type Field = {
  key: string
  label: string
  kind?: 'textarea' | 'select' | 'checkbox' | 'number' | 'url'
  required?: boolean
  options?: { id: string; name: string }[]
  step?: number
  min?: number
  max?: number
  disabled?: boolean
}
function Editor({
  action,
  row,
  data,
  company,
  busy,
  onClose,
  onSave,
}: {
  action: AdminAction
  row?: AdminRow
  data: AdminSnapshot
  company: Company | null
  busy: boolean
  onClose: () => void
  onSave: (payload: AdminRow) => Promise<void>
}) {
  const initial: AdminRow = {
    name: '',
    description: '',
    slug: '',
    category_id: data.catalog.categories[0]?.id ?? '',
    city_id: data.cities[0]?.id ?? '',
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
  const [form, setForm] = useState<AdminRow>(initial)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const update = (key: string, value: unknown) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === 'name' && !row && ['company', 'category'].includes(action)
        ? {
            slug: normalize(String(value))
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
          }
        : {}),
      ...(key === 'city_id' ? { neighborhood_id: '' } : {}),
    }))
  }
  const categories = data.catalog.categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))
  const cities = data.cities.map((city) => ({ id: String(city.id), name: city.name }))
  const fields: Field[] =
    action === 'company'
      ? step === 0
        ? [
            { key: 'name', label: 'Nome do negócio', required: true },
            { key: 'slug', label: 'Nome na URL', required: true },
            { key: 'description', label: 'Descrição', kind: 'textarea', required: true },
            {
              key: 'category_id',
              label: 'Categoria',
              kind: 'select',
              required: true,
              options: categories,
            },
          ]
        : step === 1
          ? [
              { key: 'city_id', label: 'Cidade', kind: 'select', required: true, options: cities },
              {
                key: 'neighborhood_id',
                label: 'Bairro cadastrado',
                kind: 'select',
                options: data.neighborhoods
                  .filter((neighborhood) => String(neighborhood.city_id) === String(form.city_id))
                  .map((neighborhood) => ({ id: neighborhood.id, name: neighborhood.name })),
              },
              { key: 'street', label: 'Rua' },
              { key: 'address_number', label: 'Número' },
              { key: 'postal_code', label: 'CEP (somente números)' },
              { key: 'phone', label: 'Telefone com país e DDD' },
              { key: 'whatsapp', label: 'WhatsApp com país e DDD' },
              { key: 'website', label: 'Site (https://)', kind: 'url' },
            ]
          : [
              {
                key: 'plan_id',
                label: 'Plano da empresa',
                kind: 'select',
                required: true,
                options: data.catalog.plans.map((plan) => ({ id: plan.id, name: plan.name })),
              },
              {
                key: 'status',
                label: 'Publicação',
                kind: 'select',
                options: [
                  { id: 'inactive', name: 'Salvar como rascunho' },
                  { id: 'active', name: 'Ativa no guia' },
                  { id: 'blocked', name: 'Bloqueada' },
                ],
              },
              { key: 'hours', label: 'Horários informados', kind: 'textarea' },
            ]
      : action === 'item'
        ? [
            { key: 'name', label: 'Nome do item', required: true },
            {
              key: 'type',
              label: 'Tipo',
              kind: 'select',
              disabled: !!row,
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
            { key: 'available', label: 'Disponível', kind: 'checkbox' },
          ]
        : action === 'category'
          ? [
              { key: 'name', label: 'Nome', required: true },
              { key: 'slug', label: 'Nome na URL', required: true },
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
              { key: 'is_active', label: 'Categoria ativa', kind: 'checkbox' },
            ]
          : action === 'neighborhood'
            ? [
                { key: 'name', label: 'Nome canônico do bairro', required: true },
                {
                  key: 'city_id',
                  label: 'Cidade',
                  kind: 'select',
                  options: cities,
                  required: true,
                },
              ]
            : action === 'plan'
              ? [
                  { key: 'name', label: 'Nome do plano', required: true },
                  { key: 'max_items', label: 'Limite de itens', kind: 'number', min: 0, max: 500 },
                  {
                    key: 'max_media',
                    label: 'Limite de imagens',
                    kind: 'number',
                    min: 0,
                    max: 100,
                  },
                  {
                    key: 'featured',
                    label: 'Destaque identificado nos resultados',
                    kind: 'checkbox',
                  },
                  {
                    key: 'direct_contact',
                    label: 'Exibir telefone, WhatsApp e site',
                    kind: 'checkbox',
                  },
                ]
              : [
                  { key: 'url', label: 'URL da imagem (https://)', kind: 'url', required: true },
                  { key: 'alt', label: 'Descrição acessível da imagem', required: true },
                  {
                    key: 'sort_order',
                    label: 'Ordem (a primeira imagem será a capa)',
                    kind: 'number',
                    min: 0,
                  },
                ]
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!formRef.current?.reportValidity()) return
    if (action === 'company' && step < 2) {
      setStep((value) => value + 1)
      return
    }
    try {
      const payload = { ...form }
      for (const key of ['city_id', 'max_items', 'max_media', 'sort_order'])
        if (payload[key] !== undefined) payload[key] = Number(payload[key])
      if (action === 'item') payload.price_cents = priceCents(text(form, 'price'))
      if (action === 'company') {
        payload.phone = text(form, 'phone').replace(/[^+\d]/g, '')
        let whatsapp = text(form, 'whatsapp').replace(/\D/g, '')
        if (whatsapp.length === 10 || whatsapp.length === 11) whatsapp = '55' + whatsapp
        payload.whatsapp = whatsapp
        payload.postal_code = text(form, 'postal_code').replace(/\D/g, '')
      }
      await onSave(payload)
    } catch (failure) {
      setError(message(failure))
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="app-dialog company-wizard">
        <DialogTitle>{row ? 'Editar cadastro' : 'Adicionar cadastro'}</DialogTitle>
        <DialogDescription>
          {action === 'company'
            ? 'Prepare o perfil e revise antes de publicar. A inclusão e o plano são administrados manualmente.'
            : company && ['item', 'media'].includes(action)
              ? `Cadastro de ${company.name}.`
              : 'Os dados serão validados e a alteração ficará na auditoria.'}
        </DialogDescription>
        {action === 'company' && (
          <ol className="wizard-steps">
            {['Perfil', 'Local e contato', 'Revisão'].map((label, index) => (
              <li key={label} aria-current={step === index ? 'step' : undefined}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}
        <form
          ref={formRef}
          onSubmit={(event) => {
            void submit(event)
          }}
          className="admin-form guide-editor-form"
        >
          {fields.map((field) =>
            field.kind === 'checkbox' ? (
              <label className="guide-checkbox full" key={field.key}>
                <input
                  type="checkbox"
                  checked={Boolean(form[field.key])}
                  onChange={(event) => {
                    update(field.key, event.target.checked)
                  }}
                />
                {field.label}
              </label>
            ) : (
              <label key={field.key} className={field.kind === 'textarea' ? 'full' : ''}>
                {field.label}
                {field.kind === 'textarea' ? (
                  <textarea
                    rows={4}
                    value={text(form, field.key)}
                    onChange={(event) => {
                      update(field.key, event.target.value)
                    }}
                    required={field.required}
                    minLength={
                      field.key === 'description' ? (action === 'company' ? 10 : 2) : undefined
                    }
                    maxLength={2000}
                  />
                ) : field.kind === 'select' ? (
                  <select
                    value={text(form, field.key)}
                    onChange={(event) => {
                      update(field.key, event.target.value)
                    }}
                    required={field.required}
                    disabled={field.disabled}
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
                    type={
                      field.kind === 'number' ? 'number' : field.kind === 'url' ? 'url' : 'text'
                    }
                    value={text(form, field.key)}
                    onChange={(event) => {
                      update(field.key, event.target.value)
                    }}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    maxLength={field.kind === 'url' ? 2048 : 150}
                    step={field.step ?? 1}
                  />
                )}
              </label>
            ),
          )}
          {action === 'company' && step === 2 && (
            <div className="status-note full">
              <strong>{text(form, 'name')}</strong>
              <p>{text(form, 'description')}</p>
              <small>
                Uma empresa ativa precisa de categoria, bairro e ao menos um contato. O destaque
                segue os recursos do plano escolhido.
              </small>
            </div>
          )}
          {error && (
            <p className="field-error full" role="alert">
              {error}
            </p>
          )}
          <div className="wizard-actions full">
            <button
              type="button"
              className="btn outline"
              disabled={busy}
              onClick={() => {
                if (action === 'company' && step > 0) {
                  setStep((value) => value - 1)
                } else {
                  onClose()
                }
              }}
            >
              {action === 'company' && step > 0 ? 'Voltar' : 'Cancelar'}
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy
                ? 'Salvando…'
                : action === 'company' && step < 2
                  ? 'Continuar'
                  : 'Salvar cadastro'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
