import { getSupabase } from '~/lib/supabase'

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected'

export interface Dispute {
  id: string
  booking_id: string
  opened_by: string
  reason: string
  description: string | null
  status: DisputeStatus
  resolution_note: string | null
  created_at: string
  updated_at: string
}

export interface DisputeDetail {
  id: string
  booking_id: string
  opened_by: string
  reason: string
  description: string | null
  status: DisputeStatus
  resolution_note: string | null
  created_at: string
  updated_at: string
  service_title: string
  other_party_id: string
  other_party_name: string | null
}

export interface DisputeMessage {
  id: string
  dispute_id: string
  author_id: string
  body: string
  created_at: string
}

export type EvidenceKind = 'image' | 'document' | 'link'

export interface DisputeEvidence {
  id: string
  dispute_id: string
  kind: EvidenceKind
  url: string
  added_by: string
  created_at: string
}

export const disputeStatusLabel: Record<DisputeStatus, string> = {
  open: 'Aberta',
  under_review: 'Em análise',
  resolved: 'Resolvida',
  rejected: 'Indeferida',
}

export async function openDispute(
  bookingId: string,
  reason: string,
  description: string | null,
): Promise<Dispute> {
  const supabase = getSupabase()
  const result = await supabase.rpc('open_dispute', {
    p_booking_id: bookingId,
    p_reason: reason,
    p_description: description,
  })
  if (result.error) throw result.error
  return result.data as Dispute
}

export async function listMyDisputes(): Promise<Dispute[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_my_disputes')
  if (result.error) throw result.error
  return (result.data ?? []) as Dispute[]
}

export async function getDispute(disputeId: string): Promise<DisputeDetail | null> {
  const supabase = getSupabase()
  const result = await supabase.rpc('get_dispute', { p_dispute_id: disputeId })
  if (result.error) throw result.error
  const rows = (result.data ?? []) as DisputeDetail[]
  return rows[0] ?? null
}

export async function listDisputeMessages(disputeId: string): Promise<DisputeMessage[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_dispute_messages', {
    p_dispute_id: disputeId,
    p_limit: 100,
  })
  if (result.error) throw result.error
  return (result.data ?? []) as DisputeMessage[]
}

export async function addDisputeMessage(disputeId: string, body: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('add_dispute_message', {
    p_dispute_id: disputeId,
    p_body: body,
  })
  if (error) throw error
}

export async function listDisputeEvidence(disputeId: string): Promise<DisputeEvidence[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_dispute_evidence', { p_dispute_id: disputeId })
  if (result.error) throw result.error
  return (result.data ?? []) as DisputeEvidence[]
}

export async function addDisputeEvidence(
  disputeId: string,
  kind: EvidenceKind,
  url: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('add_dispute_evidence', {
    p_dispute_id: disputeId,
    p_kind: kind,
    p_url: url,
  })
  if (error) throw error
}
