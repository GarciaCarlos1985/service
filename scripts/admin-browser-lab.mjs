// Laboratório local: SQL real em PGlite; Auth/Storage REST simulados, sem acesso ao projeto remoto.
import fs from 'node:fs'
import http from 'node:http'
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'

const envPath = '.env.e2e.local'
const envText =
  'VITE_SUPABASE_URL=http://127.0.0.1:3004\nVITE_SUPABASE_ANON_KEY=sb_publishable_service_guide_local_lab\n'
assert.ok(
  !fs.existsSync(envPath),
  'Preserve o arquivo e2e existente antes de iniciar outro laboratório.',
)
const secret = randomBytes(32)
const accounts = new Map()
const refreshTokens = new Map()
const uploads = new Map()
const db = new PGlite({ extensions: { pg_trgm, pgcrypto, btree_gist } })
const counters = { logins: 0, logouts: 0, writes: 0, requests: 0, denied: 0 }
let queue = Promise.resolve()
const serial = (operation) => {
  const result = queue.then(operation)
  queue = result.catch(() => {})
  return result
}
await db.exec(fs.readFileSync('scripts/admin-lab-schema.sql', 'utf8'))
for (const file of fs
  .readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .sort())
  await db.exec(fs.readFileSync('supabase/migrations/' + file, 'utf8'))
// Somente o simulador usa HTTP loopback. A migração e os testes SQL reais mantêm HTTPS obrigatório.
await db.exec(
  "alter table public.company_media drop constraint company_media_url_check; alter table public.company_media add constraint company_media_url_check check (url ~ '^https://' or url like 'http://127.0.0.1:3004/storage/v1/object/public/guide-media/%')",
)
for (const [kind, name, admin] of [
  ['admin', 'Admin do laboratório', true],
  ['consumer', 'Consumidor de laboratório', false],
]) {
  const user = {
    id: randomUUID(),
    email: `lab-${kind}@example.test`,
    name,
    admin,
    password: randomBytes(20).toString('hex'),
  }
  accounts.set(user.email, user)
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3::jsonb)', [
    user.id,
    user.email,
    JSON.stringify({ full_name: name, phone: '5569999990000' }),
  ])
  await db.query('update public.profiles set is_admin=$2 where id=$1', [user.id, admin])
}
const admin = accounts.get('lab-admin@example.test')
const sessionId = randomUUID()
await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [sessionId, admin.id])
const fixtureClaims = {
  sub: admin.id,
  session_id: sessionId,
  email: admin.email,
  role: 'authenticated',
  aal: 'aal1',
  amr: [{ method: 'password', timestamp: Math.floor(Date.now() / 1000) }],
}
const category = randomUUID(),
  neighborhood = randomUUID()
const city = (await db.query("select id from public.cities where ibge_code='1100049'")).rows[0].id
const plan = (await db.query("select id from public.plans where (features->>'featured')::boolean"))
  .rows[0].id
await db.query(
  "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
  [admin.id, JSON.stringify(fixtureClaims)],
)
await db.query('select public.guide_admin_save($1,$2::jsonb)', [
  'category',
  JSON.stringify({
    id: category,
    name: 'Casa e construção — teste',
    slug: 'construcao-teste',
    icon: 'House',
  }),
])
await db.query('select public.guide_admin_save($1,$2::jsonb)', [
  'category',
  JSON.stringify({ name: 'Beleza e cuidados — teste', slug: 'beleza-teste', icon: 'Scissors' }),
])
await db.query('select public.guide_admin_save($1,$2::jsonb)', [
  'neighborhood',
  JSON.stringify({ id: neighborhood, name: 'Centro (laboratório)', city_id: city }),
])
for (const name of [
  'Casa & Cor — teste local',
  'Ateliê do Corte — teste local',
  'Conecta Tech — teste local',
]) {
  const id = randomUUID()
  await db.query('select public.guide_admin_save($1,$2::jsonb)', [
    'company',
    JSON.stringify({
      id,
      name,
      slug: 'empresa-' + id,
      description: 'Empresa fictícia, visível somente no laboratório local de testes.',
      category_id: category,
      city_id: city,
      neighborhood_id: neighborhood,
      phone: '5569999990000',
      plan_id: plan,
      status: 'active',
    }),
  ])
  for (const [type, item] of [
    ['product', 'Tinta emborrachada'],
    ['service', 'Pintura profissional'],
  ])
    await db.query('select public.guide_admin_save($1,$2::jsonb)', [
      'item',
      JSON.stringify({
        company_id: id,
        category_id: category,
        name: item + ' — teste',
        description: 'Item fictício para validar o cadastro.',
        type,
        price_cents: 4590,
        available: true,
      }),
    ])
}
await db.exec('reset role')
const jwt = (claims) => {
  const parts = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
  ]
  return [...parts, createHmac('sha256', secret).update(parts.join('.')).digest('base64url')].join(
    '.',
  )
}
const decode = (authorization) => {
  const token = String(authorization || '').replace(/^Bearer /, '')
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const signature = createHmac('sha256', secret).update(parts.slice(0, 2).join('.')).digest()
  const actual = Buffer.from(parts[2], 'base64url')
  if (signature.length !== actual.length || !timingSafeEqual(signature, actual)) return null
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return claims.exp > Date.now() / 1000 ? claims : null
  } catch {
    return null
  }
}
async function userData(id) {
  const user = [...accounts.values()].find((user) => user.id === id)
  const factors = (
    await db.query(
      'select id,status,factor_type,friendly_name,created_at,updated_at from auth.mfa_factors where user_id=$1',
      [id],
    )
  ).rows
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: user.name },
    factors,
    created_at: new Date().toISOString(),
  }
}
async function session(user, sid, aal = 'aal1') {
  const refresh = randomUUID()
  refreshTokens.set(refresh, { uid: user.id, sid, aal })
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: jwt({
      sub: user.id,
      session_id: sid,
      role: 'authenticated',
      aud: 'authenticated',
      email: user.email,
      aal,
      iat: now,
      exp: now + 3600,
      amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: now }],
    }),
    refresh_token: refresh,
    expires_in: 3600,
    token_type: 'bearer',
    user: await userData(user.id),
  }
}
const rpcArguments = {
  guide_me: [],
  guide_search: [['filters', 'jsonb']],
  guide_company_by_slug: [
    ['p_city_slug', 'text'],
    ['p_company_slug', 'text'],
  ],
  guide_admin_list: [
    ['p_section', 'text'],
    ['p_page', 'integer'],
    ['p_query', 'text'],
    ['p_company_id', 'uuid'],
    ['p_days', 'integer'],
  ],
  guide_admin_save: [
    ['p_action', 'text'],
    ['payload', 'jsonb'],
  ],
  guide_admin_company: [['p_id', 'uuid']],
  guide_admin_order: [
    ['p_scope', 'text'],
    ['p_company_id', 'uuid'],
  ],
  guide_admin_reorder: [
    ['p_scope', 'text'],
    ['p_order', 'uuid[]'],
    ['p_expected', 'uuid[]'],
    ['p_company_id', 'uuid'],
  ],
  guide_admin_set_role: [
    ['p_user_id', 'uuid'],
    ['p_admin', 'boolean'],
  ],
  guide_presentation: [],
  guide_update_profile: [['payload', 'jsonb']],
  guide_toggle_favorite: [['payload', 'jsonb']],
  guide_review: [['payload', 'jsonb']],
  guide_support: [['payload', 'jsonb']],
  guide_contact: [['payload', 'jsonb']],
  guide_event: [['payload', 'jsonb']],
}
async function body(request, limit = 65536) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error('Payload excedeu o limite do laboratório')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
async function handle(request, response) {
  counters.requests++
  const origin = request.headers.origin
  if (origin && !['http://localhost:3002', 'http://127.0.0.1:3002'].includes(origin)) {
    response.writeHead(403)
    response.end()
    return
  }
  response.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3002')
  response.setHeader(
    'Access-Control-Allow-Headers',
    'authorization,apikey,content-type,content-profile,accept-profile,x-client-info,x-supabase-api-version,prefer,x-upsert,cache-control',
  )
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }
  const url = new URL(request.url, 'http://127.0.0.1:3004')
  const claims = decode(request.headers.authorization)
  const json = (value, status = 200) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(value))
  }
  if (url.pathname === '/__lab/status') {
    json({ localOnly: true, ...counters })
    return
  }
  if (url.pathname === '/__lab/stop' && request.method === 'POST') {
    response.on('finish', () => {
      void stop()
    })
    json({ stopping: true })
    return
  }
  await db.exec('begin')
  try {
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
      [claims?.sub || '', JSON.stringify(claims || { role: 'anon' })],
    )
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.slice('/rest/v1/rpc/'.length)
      const args = rpcArguments[name]
      if (!args) {
        json({ code: 'PGRST202', message: 'RPC indisponível no laboratório' }, 404)
        await db.exec('rollback')
        return
      }
      const input = JSON.parse((await body(request)).toString() || '{}')
      await db.exec(claims ? 'set local role authenticated' : 'set local role anon')
      const values = args.map(([key, type]) =>
        type === 'jsonb' ? JSON.stringify(input[key] ?? {}) : (input[key] ?? null),
      )
      const defaults = { p_section: 'overview', p_page: 1, p_query: '', p_days: 7 }
      args.forEach(([key], index) => {
        if (values[index] === null && key in defaults) values[index] = defaults[key]
      })
      const signature = args.map(([, type], index) => `$${index + 1}::${type}`).join(',')
      const result = await db.query(`select public.${name}(${signature}) as value`, values)
      if (name.includes('save') || name.includes('reorder') || name.includes('set_role'))
        counters.writes++
      await db.exec('commit')
      json(result.rows[0].value)
      return
    }
    if (url.pathname === '/auth/v1/token') {
      const input = JSON.parse((await body(request)).toString() || '{}')
      let user,
        sid,
        aal = 'aal1'
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const refresh = refreshTokens.get(input.refresh_token)
        if (
          refresh &&
          (await db.query('select id from auth.sessions where id=$1', [refresh.sid])).rows.length
        ) {
          user = [...accounts.values()].find((user) => user.id === refresh.uid)
          sid = refresh.sid
          aal = refresh.aal
        }
      } else {
        user = accounts.get(input.email)
        if (user?.password !== input.password) user = null
        if (user) {
          sid = randomUUID()
          await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [sid, user.id])
        }
      }
      if (!user) {
        await db.exec('rollback')
        counters.denied++
        json({ error_code: 'invalid_credentials', msg: 'Credenciais incorretas.' }, 400)
        return
      }
      counters.logins++
      const result = await session(user, sid, aal)
      await db.exec('commit')
      json(result)
      return
    }
    if (url.pathname === '/auth/v1/settings') {
      await db.exec('commit')
      json({ mailer_autoconfirm: true, external: { email: true } })
      return
    }
    if (url.pathname === '/auth/v1/recover') {
      await body(request)
      await db.exec('commit')
      json({})
      return
    }
    if (
      url.pathname.startsWith('/auth/') &&
      (!claims ||
        !(
          await db.query('select id from auth.sessions where id=$1 and user_id=$2', [
            claims.session_id,
            claims.sub,
          ])
        ).rows.length)
    ) {
      await db.exec('rollback')
      json({ msg: 'Sessão encerrada.', code: 'session_not_found' }, 401)
      return
    }
    if (url.pathname === '/auth/v1/user' && request.method === 'GET') {
      const result = await userData(claims.sub)
      await db.exec('commit')
      json(result)
      return
    }
    if (url.pathname === '/auth/v1/logout') {
      await db.query('delete from auth.sessions where user_id=$1', [claims.sub])
      counters.logouts++
      await db.exec('commit')
      json({})
      return
    }
    if (url.pathname === '/auth/v1/user' && request.method === 'PUT') {
      const input = JSON.parse((await body(request)).toString())
      const user = [...accounts.values()].find((user) => user.id === claims.sub)
      if (input.password) user.password = input.password
      const result = await userData(claims.sub)
      await db.exec('commit')
      json(result)
      return
    }
    if (url.pathname.startsWith('/storage/v1/object/public/')) {
      await db.exec('commit')
      const image = uploads.get(
        decodeURIComponent(url.pathname.slice('/storage/v1/object/public/guide-media/'.length)),
      )
      if (image) {
        response.writeHead(200, { 'content-type': image.type })
        response.end(image.bytes)
      } else json({ message: 'Imagem de laboratório indisponível' }, 404)
      return
    }
    if (url.pathname.startsWith('/storage/v1/object/guide-media/') && request.method === 'POST') {
      const name = decodeURIComponent(url.pathname.slice('/storage/v1/object/guide-media/'.length))
      const data = await body(request, 5 * 1024 * 1024 + 10000)
      const parsed = await new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'Content-Type': request.headers['content-type'] },
        body: data,
      }).formData()
      const file = [...parsed.values()].find((value) => value instanceof File)
      if (
        !file ||
        file.size > 5242880 ||
        !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)
      )
        throw new Error('Imagem inválida')
      await db.exec(claims ? 'set local role authenticated' : 'set local role anon')
      await db.query('insert into storage.objects(bucket_id,name,owner_id) values($1,$2,$3)', [
        'guide-media',
        name,
        claims?.sub,
      ])
      uploads.set(name, { type: file.type, bytes: Buffer.from(await file.arrayBuffer()) })
      await db.exec('commit')
      json({ Key: 'guide-media/' + name, Id: randomUUID() })
      return
    }
    if (url.pathname === '/storage/v1/object/guide-media' && request.method === 'DELETE') {
      const input = JSON.parse((await body(request)).toString())
      await db.exec(claims ? 'set local role authenticated' : 'set local role anon')
      for (const prefix of input.prefixes || []) {
        await db.query('delete from storage.objects where bucket_id=$1 and name=$2', [
          'guide-media',
          prefix,
        ])
        uploads.delete(prefix)
      }
      await db.exec('commit')
      json([])
      return
    }
    await db.exec('rollback')
    json({ message: 'Endpoint não simulado', path: url.pathname }, 501)
  } catch (error) {
    await db.exec('rollback').catch(() => {})
    counters.denied++
    json(
      { code: error.code || 'P0001', message: error.message, hint: error.hint },
      error.code === '42501' ? 403 : 400,
    )
  }
}
const server = http.createServer((request, response) => {
  void serial(() => handle(request, response)).catch(() => {
    if (!response.headersSent) response.writeHead(500)
    response.end()
  })
})
fs.writeFileSync(envPath, envText)
fs.mkdirSync('.wrangler', { recursive: true })
fs.writeFileSync(
  '.wrangler/admin-lab-browser.json',
  JSON.stringify({ accounts: Object.fromEntries(accounts), api: 'http://127.0.0.1:3004' }),
)
server.listen(3004, '127.0.0.1', () =>
  console.log(
    'Laboratório local em http://127.0.0.1:3004. Sem conexão ao Supabase remoto. Credenciais descartáveis em arquivo local ignorado.',
  ),
)
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  server.close()
  await queue
  await db.close()
  if (fs.existsSync(envPath) && fs.readFileSync(envPath, 'utf8') === envText) fs.unlinkSync(envPath)
  fs.writeFileSync(
    '.wrangler/admin-browser-lab-result.json',
    JSON.stringify({ ...counters, disposed: true }, null, 2),
  )
  console.log(JSON.stringify({ ...counters, disposed: true }))
  process.exit(0)
}
process.on('SIGINT', () => {
  void stop()
})
process.on('SIGTERM', () => {
  void stop()
})
