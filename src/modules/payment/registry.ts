import type { PaymentProvider } from './provider'
import { MockProvider } from './mock-provider'

export type ProviderName = PaymentProvider['name']

/**
 * Registry de providers (ADR-001): adicionar provider = 1 classe + 1 linha.
 */
const registry: Partial<Record<ProviderName, () => PaymentProvider>> = {
  mock: () => new MockProvider(),
}

export function getPaymentProvider(name: ProviderName = 'mock'): PaymentProvider {
  const factory = registry[name]
  if (!factory) {
    throw new Error(`PaymentProvider desconhecido: ${name}`)
  }
  return factory()
}

/**
 * StripeProvider/AppmaxProvider entram aqui quando as credenciais existirem
 * (M5+): implementar o contrato em src/modules/payment/stripe-provider.ts e
 * registrar neste registry. Nunca registrar o mock em produção.
 */
export function isMockProvider(name: ProviderName): boolean {
  return name === 'mock'
}
