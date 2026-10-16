/* Runner das suítes de testes SQL contra o banco real.
   Uso: node scripts/sql-tests.mjs <caminho-do-arquivo-sql>
   Lê DATABASE_URL do .env.local. Nunca imprime a senha. */
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { Client } from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/sql-tests.mjs <arquivo.sql>')
  process.exit(1)
}

const env = parseEnv(readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, ''))
if (!env.DATABASE_URL) {
  console.error('DATABASE_URL não encontrado no .env.local')
  process.exit(1)
}
const databaseUrl = new URL(env.DATABASE_URL)
const certificatePath =
  process.env.PGSSLROOTCERT || env.PGSSLROOTCERT || 'supabase/.temp/pgdelta/pgdelta-target-ca.crt'
const ca = existsSync(certificatePath) ? readFileSync(certificatePath, 'utf8') : undefined

const client = new Client({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 5432),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: decodeURIComponent(databaseUrl.pathname.slice(1)),
  ssl: { rejectUnauthorized: true, ca },
  connectionTimeoutMillis: 15000,
  query_timeout: 60000,
})
const notices = []
client.on('notice', (msg) => notices.push(msg.message))

async function main() {
  await client.connect()

  const info = await client.query('select current_user as role, current_database() as db')
  console.log(`Conectado: role=${info.rows[0].role} db=${info.rows[0].db}`)
  console.log(`Executando: ${file}`)

  const sql = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  // Mesmo as suítes legadas com limpeza ampla não podem persistir mudanças.
  await client.query('begin')
  await client.query("set local lock_timeout = '5s'; set local statement_timeout = '45s'")
  await client.query(sql)
  await client.query('rollback')

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
  await client.query('rollback').catch(() => {})
  const message = String(err.message)
    .replaceAll(env.DATABASE_URL, '[redacted]')
    .replaceAll(decodeURIComponent(databaseUrl.password), '[redacted]')
  console.error('ERRO:', message)
  await client.end().catch(() => {})
  process.exit(1)
})
