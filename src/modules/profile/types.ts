export type UserType = 'client' | 'professional'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  city_id: number | null
  user_type: UserType
  avatar_url: string | null
  verification_status: VerificationStatus
  is_admin: boolean
  created_at: string
  updated_at: string
}

export const verificationStatusLabel: Record<VerificationStatus, string> = {
  unverified: 'Não verificado',
  pending: 'Verificação em análise',
  verified: 'Verificado',
  rejected: 'Verificação recusada',
  suspended: 'Suspenso',
}

export interface UpdateProfileInput {
  full_name?: string
  phone?: string | null
  city_id?: number | null
}
