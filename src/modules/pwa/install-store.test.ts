import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class PromptEvent extends Event {
  prompt = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  constructor(outcome: 'accepted' | 'dismissed') {
    super('beforeinstallprompt', { cancelable: true })
    this.userChoice = Promise.resolve({ outcome })
  }
}

function browser(standalone = false) {
  const display = Object.assign(new EventTarget(), { matches: standalone })
  const registration = vi.fn().mockResolvedValue({})
  const target = Object.assign(new EventTarget(), {
    matchMedia: () => display,
    isSecureContext: true,
  })
  vi.stubGlobal('window', target)
  vi.stubGlobal('navigator', { serviceWorker: { register: registration } })
  return { target, display, registration }
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('PROD', true)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('instalação PWA', () => {
  it('registra uma vez e só afirma instalação após confirmação do navegador', async () => {
    const lab = browser()
    const store = await import('./install-store')
    store.startInstallSupport()
    store.startInstallSupport()
    expect(lab.registration).toHaveBeenCalledExactlyOnceWith('/service-worker.js', {
      updateViaCache: 'none',
    })
    const event = new PromptEvent('accepted')
    lab.target.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(store.installSnapshot().canPrompt).toBe(true)
    await store.promptInstall()
    expect(store.installSnapshot().installed).toBe(false)
    lab.target.dispatchEvent(new Event('appinstalled'))
    expect(store.installSnapshot().installed).toBe(true)
    expect(store.installSnapshot().canPrompt).toBe(false)
  })
  it('consome a prova uma vez e mantém a navegação disponível se cancelar', async () => {
    const lab = browser()
    const store = await import('./install-store')
    store.startInstallSupport()
    const event = new PromptEvent('dismissed')
    lab.target.dispatchEvent(event)
    await Promise.all([store.promptInstall(), store.promptInstall()])
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(store.installSnapshot()).toMatchObject({
      busy: false,
      installed: false,
      canPrompt: false,
    })
    expect(store.installSnapshot().message).toContain('continuar usando pelo navegador')
  })
  it('reconhece modo instalado e falha do navegador sem travar a página', async () => {
    const lab = browser(true)
    const store = await import('./install-store')
    store.startInstallSupport()
    expect(store.installSnapshot().installed).toBe(true)
    lab.display.matches = false
    lab.display.dispatchEvent(new Event('change'))
    const event = new PromptEvent('accepted')
    event.prompt.mockRejectedValue(new Error('navegador indisponível'))
    lab.target.dispatchEvent(event)
    await store.promptInstall()
    expect(store.installSnapshot()).toMatchObject({ busy: false, installed: false })
    expect(store.installSnapshot().message).toContain('menu do navegador')
  })
  it('não instala service worker no desenvolvimento nem altera o estado de SSR', async () => {
    vi.stubEnv('PROD', false)
    const lab = browser(true)
    const store = await import('./install-store')
    store.startInstallSupport()
    expect(lab.registration).not.toHaveBeenCalled()
    expect(store.installServerSnapshot()).toEqual({
      installed: false,
      busy: false,
      canPrompt: false,
      message: '',
    })
  })
})
