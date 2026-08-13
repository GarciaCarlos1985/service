import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * Retorna `true` somente no cliente (após hidratação).
 * Padrão SSR-safe sem setState em effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
