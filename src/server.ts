import handler from '@tanstack/react-start/server-entry'
import { secureHeaders } from './security/response-headers'

export default {
  async fetch(request) {
    const nonce = crypto.randomUUID().replaceAll('-', '')
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-service-guide-csp-nonce', nonce)
    const response = await handler.fetch(new Request(request, { headers: requestHeaders }), {
      context: { nonce },
    })
    if (import.meta.env.DEV) return response
    const url = new URL(request.url)
    const headers = secureHeaders(
      response.headers,
      nonce,
      import.meta.env.VITE_SUPABASE_URL ?? 'https://taabjnmsaaltsiehywbw.supabase.co',
      url.pathname,
      url.protocol === 'https:',
    )
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
} satisfies ExportedHandler<Env>
