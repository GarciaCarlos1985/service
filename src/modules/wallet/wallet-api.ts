import { getSupabase } from '~/lib/supabase'

export type WalletTransactionType =
  'credit' | 'debit' | 'cashback' | 'refund' | 'adjustment' | 'platform_fee' | 'payout'

export interface WalletTransaction {
  id: string
  wallet_id: string
  type: WalletTransactionType
  amount_cents: number
  balance_after_cents: number
  idempotency_key: string
  reference_type: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface WalletBalance {
  wallet_id: string
  balance_cents: number
}

export async function getWalletBalance(): Promise<WalletBalance | null> {
  const supabase = getSupabase()
  const result = await supabase.rpc('get_wallet_balance')
  if (result.error) throw result.error
  const data = (result.data ?? []) as WalletBalance[]
  return data[0] ?? null
}

export async function getMyTransactions(limit = 50): Promise<WalletTransaction[]> {
  const supabase = getSupabase()
  const result = await supabase.rpc('get_my_transactions', { p_limit: limit })
  if (result.error) throw result.error
  return (result.data ?? []) as WalletTransaction[]
}

export const walletTypeLabel: Record<WalletTransactionType, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  cashback: 'Cashback',
  refund: 'Reembolso',
  adjustment: 'Ajuste',
  platform_fee: 'Taxa da plataforma',
  payout: 'Saque',
}

export function isIncome(type: WalletTransactionType): boolean {
  return type === 'credit' || type === 'cashback' || type === 'refund' || type === 'adjustment'
}

export function formatBRL(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
