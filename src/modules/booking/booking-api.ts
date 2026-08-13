/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unnecessary-condition --
   Supabase-js retorna `any` em selects/RPCs sem Database genérica; tipamos a
   borda explicitamente. Substituir por `supabase gen types` quando o banco
   estiver linkado (documentos/APLICANDO_MIGRATIONS.md). */
import { getSupabase } from '~/lib/supabase'

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface AvailabilitySlot {
  id: string
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface AvailabilityException {
  id: string
  professional_id: string
  exception_date: string
  reason: string | null
  is_blocked: boolean
}

export interface Booking {
  id: string
  client_id: string
  professional_id: string
  service_id: string
  scheduled_at: string
  duration_minutes: number
  price_cents: number
  status: BookingStatus
  cancellation_reason: string | null
  service: { title: string; category: { name: string } | null } | null
  professional: {
    full_name: string | null
    slug: string | null
    city: { slug: string } | null
  } | null
  client: { full_name: string | null } | null
}

export async function listAvailability(professionalId: string): Promise<AvailabilitySlot[]> {
  const supabase = getSupabase()
  const result = await supabase
    .from('professional_availability')
    .select('*')
    .eq('professional_id', professionalId)
    .order('day_of_week')
    .order('start_time')

  if (result.error) throw result.error
  return result.data as AvailabilitySlot[]
}

export async function addAvailabilityRow(
  professionalId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('professional_availability').insert({
    professional_id: professionalId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  })
  if (error) throw error
}

export async function removeAvailabilityRow(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('professional_availability').delete().eq('id', id)
  if (error) throw error
}

export async function listExceptions(professionalId: string): Promise<AvailabilityException[]> {
  const supabase = getSupabase()
  const result = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('professional_id', professionalId)
    .order('exception_date')

  if (result.error) throw result.error
  return result.data as AvailabilityException[]
}

export async function addException(
  professionalId: string,
  exceptionDate: string,
  reason?: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('availability_exceptions').insert({
    professional_id: professionalId,
    exception_date: exceptionDate,
    reason: reason ?? null,
    is_blocked: true,
  })
  if (error) throw error
}

export async function removeException(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('availability_exceptions').delete().eq('id', id)
  if (error) throw error
}

export interface FreeSlot {
  slot_date: string
  slot_time: string
}

export async function getAvailableSlots(
  professionalId: string,
  fromDate: string,
  days = 14,
  slotMinutes = 30,
): Promise<FreeSlot[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('available_slots', {
    p_professional_id: professionalId,
    p_from_date: fromDate,
    p_days: days,
    p_slot_minutes: slotMinutes,
  })
  if (result.error) throw result.error
  return (result.data ?? []) as FreeSlot[]
}

export async function createBooking(input: {
  professionalId: string
  serviceId: string
  scheduledAt: string
  durationMinutes: number
}): Promise<Booking> {
  const supabase = getSupabase()
  const result = await supabase.rpc('create_booking', {
    p_professional_id: input.professionalId,
    p_service_id: input.serviceId,
    p_scheduled_at: input.scheduledAt,
    p_duration_minutes: input.durationMinutes,
  })
  if (result.error) throw result.error
  return result.data as Booking
}

export async function listMyBookings(): Promise<Booking[]> {
  const supabase = getSupabase()
  const result = await supabase
    .from('bookings')
    .select(
      '*, service:services(title, category:service_categories(name)), professional:profiles!bookings_professional_id_fkey(full_name, slug, city:cities!profiles_city_id_fkey(slug)), client:profiles!bookings_client_id_fkey(full_name)',
    )
    .order('scheduled_at', { ascending: false })

  if (result.error) throw result.error
  return (result.data ?? []) as unknown as Booking[]
}

export async function confirmBooking(bookingId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('confirm_booking', { p_booking_id: bookingId })
  if (error) throw error
}

export async function startBooking(bookingId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('start_booking', { p_booking_id: bookingId })
  if (error) throw error
}

export async function completeBooking(bookingId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('complete_booking', { p_booking_id: bookingId })
  if (error) throw error
}

export async function cancelBooking(bookingId: string, reason: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: reason,
  })
  if (error) throw error
}

export const bookingStatusLabel: Record<BookingStatus, string> = {
  pending: 'Aguardando confirmaÃ§Ã£o',
  confirmed: 'Confirmado',
  in_progress: 'Em andamento',
  completed: 'ConcluÃ­do',
  cancelled: 'Cancelado',
}
