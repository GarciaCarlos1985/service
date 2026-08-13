import { getSupabase } from '~/lib/supabase'
import type { CreateServiceInput, Service, ServiceCategory, UpdateServiceInput } from './types'

export async function listMyServices(professionalId: string): Promise<Service[]> {
  const supabase = getSupabase()
  const result = await supabase
    .from('services')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false })

  if (result.error) throw result.error
  return result.data as Service[]
}

export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = getSupabase()
  const result = await supabase
    .from('service_categories')
    .select('id, slug, name')
    .eq('is_active', true)
    .order('sort_order')

  if (result.error) throw result.error
  return result.data
}

export async function createService(
  professionalId: string,
  input: CreateServiceInput,
): Promise<Service> {
  const supabase = getSupabase()
  const result = await supabase
    .from('services')
    .insert({
      professional_id: professionalId,
      category_id: input.category_id,
      title: input.title,
      description: input.description ?? null,
      price_from_cents: input.price_from_cents ?? null,
    })
    .select('*')
    .single()

  if (result.error) throw result.error
  return result.data as Service
}

export async function updateService(
  serviceId: string,
  input: UpdateServiceInput,
): Promise<Service> {
  const supabase = getSupabase()
  const result = await supabase
    .from('services')
    .update(input)
    .eq('id', serviceId)
    .select('*')
    .single()

  if (result.error) throw result.error
  return result.data as Service
}

export async function deleteService(serviceId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('services').delete().eq('id', serviceId)
  if (error) throw error
}
