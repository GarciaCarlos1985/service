// Somente conta marcada e descartável; nunca redefine credenciais de titulares.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { randomUUID, createHmac } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { labDatabase } from './admin-lab-db.mjs'

function totp(secret, seconds = Date.now() / 1000, digits = 6) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let value = 0,
    bits = 0
  const bytes = []
  for (const char of secret.replace(/=/g, '').toUpperCase()) {
    const part = alphabet.indexOf(char)
    assert.ok(part >= 0, 'Base32 inválido')
    value = (value << 5) | part
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 255)
    }
  }
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(seconds / 30)))
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest()
  const offset = digest[19] & 15
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).padStart(digits, '0')
}
assert.equal(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59, 8), '94287082', 'Vetor RFC 6238')
const { db, redact, env } = labDatabase()
const nonce = randomUUID()
const email = `guide-security-${nonce}@example.test`
const password = randomUUID() + '!gA7'
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const privateValues = [email, password]
const report = {}
let id
try {
  await db.connect()
  const settings = await (
    await fetch(env.VITE_SUPABASE_URL + '/auth/v1/settings', {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(15000),
    })
  ).json()
  assert.equal(settings.mailer_autoconfirm, true, 'Não criar fixture se houver envio de e-mail')
  const applied = (
    await db.query(
      "select to_regprocedure('public.guide_admin_reorder(text,uuid[],uuid[],uuid)') is not null as ready",
    )
  ).rows[0].ready
  report.workspaceMigrationActive = applied
  const created = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Teste técnico de segurança',
        phone: '5569999990000',
        security_test: nonce,
        is_admin: true,
      },
    },
  })
  assert.equal(created.error, null, 'Cadastro descartável falhou')
  id = created.data.user.id
  assert.equal(
    (await client.rpc('guide_me')).data.admin,
    false,
    'Metadados não podem conceder papel',
  )
  report.metadataEscalationDenied = true
  const updated = await db.query(
    "update public.profiles set is_admin=true where id=$1 and exists(select 1 from auth.users where id=$1 and raw_user_meta_data->>'security_test'=$2)",
    [id, nonce],
  )
  assert.equal(updated.rowCount, 1, 'Fixture deve ser a única conta promovida')
  for (let cycle = 0; cycle < 3; cycle++) {
    const allowed = await client.rpc('guide_admin_list', { p_section: 'overview' })
    assert.equal(allowed.error, null, 'Admin temporário sem acesso')
    const session = (await client.auth.getSession()).data.session
    privateValues.push(session.access_token, session.refresh_token)
    assert.equal((await client.auth.signOut()).error, null, 'Logout falhou')
    const afterLogout = await fetch(env.VITE_SUPABASE_URL + '/rest/v1/rpc/guide_admin_list', {
      method: 'POST',
      headers: {
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_section: 'overview' }),
      signal: AbortSignal.timeout(15000),
    })
    if (applied) assert.equal(afterLogout.status, 403, 'JWT de sessão encerrada ainda administra')
    else report.beforeMigrationOldTokenStillAccepted = afterLogout.status === 200
    assert.equal(
      (await client.auth.signInWithPassword({ email, password })).error,
      null,
      'Novo login falhou',
    )
  }
  report.loginLogoutReturnCycles = 3
  report.revokedAdminTokenDenied = applied
  const enrolled = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Fixture descartável ' + nonce,
  })
  assert.equal(enrolled.error, null, 'Enroll TOTP falhou')
  privateValues.push(enrolled.data.totp.secret, enrolled.data.totp.qr_code)
  const verify = await client.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code: totp(enrolled.data.totp.secret),
  })
  assert.equal(verify.error, null, 'Verificação TOTP falhou')
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  assert.equal(assurance.data.currentLevel, 'aal2', 'Segundo fator não elevou a sessão')
  assert.equal(
    (await client.rpc('guide_admin_list', { p_section: 'overview' })).error,
    null,
    'Sessão AAL2 deve administrar',
  )
  report.realTotpEnrollmentAndVerification = true
  await client.auth.signOut()
  assert.equal(
    (await client.auth.signInWithPassword({ email, password })).error,
    null,
    'Novo login com MFA falhou',
  )
  const next = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  assert.equal(next.data.currentLevel, 'aal1')
  assert.equal(next.data.nextLevel, 'aal2')
  if (applied)
    assert.equal(
      (await client.rpc('guide_admin_list', { p_section: 'overview' })).error?.code,
      '42501',
      'Login só com senha não pode ignorar MFA ativo',
    )
  report.passwordLoginRequestsSecondFactor = true
  report.noEmailsSent = true
} catch (error) {
  let message = redact(error)
  for (const value of privateValues) if (value) message = message.replaceAll(value, '[redacted]')
  console.error(message)
  process.exitCode = 1
} finally {
  await client.auth.signOut().catch(() => {})
  if (!id) {
    const owned = await db
      .query(
        "select id from auth.users where email=$1 and raw_user_meta_data->>'security_test'=$2",
        [email, nonce],
      )
      .catch(() => ({ rows: [] }))
    assert.ok(owned.rows.length <= 1)
    id = owned.rows[0]?.id
  }
  if (id) {
    try {
      await db.query('begin')
      const owned = await db.query(
        "select id from auth.users where id=$1 and email=$2 and raw_user_meta_data->>'security_test'=$3",
        [id, email, nonce],
      )
      assert.equal(owned.rowCount, 1, 'Limpeza exige identificação exata da fixture')
      await db.query('update public.profiles set is_admin=false where id=$1', [id])
      await db.query('delete from auth.sessions where user_id=$1', [id])
      await db.query(
        "delete from auth.users where id=$1 and raw_user_meta_data->>'security_test'=$2",
        [id, nonce],
      )
      await db.query('commit')
      report.temporaryAccountRemoved = true
    } catch (error) {
      await db.query('rollback').catch(() => {})
      console.error('Falha na limpeza restrita: ' + error.code)
      process.exitCode = 1
    }
  }
  fs.mkdirSync('.wrangler', { recursive: true })
  fs.writeFileSync('.wrangler/auth-security-verification.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  await db.end()
}
