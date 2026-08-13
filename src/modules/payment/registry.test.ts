import { describe, expect, it } from 'vitest'
import { getPaymentProvider, isMockProvider } from './registry'
import { MockProvider } from './mock-provider'

describe('registry de providers (ADR-001)', () => {
  it('resolve o MockProvider pelo nome', () => {
    const provider = getPaymentProvider('mock')
    expect(provider).toBeInstanceOf(MockProvider)
  })

  it('usa mock como default', () => {
    expect(getPaymentProvider().name).toBe('mock')
  })

  it('não permite registrar provider desconhecido', () => {
    expect(() => getPaymentProvider('stripe')).toThrow(/desconhecido/)
  })

  it('marca claramente o mock (spec §73)', () => {
    expect(isMockProvider('mock')).toBe(true)
    expect(isMockProvider('stripe')).toBe(false)
  })
})

describe('MockProvider', () => {
  it('cria pagamento com resultado rotulado como simulado', async () => {
    const provider = getPaymentProvider('mock')
    const result = await provider.createPayment({
      idempotencyKey: 'idem-1',
      bookingId: 'booking-1',
      amountCents: 10000,
      currency: 'BRL',
      description: 'Serviço de teste',
    })

    expect(result.status).toBe('succeeded')
    expect(result.providerPaymentId).toContain('mock_')
    expect(result.payload).toMatchObject({ mock: true })
  })

  it('verifica webhook com assinatura mock e rejeita assinatura inválida', async () => {
    const provider = getPaymentProvider('mock')
    const event = await provider.verifyWebhook(
      'mock-signature',
      JSON.stringify({ id: 'evt_1', type: 'payment.succeeded' }),
    )
    expect(event.eventId).toBe('evt_1')
    await expect(provider.verifyWebhook('assinatura-errada', '{}')).rejects.toThrow(/Assinatura/)
  })
})
