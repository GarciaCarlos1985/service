import { z } from 'zod'
import { normalize } from '../types'
import { priceCents, text } from '../admin'
import { cleanWeek, weeklyHoursSchema, weekHoursText } from '../hours'
import type { WeeklyHours } from '../hours'
import type { AdminAction, AdminRow } from '../admin'

export const slugFor = (value: string) =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)

const id = z.uuid('Escolha um cadastro válido.')
const name = z.string().trim().min(2, 'Informe um nome com pelo menos 2 caracteres.').max(150)
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.')
  .max(100)
const contact = z.string().regex(/^\+?[0-9]{10,15}$|^$/, 'Informe o telefone com DDD.')
const website = z.union([
  z.literal(''),
  z.url().refine((url) => url.startsWith('https://'), 'Use um endereço iniciado por https://.'),
])
const companyForm = z
  .object({
    name: name.max(100, 'Use até 100 caracteres no nome da empresa.'),
    slug,
    description: z
      .string()
      .trim()
      .min(10, 'Descreva a empresa com pelo menos 10 caracteres.')
      .max(2000),
    category_id: id,
    city_id: z.coerce.number().int().positive('Escolha a cidade.'),
    neighborhood_id: z.union([id, z.literal('')]),
    plan_id: id,
    status: z.enum(['inactive', 'active', 'blocked']),
    street: z.string().max(160),
    address_number: z.string().max(20),
    postal_code: z.string().regex(/^\d{8}$|^$/, 'Informe um CEP com 8 números.'),
    phone: contact,
    whatsapp: contact,
    website,
    hours: z.string().max(2000),
    logo_url: z
      .union([
        z.literal(''),
        z
          .url()
          .refine(
            (url) =>
              url.startsWith('https://') ||
              (import.meta.env.MODE === 'e2e' &&
                url.startsWith('http://127.0.0.1:3004/storage/v1/object/public/guide-media/')),
            'Use uma imagem enviada para a empresa.',
          ),
      ])
      .default(''),
    weekly_hours: weeklyHoursSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.status !== 'active') return
    if (!value.neighborhood_id)
      context.addIssue({
        code: 'custom',
        path: ['neighborhood_id'],
        message: 'Escolha o bairro para publicar.',
      })
    if (!value.phone && !value.whatsapp && !value.website)
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Informe pelo menos um contato para publicar.',
      })
  })
const itemForm = z.object({
  name,
  description: z.string().trim().min(2, 'Descreva o item.').max(2000),
  company_id: id,
  category_id: id,
  type: z.enum(['product', 'service']),
  available: z.boolean(),
  price_cents: z.number().int().nonnegative().max(1000000000).nullable(),
})
export function editorPayload(action: AdminAction, form: AdminRow): AdminRow {
  const payload = { ...form }
  if (action === 'company') {
    if (payload.weekly_hours) {
      payload.weekly_hours = cleanWeek(payload.weekly_hours as WeeklyHours)
    }
    payload.phone = text(form, 'phone').replace(/[^+\d]/g, '')
    let whatsapp = text(form, 'whatsapp').replace(/\D/g, '')
    if ([10, 11].includes(whatsapp.length)) whatsapp = '55' + whatsapp
    payload.whatsapp = whatsapp
    payload.postal_code = text(form, 'postal_code').replace(/\D/g, '')
    const parsed = companyForm.parse(payload)
    if (parsed.weekly_hours) parsed.hours = weekHoursText(parsed.weekly_hours)
    return { ...parsed, ...(text(form, 'id') ? { id: text(form, 'id') } : {}) }
  }
  if (action === 'item') {
    payload.price_cents = priceCents(text(form, 'price'))
    return { ...itemForm.parse(payload), ...(text(form, 'id') ? { id: text(form, 'id') } : {}) }
  }
  for (const key of ['city_id', 'max_items', 'max_media', 'sort_order'])
    if (payload[key] !== undefined) payload[key] = Number(payload[key])
  return payload
}

export function moveRecord<T extends { id: string }>(
  rows: readonly T[],
  from: string,
  to: string,
): T[] {
  const start = rows.findIndex((row) => row.id === from)
  const end = rows.findIndex((row) => row.id === to)
  if (start < 0 || end < 0 || start === end) return [...rows]
  const next = [...rows]
  const [entry] = next.splice(start, 1)
  if (!entry) return [...rows]
  next.splice(end, 0, entry)
  return next
}
