import { z } from 'zod'

export const presentationSchema = z.object({
  heroTitle: z.string().trim().min(3).max(80),
  heroDescription: z.string().trim().min(10).max(300),
  searchPlaceholder: z.string().trim().min(3).max(100),
  quickSearches: z.array(z.string().trim().min(2).max(80)).max(8),
  showSuggestions: z.boolean(),
  showSpotlight: z.boolean(),
})
export type Presentation = z.infer<typeof presentationSchema>
export const defaultPresentation: Presentation = {
  heroTitle: 'Descubra Cacoal.',
  heroDescription:
    'Produtos, serviços e negócios locais. Encontre o que precisa e faça a cidade acontecer.',
  searchPlaceholder: 'Eletricista, tinta, barbearia…',
  quickSearches: ['Tinta emborrachada', 'Corte masculino', 'Eletricista', 'Celular Samsung'],
  showSuggestions: true,
  showSpotlight: true,
}

export const publicPresentationSchema = presentationSchema.partial().transform((value) => ({
  ...defaultPresentation,
  ...value,
}))
