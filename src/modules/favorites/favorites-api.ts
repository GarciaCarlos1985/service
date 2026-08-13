import { getSupabase } from '~/lib/supabase'

export async function isFavorite(clientId: string, professionalId: string): Promise<boolean> {
  const supabase = getSupabase()
  const result = await supabase
    .from('favorites')
    .select('client_id')
    .eq('client_id', clientId)
    .eq('professional_id', professionalId)
    .maybeSingle()

  if (result.error) throw result.error
  return result.data !== null
}

export async function addFavorite(clientId: string, professionalId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('favorites')
    .insert({ client_id: clientId, professional_id: professionalId })
  if (error) throw error
}

export async function removeFavorite(clientId: string, professionalId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('client_id', clientId)
    .eq('professional_id', professionalId)
  if (error) throw error
}

export async function listMyFavorites(
  clientId: string,
): Promise<Array<{ professional_id: string }>> {
  const supabase = getSupabase()
  const result = await supabase
    .from('favorites')
    .select('professional_id')
    .eq('client_id', clientId)

  if (result.error) throw result.error
  return result.data
}
