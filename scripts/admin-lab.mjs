// Ensaio transacional: aplica a migração e as suítes apenas nesta conexão, sempre com rollback.
import fs from 'node:fs'
import { labDatabase } from './admin-lab-db.mjs'

const { db, redact } = labDatabase()
const failures = []
try {
  await db.connect()
  db.on('notice', (notice) => {
    if (notice.message.startsWith('FALHOU:')) failures.push(notice.message)
    if (notice.message.startsWith('OK:') || notice.message.includes('TODOS OS TESTES PASSARAM'))
      console.log(notice.message)
  })
  await db.query('begin')
  await db.query("set local lock_timeout='5s'")
  const exists = await db.query(
    "select to_regprocedure('public.guide_admin_reorder(text,uuid[],uuid[],uuid)') is not null as applied",
  )
  if (!exists.rows[0].applied)
    await db.query(
      fs.readFileSync('supabase/migrations/20261016194717_guide_admin_workspace.sql', 'utf8'),
    )
  const customization = await db.query(
    "select to_regprocedure('public.guide_showcase()') is not null as applied",
  )
  if (!customization.rows[0].applied)
    await db.query(
      fs.readFileSync('supabase/migrations/20261017005400_guide_site_customization.sql', 'utf8'),
    )
  for (const file of [
    'rls-security.sql',
    'ledger-tests.sql',
    'chat-tests.sql',
    'reviews-tests.sql',
  ]) {
    await db.query('savepoint legacy_suite')
    await db.query(fs.readFileSync('supabase/tests/' + file, 'utf8').replace(/^\uFEFF/, ''))
    if (failures.length) throw new Error(failures.join('\n'))
    await db.query('rollback to savepoint legacy_suite')
    console.log('OK: regressão legada ' + file)
  }
  await db.query(fs.readFileSync('supabase/tests/guide-commercial.sql', 'utf8'))
  if (fs.existsSync('supabase/tests/guide-admin-workspace.sql'))
    await db.query(fs.readFileSync('supabase/tests/guide-admin-workspace.sql', 'utf8'))
  await db.query(fs.readFileSync('supabase/tests/guide-site-customization.sql', 'utf8'))
  console.log('Ensaio aprovado. Alterações e fixtures revertidas por rollback.')
} catch (error) {
  console.error(redact(error))
  if (error.position) console.error('Posição SQL: ' + error.position)
  process.exitCode = 1
} finally {
  await db.query('rollback').catch(() => {})
  await db.end()
}
