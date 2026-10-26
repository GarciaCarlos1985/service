export type InstallState = {
  installed: boolean
  canPrompt: boolean
  busy: boolean
  message: string
}
interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
const initial: InstallState = { installed: false, canPrompt: false, busy: false, message: '' }
let state = initial
let deferred: InstallPrompt | null = null
let started = false
const listeners = new Set<() => void>()
function update(next: Partial<InstallState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => {
    listener()
  })
}
export const installSnapshot = () => state
export const installServerSnapshot = () => initial
export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function startInstallSupport() {
  if (started || typeof window === 'undefined') return
  started = true
  const standalone = window.matchMedia('(display-mode: standalone)')
  const readInstalled = () => {
    update({
      installed:
        standalone.matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    })
  }
  readInstalled()
  standalone.addEventListener('change', readInstalled)
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPrompt
    update({ canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    update({ installed: true, canPrompt: false, busy: false, message: 'Service Guide instalado.' })
  })
  if (import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator) {
    // A atualização entra no próximo uso; nunca recarrega formulários nem ativa versões à força.
    void navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .catch(() => {
        update({
          message:
            'A instalação não pôde ser preparada agora. Você pode continuar pelo site e tentar novamente depois.',
        })
      })
  }
}
export async function promptInstall() {
  const prompt = deferred
  if (!prompt || state.busy) return
  deferred = null
  update({ busy: true, canPrompt: false, message: '' })
  try {
    await prompt.prompt()
    const choice = await prompt.userChoice
    update({
      message:
        choice.outcome === 'accepted'
          ? 'Confirme a instalação no seu navegador.'
          : 'Você pode instalar depois ou continuar usando pelo navegador.',
    })
  } catch {
    update({ message: 'Use o menu do navegador para instalar ou siga as instruções abaixo.' })
  } finally {
    update({ busy: false })
  }
}
