import fs from 'node:fs'
import { parseEnv } from 'node:util'
import { Client } from 'pg'

export function labDatabase() {
  const env = parseEnv(fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, ''))
  const url = new URL(env.DATABASE_URL)
  if (
    !url.hostname.includes('taabjnmsaaltsiehywbw') &&
    !decodeURIComponent(url.username).includes('taabjnmsaaltsiehywbw')
  )
    throw new Error('Projeto PostgreSQL inesperado')
  const db = new Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync(
        env.PGSSLROOTCERT || 'supabase/.temp/pgdelta/pgdelta-target-ca.crt',
        'utf8',
      ),
    },
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
  })
  const redact = (error) => {
    let message = String(error.message ?? error)
    for (const value of [
      ...Object.values(env).filter((value) => value.length > 16),
      decodeURIComponent(url.password),
    ])
      message = message.replaceAll(value, '[redacted]')
    return message
  }
  return { db, redact, env }
}
