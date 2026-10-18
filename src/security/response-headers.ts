export function secureHeaders(
  original: Headers,
  nonce: string,
  supabaseUrl: string,
  path: string,
  https: boolean,
) {
  const headers = new Headers(original)
  const backend = new URL(supabaseUrl)
  const socket = `${backend.protocol === 'https:' ? 'wss:' : 'ws:'}//${backend.host}`
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${backend.origin}`,
      "font-src 'self' data:",
      `connect-src 'self' ${backend.origin} ${socket} https://challenges.cloudflare.com`,
      "frame-src 'self' https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; '),
  )
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  if (https) headers.set('Strict-Transport-Security', 'max-age=31536000')
  if (/^\/(admin|conta|favoritos|entrar|cadastro|recuperar-senha)(\/|$)/.test(path)) {
    headers.set('Cache-Control', 'private, no-store, max-age=0')
    headers.set('Pragma', 'no-cache')
  }
  return headers
}
