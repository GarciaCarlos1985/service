import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  defaultPresentation,
  presentationSchema,
  publicPresentationSchema,
  textOn,
  themeVariables,
} from './presentation'
const slide = {
  id: 'db1d35e6-0515-4c4f-af65-ec99da3f0c32',
  companyId: '15a992b4-3957-429b-ab9d-e7f92ec31db5',
  title: 'Vitrine',
  description: '',
  imageUrl: 'https://example.test/image.jpg',
  imageAlt: 'Imagem da empresa',
  enabled: true,
}
describe('personalização do site', () => {
  it('mantém compatibilidade com configurações anteriores e temas parciais', () => {
    const current = publicPresentationSchema.parse({
      heroTitle: 'Título anterior',
      theme: { navy: '#123456' },
    })
    expect(current.heroTitle).toBe('Título anterior')
    expect(current.searchButtonLabel).toBe('Buscar')
    expect(current.theme.navy).toBe('#123456')
    expect(current.theme.accent).toBe(defaultPresentation.theme.accent)
  })
  it('valida vitrines e impede identificadores duplicados e URLs executáveis', () => {
    expect(
      presentationSchema.safeParse({
        ...defaultPresentation,
        spotlightMode: 'manual',
        spotlights: [slide],
      }).success,
    ).toBe(true)
    expect(
      presentationSchema.safeParse({ ...defaultPresentation, spotlights: [slide, slide] }).success,
    ).toBe(false)
    for (const imageUrl of [
      'javascript:alert(1)',
      'data:image/svg+xml,<svg/>',
      'http://example.test/image.jpg',
    ])
      expect(
        presentationSchema.safeParse({
          ...defaultPresentation,
          spotlights: [{ ...slide, imageUrl }],
        }).success,
      ).toBe(false)
  })
  it('recusa CSS arbitrário e campos desconhecidos', () => {
    expect(
      presentationSchema.safeParse({
        ...defaultPresentation,
        theme: { ...defaultPresentation.theme, primary: 'red;background:url(x)' },
      }).success,
    ).toBe(false)
    expect(
      presentationSchema.safeParse({ ...defaultPresentation, html: '<script/>' }).success,
    ).toBe(false)
  })
  it('mantém contraste de texto de pelo menos 4,5 em paletas claras, escuras e intermediárias', () => {
    for (const r of [0, 51, 102, 153, 204, 255])
      for (const g of [0, 51, 102, 153, 204, 255])
        for (const b of [0, 51, 102, 153, 204, 255]) {
          const color = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
          expect(contrastRatio(color, textOn(color))).toBeGreaterThanOrEqual(4.5)
        }
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
  })
  it('gera somente variáveis de papéis conhecidos e corrige link claro sobre fundo claro', () => {
    const vars = themeVariables({ ...defaultPresentation.theme, primary: '#ffffaa' })
    expect(vars).toHaveProperty('--site-primary', '#ffffaa')
    expect(vars).toHaveProperty('--site-link', textOn('#ffffff'))
    expect(vars).toHaveProperty('--site-navy', '#0b2948')
  })
})
