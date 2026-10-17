// Prévia por padrão. --apply é reservado à publicação revisada pelo responsável.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { parseEnv } from 'node:util'

const env = parseEnv(fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, ''))
const project = 'taabjnmsaaltsiehywbw'
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, project + '.supabase.co')
assert.ok(env.SUPABASE_ACCESS_TOKEN, 'Token de configuração do Supabase ausente.')
const args = process.argv.slice(2)
assert.ok(
  args.every((arg) => arg === '--apply'),
  'Use sem argumentos para conferir ou --apply após revisão.',
)
const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`
const headers = {
  Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN,
  'Content-Type': 'application/json',
}
async function read() {
  const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 200, 'Não foi possível ler a configuração Auth autorizada.')
  return response.json()
}
try {
  const before = await read()
  const minimum = Math.max(12, Number(before.password_min_length) || 0)
  const report = {
    project,
    applied: false,
    passwordMinimum: { before: before.password_min_length, after: minimum },
    mailerAutoConfirm: before.mailer_autoconfirm,
    customSmtpConfigured: !!before.smtp_host,
    captchaEnabled: before.security_captcha_enabled,
    leakedPasswordProtection: before.password_hibp_enabled,
    currentPasswordsChanged: false,
  }
  if (args.includes('--apply')) {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ password_min_length: minimum }),
      signal: AbortSignal.timeout(20000),
    })
    assert.ok(response.ok, 'Falha ao aplicar o mínimo de senha; confira a configuração no painel.')
    const after = await read()
    assert.equal(after.password_min_length, minimum)
    for (const key of [
      'site_url',
      'uri_allow_list',
      'mailer_autoconfirm',
      'external_email_enabled',
      'external_google_enabled',
      'security_captcha_enabled',
      'refresh_token_rotation_enabled',
    ])
      assert.deepEqual(after[key], before[key], 'Configuração não solicitada alterada: ' + key)
    report.applied = true
  }
  console.log(JSON.stringify(report))
} catch (error) {
  const message =
    error instanceof assert.AssertionError ? error.message : 'Falha de conexão ao conferir Auth.'
  console.error(message)
  process.exitCode = 1
}
