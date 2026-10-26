// Verifica o artefato servido pelo Worker, sem sessão de usuário ou credenciais.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const base = new URL(process.argv[2] || 'http://127.0.0.1:3011')
assert(base.protocol === 'https:' || ['127.0.0.1', 'localhost'].includes(base.hostname))
const results = []
async function get(path, mime) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200, path + ': HTTP 200')
  assert(response.headers.get('content-type')?.includes(mime), path + ': MIME correto')
  results.push({ path, status: response.status, contentType: response.headers.get('content-type') })
  return response
}

const installPage = await get('/instalar', 'text/html')
const installNonce = /'nonce-([^']+)'/.exec(
  installPage.headers.get('content-security-policy') || '',
)?.[1]
assert(installNonce, 'página de instalação preserva CSP com nonce')
const page = await installPage.text()
assert(page.includes('nonce="' + installNonce + '"'), 'scripts recebem o nonce da resposta')
assert(page.includes('Seu guia, a um toque.'))
assert(page.includes('No iPhone ou iPad') && page.includes('No Android'))
assert(page.includes('rel="manifest"') && page.includes('apple-touch-icon'))
const response = await get('/manifest.webmanifest', 'application/manifest+json')
assert(response.headers.get('cache-control')?.includes('must-revalidate'))
const manifest = await response.json()
assert.equal(manifest.id, '/')
assert.equal(manifest.start_url, '/')
assert.equal(manifest.scope, '/')
assert.equal(manifest.display, 'standalone')
assert.equal(manifest.lang, 'pt-BR')
assert.equal(manifest.name, 'Service Guide')
assert(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'))
assert(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'))
for (const icon of manifest.icons) {
  assert.equal(new URL(icon.src, base).origin, base.origin)
  const bytes = Buffer.from(await (await get(icon.src, 'image/png')).arrayBuffer())
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(bytes.readUInt32BE(16) + 'x' + bytes.readUInt32BE(20), icon.sizes)
}
const appleIcon = Buffer.from(
  await (await get('/app-icons/apple-touch-icon.png', 'image/png')).arrayBuffer(),
)
assert.equal(appleIcon.readUInt32BE(16), 180)
assert.equal(appleIcon.readUInt32BE(20), 180)
const worker = await get('/service-worker.js', 'javascript')
assert(worker.headers.get('cache-control')?.includes('must-revalidate'))
const source = await worker.text()
assert(!source.includes('__PWA_REVISION__'), 'worker passou pela revisão do build')
assert(!source.includes('skipWaiting'), 'atualização preserva formulários em uso')
const offline = await get('/offline', 'text/html')
assert(!offline.redirected, 'tela offline servida pelo endereço canônico, sem redirecionamento')
assert(offline.headers.get('content-security-policy')?.includes("default-src 'none'"))
assert((await offline.text()).includes('Conecte-se para continuar'))
const links = await (await get('/.well-known/assetlinks.json', 'application/json')).json()
assert(
  links.some(
    (link) =>
      link.target.package_name === 'dev.serviceguide.cacoal' &&
      link.relation.includes('delegate_permission/common.handle_all_urls') &&
      link.target.sha256_cert_fingerprints.every((fingerprint) =>
        /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint),
      ),
  ),
)
const admin = await get('/admin', 'text/html')
assert(admin.headers.get('cache-control')?.includes('no-store'))
const adminNonce = /'nonce-([^']+)'/.exec(admin.headers.get('content-security-policy') || '')?.[1]
assert(adminNonce && adminNonce !== installNonce, 'nonce novo por resposta')
const receipt = {
  testedAt: new Date().toISOString(),
  base: base.origin,
  results,
  passed: true,
  browserInstallationTested: false,
  realDeviceTested: false,
}
await fs.mkdir('.wrangler', { recursive: true })
await fs.writeFile('.wrangler/install-http-receipt.json', JSON.stringify(receipt, null, 2) + '\n')
console.log(
  'PASS: ' +
    results.length +
    ' respostas HTTP, manifesto, PNGs, worker versionado, associação Android e no-store administrativo.',
)
