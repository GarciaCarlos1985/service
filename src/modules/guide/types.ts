import { z } from 'zod'
import { publicPresentationSchema } from './presentation'
import { weeklyHoursSchema } from './hours'

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  slug: z.string().optional(),
})
export const planSchema = z.object({
  id: z.string(),
  name: z.string(),
  max_items: z.number(),
  max_media: z.number(),
  featured: z.number(),
})
export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category_id: z.string(),
  neighborhood: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  website: z.string(),
  hours: z.string(),
  logo_url: z.string().default(''),
  weekly_hours: weeklyHoursSchema.nullable().default(null),
  plan_id: z.string(),
  status: z.string(),
  image: z.string(),
  demo: z.number(),
  slug: z.string(),
  city_slug: z.string(),
  city_id: z.number(),
  neighborhood_id: z.string().nullable(),
  street: z.string(),
  address_number: z.string(),
  postal_code: z.string(),
})
export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category_id: z.string(),
  type: z.enum(['product', 'service']),
  company_id: z.string(),
})
export const offeringSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  product_id: z.string().nullable(),
  service_id: z.string().nullable(),
  price: z.number().nullable(),
  available: z.number(),
})
export const reviewSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  company_id: z.string(),
  rating: z.number(),
  comment: z.string(),
  status: z.string(),
  created_at: z.string(),
  author: z.string().optional(),
})
export const catalogSchema = z.object({
  presentation: publicPresentationSchema.optional(),
  categories: z.array(categorySchema),
  plans: z.array(planSchema),
  companies: z.array(companySchema),
  items: z.array(itemSchema),
  offerings: z.array(offeringSchema),
  reviews: z.array(reviewSchema),
  source: z.string(),
  media: z
    .array(
      z.object({
        id: z.string(),
        company_id: z.string(),
        url: z.string(),
        alt: z.string().default(''),
      }),
    )
    .default([]),
  rating_summary: z
    .record(z.string(), z.object({ average: z.number(), count: z.number() }))
    .default({}),
})
export const searchResultSchema = catalogSchema.extend({
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
  neighborhoods: z.array(z.string()),
  containsExamples: z.boolean(),
})
export const viewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  admin: z.boolean(),
  favorites: z.array(z.string()),
})
export const supportSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  kind: z.enum(['business', 'help', 'privacy']),
  message: z.string(),
  status: z.enum(['new', 'in_progress', 'resolved']),
  created_at: z.string(),
  updated_at: z.string(),
})
export const searchSchema = z.object({
  q: z.string().trim().max(150).catch(''),
  category: z.string().max(100).catch(''),
  neighborhood: z.string().max(100).catch(''),
  kind: z.enum(['all', 'product', 'service']).catch('all'),
  rating: z.coerce.number().min(0).max(5).catch(0),
  maxPrice: z.coerce.number().min(0).max(10000000).nullable().catch(null),
  available: z.boolean().catch(false),
  featured: z.boolean().catch(false),
  sort: z.enum(['relevance', 'name', 'rating']).catch('relevance'),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(24).catch(12),
  itemId: z.string().max(100).catch(''),
  companyId: z.string().max(100).catch(''),
  favorites: z.boolean().catch(false),
})

export type Category = z.infer<typeof categorySchema>
export type Plan = z.infer<typeof planSchema>
export type Company = z.infer<typeof companySchema>
export type Item = z.infer<typeof itemSchema>
export type Offering = z.infer<typeof offeringSchema>
export type Review = z.infer<typeof reviewSchema>
export type Catalog = z.infer<typeof catalogSchema>
export type SearchResult = z.infer<typeof searchResultSchema>
export type Viewer = z.infer<typeof viewerSchema>
export type SupportRequest = z.infer<typeof supportSchema>
export type SearchOptions = z.infer<typeof searchSchema>

export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
export const money = (value: number | null) =>
  value === null
    ? 'Consulte o valor'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export function ratingFor(reviews: Review[], companyId: string) {
  const selected = reviews.filter(
    (review) => review.company_id === companyId && review.status === 'published',
  )
  return {
    count: selected.length,
    average: selected.length
      ? selected.reduce((sum, review) => sum + review.rating, 0) / selected.length
      : 0,
  }
}

export function searchFromParams(params: URLSearchParams): SearchOptions {
  return searchSchema.parse({
    ...Object.fromEntries(params),
    available: params.get('available') === '1',
    featured: params.get('featured') === '1',
    favorites: params.get('favorites') === '1',
    maxPrice: params.get('maxPrice') || null,
  })
}
