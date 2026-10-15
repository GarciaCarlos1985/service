import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { searchResultSchema, viewerSchema } from './types'
import { adminSections, adminSnapshotSchema } from './admin'

const ADMIN = '10000000-0000-4000-8000-000000000001'
const USER = '10000000-0000-4000-8000-000000000002'
const OTHER = '10000000-0000-4000-8000-000000000003'
const CATEGORY = '20000000-0000-4000-8000-000000000001'
const NEIGHBORHOOD = '20000000-0000-4000-8000-000000000002'
const COMPANY = '30000000-0000-4000-8000-000000000001'
const DRAFT = '30000000-0000-4000-8000-000000000002'
const PRODUCT = '40000000-0000-4000-8000-000000000001'
const db = new PGlite({ extensions: { pg_trgm, pgcrypto, btree_gist } })
let city = 0
let plan = ''

async function identity(id: string | null) {
  await db.exec('reset role')
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
    [id ?? '', JSON.stringify({ sub: id, email: id ? 'consumer@example.test' : '' })],
  )
  await db.exec(id ? 'set local role authenticated' : 'set local role anon')
}
async function rpc(name: string, value: unknown = {}) {
  const result = await db.query<{ result: unknown }>(`select public.${name}($1::jsonb) as result`, [
    JSON.stringify(value),
  ])
  return result.rows[0]?.result
}
async function save(action: string, value: unknown) {
  return db.query('select public.guide_admin_save($1,$2::jsonb)', [action, JSON.stringify(value)])
}

describe('commercial foundation on isolated PostgreSQL', () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      grant usage on schema auth,public to anon,authenticated;
      create publication supabase_realtime;
    `)
    const migrationRoot = resolve('supabase/migrations')
    for (const file of readdirSync(migrationRoot)
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      await db.exec(readFileSync(resolve(migrationRoot, file), 'utf8'))
    }
    for (const id of [ADMIN, USER, OTHER])
      await db.query(
        'insert into auth.users(id,email,raw_user_meta_data) values($1,$2,\'{"full_name":"Usuário de teste"}\')',
        [id, `${id}@example.test`],
      )
    await db.query('update public.profiles set is_admin=true where id=$1', [ADMIN])
    city =
      (await db.query<{ id: number }>("select id from public.cities where ibge_code='1100049'"))
        .rows[0]?.id ?? 0
    plan =
      (
        await db.query<{ id: string }>(
          "select id from public.plans where not (features->>'featured')::boolean",
        )
      ).rows[0]?.id ?? ''
    if (!city || !plan)
      throw new Error('Canonical location and plans must exist in the test fixture.')
    await db.exec('begin')
    await identity(ADMIN)
    await save('category', {
      id: CATEGORY,
      name: 'Categoria de teste',
      slug: 'categoria-teste',
      icon: 'House',
    })
    await save('neighborhood', { id: NEIGHBORHOOD, name: 'Bairro de teste', city_id: city })
    const company = {
      name: 'Empresa de teste',
      slug: 'empresa-teste',
      description: 'Empresa fictícia para testes isolados.',
      category_id: CATEGORY,
      city_id: city,
      neighborhood_id: NEIGHBORHOOD,
      phone: '5569999990000',
      plan_id: plan,
      status: 'active',
    }
    await save('company', { ...company, id: COMPANY })
    await save('company', {
      ...company,
      id: DRAFT,
      name: 'Rascunho de teste',
      slug: 'rascunho-teste',
      status: 'inactive',
    })
    await save('item', {
      id: PRODUCT,
      company_id: COMPANY,
      category_id: CATEGORY,
      name: 'Tinta emborrachada',
      description: 'Produto fictício para testar busca.',
      type: 'product',
      price_cents: 4550,
      available: true,
    })
    await db.exec('commit; reset role')
  }, 60000)
  beforeEach(async () => {
    await db.exec('begin')
  })
  afterEach(async () => {
    await db.exec('rollback; reset role')
  })
  afterAll(async () => {
    await db.close()
  })

  it('preserves legacy contracts and enables RLS on every new table', async () => {
    const legacy = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema='public' and table_name='services'",
    )
    expect(legacy.rows.map((row) => row.column_name)).toContain('professional_id')
    const exposed = await db.query<{ name: string }>(
      "select relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    )
    expect(exposed.rows).toEqual([])
  })
  it('finds a company by its product and keeps drafts private', async () => {
    await identity(null)
    const data = searchResultSchema.parse(await rpc('guide_search', { q: 'tinta emborrachada' }))
    expect(data.companies.map((company) => company.id)).toEqual([COMPANY])
    expect(data.offerings[0]?.price).toBe(45.5)
    expect(data.companies.some((company) => company.id === DRAFT)).toBe(false)
  })

  it('applies item type and query to the same offering', async () => {
    await identity(ADMIN)
    await save('item', {
      company_id: COMPANY,
      category_id: CATEGORY,
      name: 'Eletricista residencial',
      description: 'Serviço fictício para testar filtros.',
      type: 'service',
      available: true,
    })
    await identity(null)
    const result = searchResultSchema.parse(
      await rpc('guide_search', { q: 'tinta emborrachada', kind: 'service' }),
    )
    expect(result.companies).toEqual([])
  })

  it('paginates a larger result set with a complete total', async () => {
    await db.query(
      "insert into public.companies(name,slug,description,category_id,city_id,neighborhood_id,phone,status) select 'Empresa laboratorial '||n,'laboratorio-'||n,'Empresa fictícia do laboratório isolado.',$1,$2,$3,'5569999990000','active' from generate_series(1,30) n",
      [CATEGORY, city, NEIGHBORHOOD],
    )
    await identity(null)
    const result = searchResultSchema.parse(await rpc('guide_search', { page: 2, pageSize: 24 }))
    expect(result.pagination).toEqual({ page: 2, pageSize: 24, total: 31, pages: 2 })
    expect(result.companies).toHaveLength(7)
  })

  it('keeps private database helpers inaccessible', async () => {
    await identity(null)
    await expect(db.query("select guide_private.catalog('{}'::uuid[])")).rejects.toThrow(
      /permission denied/i,
    )
  })

  it('does not allow a public filter to request administrative data', async () => {
    await identity(null)
    const result = searchResultSchema.parse(
      await rpc('guide_search', { companyId: DRAFT, administrative: true }),
    )
    expect(result.companies).toEqual([])
  })
  it('bounds pagination and does not silently truncate the total', async () => {
    await identity(null)
    const data = searchResultSchema.parse(await rpc('guide_search', { pageSize: 10000, page: 999 }))
    expect(data.pagination).toEqual({ page: 1, pageSize: 24, total: 1, pages: 1 })
  })
  it('denies direct anonymous reads of commercial tables', async () => {
    await identity(null)
    await expect(db.query('select * from public.companies')).rejects.toThrow(/permission denied/i)
  })
  it('denies administration to an ordinary consumer', async () => {
    await identity(USER)
    await expect(save('category', { name: 'Não autorizado' })).rejects.toThrow(/não autorizado/i)
  })
  it('returns validated, bounded snapshots for every administrative section', async () => {
    await identity(ADMIN)
    for (const section of adminSections) {
      const response = await db.query<{ result: unknown }>(
        "select public.guide_admin_list($1,1,'',null,7) as result",
        [section],
      )
      const snapshot = adminSnapshotSchema.parse(response.rows[0]?.result)
      expect(snapshot.rows.length).toBeLessThanOrEqual(20)
      expect(snapshot.pagination.pageSize).toBe(20)
    }
  })
  it('exposes direct contacts only when the assigned plan allows them', async () => {
    await identity(null)
    expect(searchResultSchema.parse(await rpc('guide_search')).companies[0]?.phone).toBe('')
    await identity(ADMIN)
    const privateData = await db.query<{ result: unknown }>(
      "select public.guide_admin_list('companies',1,'',null,7) as result",
    )
    expect(
      adminSnapshotSchema
        .parse(privateData.rows[0]?.result)
        .catalog.companies.find((c) => c.id === COMPANY)?.phone,
    ).toBe('5569999990000')
    await save('plan', {
      id: plan,
      name: 'FREE',
      max_items: 5,
      max_media: 3,
      featured: false,
      direct_contact: true,
    })
    await identity(null)
    expect(searchResultSchema.parse(await rpc('guide_search')).companies[0]?.phone).toBe(
      '5569999990000',
    )
    await db.exec('reset role')
    const audit = await db.query<{ after_value: { features: { direct_contact: boolean } } }>(
      "select after_value from public.admin_audit_logs where action='plan'",
    )
    expect(audit.rows[0]?.after_value.features.direct_contact).toBe(true)
  })
  it('binds favorites to the verified user, ignoring an injected user id', async () => {
    await identity(USER)
    await rpc('guide_toggle_favorite', { company_id: COMPANY, user_id: OTHER })
    const mine = await db.query<{ result: unknown }>('select public.guide_me() as result')
    expect(viewerSchema.parse(mine.rows[0]?.result).favorites).toEqual([COMPANY])
    await identity(OTHER)
    const theirs = await db.query<{ result: unknown }>('select public.guide_me() as result')
    expect(viewerSchema.parse(theirs.rows[0]?.result).favorites).toEqual([])
  })
  it('moderates reviews before exposing them and records administrative audit atomically', async () => {
    await identity(USER)
    await rpc('guide_review', {
      company_id: COMPANY,
      rating: 5,
      comment: 'Comentário fictício de teste.',
    })
    await identity(null)
    expect(searchResultSchema.parse(await rpc('guide_search')).reviews).toEqual([])
    await identity(ADMIN)
    await db.exec('reset role')
    const review = (await db.query<{ id: string }>('select id from public.company_reviews')).rows[0]
    await identity(ADMIN)
    if (!review) throw new Error('Review fixture missing')
    await save('review', { id: review.id, status: 'published' })
    await identity(null)
    expect(searchResultSchema.parse(await rpc('guide_search')).reviews).toHaveLength(1)
    await db.exec('reset role')
    expect(
      (await db.query("select id from public.admin_audit_logs where action='review'")).rows,
    ).toHaveLength(1)
  })
  it('requires consent before persisting optional analytics', async () => {
    await identity(null)
    await expect(
      rpc('guide_event', { type: 'search', session_id: USER, route: '/', query: 'tinta' }),
    ).rejects.toThrow(/consentimento/i)
  })
  it('makes analytics append-only even for privileged database sessions', async () => {
    await identity(null)
    await rpc('guide_event', {
      type: 'search',
      session_id: USER,
      route: '/',
      query: 'tinta',
      consent: true,
    })
    await db.exec('reset role')
    await expect(db.query("update public.analytics_events set query='alterada'")).rejects.toThrow(
      /imutável/i,
    )
  })
  it('enforces item limits in the database', async () => {
    await identity(ADMIN)
    for (let index = 0; index < 4; index++)
      await save('item', {
        company_id: COMPANY,
        category_id: CATEGORY,
        name: `Teste ${String(index)}`,
        description: 'Item para testar quota.',
        type: 'service',
        available: true,
      })
    await expect(
      save('item', {
        company_id: COMPANY,
        category_id: CATEGORY,
        name: 'Excesso',
        description: 'Não deve ser inserido.',
        type: 'product',
      }),
    ).rejects.toThrow(/limite/i)
  })
  it('rejects writes from a blocked consumer', async () => {
    await identity(ADMIN)
    await save('user', { id: USER, status: 'blocked' })
    await identity(USER)
    await expect(
      rpc('guide_contact', { company_id: COMPANY, message: 'Mensagem fictícia de teste.' }),
    ).rejects.toThrow(/não autorizado/i)
  })
  it('accepts a support request and returns a reference without exposing the inbox', async () => {
    await identity(null)
    const result = await rpc('guide_support', {
      kind: 'business',
      name: 'Solicitante de teste',
      email: 'teste@example.test',
      phone: '',
      message: 'Solicitação fictícia para teste.',
      website: '',
    })
    expect(
      typeof result === 'object' &&
        result !== null &&
        'reference' in result &&
        typeof result.reference === 'string' &&
        /^SG-[0-9A-F]{12}$/.test(result.reference),
    ).toBe(true)
    await expect(db.query('select * from public.guide_support_requests')).rejects.toThrow(
      /permission denied/i,
    )
  })
})
