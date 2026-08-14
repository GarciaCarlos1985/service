import { getSupabase } from '~/lib/supabase'

export type NotificationType =
  | 'booking'
  | 'payment'
  | 'payout'
  | 'cashback'
  | 'review'
  | 'referral'
  | 'system'
  | 'dispute'
  | 'security'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export async function listMyNotifications(limit = 50): Promise<AppNotification[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_my_notifications', { p_limit: limit })
  if (result.error) throw result.error
  return (result.data ?? []) as AppNotification[]
}

export async function markNotificationsRead(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('mark_notifications_read')
  if (error) throw error
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const supabase = getSupabase()
  const result = await supabase.rpc('get_unread_notifications_count')
  if (result.error) throw result.error
  return result.data as number
}

export const notificationIcon: Record<NotificationType, string> = {
  booking: '📅',
  payment: '💳',
  payout: '💰',
  cashback: '✨',
  review: '⭐',
  referral: '👥',
  system: '🔧',
  dispute: '⚖️',
  security: '🛡️',
}
