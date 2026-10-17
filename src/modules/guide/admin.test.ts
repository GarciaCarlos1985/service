import { describe, expect, it } from 'vitest'
import { priceCents } from './admin'

describe('catalog prices', () => {
  it('converts localized prices to integer cents and preserves an absent price', () => {
    expect(priceCents('45,50')).toBe(4550)
    expect(priceCents('1.299,90')).toBe(129990)
    expect(priceCents('0.29')).toBe(29)
    expect(priceCents('')).toBe(null)
  })
  it.each(['-1', '1.005', '1e9', 'R$ 45', '99999999'])(
    'rejects ambiguous or out-of-range input %s',
    (value) => {
      expect(() => priceCents(value)).toThrow()
    },
  )
})
