import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Informe seu e-mail.')
  .pipe(z.email('E-mail inválido.'))

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Informe seu nome completo.').max(120, 'Nome muito longo.'),
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

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
