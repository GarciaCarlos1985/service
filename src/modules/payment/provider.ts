/**
 * Contrato de pagamento (ADR-001): a regra de negócio do SERVICE NUNCA
 * depende de detalhes de um provider (spec §9). Implementações:
 * MockProvider (desenvolvimento — claramente separado, spec §73),
 * StripeProvider (produção, M5+ com credenciais), AppmaxProvider (futuro).
 */

export type PaymentStatus =
  'pending' | 'requires_action' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'

export interface CreatePaymentInput {
  /** Chave de idempotência do SERVICE (spec §12) — nunca gerada pelo cliente. */
  idempotencyKey: string
  bookingId: string
  amountCents: number
  currency: 'BRL'
  /** Metadados mínimos: nunca dados sensíveis. */
  description: string
}

export interface PaymentResult {
  providerPaymentId: string
  status: PaymentStatus
  /** Chave oficial do provider quando existir (ADR-005). */
  providerEventId?: string
  payload?: unknown
}

export interface RefundInput {
  idempotencyKey: string
  providerPaymentId: string
  amountCents?: number
  reason?: string
}

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe' | 'appmax'
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>
  refund(input: RefundInput): Promise<PaymentResult>
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>
  /** Verifica a assinatura de um webhook (ADR-012: autenticado/verificado). */
  verifyWebhook(signature: string, rawBody: string): Promise<{ eventId: string; eventType: string }>
}
