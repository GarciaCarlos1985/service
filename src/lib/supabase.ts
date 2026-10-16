import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

/**
 * Cliente Supabase para uso no navegador (chave anônima).
 * Toda a segurança de acesso depende de RLS no banco — ver
 * documentos/DECISIONS.md (ADR-002).
 *
 * Escrita no banco nunca acontece direto do navegador com a chave anônima
 * além do que o RLS autoriza por policy explícita.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client

  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ver .env.example).',
    )
  }

  client = createClient(url, anonKey, {
    global: {
      fetch: (input, options) => {
        const target =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const deadline = AbortSignal.timeout(target.includes('/storage/v1/') ? 120_000 : 30_000)
        const incoming = options?.signal ?? (input instanceof Request ? input.signal : null)
        return fetch(input, {
          ...options,
          signal: incoming ? AbortSignal.any([incoming, deadline]) : deadline,
        })
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return client
}
