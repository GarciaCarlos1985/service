import { readFileSync } from 'node:fs'
import { createContext, Script } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

type RequestStub = { url: string; method: string; mode: string }
type EventStub = {
  request: RequestStub
  respondWith: (response: Promise<Response>) => void
  waitUntil: (task: Promise<unknown>) => void
}
const origin = 'https://service-guide.example'
function worker() {
  const handlers: Record<string, (event: EventStub) => void> = {}
  const entries = new Map<string, Map<string, Response>>()
  const key = (request: RequestStub | string) =>
    new URL(typeof request === 'string' ? request : request.url, origin).href
  const fetcher = vi
    .fn<(request: RequestStub) => Promise<Response>>()
    .mockImplementation((request) =>
      Promise.resolve(
        new Response(request.mode === 'navigate' ? 'HTML privado com nonce atual' : 'static', {
          headers: {
            'content-type': request.mode === 'navigate' ? 'text/html' : 'text/javascript',
          },
        }),
      ),
    )
  const storage = {
    keys: () => Promise.resolve([...entries.keys()]),
    delete: (name: string) => Promise.resolve(entries.delete(name)),
    open: (name: string) => {
      const data = entries.get(name) ?? new Map<string, Response>()
      entries.set(name, data)
      return Promise.resolve({
        match: (request: RequestStub | string) => Promise.resolve(data.get(key(request))?.clone()),
        addAll: (paths: string[]) => {
          for (const path of paths)
            data.set(
              key(path),
              new Response(path === '/offline' ? 'Conecte-se para continuar' : 'icon'),
            )
          return Promise.resolve()
        },
        put: (request: RequestStub, response: Response) => {
          data.set(key(request), response)
          return Promise.resolve()
        },
        keys: () => Promise.resolve([...data.keys()].map((url) => ({ url }))),
        delete: (request: RequestStub) => Promise.resolve(data.delete(key(request))),
      })
    },
  }
  const context = createContext({
    URL,
    Headers,
    Response,
    caches: storage,
    fetch: fetcher,
    self: {
      location: { origin },
      clients: { claim: vi.fn().mockResolvedValue(undefined) },
      addEventListener: (name: string, handler: (event: EventStub) => void) => {
        handlers[name] = handler
      },
    },
  })
  new Script(readFileSync('public/service-worker.js', 'utf8')).runInContext(context)
  const dispatch = async (name: string, path = '/', method = 'GET', mode = 'cors') => {
    let pending: Promise<Response> | undefined
    const tasks: Promise<unknown>[] = []
    handlers[name]?.({
      request: { url: new URL(path, origin).href, method, mode },
      respondWith: (response) => {
        pending = response
      },
      waitUntil: (task) => {
        tasks.push(task)
      },
    })
    const response = pending ? await pending : undefined
    await Promise.all(tasks)
    return response
  }
  return { entries, fetcher, dispatch }
}

describe('worker PWA executado com Cache API isolada', () => {
  it('não intercepta RPCs, Auth, dados com query, terceiros ou escritas', async () => {
    const lab = worker()
    for (const path of [
      '/rest/v1/profiles',
      '/auth/v1/token',
      '/api/me',
      '/assets/file.js?token=private',
      'https://backend.example/rest/v1/company',
    ]) {
      expect(await lab.dispatch('fetch', path)).toBeUndefined()
    }
    expect(await lab.dispatch('fetch', '/assets/file.js', 'POST')).toBeUndefined()
    expect(lab.fetcher).not.toHaveBeenCalled()
    expect(lab.entries.size).toBe(0)
  })
  it('consulta HTML de todas as rotas na rede e nunca o guarda', async () => {
    const lab = worker()
    for (const path of ['/', '/admin', '/conta', '/favoritos', '/recuperar-senha']) {
      expect(await (await lab.dispatch('fetch', path, 'GET', 'navigate'))?.text()).toContain(
        'nonce atual',
      )
    }
    expect(lab.fetcher).toHaveBeenCalledTimes(5)
    expect(lab.entries.size).toBe(0)
  })
  it('entrega somente a orientação pública, sem cache HTTP, quando fica offline', async () => {
    const lab = worker()
    await lab.dispatch('install')
    lab.fetcher.mockRejectedValue(new TypeError('offline'))
    const response = await lab.dispatch('fetch', '/admin', 'GET', 'navigate')
    expect(await response?.text()).toBe('Conecte-se para continuar')
    expect(response?.headers.get('cache-control')).toBe('no-store')
    expect(response?.headers.get('x-service-guide-offline')).toBe('true')
  })
  it('reutiliza arquivos estáticos e recusa respostas privadas, HTML ou JSON', async () => {
    const lab = worker()
    await lab.dispatch('fetch', '/assets/app-123.js')
    await lab.dispatch('fetch', '/assets/app-123.js')
    expect(lab.fetcher).toHaveBeenCalledTimes(1)
    const deniedHeaders: HeadersInit[] = [
      { 'content-type': 'text/javascript', 'cache-control': 'private, no-store' },
      { 'content-type': 'text/html' },
      { 'content-type': 'application/json' },
    ]
    for (const [index, headers] of deniedHeaders.entries()) {
      lab.fetcher.mockResolvedValue(new Response('segredo', { headers }))
      await lab.dispatch('fetch', '/assets/private-' + String(index) + '.js')
    }
    const keys = [...lab.entries.values()].flatMap((cache) => [...cache.keys()])
    expect(keys).toHaveLength(1)
    expect(keys[0]).toContain('/assets/app-123.js')
  })
  it('não guarda redirecionamentos ou erros disfarçados de arquivos estáticos', async () => {
    const lab = worker()
    const redirected = new Response('outro domínio', {
      headers: { 'content-type': 'text/javascript' },
    })
    Object.defineProperty(redirected, 'redirected', { value: true })
    lab.fetcher.mockResolvedValue(redirected)
    await lab.dispatch('fetch', '/assets/redirect.js')
    lab.fetcher.mockResolvedValue(
      new Response('erro', {
        status: 403,
        headers: { 'content-type': 'text/javascript' },
      }),
    )
    await lab.dispatch('fetch', '/assets/error.js')
    expect([...lab.entries.values()].flatMap((cache) => [...cache.keys()])).toHaveLength(0)
  })
  it('não usa uma página offline guardada por outro aplicativo', async () => {
    const lab = worker()
    lab.entries.set('other-app', new Map([[origin + '/offline', new Response('HTML de terceiro')]]))
    lab.fetcher.mockRejectedValue(new TypeError('offline'))
    const response = await lab.dispatch('fetch', '/admin', 'GET', 'navigate')
    expect(response?.type).toBe('error')
    expect(await response?.text()).not.toContain('terceiro')
  })
  it('limita armazenamento e remove apenas versões antigas do próprio aplicativo', async () => {
    const lab = worker()
    lab.entries.set('other-app', new Map())
    lab.entries.set('service-guide-pwa-old', new Map())
    await lab.dispatch('install')
    for (let index = 0; index < 80; index++)
      await lab.dispatch('fetch', `/assets/app-${String(index)}.js`)
    await lab.dispatch('activate')
    expect(lab.entries.has('other-app')).toBe(true)
    expect(lab.entries.has('service-guide-pwa-old')).toBe(false)
    const cache = [...lab.entries.entries()].find(([name]) =>
      name.startsWith('service-guide-pwa-'),
    )?.[1]
    expect(cache?.size).toBeLessThanOrEqual(64)
    expect(cache?.has(origin + '/offline')).toBe(true)
  })
})
