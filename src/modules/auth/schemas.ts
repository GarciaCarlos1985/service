import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Informe seu e-mail.')
  .pipe(z.email('E-mail inválido.'))

export const passwordSchema = z
  .string()
  .min(12, 'A senha precisa de pelo menos 12 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Informe seu nome completo.').max(120, 'Nome muito longo.'),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[^+\d]/g, ''))
    .pipe(z.string().regex(/^\+?[0-9]{10,15}$/, 'Informe um telefone com DDD.')),
  email: emailSchema,
  password: passwordSchema,
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas precisam ser iguais.',
    path: ['confirmPassword'],
  })

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
