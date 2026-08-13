export type UserType = 'client' | 'professional'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  city_id: number | null
  user_type: UserType
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileInput {
  full_name?: string
  phone?: string | null
  city_id?: number | null
}
