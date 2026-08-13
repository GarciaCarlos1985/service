import type {
  CreatePaymentInput,
  PaymentProvider,
  PaymentResult,
  PaymentStatus,
  RefundInput,
} from './provider'

/**
 * MockProvider — SOMENTE desenvolvimento (spec §73).
 * Nunca misturar com produção; nunca usar em ambiente real.
 * Identifica claramente cada resultado como simulado.
 */
export class MockProvider implements PaymentProvider {
  readonly name = 'mock' as const

  // eslint-disable-next-line @typescript-eslint/require-await -- mock é síncrono por natureza (spec §73)
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    // Simula o processamento: aceita e devolve status controlado.
    // Em dev, qualquer valor é aceito — mas o resultado é rotulado como MOCK.
    return {
      providerPaymentId: `mock_pay_${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`,
      status: 'succeeded',
      payload: { mock: true, amount_cents: input.amountCents, booking_id: input.bookingId },
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- mock é síncrono por natureza (spec §73)
  async refund(_input: RefundInput): Promise<PaymentResult> {
    return { providerPaymentId: 'mock_refund', status: 'refunded', payload: { mock: true } }
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- mock é síncrono por natureza (spec §73)
  async getPaymentStatus(_providerPaymentId: string): Promise<PaymentStatus> {
    return 'succeeded'
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- mock é síncrono por natureza (spec §73)
  async verifyWebhook(
    signature: string,
    rawBody: string,
  ): Promise<{ eventId: string; eventType: string }> {
    if (signature !== 'mock-signature') {
      throw new Error('Assinatura inválida')
    }
    const parsed = JSON.parse(rawBody) as { id?: string; type?: string }
    return { eventId: parsed.id ?? 'mock-event', eventType: parsed.type ?? 'mock' }
  }
}
