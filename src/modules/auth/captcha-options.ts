export const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? ''

export function captchaOptions(token?: string) {
  if (captchaSiteKey && !token?.trim()) {
    const error = new Error('Conclua a verificação de segurança para continuar.')
    error.name = 'CaptchaRequired'
    throw error
  }
  return token ? { captchaToken: token } : {}
}

export function authErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === 'CaptchaRequired') return error.message
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    captcha_failed:
      'A verificação de segurança expirou ou falhou. Conclua novamente e tente outra vez.',
    email_not_confirmed:
      'Confirme seu e-mail antes de entrar. Confira a caixa de entrada e o spam.',
    invalid_credentials: 'E-mail ou senha incorretos.',
    over_email_send_rate_limit:
      'Aguarde antes de pedir outro e-mail. Confira também a caixa de entrada e o spam.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
    email_address_not_authorized:
      'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
    email_send_error: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
  }
  return messages[code] ?? fallback
}
