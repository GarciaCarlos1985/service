import { getSupabase } from '~/lib/supabase'
import type { SignInInput, SignUpInput } from './schemas'
import { captchaOptions } from './captcha-options'

export async function signUp(input: SignUpInput, captchaToken?: string) {
  const options = captchaOptions(captchaToken)
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      ...options,
      data: { full_name: input.fullName, phone: input.phone },
      emailRedirectTo: `${window.location.origin}/conta`,
    },
  })
  if (error) throw error
  return { requiresConfirmation: data.session === null }
}

export async function signIn(input: SignInInput, captchaToken?: string) {
  const options = captchaOptions(captchaToken)
  const { error } = await getSupabase().auth.signInWithPassword({
    email: input.email,
    password: input.password,
    options,
  })
  if (error) throw error
}

export async function resetPassword(email: string, captchaToken?: string) {
  const options = captchaOptions(captchaToken)
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    ...options,
    redirectTo: `${window.location.origin}/recuperar-senha`,
  })
  if (error) throw error
}

export async function resendConfirmation(email: string, captchaToken?: string) {
  const options = captchaOptions(captchaToken)
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email,
    options: { ...options, emailRedirectTo: `${window.location.origin}/conta` },
  })
  if (error) throw error
}
