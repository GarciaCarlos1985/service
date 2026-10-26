import { describe, expect, it } from 'vitest'
import { secureHeaders } from './response-headers'
describe('proteção HTTP', () => {
  it('isola scripts pelo nonce e permite apenas o backend configurado', () => {
    const result = secureHeaders(
      new Headers({ 'x-test': 'preserved' }),
      'nonce123',
      'https://example.supabase.co',
      '/admin',
      true,
    )
    expect(result.get('content-security-policy')).toContain("script-src 'self' 'nonce-nonce123'")
    expect(result.get('content-security-policy')).toContain(
      "connect-src 'self' https://example.supabase.co wss://example.supabase.co",
    )
    expect(result.get('content-security-policy')).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(result.get('content-security-policy')).toContain(
      "frame-src 'self' https://challenges.cloudflare.com",
    )
    expect(result.get('content-security-policy')).toContain(
      "script-src 'self' 'nonce-nonce123' https://challenges.cloudflare.com",
    )
    expect(result.get('content-security-policy')).toContain(
      'wss://example.supabase.co https://challenges.cloudflare.com',
    )
    expect(result.get('cache-control')).toContain('no-store')
    expect(result.get('x-frame-options')).toBe('DENY')
    expect(result.get('x-test')).toBe('preserved')
    expect(result.get('content-security-policy')).toContain("worker-src 'self'")
    expect(result.get('content-security-policy')).toContain("manifest-src 'self'")
  })
  it('revalida os arquivos de controle PWA sem liberar cache de HTML privado', () => {
    for (const path of [
      '/service-worker.js',
      '/manifest.webmanifest',
      '/offline',
      '/offline.html',
    ]) {
      const result = secureHeaders(
        new Headers(),
        'nonce789',
        'https://example.supabase.co',
        path,
        true,
      )
      expect(result.get('cache-control')).toContain('must-revalidate')
    }
    expect(
      secureHeaders(new Headers(), 'nonce789', 'https://example.supabase.co', '/admin', true).get(
        'cache-control',
      ),
    ).toContain('no-store')
  })
  it('preserva cookies e cache público sem forçar HSTS no laboratório local', () => {
    const original = new Headers({
      'set-cookie': 'test=value; HttpOnly',
      'cache-control': 'public,max-age=30',
    })
    const result = secureHeaders(original, 'nonce456', 'http://127.0.0.1:3004', '/', false)
    expect(result.get('set-cookie')).toBe(original.get('set-cookie'))
    expect(result.get('cache-control')).toBe('public,max-age=30')
    expect(result.has('strict-transport-security')).toBe(false)
  })
})
