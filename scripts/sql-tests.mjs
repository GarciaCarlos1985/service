/* Runner das suítes de testes SQL contra o banco real.
   Uso: node scripts/sql-tests.mjs <caminho-do-arquivo-sql>
   Lê DATABASE_URL do .env.local. Nunca imprime a senha. */
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/sql-tests.mjs <arquivo.sql>')
  process.exit(1)
}

const envFile = readFileSync('.env.local', 'utf8')
const match = envFile.match(/^DATABASE_URL=(.+)$/m)
if (!match) {
  console.error('DATABASE_URL não encontrado no .env.local')
  process.exit(1)
}
const databaseUrl = match[1].trim().replace(/^"|"$/g, '')

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
const notices = []
client.on('notice', (msg) => notices.push(msg.message))

async function main() {
  await client.connect()

  const info = await client.query('select current_user as role, current_database() as db')
  console.log(`Conectado: role=${info.rows[0].role} db=${info.rows[0].db}`)
  console.log(`Executando: ${file}`)

  const sql = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  await client.query(sql)

  console.log('\n=== NOTICES ===')
  for (const n of notices) console.log(n)

  const passed = notices.some((n) => n.includes('TODOS OS TESTES PASSARAM'))
  const failed = notices.filter((n) => n.includes('FALHOU'))
  console.log(
    `\nRESULTADO: ${passed ? 'TODOS OS TESTES PASSARAM' : 'FALHAS ENCONTRADAS'}${
      failed.length ? ` (${failed.length} falhas)` : ''
    }`,
  )

  await client.end()
  process.exit(passed && failed.length === 0 ? 0 : 1)
}

main().catch(async (err) => {
  console.error('ERRO:', err.message)
  await client.end().catch(() => {})
  process.exit(1)
})
