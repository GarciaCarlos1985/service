'use client'
import { useEffect, useState, useRef, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Search, Heart, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import { Checkbox } from '~/modules/ui/primitives/checkbox'
import { Skeleton } from '~/modules/ui/primitives/skeleton'
import { Empty, EmptyTitle, EmptyDescription } from '~/modules/ui/primitives/empty'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '~/modules/ui/primitives/pagination'
import type { Catalog, SearchResult } from '~/modules/guide/types'
import { track, searchByParams } from '~/modules/guide/api'
import {
  icons,
  Header,
  Footer,
  Consent,
  Picker,
  CompanyCard,
  useCatalog,
} from '../components/shared'
import CompanyDetail from './CompanyDetail'
import Account from './Account'
import { PremiumSpotlight } from '../components/Premium'
import { useSitePresentation } from '../site-presentation-context'
type Filters = {
  q: string
  category: string
  neighborhood: string
  kind: string
  rating: string
  maxPrice: string
  available: boolean
  featured: boolean
  sort: string
  page: number
}
const defaults: Filters = {
  q: '',
  category: '',
  neighborhood: '',
  kind: 'all',
  rating: '0',
  maxPrice: '',
  available: false,
  featured: false,
  sort: 'relevance',
  page: 1,
}
function fromQuery(params: Record<string, string>): Filters {
  return {
    ...defaults,
    q: params.q || '',
    category: params.category || '',
    neighborhood: params.neighborhood || '',
    kind: params.kind || 'all',
    rating: params.rating || '0',
    maxPrice: params.maxPrice || '',
    available: params.available === '1',
    featured: params.featured === '1',
    sort: params.sort || 'relevance',
    page: Number(params.page) || 1,
  }
}
function paramsFor(f: Filters) {
  const p = new URLSearchParams()
  for (const key of ['q', 'category', 'neighborhood', 'maxPrice'] as const)
    if (f[key]) p.set(key, f[key])
  if (f.kind !== 'all') p.set('kind', f.kind)
  if (f.rating !== '0') p.set('rating', f.rating)
  if (f.sort !== 'relevance') p.set('sort', f.sort)
  if (f.available) p.set('available', '1')
  if (f.featured) p.set('featured', '1')
  if (f.page > 1) p.set('page', String(f.page))
  return p
}
export default function Directory({
  companyId,
  itemId,
  favoritesOnly = false,
  account = false,
  initialData,
  initialQuery = {},
  previewSearch,
}: {
  companyId?: string
  itemId?: string
  favoritesOnly?: boolean
  account?: boolean
  initialData?: Catalog | null
  initialQuery?: Record<string, string>
  previewSearch?: (params: URLSearchParams) => SearchResult
}) {
  const { data, viewer, viewerLoading, viewerError, loadViewer, setViewer, error, load, favorite } =
    useCatalog(initialData, companyId, !!companyId)
  const [f, setF] = useState<Filters>(() => fromQuery(initialQuery)),
    [query, setQuery] = useState(initialQuery.q || ''),
    [filtersOpen, setFiltersOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const suggestionsId = useId()
  const serialized = paramsFor(f).toString()
  const favoritesKey = favoritesOnly ? (viewer?.favorites ?? []).join('|') : ''
  const queryEnabled = !previewSearch && !companyId && !account && (!favoritesOnly || !!viewer)
  const resultQuery = useQuery({
    queryKey: ['guide-search', serialized, retry, viewer?.id, favoritesKey, itemId],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams(serialized)
      if (itemId) params.set('itemId', itemId)
      if (favoritesOnly) params.set('favorites', '1')
      return searchByParams(params, signal)
    },
    enabled: queryEnabled,
    retry: false,
    initialData:
      serialized === paramsFor(fromQuery(initialQuery)).toString() &&
      initialData &&
      'pagination' in initialData
        ? (initialData as SearchResult)
        : undefined,
  })
  const loading = queryEnabled && resultQuery.isFetching
  const searchError = resultQuery.error instanceof Error ? resultQuery.error.message : ''
  const update = (changes: Partial<Filters>) => {
    const next = { ...f, ...changes, page: changes.page || 1 }
    if (!previewSearch && !companyId && !account) {
      const params = paramsFor(next)
      const href = location.pathname + (params.size ? '?' + params.toString() : '')
      if (href !== location.pathname + location.search) history.pushState(history.state, '', href)
    }
    setF(next)
  }
  useEffect(() => {
    const pop = () => {
      const next = fromQuery(Object.fromEntries(new URLSearchParams(location.search)))
      setF(next)
      setQuery(next.q)
    }
    window.addEventListener('popstate', pop)
    return () => {
      window.removeEventListener('popstate', pop)
    }
  }, [])
  useEffect(() => {
    if (previewSearch || companyId || account) return
    const visible = new URLSearchParams(serialized)
    history.replaceState(
      history.state,
      '',
      location.pathname + (visible.size ? '?' + visible.toString() : ''),
    )
  }, [serialized, previewSearch, companyId, account])
  const previewParams = paramsFor(f)
  if (itemId) previewParams.set('itemId', itemId)
  const catalog = previewSearch ? previewSearch(previewParams) : (resultQuery.data ?? null)
  const presentation = useSitePresentation()
  const suggestions = [
    ...new Set([
      ...(catalog?.categories.map((entry) => entry.name) ?? []),
      ...(catalog?.items.map((entry) => entry.name) ?? []),
      ...(catalog?.companies.map((entry) => entry.name) ?? []),
    ]),
  ]
    .filter(
      (entry) =>
        query.length >= 2 &&
        entry.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
    )
    .slice(0, 8)
  const currentPage =
    (catalog && 'pagination' in catalog ? catalog.pagination.page : undefined) ?? f.page
  const item = catalog?.items.find((i) => i.id === itemId)
  const selectedItemId = item?.id
  const selectedItemType = item?.type
  useEffect(() => {
    if (selectedItemId)
      track(selectedItemType === 'product' ? 'product_view' : 'service_view', {
        item_id: selectedItemId,
      })
  }, [selectedItemId, selectedItemType])
  const search = (value = query) => {
    setQuery(value)
    update({ q: value.trim() })
    track('search', { query: value.trim() })
    requestAnimationFrame(() => {
      resultHeading.current?.focus({ preventScroll: true })
      resultHeading.current?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
      })
    })
  }
  const reset = () => {
    setQuery('')
    update({ ...defaults })
  }
  const filterCount = [
    !!f.neighborhood,
    f.kind !== 'all',
    f.rating !== '0',
    f.maxPrice !== '',
    f.available,
    f.featured,
  ].filter(Boolean).length
  const chips: {
    name: string
    clear: () => void
  }[] = []
  if (f.q)
    chips.push({
      name: 'Busca: ' + f.q,
      clear: () => {
        setQuery('')
        update({ q: '' })
      },
    })
  if (f.category)
    chips.push({
      name: catalog?.categories.find((c) => c.id === f.category)?.name || 'Categoria',
      clear: () => {
        update({ category: '' })
      },
    })
  if (f.neighborhood)
    chips.push({
      name: f.neighborhood,
      clear: () => {
        update({ neighborhood: '' })
      },
    })
  if (f.kind !== 'all')
    chips.push({
      name: f.kind === 'product' ? 'Produtos' : 'Serviços',
      clear: () => {
        update({ kind: 'all' })
      },
    })
  if (f.rating !== '0')
    chips.push({
      name: f.rating + ' estrelas ou mais',
      clear: () => {
        update({ rating: '0' })
      },
    })
  if (f.maxPrice !== '')
    chips.push({
      name: 'Até R$ ' + f.maxPrice,
      clear: () => {
        update({ maxPrice: '' })
      },
    })
  if (f.available)
    chips.push({
      name: 'Disponíveis',
      clear: () => {
        update({ available: false })
      },
    })
  if (f.featured)
    chips.push({
      name: 'Em destaque',
      clear: () => {
        update({ featured: false })
      },
    })
  const pageHref = (page: number) => {
    const p = paramsFor({ ...f, page })
    return (
      (favoritesOnly ? '/favoritos' : itemId ? '/item/' + itemId : '/') +
      (p.size ? '?' + p.toString() : '')
    )
  }
  const goPage = (page: number) => {
    update({ page })
    resultHeading.current?.focus()
    resultHeading.current?.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
    })
  }
  return (
    <>
      <Header viewer={viewer} />
      <main id="main-content">
        {account ? (
          <Account
            viewer={viewer}
            loading={viewerLoading}
            error={viewerError}
            onRetry={() => {
              void loadViewer()
            }}
            onSave={setViewer}
          />
        ) : companyId ? (
          error ? (
            <div className="wrap state-box" role="alert">
              <h1>Não conseguimos carregar o perfil.</h1>
              <p>{error}</p>
              <button
                className="btn primary"
                onClick={() => {
                  void load()
                }}
              >
                Tentar novamente
              </button>
            </div>
          ) : !data ? (
            <div className="wrap loading" aria-busy="true">
              <Skeleton className="h-80 w-full" />
            </div>
          ) : (
            <CompanyDetail
              id={companyId}
              data={data}
              viewer={viewer}
              onFavorite={(company) => {
                void favorite(company)
              }}
            />
          )
        ) : (
          <>
            <section className={'search-zone' + (!favoritesOnly && !itemId ? ' premium-hero' : '')}>
              <div className="wrap hero-grid">
                <div className="hero-copy">
                  <div className="search-intro">
                    <div>
                      <h1>
                        {favoritesOnly
                          ? presentation.favoritesTitle
                          : item
                            ? item.name
                            : presentation.heroTitle}
                      </h1>
                      <p>
                        {favoritesOnly
                          ? presentation.favoritesDescription
                          : item
                            ? item.description
                            : presentation.heroDescription}
                      </p>
                    </div>
                    <div className="city-label">
                      <MapPin size={19} />
                      <div>
                        <strong>Cacoal, RO</strong>
                        <span>Feito para a sua cidade</span>
                      </div>
                    </div>
                  </div>
                  {!favoritesOnly && (
                    <>
                      <form
                        className="search-box"
                        role="search"
                        onSubmit={(e) => {
                          e.preventDefault()
                          search()
                        }}
                      >
                        <Search size={22} />
                        <input
                          aria-label="O que você procura?"
                          placeholder={presentation.searchPlaceholder}
                          list={suggestionsId}
                          value={query}
                          maxLength={150}
                          onChange={(e) => {
                            setQuery(e.target.value)
                          }}
                        />
                        <datalist id={suggestionsId}>
                          {suggestions.map((entry) => (
                            <option value={entry} key={entry} />
                          ))}
                        </datalist>
                        {query && (
                          <button
                            type="button"
                            className="search-clear"
                            aria-label="Limpar busca"
                            onClick={() => {
                              setQuery('')
                              update({ q: '' })
                            }}
                          >
                            <X size={18} />
                          </button>
                        )}
                        <button className="btn primary" data-track="search_submit">
                          {presentation.searchButtonLabel}
                        </button>
                      </form>
                      {presentation.showSuggestions && (
                        <div className="suggestions">
                          <span>Experimente:</span>
                          {presentation.quickSearches.map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                search(t)
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {!favoritesOnly && !itemId && catalog && presentation.showSpotlight && (
                  <PremiumSpotlight data={catalog} />
                )}
              </div>
            </section>
            {!favoritesOnly && !itemId && catalog && (
              <section className="wrap categories" aria-label="Explorar categorias">
                {[{ id: '', name: 'Tudo por perto', icon: 'Store' }, ...catalog.categories].map(
                  (c) => {
                    const Icon = icons[c.icon] || icons.Store
                    return (
                      <button
                        key={c.id}
                        className={'category ' + (f.category === c.id ? 'selected' : '')}
                        onClick={() => {
                          update({ category: c.id })
                          track('ui_click', { target: 'category_' + (c.id || 'all') })
                        }}
                        aria-pressed={f.category === c.id}
                      >
                        <Icon size={25} />
                        <span>{c.name}</span>
                      </button>
                    )
                  },
                )}
              </section>
            )}
            <section className="wrap results-section" id="resultados">
              <div className="results-toolbar">
                <div>
                  <h2 ref={resultHeading} tabIndex={-1}>
                    {favoritesOnly
                      ? 'Favoritos'
                      : item
                        ? 'Onde encontrar'
                        : f.q
                          ? 'Resultados para “' + f.q + '”'
                          : f.category
                            ? catalog?.categories.find((c) => c.id === f.category)?.name
                            : presentation.resultsTitle}
                  </h2>
                  <p aria-live="polite" className="results-status">
                    {loading ? (
                      <>
                        <Loader2 size={15} className="spin" />
                        Buscando…
                      </>
                    ) : catalog ? (
                      String(catalog.pagination.total) +
                      ' ' +
                      (catalog.pagination.total === 1
                        ? 'empresa encontrada'
                        : 'empresas encontradas')
                    ) : searchError ? (
                      'Busca indisponível'
                    ) : (
                      ''
                    )}
                  </p>
                </div>
                {catalog && (
                  <div className="toolbar-actions">
                    <button
                      className={'btn outline ' + (filtersOpen ? 'pressed' : '')}
                      onClick={() => {
                        setFiltersOpen(!filtersOpen)
                      }}
                      aria-expanded={filtersOpen}
                      aria-controls="catalog-filters"
                    >
                      <SlidersHorizontal size={18} />
                      Filtros{filterCount ? ' (' + String(filterCount) + ')' : ''}
                    </button>
                    <Picker
                      label="Ordenar resultados"
                      value={f.sort}
                      onChange={(sort) => {
                        update({ sort })
                      }}
                      options={[
                        { id: 'relevance', name: 'Destaques primeiro' },
                        { id: 'name', name: 'Nome: A–Z' },
                        { id: 'rating', name: 'Melhor avaliação' },
                      ]}
                    />
                  </div>
                )}
              </div>
              {filtersOpen && catalog && (
                <div className="filters" id="catalog-filters">
                  <label>
                    Tipo
                    <Picker
                      label="Tipo de resultado"
                      value={f.kind}
                      onChange={(kind) => {
                        update({ kind })
                      }}
                      options={[
                        { id: 'all', name: 'Empresas e itens' },
                        { id: 'product', name: 'Produtos' },
                        { id: 'service', name: 'Serviços' },
                      ]}
                    />
                  </label>
                  <label>
                    Bairro
                    <Picker
                      label="Bairro"
                      value={f.neighborhood || 'all'}
                      onChange={(neighborhood) => {
                        update({ neighborhood: neighborhood === 'all' ? '' : neighborhood })
                      }}
                      options={[
                        { id: 'all', name: 'Todos os bairros' },
                        ...catalog.neighborhoods.map((n) => ({ id: n, name: n })),
                      ]}
                    />
                  </label>
                  <label>
                    Avaliação
                    <Picker
                      label="Avaliação mínima"
                      value={f.rating}
                      onChange={(rating) => {
                        update({ rating })
                      }}
                      options={[
                        { id: '0', name: 'Qualquer avaliação' },
                        { id: '4', name: '4 estrelas ou mais' },
                        { id: '3', name: '3 estrelas ou mais' },
                      ]}
                    />
                  </label>
                  <label>
                    Valor até (R$)
                    <input
                      type="number"
                      min="0"
                      max="10000000"
                      value={f.maxPrice}
                      onChange={(e) => {
                        update({ maxPrice: e.target.value })
                      }}
                      placeholder="Sem limite"
                    />
                  </label>
                  <label className="check-label">
                    <Checkbox
                      checked={f.featured}
                      onCheckedChange={(v) => {
                        update({ featured: v === true })
                      }}
                    />
                    Só empresas em destaque
                  </label>
                  <label className="check-label">
                    <Checkbox
                      checked={f.available}
                      onCheckedChange={(v) => {
                        update({ available: v === true })
                      }}
                    />
                    Só itens disponíveis
                  </label>
                </div>
              )}
              {!!chips.length && (
                <div className="active-filters" aria-label="Filtros aplicados">
                  {chips.map((chip) => (
                    <button
                      key={chip.name}
                      className="filter-chip"
                      onClick={chip.clear}
                      aria-label={'Remover filtro: ' + chip.name}
                    >
                      {chip.name}
                      <X size={15} />
                    </button>
                  ))}
                  <button className="text-button" onClick={reset}>
                    Limpar tudo
                  </button>
                </div>
              )}
              {searchError && (
                <div className="inline-error" role="alert">
                  <p>{searchError}</p>
                  <button
                    className="btn outline"
                    onClick={() => {
                      setRetry((n) => n + 1)
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {favoritesOnly && viewerError ? (
                <div className="state-box" role="alert">
                  <h3>Não conseguimos carregar sua conta.</h3>
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
              ) : favoritesOnly && !viewerLoading && !viewer ? (
                <div className="state-box">
                  <Heart size={32} />
                  <h3>Guarde seus negócios favoritos.</h3>
                  <p>Entre gratuitamente para acessar sua lista em outros dispositivos.</p>
                  <a className="btn primary" href="/entrar?redirect=%2Ffavoritos" target="_top">
                    Entrar e salvar favoritos
                  </a>
                </div>
              ) : !catalog && loading ? (
                <div className="cards" aria-busy="true" aria-label="Carregando resultados">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-96 w-full" />
                  ))}
                </div>
              ) : (
                catalog && (
                  <>
                    {catalog.containsExamples && (
                      <p className="example-note">
                        <span>Exemplos identificados</span>Os perfis demonstrativos são fictícios.
                        Fotos e valores são ilustrativos.
                      </p>
                    )}
                    <div
                      className={loading ? 'cards results-updating' : 'cards'}
                      aria-busy={loading}
                    >
                      {catalog.companies.map((c) => (
                        <CompanyCard
                          key={c.id}
                          c={c}
                          data={catalog}
                          viewer={viewer}
                          onFavorite={(company) => {
                            void favorite(company)
                          }}
                          query={f.q}
                        />
                      ))}
                    </div>
                    {!catalog.companies.length && !loading && (
                      <Empty className="empty-state">
                        <Search size={30} />
                        <EmptyTitle>
                          {favoritesOnly ? 'Sua lista está começando.' : presentation.emptyTitle}
                        </EmptyTitle>
                        <EmptyDescription>
                          {favoritesOnly
                            ? 'Explore o guia e toque no coração para guardar uma empresa.'
                            : presentation.emptyDescription}
                        </EmptyDescription>
                        {favoritesOnly ? (
                          <a className="btn primary" href="/">
                            Explorar empresas
                          </a>
                        ) : (
                          <button className="btn primary" onClick={reset}>
                            Limpar busca e filtros
                          </button>
                        )}
                      </Empty>
                    )}
                    {catalog.pagination.pages > 1 && (
                      <div className="pagination-bar">
                        <Pagination aria-label="Páginas de resultados">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationLink
                                href={pageHref(Math.max(1, currentPage - 1))}
                                size="default"
                                aria-disabled={currentPage <= 1}
                                onClick={(e) => {
                                  e.preventDefault()
                                  if (currentPage > 1) goPage(currentPage - 1)
                                }}
                              >
                                Anterior
                              </PaginationLink>
                            </PaginationItem>
                            {Array.from(
                              new Set([
                                1,
                                ...[currentPage - 1, currentPage, currentPage + 1].filter(
                                  (n) => n > 1 && n < catalog.pagination.pages,
                                ),
                                catalog.pagination.pages,
                              ]),
                            )
                              .sort((a, b) => a - b)
                              .map((n) => (
                                <PaginationItem key={n}>
                                  <PaginationLink
                                    href={pageHref(n)}
                                    isActive={n === catalog.pagination.page}
                                    aria-label={'Página ' + String(n)}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      goPage(n)
                                    }}
                                  >
                                    {n}
                                  </PaginationLink>
                                </PaginationItem>
                              ))}
                            <PaginationItem>
                              <PaginationLink
                                href={pageHref(Math.min(catalog.pagination.pages, currentPage + 1))}
                                size="default"
                                aria-disabled={currentPage >= catalog.pagination.pages}
                                onClick={(e) => {
                                  e.preventDefault()
                                  if (currentPage < catalog.pagination.pages)
                                    goPage(currentPage + 1)
                                }}
                              >
                                Próxima
                              </PaginationLink>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                        <p>
                          Página {catalog.pagination.page} de {catalog.pagination.pages}
                        </p>
                      </div>
                    )}
                  </>
                )
              )}
            </section>
            <div className="wrap local-close">
              <MapPin size={28} />
              <div>
                <strong>{presentation.businessTitle}</strong>
                <p>{presentation.businessDescription}</p>
              </div>
              <a className="btn outline" href="/ajuda?tipo=business#contato">
                {presentation.businessButtonLabel}
              </a>
            </div>
          </>
        )}
      </main>
      <Footer />
      <Consent />
    </>
  )
}
