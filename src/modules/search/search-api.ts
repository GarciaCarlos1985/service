import { getSupabase } from '~/lib/supabase'

export interface PublicProfessionalProfile {
  id: string
  full_name: string | null
  city_id: number | null
  avatar_url: string | null
  slug: string | null
  verification_status: string | null
  city: { id: number; name: string; state: string; slug: string } | null
  services: Array<{
    id: string
    title: string
    description: string | null
    price_from_cents: number | null
    category_id: number
    category: { slug: string; name: string } | null
  }>
}

export interface ProfessionalListItem {
  id: string
  full_name: string | null
  avatar_url: string | null
  slug: string | null
  city_id: number | null
  city: { id: number; name: string; state: string; slug: string } | null
  services: Array<{
    id: string
    title: string
    price_from_cents: number | null
    category_id: number
    category: { slug: string; name: string } | null
  }>
}

export interface SearchFilters {
  categorySlug?: string
  citySlug?: string
  q?: string
}

export async function getProfessionalBySlugs(
  citySlug: string,
  profileSlug: string,
): Promise<PublicProfessionalProfile | null> {
  const supabase = getSupabase()
  const result = await supabase
    .from('profiles')
    .select(
      'id, full_name, city_id, avatar_url, slug, user_type, verification_status, city:cities!profiles_city_id_fkey(id, name, state, slug), services(id, title, description, price_from_cents, category_id, category:service_categories(slug, name))',
    )
    .eq('user_type', 'professional')
    .eq('slug', profileSlug)
    .maybeSingle()

  if (result.error) throw result.error
  const data = result.data as PublicProfessionalProfile | null
  if (!data) return null
  // URL amigÃ¡vel exige cidade coerente: /profissionais/<cidade>/<perfil>
  if (data.city?.slug !== citySlug) return null
  return data
}

export async function searchProfessionals(filters: SearchFilters): Promise<ProfessionalListItem[]> {
  const supabase = getSupabase()
  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, slug, city_id, user_type, city:cities!profiles_city_id_fkey(id, name, state, slug), services(id, title, price_from_cents, category_id, category:service_categories(slug, name))',
    )
    .eq('user_type', 'professional')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters.citySlug) {
    query = query.eq('city.slug', filters.citySlug)
  }
  if (filters.categorySlug) {
    query = query.eq('services.category.slug', filters.categorySlug)
  }
  if (filters.q && filters.q.trim()) {
    query = query.ilike('full_name', `%${filters.q.trim()}%`)
  }

  const result = await query
  if (result.error) throw result.error
  return result.data as unknown as ProfessionalListItem[]
}

export async function listCategories(): Promise<Array<{ id: number; slug: string; name: string }>> {
  const supabase = getSupabase()
  const result = await supabase
    .from('service_categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('sort_order')

  if (result.error) throw result.error
  return result.data
}

export async function getCityBySlug(
  citySlug: string,
): Promise<{ id: number; name: string; state: string; slug: string } | null> {
  const supabase = getSupabase()
  const result = await supabase
    .from('cities')
    .select('id, name, state, slug')
    .eq('slug', citySlug)
    .maybeSingle()

  if (result.error) throw result.error
  return result.data
}

export async function listLaunchCities(): Promise<
  Array<{ id: number; name: string; state: string; slug: string }>
> {
  const supabase = getSupabase()
  const result = await supabase
    .from('cities')
    .select('id, name, state, slug')
    .eq('is_launch', true)
    .order('name')

  if (result.error) throw result.error
  return result.data
}
