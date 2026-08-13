import { getSupabase } from '~/lib/supabase'

export interface Conversation {
  conversation_id: string
  booking_id: string
  other_party_id: string
  other_party_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

export async function openConversation(bookingId: string): Promise<{ id: string }> {
  const supabase = getSupabase()
  const result = await supabase.rpc('open_conversation', { p_booking_id: bookingId })
  if (result.error) throw result.error
  return result.data as { id: string }
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const supabase = getSupabase()
  const result = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
  })
  if (result.error) throw result.error
  return result.data as Message
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  })
  if (error) throw error
}

export async function listMyConversations(): Promise<Conversation[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_my_conversations')
  if (result.error) throw result.error
  return (result.data ?? []) as Conversation[]
}

export async function listConversationMessages(
  conversationId: string,
  limit = 50,
): Promise<Message[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_conversation_messages', {
    p_conversation_id: conversationId,
    p_before: null,
    p_limit: limit,
  })
  if (result.error) throw result.error
  return (result.data ?? []) as Message[]
}

export async function getUnreadMessagesCount(): Promise<number> {
  const supabase = getSupabase()
  const result = await supabase.rpc('get_unread_messages_count')
  if (result.error) throw result.error
  return (result.data as number) ?? 0
}
