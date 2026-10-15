import { z } from 'zod'
import { guideRpc } from './api'
import { catalogSchema } from './types'

export const adminSections = [
  'overview',
  'companies',
  'items',
  'categories',
  'neighborhoods',
  'plans',
  'reviews',
  'contacts',
  'support',
  'users',
  'media',
  'reports',
  'audit',
] as const
export type AdminSection = (typeof adminSections)[number]
export type AdminAction =
  | 'company'
  | 'item'
  | 'category'
  | 'neighborhood'
  | 'plan'
  | 'media'
  | 'review'
  | 'contact'
  | 'support'
  | 'user'
  | 'report'
export type AdminRow = Record<string, unknown>
export const adminSnapshotSchema = z.object({
  catalog: catalogSchema,
  rows: z.array(z.record(z.string(), z.unknown())),
  cities: z.array(z.object({ id: z.number(), name: z.string(), slug: z.string() })),
  neighborhoods: z.array(z.object({ id: z.string(), name: z.string(), city_id: z.number() })),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
  metrics: z
    .object({
      companies: z.number(),
      pending_reviews: z.number(),
      new_contacts: z.number(),
      new_support: z.number(),
      views: z.number(),
      searches: z.number(),
      whatsapp: z.number(),
      top_queries: z.array(z.object({ query: z.string(), count: z.number() })),
    })
    .partial(),
})
export type AdminSnapshot = z.infer<typeof adminSnapshotSchema>

export async function adminSnapshot(
  section: AdminSection,
  page: number,
  query: string,
  companyId?: string,
  days = 7,
) {
  return adminSnapshotSchema.parse(
    await guideRpc('guide_admin_list', {
      p_section: section,
      p_page: page,
      p_query: query,
      p_company_id: companyId ?? null,
      p_days: days,
    }),
  )
}
export async function adminSave(action: AdminAction, payload: AdminRow) {
  return z
    .object({ ok: z.boolean(), id: z.string() })
    .parse(await guideRpc('guide_admin_save', { p_action: action, payload }))
}
export function text(row: AdminRow, key: string): string {
  const value = row[key]
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
}
export function priceCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized))
    throw new Error('Informe um preço com até duas casas decimais.')
  const cents = Math.round(Number(normalized) * 100)
  if (!Number.isSafeInteger(cents) || cents > 1000000000)
    throw new Error('O preço informado ultrapassa o limite permitido.')
  return cents
}
