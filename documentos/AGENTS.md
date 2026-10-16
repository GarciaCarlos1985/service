# AGENTS.md — Guia para IAs trabalharem no SERVICE GUIDE

Este arquivo é a porta de entrada para QUALQUER agente de IA (ou humano) que
assumir este projeto. Leia-o antes de qualquer tarefa.

## Repositório oficial

Por orientação expressa do usuário em **16/10/2026**, o repositório deste
projeto é **https://github.com/GarciaCarlos1985/service**.

- `origin` deve apontar para `https://github.com/GarciaCarlos1985/service.git`
  tanto para fetch quanto para push.
- Todos os commits, branches, PRs e envios deste projeto usam esse repositório;
  a branch principal é `main`.
- Confira o destino configurado antes de cada envio. Qualquer troca de
  repositório depende de uma nova instrução explícita do usuário.

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
| `DECISIONS.md` | ADRs — antigos (001–040, modelo antigo) + **041–050 (produto e hospedagem)**; NÃO edite ADRs antigos |
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
7. **Custo zero por princípio** (ADR-017): "Supabase ou Cloudflare já resolve?"
   antes de qualquer serviço externo.
8. **Não conectar pagamento** e **não construir funcionalidade futura por
   ansiedade** (spec §22/§28). Empresa e produto são entidades próprias
   (ADR-042/043) — nunca usuário nem texto.

## Stack e arquitetura (resumo)

- **TanStack Start** (React 19 + Vite + TS strict + Tailwind) — SSR indexável;
  deploy **Cloudflare Workers** (ADR-049), sem contratação de plano pago.
- **Supabase** = única fonte de verdade (PostgreSQL + Auth + RLS + Realtime).
- Camadas: `src/routes/` · `src/modules/<dominio>/` · `src/modules/ui/`.
- Busca em PostgreSQL (`tsvector` + `pg_trgm`) na Fase 1.
- Estilo de código legado: TanStack Start (não Next.js).

## Comandos essenciais

```bash
npm run dev          # dev server (porta 3000)
npm run typecheck    # gera tipos do Worker + tsc --noEmit
npm run lint         # eslint (strict type-checked)
npm run test         # vitest (unitários)
npm run build        # build de produção (Cloudflare Workers + assets)
npm run preview      # valida o build no runtime local do Worker
npm run deploy       # build + publicação Cloudflare; requer autorização
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
node scripts/sql-tests.mjs supabase/tests/guide-commercial.sql
```

O runner lê `DATABASE_URL` do `.env.local`, valida TLS (CA via `PGSSLROOTCERT`
ou certificado da CLI) e executa a suíte em transação com **rollback**, inclusive
em falha. **Nunca imprima a senha**. Ao criar teste novo: crie usuários no `auth.users`
(o trigger cria perfis), use `set local role` + `set_config`, e **volte ao papel
postgres antes de setup/cleanup**. Em projeto ativo, prefira a suíte comercial
com fixtures isoladas; nunca execute a limpeza ampla das suítes legadas fora
da transação protegida pelo runner.

## Variáveis de ambiente (resumo — detalhes em ENVIRONMENT.md)

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — públicas por design (vão ao
  bundle); a segurança vem do RLS.
- `DATABASE_URL` — só para testes locais (gitignored).
- `service_role`, tokens CLI — NUNCA em `VITE_*`, nunca no chat/repo.
- **Sem chaves de pagamento**: não há gateway no MVP (ADR-044).

## Estado atual (2026-10-16)

**App publicado no Cloudflare Workers** (ADR-049), em
`https://service-guide.helon280.workers.dev`. Código no repositório oficial.
A fundação comercial foi **aplicada e validada no Supabase real** (ADR-050):
10 migrações, dados legados preservados, suíte SQL transacional e teste real
de cadastro/login/perfil aprovados. O catálogo público funciona e está vazio,
aguardando conteúdo real. Duas contas administrativas foram confirmadas pelo
usuário, ativadas e auditadas; as permissões foram verificadas no banco real.
As URLs de retorno do Auth apontam para o site publicado; a recuperação de senha
foi completada e testada com conta temporária, sem enviar e-mails ou alterar
senhas reais. A entrega de e-mail ainda precisa ser conferida pelo titular.
`/previa` existe apenas em DEV. O legado M0–M8 permanece preservado e com os
módulos financeiros/booking **parados, não deletados**. Ver
`ATIVACAO-SUPABASE-2026-10-16.md`, `CLOUDFLARE-2026-10-16.md` e `ROADMAP.md`
para evidências e pendências.

## Como trabalhar aqui (fluxo recomendado)

1. Leia a spec do Service Guide e os ADRs relevantes (incl. 041–047).
2. Se mexer em banco: migration + suíte de teste SQL + aplicar + testar no banco
   real; ver `REUSE-MAP.md` antes de criar tabela nova.
3. Se mexer em UI: siga o design system (`src/modules/ui/`), estados
   loading/empty/error em toda tela, mobile-first.
4. Rode o gate completo. Só então commit (mensagem em pt-BR, escopo claro).
5. Atualize `ROADMAP.md` e, se houver decisão nova, registre um ADR (não edite
   os antigos — crie ADR novo que substitui).
