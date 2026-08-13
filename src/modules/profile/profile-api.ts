/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unnecessary-condition --
   O supabase-js retorna `any` em select('*') sem Database genérica. Tipamos a
   borda explicitamente; substituir por `supabase gen types` quando o banco
   estiver linkado (documentos/APLICANDO_MIGRATIONS.md). */
import { getSupabase } from '~/lib/supabase'
import type { Profile, UpdateProfileInput, UserType } from './types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase()
  const result = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (result.error) throw result.error
  return result.data as Profile | null
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {}

  if (input.full_name !== undefined) payload.full_name = input.full_name
  if (input.phone !== undefined) payload.phone = input.phone
  if (input.city_id !== undefined) payload.city_id = input.city_id

  // Merge por completude (ADR-007): nulo nunca sobrescreve — omitimos chaves
  // nulas do payload; apenas campos enviados são atualizados.
  const result = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .maybeSingle()

  if (result.error) throw result.error
  return result.data as Profile
}

/**
 * Escolha de tipo de conta (client/professional) — único caminho permitido
 * (RLS bloqueia alteração direta de user_type; spec §63).
 */
export async function chooseUserType(userType: UserType): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('choose_user_type', {
    p_user_type: userType,
  })
  if (error) throw error
}

export async function listCities(): Promise<Array<{ id: number; name: string; state: string }>> {
  const supabase = getSupabase()
  const result = await supabase.from('cities').select('id, name, state').order('name')

  if (result.error) throw result.error
  return result.data
}
