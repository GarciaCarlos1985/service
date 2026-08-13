import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('ignora valores falsos', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('mescla classes conflitantes do Tailwind', () => {
    expect(cn('p-4 p-6')).toBe('p-6')
    expect(cn('text-sm text-lg')).toBe('text-lg')
  })

  it('mantém classes diferentes', () => {
    expect(cn('flex h-11 rounded-xl')).toBe('flex h-11 rounded-xl')
  })
})
