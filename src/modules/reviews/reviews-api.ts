import { getSupabase } from '~/lib/supabase'

export interface ProfessionalReview {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer_name: string
  response_body: string | null
  response_created_at: string | null
}

export interface RatingSummary {
  avg_rating: number
  review_count: number
}

export interface ProfessionalBadge {
  badge: 'verificado' | 'alta_avaliacao' | 'top' | 'pro'
  label: string
}

export interface MyReview {
  id: string
  booking_id: string
  professional_id: string
  rating: number
  comment: string | null
  created_at: string
}

export async function listProfessionalReviews(
  professionalId: string,
  limit = 20,
): Promise<ProfessionalReview[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_professional_reviews', {
    p_professional_id: professionalId,
    p_limit: limit,
    p_before: null,
  })
  if (result.error) throw result.error
  return (result.data ?? []) as ProfessionalReview[]
}

export async function getRatingSummary(professionalId: string): Promise<RatingSummary> {
  const supabase = getSupabase()
  const result = await supabase.rpc('professional_rating_summary', {
    p_professional_id: professionalId,
  })
  if (result.error) throw result.error
  const rows = (result.data ?? []) as Array<{ avg_rating: number; review_count: number }>
  return rows[0] ?? { avg_rating: 0, review_count: 0 }
}

export async function getProfessionalBadges(professionalId: string): Promise<ProfessionalBadge[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('professional_badges', {
    p_professional_id: professionalId,
  })
  if (result.error) throw result.error
  return (result.data ?? []) as ProfessionalBadge[]
}

export async function createReview(
  bookingId: string,
  rating: number,
  comment: string | null,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('create_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment,
  })
  if (error) throw error
}

export async function respondReview(reviewId: string, body: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('respond_review', {
    p_review_id: reviewId,
    p_body: body,
  })
  if (error) throw error
}

export async function listMyReviews(): Promise<MyReview[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('list_my_reviews')
  if (result.error) throw result.error
  return (result.data ?? []) as MyReview[]
}
