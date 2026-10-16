import { describe, expect, it } from 'vitest'
import { editorPayload, moveRecord, slugFor } from './editor-model'
import { defaultPresentation, presentationSchema } from '../presentation'

describe('cadastro profissional', () => {
  it('gera URL legível sem acentos ou caracteres perigosos', () => {
    expect(slugFor('  Açúcar & Café / Cacoal  ')).toBe('acucar-cafe-cacoal')
  })
  const item = {
    name: 'Tinta',
    description: 'Tinta lavável',
    type: 'product',
    company_id: '7904e038-d60e-4f62-a633-32af0a37094f',
    category_id: '216d2437-81ca-4e8d-ab21-e95b96e07191',
    available: true,
    price: '23,90',
  }
  it('preserva a associação e converte preço em centavos', () => {
    expect(editorPayload('item', item)).toMatchObject({
      company_id: item.company_id,
      price_cents: 2390,
    })
  })
  it.each([
    { ...item, company_id: '' },
    { ...item, price: '-1' },
    { ...item, price: '1e3' },
    { ...item, description: '' },
  ])('rejeita item inválido sem enviar a RPC', (value) => {
    expect(() => editorPayload('item', value)).toThrow()
  })
})
describe('ordenação acessível', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('move nos dois sentidos sem perder ou duplicar registros', () => {
    expect(moveRecord(rows, 'a', 'c').map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect(moveRecord(rows, 'c', 'a').map((r) => r.id)).toEqual(['c', 'a', 'b'])
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
  it('ignora IDs externos, ausentes ou iguais', () => {
    expect(moveRecord(rows, 'outside', 'a')).toEqual(rows)
    expect(moveRecord(rows, 'a', 'a')).toEqual(rows)
  })
})
describe('apresentação pública', () => {
  it('aceita a apresentação atual e opções desligadas', () => {
    expect(presentationSchema.safeParse(defaultPresentation).success).toBe(true)
    expect(
      presentationSchema.safeParse({
        ...defaultPresentation,
        showSpotlight: false,
        quickSearches: [],
      }).success,
    ).toBe(true)
  })
  it('limita sugestões e texto excessivo', () => {
    expect(
      presentationSchema.safeParse({
        ...defaultPresentation,
        quickSearches: Array<string>(9).fill('Teste'),
      }).success,
    ).toBe(false)
    expect(
      presentationSchema.safeParse({ ...defaultPresentation, heroTitle: 'a'.repeat(81) }).success,
    ).toBe(false)
  })
})
