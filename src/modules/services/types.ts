export interface Service {
  id: string
  professional_id: string
  category_id: number
  title: string
  description: string | null
  price_from_cents: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceCategory {
  id: number
  slug: string
  name: string
}

export interface CreateServiceInput {
  category_id: number
  title: string
  description?: string
  price_from_cents?: number
}

export interface UpdateServiceInput {
  category_id?: number
  title?: string
  description?: string | null
  price_from_cents?: number | null
  is_active?: boolean
}
