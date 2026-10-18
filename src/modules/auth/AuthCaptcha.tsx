import { useEffect, useRef, useState } from 'react'
import { captchaSiteKey } from './captcha-options'

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string
      action: string
      language: string
      theme: 'light'
      size: 'compact' | 'flexible'
      retry: 'never'
      'response-field': boolean
      callback: (token: string) => void
      'error-callback': () => boolean
      'expired-callback': () => void
      'timeout-callback': () => void
    },
  ) => string
  remove: (widget: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptLoading: Promise<TurnstileApi> | undefined
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce
    if (nonce) script.nonce = nonce
    const fail = () => {
      clearTimeout(timeout)
      script.onload = null
      script.onerror = null
      script.remove()
      scriptLoading = undefined
      reject(new Error('Verificação indisponível.'))
    }
    const timeout = setTimeout(fail, 15000)
    script.onerror = fail
    script.onload = () => {
      clearTimeout(timeout)
      if (window.turnstile) resolve(window.turnstile)
      else fail()
    }
    document.head.appendChild(script)
  })
  return scriptLoading
}

export function AuthCaptcha({
  action,
  onToken,
}: {
  action: 'sign_in' | 'sign_up' | 'recovery' | 'resend' | 'admin_confirm'
  onToken: (token: string) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'verified' | 'expired' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const element = host.current
    if (!captchaSiteKey || !element) return
    let active = true
    let api: TurnstileApi | undefined
    let widget: string | undefined
    let observer: ResizeObserver | undefined
    let compact: boolean | undefined
    let generation = 0
    void loadTurnstile()
      .then((loaded) => {
        if (!active) return
        api = loaded
        const render = (nextCompact: boolean) => {
          if (!active || compact === nextCompact) return
          compact = nextCompact
          generation++
          const current = generation
          if (widget) loaded.remove(widget)
          onToken('')
          setStatus('loading')
          const valid = () => active && generation === current
          const failed = () => {
            if (!valid()) return
            onToken('')
            setStatus('error')
          }
          widget = loaded.render(element, {
            sitekey: captchaSiteKey,
            action,
            language: 'pt-br',
            theme: 'light',
            size: nextCompact ? 'compact' : 'flexible',
            retry: 'never',
            'response-field': false,
            callback: (token) => {
              if (!valid()) return
              onToken(token)
              setStatus('verified')
            },
            'error-callback': () => {
              failed()
              return false
            },
            'expired-callback': () => {
              if (!valid()) return
              onToken('')
              setStatus('expired')
            },
            'timeout-callback': failed,
          })
        }
        render(element.clientWidth < 300)
        observer = new ResizeObserver(([entry]) => {
          if (entry) render(entry.contentRect.width < 300)
        })
        observer.observe(element)
      })
      .catch(() => {
        if (!active) return
        onToken('')
        setStatus('error')
      })
    return () => {
      active = false
      observer?.disconnect()
      if (widget) api?.remove(widget)
    }
  }, [action, onToken, retry])

  if (!captchaSiteKey) return null
  return (
    <div role="group" aria-label="Verificação de segurança" className="min-w-0 space-y-2">
      <div ref={host} className="min-w-0" data-sitekey={captchaSiteKey} />
      <p role="status" className="text-sm text-slate-600">
        {status === 'loading' && 'Conclua a verificação de segurança para continuar.'}
        {status === 'verified' && 'Verificação concluída.'}
        {status === 'expired' && 'A verificação expirou. Aguarde a renovação ou tente novamente.'}
        {status === 'error' &&
          'Não foi possível concluir a verificação. Confira sua conexão e tente novamente.'}
      </p>
      {(status === 'error' || status === 'expired') && (
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-blue-700 underline underline-offset-4 focus-visible:outline-2"
          onClick={() => {
            onToken('')
            setStatus('loading')
            setRetry((previous) => previous + 1)
          }}
        >
          Repetir verificação
        </button>
      )}
    </div>
  )
}
