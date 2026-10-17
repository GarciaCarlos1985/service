import type { CSSProperties } from 'react'
import { z } from 'zod'

export const defaultTheme = {
  primary: '#005cc5',
  navy: '#0b2948',
  accent: '#a2e579',
  background: '#ffffff',
  surface: '#f1f6fa',
  badge: '#e9cc7a',
}
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor hexadecimal, como #0b2948.')
export const themeSchema = z
  .object({
    primary: color,
    navy: color,
    accent: color,
    background: color,
    surface: color,
    badge: color,
  })
  .strict()
export const spotlightSchema = z
  .object({
    id: z.uuid(),
    companyId: z.uuid(),
    title: z.string().trim().max(80),
    description: z.string().trim().max(160),
    imageUrl: z.union([
      z.literal(''),
      z
        .url()
        .max(2048)
        .refine((value) => value.startsWith('https://'), 'Use https:// na imagem.'),
    ]),
    imageAlt: z.string().trim().max(160),
    enabled: z.boolean(),
  })
  .strict()
export type Spotlight = z.infer<typeof spotlightSchema>
const title = z.string().trim().min(2).max(80)
const description = z.string().trim().min(3).max(300)
const presentationObject = z
  .object({
    heroTitle: z.string().trim().min(3).max(80),
    heroDescription: z.string().trim().min(10).max(300),
    searchPlaceholder: z.string().trim().min(3).max(100),
    searchButtonLabel: title.max(30),
    resultsTitle: title,
    favoritesTitle: title,
    favoritesDescription: description,
    emptyTitle: title,
    emptyDescription: description,
    businessTitle: title,
    businessDescription: description,
    businessButtonLabel: title.max(40),
    footerTagline: description,
    quickSearches: z.array(z.string().trim().min(2).max(80)).max(8),
    showSuggestions: z.boolean(),
    showSpotlight: z.boolean(),
    theme: themeSchema,
    spotlightMode: z.enum(['automatic', 'manual']),
    spotlights: z.array(spotlightSchema).max(12),
  })
  .strict()
export const presentationSchema = presentationObject.refine(
  (value) => new Set(value.spotlights.map((slide) => slide.id)).size === value.spotlights.length,
  { message: 'Cada vitrine precisa de um identificador único.', path: ['spotlights'] },
)
export type Presentation = z.infer<typeof presentationSchema>
export const defaultPresentation: Presentation = {
  heroTitle: 'Descubra Cacoal.',
  heroDescription:
    'Produtos, serviços e negócios locais. Encontre o que precisa e faça a cidade acontecer.',
  searchPlaceholder: 'Eletricista, tinta, barbearia…',
  searchButtonLabel: 'Buscar',
  resultsTitle: 'Descubra por perto',
  favoritesTitle: 'Seus favoritos, por perto.',
  favoritesDescription: 'Um lugar para guardar quem resolve o que você precisa.',
  emptyTitle: 'Nenhum resultado com estes filtros.',
  emptyDescription: 'Experimente um termo mais amplo, como “pintura”, ou remova um filtro.',
  businessTitle: 'Seu negócio também pode estar aqui.',
  businessDescription: 'Converse com o dono do guia para combinar sua inclusão.',
  businessButtonLabel: 'Solicitar inclusão',
  footerTagline: 'O comércio local, mais perto de você.',
  quickSearches: ['Tinta emborrachada', 'Corte masculino', 'Eletricista', 'Celular Samsung'],
  showSuggestions: true,
  showSpotlight: true,
  theme: defaultTheme,
  spotlightMode: 'automatic',
  spotlights: [],
}
export const publicPresentationSchema = presentationObject
  .partial()
  .extend({ theme: themeSchema.partial().optional() })
  .transform((value) => ({
    ...defaultPresentation,
    ...value,
    theme: { ...defaultTheme, ...value.theme },
  }))
export const presentationTextFields = [
  ['heroTitle', 'Título principal', 80, false],
  ['heroDescription', 'Descrição principal', 300, true],
  ['searchPlaceholder', 'Exemplo no campo de busca', 100, false],
  ['searchButtonLabel', 'Texto do botão de busca', 30, false],
  ['resultsTitle', 'Título da lista de empresas', 80, false],
  ['favoritesTitle', 'Título dos favoritos', 80, false],
  ['favoritesDescription', 'Descrição dos favoritos', 300, true],
  ['emptyTitle', 'Título quando não há resultados', 80, false],
  ['emptyDescription', 'Orientação quando não há resultados', 300, true],
  ['businessTitle', 'Título do convite para empresas', 80, false],
  ['businessDescription', 'Descrição do convite', 300, true],
  ['businessButtonLabel', 'Texto do botão de inclusão', 40, false],
  ['footerTagline', 'Texto do rodapé', 300, true],
] as const
export const themeFields = [
  ['primary', 'Botões e ações'],
  ['navy', 'Vitrine e áreas premium'],
  ['accent', 'Destaque da busca'],
  ['background', 'Fundo do site'],
  ['surface', 'Superfícies de apoio'],
  ['badge', 'Selo Premium Guide'],
] as const
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((index) => {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722
  }
  const first = luminance(a),
    second = luminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}
export function textOn(background: string) {
  if (contrastRatio(background, '#18334f') >= 4.5) return '#18334f'
  return contrastRatio(background, '#000000') > contrastRatio(background, '#ffffff')
    ? '#000000'
    : '#ffffff'
}
export function themeVariables(theme: Presentation['theme']): CSSProperties {
  const variables: Record<string, string> = {}
  for (const [key, value] of Object.entries(theme)) {
    variables['--site-' + key] = value
    variables['--site-' + key + '-ink'] = textOn(value)
  }
  variables['--site-link'] =
    contrastRatio(theme.primary, theme.background) >= 4.5 ? theme.primary : textOn(theme.background)
  variables['--site-badge-ink'] =
    contrastRatio(theme.badge, '#3a2a11') >= 4.5 ? '#3a2a11' : textOn(theme.badge)
  return variables
}
