import { z } from 'zod'

export const serviceFormSchema = z.object({
  category_id: z.string().min(1, 'Escolha uma categoria.'),
  title: z
    .string()
    .trim()
    .min(3, 'Título precisa de pelo menos 3 caracteres.')
    .max(120, 'Título muito longo.'),
  description: z.string().trim().max(2000, 'Descrição muito longa.').optional().or(z.literal('')),
  price_from_cents: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => value === '' || !Number.isNaN(Number(value)), 'Valor inválido.')
    .refine((value) => value === '' || Number(value) >= 0, 'O valor não pode ser negativo.'),
})

export type ServiceFormInput = z.infer<typeof serviceFormSchema>

export function parseCategoryId(value: string): number | null {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function formatPriceFromCents(cents: number | null): string {
  if (cents === null) return ''
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
