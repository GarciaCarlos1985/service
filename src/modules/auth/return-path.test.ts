import { describe, expect, it } from 'vitest'
import { safeReturnPath } from './return-path'

describe('authenticated return paths', () => {
  it('keeps a relative local destination and its query', () => {
    expect(safeReturnPath('/empresas/cacoal-ro/loja?aba=avaliacoes')).toBe(
      '/empresas/cacoal-ro/loja?aba=avaliacoes',
    )
  })
  it.each(['//example.com', '/\\example.com', 'https://example.com', '/\nexample', null, '/ a'])(
    'rejects unsafe destination %s',
    (value) => {
      expect(safeReturnPath(value)).toBe('/conta')
    },
  )
})
