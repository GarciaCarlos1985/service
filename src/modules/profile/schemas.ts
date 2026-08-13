import { z } from 'zod'

export const profileFormSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe seu nome completo.').max(120, 'Nome muito longo.'),
  phone: z
    .string()
    .trim()
    .max(15, 'Telefone muito longo.')
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => value === '' || /^\+?[0-9]{10,15}$/.test(value ?? ''),
      'Telefone inválido (use apenas números, ex.: 11987654321).',
    ),
  city_id: z.string().optional().or(z.literal('')),
})

export type ProfileFormInput = z.infer<typeof profileFormSchema>

export function parseCityId(value: unknown): number | null {
  if (typeof value !== 'string' || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}
