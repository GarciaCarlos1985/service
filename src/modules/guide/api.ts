import { z } from 'zod'
import { getSupabase } from '~/lib/supabase'
import { catalogSchema, searchResultSchema, searchFromParams, viewerSchema } from './types'
import type { Catalog, SearchOptions, SearchResult, Viewer } from './types'

export class GuideError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = 'GuideError'
  }
}

export async function guideRpc(
  name: string,
  args: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<unknown> {
  const request = getSupabase().rpc(name, args)
  const result: { data: unknown; error: { message: string; code: string; hint?: string } | null } =
    await (signal ? request.abortSignal(signal) : request)
  if (result.error) {
    const { code, message } = result.error
    if (result.error.hint === 'MFA_REQUIRED')
      throw new GuideError('Confirme o código do autenticador para continuar.', 'MFA_REQUIRED')
    if (result.error.hint === 'REAUTH_REQUIRED')
      throw new GuideError(
        'Confirme sua senha ou autenticador novamente para alterar acessos.',
        'REAUTH_REQUIRED',
      )
    if (code === 'PGRST202' || code === '42883')
      throw new GuideError(
        'O guia está sendo preparado. Tente novamente em breve.',
        'FOUNDATION_PENDING',
      )
    if (code === '42501')
      throw new GuideError('Entre com uma conta autorizada para continuar.', 'FORBIDDEN')
    if (code === 'P0001') throw new GuideError(message, 'VALIDATION')
    if (code === '23505')
      throw new GuideError(
        'Já existe um cadastro com esse nome ou endereço na URL. Revise o campo e tente novamente.',
        'DUPLICATE',
      )
    if (code === '23514' || code === '23502' || code === '22P02')
      throw new GuideError(
        'Revise os campos obrigatórios, o formato dos dados e os limites do cadastro.',
        'VALIDATION',
      )
    if (code === '23503')
      throw new GuideError(
        'Um cadastro relacionado mudou. Atualize as opções e tente novamente.',
        'VALIDATION',
      )
    throw new GuideError('Não foi possível concluir. Tente novamente.', code)
  }
  return result.data
}

export async function searchCatalog(
  filters: Partial<SearchOptions> = {},
  signal?: AbortSignal,
): Promise<SearchResult> {
  return searchResultSchema.parse(await guideRpc('guide_search', { filters }, signal))
}
export async function companyCatalog(id: string): Promise<Catalog> {
  return catalogSchema.parse(
    await guideRpc('guide_search', { filters: { companyId: id, pageSize: 1 } }),
  )
}
export async function companyBySlug(citySlug: string, companySlug: string): Promise<CompanyLookup> {
  const result = await guideRpc('guide_company_by_slug', {
    p_city_slug: citySlug,
    p_company_slug: companySlug,
  })
  return z.object({ id: z.string() }).nullable().parse(result)
}
type CompanyLookup = { id: string } | null

type Path =
  | '/api/me'
  | '/api/search'
  | '/api/favorites'
  | '/api/reviews'
  | '/api/contact'
  | '/api/support'
  | `/api/catalog?companyId=${string}`
type ResponseFor<P extends Path> = P extends '/api/me'
  ? Viewer | null
  : P extends '/api/search'
    ? SearchResult
    : P extends `/api/catalog?companyId=${string}`
      ? Catalog
      : P extends '/api/favorites'
        ? { saved: boolean }
        : P extends '/api/support'
          ? { id: string; reference: string }
          : { ok: boolean }

// Preserve the exported screens' request contract while routing writes through authorized RPCs.
export async function api<P extends Path>(
  path: P,
  body?: unknown,
  _method?: string,
): Promise<ResponseFor<P>> {
  let result: unknown
  if (path === '/api/me') {
    if (body !== undefined) await guideRpc('guide_update_profile', { payload: body })
    result = viewerSchema.nullable().parse(await guideRpc('guide_me'))
  } else if (path === '/api/search') result = await searchCatalog()
  else if (path.startsWith('/api/catalog?companyId='))
    result = await companyCatalog(decodeURIComponent(path.slice('/api/catalog?companyId='.length)))
  else if (path === '/api/favorites')
    result = z
      .object({ saved: z.boolean() })
      .parse(await guideRpc('guide_toggle_favorite', { payload: body }))
  else if (path === '/api/support')
    result = z
      .object({ id: z.string(), reference: z.string() })
      .parse(await guideRpc('guide_support', { payload: body }))
  else if (path === '/api/reviews')
    result = z.object({ ok: z.boolean() }).parse(await guideRpc('guide_review', { payload: body }))
  else
    result = z.object({ ok: z.boolean() }).parse(await guideRpc('guide_contact', { payload: body }))
  return result as ResponseFor<P>
}

export async function searchByParams(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<SearchResult> {
  return searchCatalog(searchFromParams(params), signal)
}

const eventTypes = [
  'page_view',
  'search',
  'company_view',
  'product_view',
  'service_view',
  'favorite',
  'contact_start',
  'whatsapp_click',
  'phone_click',
  'website_click',
  'review_created',
  'share',
  'ui_click',
  'web_vital',
] as const
type EventType = (typeof eventTypes)[number]
export function track(type: EventType, context: Record<string, unknown> = {}) {
  if (!eventTypes.includes(type)) return
  if (typeof window === 'undefined' || location.pathname === '/previa') return
  try {
    if (localStorage.getItem('sg-statistics') !== 'yes') return
    let session = sessionStorage.getItem('sg-session')
    if (!session) {
      session = crypto.randomUUID()
      sessionStorage.setItem('sg-session', session)
    }
    const payload = {
      type,
      session_id: session,
      route: location.pathname,
      ...context,
      consent: true,
    }
    void guideRpc('guide_event', { payload }).catch(() => undefined)
  } catch {
    // Optional statistics must never prevent use when browser storage is unavailable.
  }
}
