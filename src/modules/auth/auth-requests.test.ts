import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
}))
vi.mock('~/lib/supabase', () => ({ getSupabase: () => ({ auth }) }))
const input = {
  fullName: 'Consumidor de teste',
  phone: '(69) 99999-0000',
  email: 'unit@example.test',
  password: 'senha-unica-de-teste',
}
const origin = 'https://service-guide.helon280.workers.dev'

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'unit-site-key')
  vi.stubGlobal('window', { location: { origin } })
  for (const method of Object.values(auth)) {
    method.mockResolvedValue({ data: { session: null }, error: null })
  }
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('requisições Auth protegidas', () => {
  it('recusa envio sem prova quando o widget está configurado', async () => {
    const api = await import('./auth-requests')
    await expect(api.signUp(input)).rejects.toThrow('Conclua a verificação')
    await expect(api.signIn(input)).rejects.toThrow('Conclua a verificação')
    await expect(api.resetPassword(input.email)).rejects.toThrow('Conclua a verificação')
    await expect(api.resendConfirmation(input.email)).rejects.toThrow('Conclua a verificação')
    for (const method of Object.values(auth)) expect(method).not.toHaveBeenCalled()
  })

  it('envia a prova no campo aceito pelo Auth, sem conceder privilégios por metadados', async () => {
    const api = await import('./auth-requests')
    const result = await api.signUp(input, 'signup-proof')
    expect(auth.signUp).toHaveBeenCalledWith({
      email: input.email,
      password: input.password,
      options: {
        captchaToken: 'signup-proof',
        data: { full_name: input.fullName, phone: input.phone },
        emailRedirectTo: origin + '/conta',
      },
    })
    expect(result.requiresConfirmation).toBe(true)
  })

  it('inclui a prova em login e reconfirmação administrativa', async () => {
    const api = await import('./auth-requests')
    await api.signIn({ email: input.email, password: input.password }, 'login-proof')
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: input.email,
      password: input.password,
      options: { captchaToken: 'login-proof' },
    })
  })

  it('mantém destinos de recuperação e confirmação e exige provas distintas por operação', async () => {
    const api = await import('./auth-requests')
    await api.resetPassword(input.email, 'recovery-proof')
    await api.resendConfirmation(input.email, 'resend-proof')
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(input.email, {
      captchaToken: 'recovery-proof',
      redirectTo: origin + '/recuperar-senha',
    })
    expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: input.email,
      options: { captchaToken: 'resend-proof', emailRedirectTo: origin + '/conta' },
    })
  })

  it('preserva a recusa do servidor sem simular um login bem-sucedido', async () => {
    const failure = { code: 'captcha_failed', message: 'server response' }
    auth.signInWithPassword.mockResolvedValueOnce({ error: failure })
    const api = await import('./auth-requests')
    await expect(api.signIn(input, 'reused-proof')).rejects.toEqual(failure)
  })

  it('permite o laboratório sem chave sem inserir uma prova de produção fictícia', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const api = await import('./auth-requests')
    await api.signIn(input)
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: input.email,
      password: input.password,
      options: {},
    })
  })
})

describe('mensagens de autenticação', () => {
  it('explica confirmação, desafio vencido, limite e credenciais sem expor mensagens técnicas', async () => {
    const { authErrorMessage } = await import('./captcha-options')
    expect(authErrorMessage({ code: 'email_not_confirmed' }, 'fallback')).toContain(
      'Confirme seu e-mail',
    )
    expect(authErrorMessage({ code: 'captcha_failed' }, 'fallback')).toContain('Conclua novamente')
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' }, 'fallback')).toContain(
      'Aguarde',
    )
    expect(authErrorMessage({ code: 'invalid_credentials' }, 'fallback')).toBe(
      'E-mail ou senha incorretos.',
    )
    expect(authErrorMessage(new Error('internal private details'), 'Tente novamente.')).toBe(
      'Tente novamente.',
    )
  })
})
