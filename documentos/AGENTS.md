# AGENTS.md — Guia para IAs trabalharem no SERVICE GUIDE

Este arquivo é a porta de entrada para QUALQUER agente de IA (ou humano) que
assumir este projeto. Leia-o antes de qualquer tarefa.

## O que é o projeto

**SERVICE GUIDE** — plataforma de **descoberta comercial local**, lançada
inicialmente em **Cacoal – Rondônia**. O consumidor pesquisa **o que precisa**
(produto ou serviço) e encontra empresas cadastradas pela administração. Ex.:
"tinta emborrachada" → empresas que têm esse produto. Fluxo: **pesquisar →
descobrir → conhecer → contatar → favoritar → avaliar**.

> **Mudança de produto (2026-10-06):** o projeto era o **SERVICE**, um marketplace
> de profissionais. Esse conceito foi **abandonado**. Não construa no modelo
> antigo. Ver `REUSE-MAP.md` para o que reaproveitar/parar/criar.

**Documentos de autoridade (leia na ordem):**

| doc | conteúdo |
| --- | --- |
| `SERVICE-GUIDE-PROMPT-INICIO.md` | **spec-mãe atual** — fonte de verdade de produto |
| `DECISIONS.md` | ADRs — antigos (001–040, modelo antigo) + **041–047 (virada)**; NÃO edite ADRs antigos |
| `REUSE-MAP.md` | reaproveitar · parar de expandir · criar |
| `PRODUCT.md` | contexto de produto (impeccable) |
| `ROADMAP.md` | fases do Service Guide + legado M0–M8 |
| `SERVICE-PROMPT-INICIO.md` | spec-mãe ANTIGA (superada; só histórico) |
| `ENVIRONMENT.md` · `SECURITY.md` · `DATABASE.md` · `PAYMENTS.md` · `DEPLOYMENT.md` · `ADMIN.md` · `SEO.md` · `DISASTER-RECOVERY.md` | pilares técnicos (herdados; ajustar quando o Service Guide tocar) |

## Regras de ouro (não negociáveis)

1. **Nunca invente dados** (ADR-004): dado ausente fica ausente rotulado; nada
   de avaliações/empresas/SEO falsos; seeds de dev sempre identificados.
2. **Segurança por construção** (ADR-002): escrita no banco **sempre via RPC
   `SECURITY DEFINER`** ou backend com service role — **nunca** INSERT/UPDATE/
   DELETE direto do cliente; RLS `default deny`; policy se lê pelo efeito.
3. **Dinheiro é imutável** (ADR-003) — princípio mantido para qualquer módulo
   financeiro. Hoje os módulos financeiros estão **parados** (sem comissão/
   pagamento no MVP, ADR-044).
4. **Sem decisão estrutural sem autorização** (spec §28): decisão ambígua →
   problema/opções/recomendação/impacto/custo/risco → aguardar aval.
5. **Gate de qualidade antes de marcar pronto** (spec §34): typecheck → lint →
   test → build, além de **testar SQL no banco real**.
6. **Migrações compatíveis para frente** (ADR-010): nada de DROP/DELETE
   destrutivo em produção. Módulos do modelo antigo **não são deletados**.
7. **Custo zero por princípio** (ADR-017): "Supabase ou Vercel já resolve?"
   antes de qualquer serviço externo.
8. **Não conectar pagamento** e **não construir funcionalidade futura por
   ansiedade** (spec §22/§28). Empresa e produto são entidades próprias
   (ADR-042/043) — nunca usuário nem texto.

## Stack e arquitetura (resumo)

- **TanStack Start** (React 19 + Vite + TS strict + Tailwind) — SSR indexável;
  deploy **Vercel free** (ADR-036/037).
- **Supabase** = única fonte de verdade (PostgreSQL + Auth + RLS + Realtime).
- Camadas: `src/routes/` · `src/modules/<dominio>/` · `src/modules/ui/`.
- Busca em PostgreSQL (`tsvector` + `pg_trgm`) na Fase 1.
- Estilo de código legado: TanStack Start (não Next.js).

## Comandos essenciais

```bash
npm run dev          # dev server (porta 3000)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (strict type-checked)
npm run test         # vitest (unitários)
npm run build        # build de produção (Nitro/Vercel)
npx supabase db push # aplica migrations (requer CLI logado)
```

## Como validar mudanças de banco (obrigatório)

Toda migration nova **deve ser testada contra o banco real**:

```bash
npx supabase db push
node scripts/sql-tests.mjs supabase/tests/rls-security.sql
node scripts/sql-tests.mjs supabase/tests/ledger-tests.sql
node scripts/sql-tests.mjs supabase/tests/chat-tests.sql
node scripts/sql-tests.mjs supabase/tests/reviews-tests.sql
```

O runner lê `DATABASE_URL` do `.env.local` (conexão direta 5432). **Nunca
imprima a senha**. Ao criar teste novo: crie usuários reais no `auth.users`
(o trigger cria perfis), use `set local role` + `set_config`, e **volte ao papel
postgres antes de setup/cleanup**. Cleanup com `truncate ... cascade`.

## Variáveis de ambiente (resumo — detalhes em ENVIRONMENT.md)

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — públicas por design (vão ao
  bundle); a segurança vem do RLS.
- `DATABASE_URL` — só para testes locais (gitignored).
- `service_role`, tokens CLI — NUNCA em `VITE_*`, nunca no chat/repo.
- **Sem chaves de pagamento**: não há gateway no MVP (ADR-044).

## Estado atual (2026-10-06)

**Virada Service Guide documentada** (spec + ADRs 041–047 + `REUSE-MAP` +
`ROADMAP`). **Fase 1 (fundação) a iniciar.** O legado M0–M8 (marketplace de
profissionais) segue no repo, reaproveitável em parte e com os módulos
financeiros/booking **parados, não deletados**.

## Como trabalhar aqui (fluxo recomendado)

1. Leia a spec do Service Guide e os ADRs relevantes (incl. 041–047).
2. Se mexer em banco: migration + suíte de teste SQL + aplicar + testar no banco
   real; ver `REUSE-MAP.md` antes de criar tabela nova.
3. Se mexer em UI: siga o design system (`src/modules/ui/`), estados
   loading/empty/error em toda tela, mobile-first.
4. Rode o gate completo. Só então commit (mensagem em pt-BR, escopo claro).
5. Atualize `ROADMAP.md` e, se houver decisão nova, registre um ADR (não edite
   os antigos — crie ADR novo que substitui).
