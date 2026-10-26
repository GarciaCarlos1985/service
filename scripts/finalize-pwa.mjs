// Versiona o worker pelos arquivos públicos do build, sem ler variáveis ou credenciais.
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'

const client = 'dist/client'
const source = await fs.readFile(client + '/service-worker.js', 'utf8')
if (!source.includes('__PWA_REVISION__')) throw new Error('Worker PWA sem marcador de revisão.')
const hash = createHash('sha256').update(source)
for (const file of ['manifest.webmanifest', 'offline.html'])
  hash.update(await fs.readFile(client + '/' + file))
for (const file of (await fs.readdir(client + '/app-icons')).sort())
  hash.update(await fs.readFile(client + '/app-icons/' + file))
hash.update((await fs.readdir(client + '/assets')).sort().join('\n'))
const revision = hash.digest('hex').slice(0, 16)
await fs.writeFile(client + '/service-worker.js', source.replaceAll('__PWA_REVISION__', revision))
console.log('PWA: worker versionado ' + revision + '; cache somente de arquivos estáticos.')
