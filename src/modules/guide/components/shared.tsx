'use client'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '~/modules/auth/auth-context'
import { useRouterState } from '@tanstack/react-router'
import {
  MapPin,
  Heart,
  Scissors,
  House,
  Laptop,
  Car,
  Utensils,
  Wrench,
  Store,
  Star,
  UserRound,
  Search,
  LifeBuoy,
  LayoutDashboard,
  ArrowUpRight,
} from 'lucide-react'
import { PremiumBadge } from './Premium'
import { useSitePresentation } from '../site-presentation-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/modules/ui/primitives/select'
import { toast } from 'sonner'
import type { Catalog, Company, Viewer } from '~/modules/guide/types'
import { normalize, ratingFor } from '~/modules/guide/types'
import { api, track, companyCatalog, searchCatalog } from '~/modules/guide/api'
export const icons: Record<string, typeof Store> & { Store: typeof Store } = {
  Scissors,
  House,
  Laptop,
  Car,
  Utensils,
  Wrench,
  Store,
}
export function Picker({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  options: {
    id: string
    name: string
  }[]
  label: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className="picker">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
export function Header({ viewer }: { viewer?: Viewer | null }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const current = (path: string) => (pathname === path ? ('page' as const) : undefined)
  return (
    <>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <a href="/" className="brand" aria-label="Service Guide, início">
            <img
              src="/service-guide.png"
              width="224"
              height="126"
              alt="Service Guide"
              fetchPriority="high"
            />
          </a>
          <nav aria-label="Navegação principal">
            <a href="/" aria-current={current('/')}>
              Explorar
            </a>
            <a href="/favoritos" aria-current={current('/favoritos')}>
              <Heart size={18} />
              Favoritos
            </a>
            <a href="/ajuda" aria-current={current('/ajuda')}>
              Ajuda
            </a>
            {viewer?.admin && (
              <a href="/admin" aria-current={current('/admin')}>
                Painel
              </a>
            )}
            <a className="business-link" href="/ajuda?tipo=business#contato">
              Incluir meu negócio
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a className="account-link" href="/conta" aria-current={current('/conta')}>
              <UserRound size={18} />
              {viewer ? 'Minha conta' : 'Entrar'}
            </a>
          </nav>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Navegação no celular">
        {[
          { href: '/', name: 'Explorar', Icon: Search },
          { href: '/favoritos', name: 'Favoritos', Icon: Heart },
          {
            href: viewer?.admin ? '/admin' : '/ajuda',
            name: viewer?.admin ? 'Painel' : 'Ajuda',
            Icon: viewer?.admin ? LayoutDashboard : LifeBuoy,
          },
          { href: '/conta', name: 'Conta', Icon: UserRound },
        ].map(({ href, name, Icon }) => (
          <a key={href} href={href} aria-current={current(href)}>
            <Icon />
            <span>{name}</span>
          </a>
        ))}
      </nav>
    </>
  )
}
export function Footer() {
  const presentation = useSitePresentation()
  return (
    <footer className="site-footer wrap">
      <div>
        <a className="footer-brand" href="/" aria-label="Service Guide, início">
          <img
            src="/service-guide.png"
            alt="Service Guide"
            width="180"
            height="102"
            loading="lazy"
          />
        </a>
        <p>{presentation.footerTagline}</p>
      </div>
      <div className="footer-links">
        <a href="/ajuda">Ajuda e contato</a>
        <a href="/ajuda?tipo=business#contato">Incluir meu negócio</a>
        <a href="/privacidade">Privacidade</a>
        <button
          onClick={() => {
            localStorage.removeItem('sg-statistics')
            location.reload()
          }}
        >
          Preferências de estatísticas
        </button>
      </div>
      <span>Cacoal · Rondônia</span>
    </footer>
  )
}
function consentSubscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener('guide-consent', listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener('guide-consent', listener)
  }
}
function consentSnapshot() {
  try {
    return localStorage.getItem('sg-statistics') ?? ''
  } catch {
    return 'no'
  }
}
export function Consent() {
  const choice = useSyncExternalStore(consentSubscribe, consentSnapshot, () => '')
  if (choice) return null
  const choose = (yes: boolean) => {
    localStorage.setItem('sg-statistics', yes ? 'yes' : 'no')
    window.dispatchEvent(new Event('guide-consent'))
    if (yes) track('page_view')
  }
  return (
    <aside className="consent" aria-label="Preferências de privacidade">
      <div>
        <strong>Ajude a melhorar o guia</strong>
        <p>
          Podemos registrar buscas, cliques e desempenho. Você escolhe e pode mudar depois.{' '}
          <a href="/privacidade">Saiba mais</a>
        </p>
      </div>
      <div>
        <button
          className="btn outline"
          onClick={() => {
            choose(false)
          }}
        >
          Só essenciais
        </button>
        <button
          className="btn primary"
          onClick={() => {
            choose(true)
          }}
        >
          Permitir estatísticas
        </button>
      </div>
    </aside>
  )
}
export function CompanyCard({
  c,
  data,
  viewer,
  onFavorite,
  query = '',
}: {
  c: Company
  data: Catalog
  viewer: Viewer | null
  onFavorite: (c: Company) => void
  query?: string
}) {
  const r = data.rating_summary[c.id] || ratingFor(data.reviews, c.id)
  const cat = data.categories.find((v) => v.id === c.category_id)
  const Icon = icons[cat?.icon || 'Store'] || Store
  const plan = data.plans.find((p) => p.id === c.plan_id)
  const items = data.offerings
    .filter((o) => o.company_id === c.id)
    .map((o) => data.items.find((i) => i.id === (o.product_id || o.service_id)))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .sort(
      (a, b) =>
        Number(normalize(b.name).includes(normalize(query))) -
        Number(normalize(a.name).includes(normalize(query))),
    )
  const saved = !!viewer?.favorites.includes(c.id)
  return (
    <article className={'company-card' + (plan?.featured ? ' company-card-master' : '')}>
      {plan?.featured ? (
        <div className="card-master-mark">
          <PremiumBadge />
        </div>
      ) : null}
      {c.image ? (
        <a href={'/empresa/' + c.id} className="cover" tabIndex={-1} aria-hidden="true">
          <img
            src={c.image}
            alt={c.demo ? 'Foto ilustrativa de ' + (cat?.name ?? 'empresa') : 'Foto de ' + c.name}
            width="800"
            height="450"
            loading="lazy"
          />
        </a>
      ) : (
        <div className={'letter-cover cat-' + c.category_id}>
          <Icon size={34} />
          <span>{cat?.name}</span>
        </div>
      )}
      <button
        className={'favorite ' + (saved ? 'saved' : '')}
        onClick={() => {
          onFavorite(c)
        }}
        aria-label={(saved ? 'Remover dos favoritos: ' : 'Favoritar: ') + c.name}
        aria-pressed={saved}
      >
        <Heart size={20} />
      </button>
      <div className="card-body">
        <h3>
          <a href={'/empresa/' + c.id}>{c.name}</a>
        </h3>
        <div className="card-tags">
          <span>{cat?.name}</span>
        </div>
        <p className="location">
          <MapPin size={14} />
          {c.neighborhood} · {c.city}
        </p>
        <p className="card-description">{c.description}</p>
        <div className="item-tags">
          {items.slice(0, 2).map((i) => (
            <a key={i.id} href={'/item/' + i.id}>
              {i.name}
            </a>
          ))}
        </div>
        <div className="card-bottom">
          <span>
            {r.count ? (
              <>
                <Star size={14} fill="currentColor" />
                {r.average.toFixed(1)} <small>({r.count})</small>
              </>
            ) : c.demo ? (
              <span className="demo-label">Perfil de exemplo</span>
            ) : (
              <span className="secondary">Sem avaliações</span>
            )}
          </span>
          <a href={'/empresa/' + c.id} data-track="view_company" className="view-link">
            Ver perfil
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  )
}
export function useCatalog(initial?: Catalog | null, companyId?: string, fetchCatalog = true) {
  const { user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const preview = initial?.source === 'demonstration'
  const viewerKey = ['guide-viewer', user?.id] as const
  const viewerQuery = useQuery({
    queryKey: viewerKey,
    queryFn: () => api('/api/me'),
    enabled: !preview && !isLoading && !!user,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const catalogQuery = useQuery({
    queryKey: ['guide-catalog', companyId, preview],
    queryFn: () => (companyId ? companyCatalog(companyId) : searchCatalog()),
    enabled: !preview && fetchCatalog,
    initialData: initial ?? undefined,
    retry: false,
  })
  const viewer = preview ? null : (viewerQuery.data ?? null)
  const data = preview ? initial : catalogQuery.data
  const viewerLoading = !preview && (isLoading || (!!user && viewerQuery.isPending))
  const viewerError = viewerQuery.error instanceof Error ? viewerQuery.error.message : ''
  const error = catalogQuery.error instanceof Error ? catalogQuery.error.message : ''
  const setViewer: Dispatch<SetStateAction<Viewer | null>> = (next) => {
    queryClient.setQueryData<Viewer | null>(viewerKey, (previous) =>
      typeof next === 'function' ? next(previous ?? null) : next,
    )
  }
  const loadViewer = () => viewerQuery.refetch()
  const load = () => catalogQuery.refetch()
  const favoriteBusy = useRef(new Set<string>())
  useEffect(() => {
    if (preview) return
    track('page_view')
    const click = (e: MouseEvent) => {
      const target = (e.target as Element).closest('[data-track]')
      if (target) track('ui_click', { target: target.getAttribute('data-track') })
    }
    document.addEventListener('click', click)
    const observers: PerformanceObserver[] = []
    let cls = 0
    let lcp = 0
    let sessionCLS = 0
    let sessionStart = 0
    let lastShift = 0
    let measuredCLS = false
    let reported = false
    try {
      if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = entry.startTime
        })
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
        observers.push(observer)
      }
      if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
        measuredCLS = true
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (
              !(entry as PerformanceEntry & { hadRecentInput: boolean; value: number })
                .hadRecentInput
            ) {
              if (entry.startTime - lastShift < 1000 && entry.startTime - sessionStart < 5000)
                sessionCLS += (entry as PerformanceEntry & { value: number }).value
              else {
                sessionStart = entry.startTime
                sessionCLS = (entry as PerformanceEntry & { value: number }).value
              }
              lastShift = entry.startTime
              cls = Math.max(cls, sessionCLS)
            }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
        observers.push(observer)
      }
    } catch {}
    const exit = () => {
      if (reported) return
      reported = true
      if (lcp) track('web_vital', { target: 'LCP', value: lcp })
      if (measuredCLS) track('web_vital', { target: 'CLS', value: cls })
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') exit()
    }
    window.addEventListener('pagehide', exit)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observers.forEach((observer) => {
        observer.disconnect()
      })
      document.removeEventListener('click', click)
      window.removeEventListener('pagehide', exit)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [preview])
  const favorite = async (c: Company) => {
    if (c.demo) {
      toast.info('Esta empresa é um exemplo identificado.')
      return
    }
    if (!viewer) {
      toast('Entre para guardar seus favoritos.', {
        action: {
          label: 'Entrar',
          onClick: () => {
            window.location.href =
              '/entrar?redirect=' + encodeURIComponent(location.pathname + location.search)
          },
        },
      })
      return
    }
    if (favoriteBusy.current.has(c.id)) return
    favoriteBusy.current.add(c.id)
    try {
      const r = await api('/api/favorites', { company_id: c.id })
      setViewer((previous) =>
        previous
          ? {
              ...previous,
              favorites: r.saved
                ? [...new Set([...previous.favorites, c.id])]
                : previous.favorites.filter((id) => id !== c.id),
            }
          : previous,
      )
      track('favorite', { company_id: c.id })
      toast.success(r.saved ? 'Empresa salva nos favoritos.' : 'Empresa removida dos favoritos.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      favoriteBusy.current.delete(c.id)
    }
  }
  return { data, viewer, viewerLoading, viewerError, loadViewer, setViewer, error, load, favorite }
}
