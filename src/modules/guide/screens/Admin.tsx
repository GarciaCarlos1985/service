import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '~/lib/supabase'
import { useAuth } from '~/modules/auth/auth-context'
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
  Settings2,
  ArrowUpDown,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/modules/ui/primitives/dialog'
import { Header, Footer, Picker, useCatalog } from '../components/shared'
import { adminCompany, adminSnapshot, adminSave, text } from '../admin'
import type { AdminAction, AdminRow, AdminSection } from '../admin'
import { companySchema } from '../types'
import type { Company } from '../types'
import { Editor } from '../admin/CatalogEditor'
import { CompanyPicker } from '../admin/CompanyPicker'
import { OrderBoard } from '../admin/OrderBoard'
import type { OrderScope } from '../admin'
import { PresentationSettings } from '../admin/PresentationSettings'
import { SecurityPanel } from '../admin/SecurityPanel'
import { MediaUploader } from '../admin/MediaUploader'
import { RoleDialog } from '../admin/RoleDialog'

const sections = [
  ['overview', 'Visão geral', BarChart3],
  ['companies', 'Empresas', Store],
  ['items', 'Produtos e serviços', Package],
  ['media', 'Imagens', Image],
  ['categories', 'Categorias', Tags],
  ['neighborhoods', 'Bairros', MapPin],
  ['plans', 'Planos', BadgeCheck],
  ['reviews', 'Avaliações', Star],
  ['contacts', 'Contatos', MessageCircle],
  ['support', 'Ajuda e inclusões', LifeBuoy],
  ['users', 'Usuários', Users],
  ['reports', 'Denúncias', Flag],
  ['audit', 'Auditoria', ShieldCheck],
  ['settings', 'Aparência do site', Settings2],
  ['security', 'Segurança da conta', KeyRound],
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
  const { user, session } = useAuth()
  const { viewer, viewerLoading, viewerError, loadViewer } = useCatalog(null, undefined, false)
  const queryClient = useQueryClient()
  const params = useSearch({ from: '/admin' })
  const routeNavigate = useNavigate({ from: '/admin' })
  const section = params.area
  const page = params.page
  const query = params.query
  const [days, setDays] = useState('7')
  const companyQuery = useQuery({
    queryKey: ['guide-admin', user?.id, 'company', params.company],
    queryFn: () => {
      if (!params.company) throw new Error('Escolha uma empresa.')
      return adminCompany(params.company)
    },
    enabled: !!viewer?.admin && !!params.company,
    retry: false,
  })
  const company = companyQuery.data ?? null
  const setCompany = (selected: Company | null) =>
    routeNavigate({ search: (previous) => ({ ...previous, company: selected?.id, page: 1 }) })
  const assurance = useQuery({
    queryKey: ['guide-assurance', user?.id],
    queryFn: async () => {
      const result = await getSupabase().auth.mfa.getAuthenticatorAssuranceLevel()
      if (result.error) throw result.error
      return result.data
    },
    enabled: !!viewer?.admin,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const mfaRequired = assurance.data?.nextLevel === 'aal2' && assurance.data.currentLevel !== 'aal2'
  const [ordering, setOrdering] = useState<OrderScope | null>(null)
  const [roleTarget, setRoleTarget] = useState<AdminRow | null>(null)
  const [editor, setEditor] = useState<{ action: AdminAction; row?: AdminRow } | null>(null)
  const [details, setDetails] = useState<AdminRow | null>(null)
  const [confirmation, setConfirmation] = useState<{
    action: AdminAction
    row: AdminRow
    status: string
    title: string
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const snapshot = useQuery({
    queryKey: [
      'guide-admin',
      user?.id,
      session?.expires_at,
      section,
      page,
      query,
      params.company,
      days,
    ],
    queryFn: () => adminSnapshot(section, page, query, params.company, Number(days)),
    enabled:
      !!viewer?.admin &&
      assurance.isSuccess &&
      !mfaRequired &&
      section !== 'security' &&
      !(section === 'settings' && settingsDirty),
    refetchOnWindowFocus: section !== 'settings',
    retry: false,
  })
  const data = snapshot.data
  const navigate = (next: AdminSection, selected?: Company) => {
    void routeNavigate({
      search: (previous) => ({
        ...previous,
        area: next,
        page: 1,
        query: '',
        company: selected?.id ?? previous.company,
      }),
    })
  }
  const setPage = (next: number) => {
    void routeNavigate({ search: (previous) => ({ ...previous, page: next }) })
  }
  const refresh = () =>
    queryClient.invalidateQueries({
      predicate: (entry) =>
        typeof entry.queryKey[0] === 'string' && entry.queryKey[0].startsWith('guide-'),
    })
  const manage = (row: AdminRow, area: 'items' | 'media') => {
    navigate(area, companySchema.parse(row))
  }
  const openEditor = async (action: AdminAction, row?: AdminRow) => {
    if (row && ['item', 'media'].includes(action) && text(row, 'company_id') !== company?.id) {
      try {
        await setCompany(await adminCompany(text(row, 'company_id')))
      } catch (error) {
        toast.error(message(error))
        return
      }
    }
    setEditor({ action, row })
  }
  const save = async (action: AdminAction, payload: AdminRow) => {
    setSaving(true)
    try {
      const saved = await adminSave(action, payload)
      if (action === 'settings') {
        setSettingsDirty(false)
        await snapshot.refetch()
      }
      await refresh()
      setEditor(null)
      setConfirmation(null)
      toast.success('Alteração salva e registrada na auditoria.')
      if (action === 'company')
        toast('Continue montando o catálogo da empresa.', {
          action: {
            label: 'Adicionar produtos',
            onClick: () => {
              void adminCompany(saved.id)
                .then((selected) => {
                  navigate('items', selected)
                })
                .catch((error: unknown) => toast.error(message(error)))
            },
          },
        })
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
      <main id="main-content" className="wrap admin-page professional-admin">
        <div className="section-top admin-page-heading">
          <div>
            <h1>Gestão do Service Guide</h1>
            <p>Seu catálogo, sua organização. Tudo em um só lugar.</p>
          </div>
          {viewer?.admin && (
            <div className="admin-heading-actions">
              <a className="btn outline" href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={18} />
                Ver site
              </a>
              <button
                className="btn outline icon-btn"
                aria-label="Atualizar informações do painel"
                disabled={settingsDirty || saving}
                onClick={() => {
                  void refresh()
                }}
              >
                <RefreshCw size={18} />
              </button>
              <button
                className="btn primary"
                disabled={!data || mfaRequired}
                onClick={() => {
                  void openEditor('company')
                }}
              >
                <Plus size={19} />
                Nova empresa
              </button>
            </div>
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
            <label className="admin-mobile-navigation">
              Área do painel
              <select
                value={section}
                onChange={(event) => {
                  navigate(event.target.value as AdminSection)
                }}
              >
                {sections.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <nav className="guide-admin-nav" aria-label="Áreas administrativas">
              <div className="admin-nav-heading">
                <strong>Sua área de trabalho</strong>
                <span>{viewer.name}</span>
              </div>
              {sections.map(([key, label, Icon]) => (
                <button
                  key={key}
                  className={
                    (section === key ? 'selected' : '') +
                    (['companies', 'reviews', 'users', 'settings'].includes(key)
                      ? ' admin-nav-group-start'
                      : '')
                  }
                  aria-current={section === key ? 'page' : undefined}
                  onClick={() => {
                    navigate(key)
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
              <p className="admin-nav-footnote">
                <ShieldCheck size={16} />
                Ações autorizadas e auditadas
              </p>
            </nav>
            <section className="guide-admin-content" aria-busy={snapshot.isFetching}>
              <div className="section-top">
                <div className="admin-section-title">
                  <h2>{sections.find(([key]) => key === section)?.[1]}</h2>
                  {section !== 'overview' && (
                    <button
                      className="text-button"
                      onClick={() => {
                        navigate('overview')
                      }}
                    >
                      <ArrowLeft size={15} />
                      Visão geral
                    </button>
                  )}
                </div>
                {['categories', 'items', 'media'].includes(section) &&
                  (section === 'categories' || company) && (
                    <button
                      className="btn outline"
                      disabled={!data || mfaRequired}
                      onClick={() => {
                        setOrdering(section as OrderScope)
                      }}
                    >
                      <ArrowUpDown size={18} />
                      Organizar ordem
                    </button>
                  )}
                {section !== 'companies' && editorActions[section] && (
                  <button
                    className="btn primary"
                    disabled={!data || (section === 'media' && !company) || mfaRequired}
                    onClick={() => {
                      const action = editorActions[section]
                      if (action) void openEditor(action)
                    }}
                  >
                    <Plus size={18} />
                    {section === 'items' ? 'Cadastrar produto ou serviço' : 'Adicionar'}
                  </button>
                )}
              </div>
              {(section === 'items' || section === 'media') && (
                <div className="admin-company-context">
                  <CompanyPicker
                    company={company}
                    onChange={(selected) => {
                      void setCompany(selected)
                    }}
                  />
                  <p className="secondary">
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
                </div>
              )}
              {assurance.isPending ? (
                <div className="admin-loading" role="status">
                  <div />
                  <div />
                  <div />
                  <span>Conferindo a proteção da sessão…</span>
                </div>
              ) : assurance.isError ? (
                <div className="state-box" role="alert">
                  <h3>Não foi possível conferir a sessão</h3>
                  <p>Confira a conexão para continuar com segurança.</p>
                  <button
                    className="btn primary"
                    onClick={() => {
                      void assurance.refetch()
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : mfaRequired || section === 'security' ? (
                <SecurityPanel required={mfaRequired} onVerified={refresh} />
              ) : snapshot.isError ? (
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
                  <a className="btn outline" href="/entrar?redirect=%2Fadmin">
                    Entrar novamente
                  </a>
                </div>
              ) : !data ? (
                <div className="admin-loading" role="status">
                  <div />
                  <div />
                  <div />
                  <span>Carregando informações…</span>
                </div>
              ) : section === 'settings' ? (
                <PresentationSettings
                  key={String(data.rows[0]?.revision)}
                  row={data.rows[0] ?? { value: {}, revision: 0 }}
                  busy={saving}
                  onDirtyChange={setSettingsDirty}
                  onSave={(payload) => save('settings', payload)}
                />
              ) : section === 'overview' ? (
                <>
                  <div className="admin-workflow-intro">
                    <div>
                      <h3>Do cadastro à descoberta.</h3>
                      <p>
                        Prepare o guia, publique empresas e ajude os clientes a encontrar o que
                        procuram.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => {
                        void openEditor('company')
                      }}
                    >
                      <Plus size={18} />
                      Cadastrar empresa
                    </button>
                  </div>
                  <ol className="admin-onboarding">
                    {[
                      ['categories', 'Organize as categorias', data.catalog.categories.length > 0],
                      ['neighborhoods', 'Cadastre os bairros', data.neighborhoods.length > 0],
                      ['companies', 'Publique as empresas', Number(data.metrics.companies) > 0],
                    ].map(([area, title, complete]) => (
                      <li key={String(area)}>
                        <span className={complete ? 'complete' : ''}>
                          {complete ? <CheckCircle2 size={20} /> : <Store size={20} />}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => {
                            navigate(area as AdminSection)
                          }}
                        >
                          {title}
                        </button>
                        <small>{complete ? 'Configurado' : 'Começar'}</small>
                      </li>
                    ))}
                  </ol>
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
                  {section === 'media' && company && (
                    <MediaUploader company={company} onUploaded={refresh} />
                  )}
                  <form
                    key={section + query}
                    className="guide-admin-toolbar"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const submitted = new FormData(event.currentTarget).get('query')
                      void routeNavigate({
                        search: (previous) => ({
                          ...previous,
                          query: (typeof submitted === 'string' ? submitted : '')
                            .trim()
                            .slice(0, 150),
                          page: 1,
                        }),
                      })
                    }}
                  >
                    <label className="admin-search">
                      <Search size={18} />
                      <input
                        aria-label="Pesquisar registros"
                        placeholder="Pesquisar nesta área"
                        name="query"
                        defaultValue={query}
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
                      <h3>
                        {query
                          ? 'Nenhum cadastro corresponde à busca.'
                          : section === 'companies'
                            ? 'Seu próximo negócio começa aqui.'
                            : 'Tudo pronto para o primeiro cadastro.'}
                      </h3>
                      <p>
                        {query
                          ? 'Tente parte do nome ou limpe a pesquisa.'
                          : editorActions[section]
                            ? 'Use o botão de cadastro acima para preparar os dados. Você pode editar depois.'
                            : 'As solicitações aparecerão aqui quando forem recebidas.'}
                      </p>
                      {query && (
                        <button
                          className="btn outline"
                          onClick={() => {
                            void routeNavigate({
                              search: (previous) => ({ ...previous, query: '', page: 1 }),
                            })
                          }}
                        >
                          Limpar pesquisa
                        </button>
                      )}
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
                                {section === 'media' && text(row, 'url') && (
                                  <img
                                    className="admin-table-image"
                                    src={text(row, 'url')}
                                    alt={text(row, 'alt')}
                                    loading="lazy"
                                  />
                                )}
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
                                  {section === 'items'
                                    ? row.available
                                      ? 'Disponível'
                                      : 'Indisponível'
                                    : labels[text(row, 'status')] ||
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
                                        if (action) void openEditor(action, row)
                                      }}
                                    >
                                      Editar
                                    </button>
                                  )}
                                  {section === 'companies' && (
                                    <>
                                      <a
                                        className="text-button"
                                        href={
                                          '/empresas/' +
                                          text(row, 'city_slug') +
                                          '/' +
                                          text(row, 'slug')
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Ver perfil
                                      </a>
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
                                  {['companies', 'items'].includes(section) && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        const action = editorActions[section]
                                        if (action)
                                          void openEditor(action, {
                                            ...row,
                                            id: '',
                                            name: text(row, 'name') + ' (cópia)',
                                            slug: text(row, 'slug') + '-copia',
                                            ...(section === 'companies'
                                              ? { status: 'inactive' }
                                              : {}),
                                          })
                                      }}
                                    >
                                      Duplicar
                                    </button>
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
                                  {section === 'users' && text(row, 'id') !== viewer.id && (
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setRoleTarget(row)
                                      }}
                                    >
                                      {row.is_admin
                                        ? 'Remover administração'
                                        : 'Tornar administrador'}
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
                          setPage(page - 1)
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
                          setPage(page + 1)
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
        {editor && data && viewer?.admin && !mfaRequired && (
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
            onRefresh={refresh}
          />
        )}
        {ordering && viewer?.admin && !mfaRequired && (
          <OrderBoard
            scope={ordering}
            companyId={company?.id}
            onClose={() => {
              setOrdering(null)
            }}
            onSaved={refresh}
          />
        )}
        {roleTarget && viewer?.admin && !mfaRequired && (
          <RoleDialog
            row={roleTarget}
            onClose={() => {
              setRoleTarget(null)
            }}
            onSaved={refresh}
          />
        )}
        <Dialog
          open={!!confirmation && !!viewer?.admin && !viewerError && !mfaRequired}
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
          open={!!details && !!viewer?.admin && !viewerError && !mfaRequired}
          onOpenChange={(open) => {
            if (!open) setDetails(null)
          }}
        >
          <DialogContent className="app-dialog">
            <DialogTitle>Detalhes do registro</DialogTitle>
            <DialogDescription>Informações restritas à administração.</DialogDescription>
            <dl className="guide-record-details">
              {details &&
                viewer?.admin &&
                !viewerError &&
                !mfaRequired &&
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
