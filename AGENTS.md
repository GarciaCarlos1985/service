# AGENTS.md — Guia para IAs trabalharem no SERVICE

Este arquivo é a porta de entrada para QUALQUER agente de IA (ou humano) que
assumir este projeto. Leia-o antes de qualquer tarefa.

## O que é o projeto

**SERVICE** — marketplace brasileiro de serviços locais (diaristas, eletricistas,
encanadores, pintores, etc.). Clientes contratam, profissionais oferecem; a
plataforma intermedeia agendamento, pagamento, comissão, cashback e reputação.

**Documentos de autoridade (leia na ordem):**

| doc                                                                                                              | conteúdo                                                                |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `documentos/SERVICE-PROMPT-INICIO.md`                                                                            | a spec-mãe do produto (79 seções) — fonte de verdade de requisitos      |
| `documentos/DECISIONS.md`                                                                                        | registro de decisões arquiteturais (ADR-001+) — NÃO edite ADRs antigos  |
| `PRODUCT.md`                                                                                                     | contexto de produto (impeccable) — usuários, posicionamento, princípios |
| `ROADMAP.md`                                                                                                     | milestones 0–12 e status atual                                          |
| `ENVIRONMENT.md`                                                                                                 | variáveis de ambiente: onde cada chave vive                             |
| `SECURITY.md` · `DATABASE.md` · `PAYMENTS.md` · `DEPLOYMENT.md` · `ADMIN.md` · `SEO.md` · `DISASTER-RECOVERY.md` | pilares técnicos                                                        |

## Regras de ouro (não negociáveis — vêm da spec §0/§72/§78 e ADRs)

1. **Nunca invente dados** (ADR-004): dado ausente fica ausente rotulado; nada
   de testemunhos/avaliações/SEO falsos; seeds de dev sempre identificados.
2. **Segurança por construção** (ADR-002): escrita no banco **sempre via RPC
   `SECURITY DEFINER`** ou backend com service role — **nunca** INSERT/UPDATE/
   DELETE direto do cliente; RLS `default deny`; nenhuma policy por nome bonito
   sem verificar o efeito.
3. **Dinheiro é imutável** (ADR-003): ledger append-only (trigger bloqueia até
   postgres); correções = transação compensatória; idempotência obrigatória.
4. **Sem decisão estrutural sem autorização** (spec §72): decisão ambígua →
   problema/opções/recomendação/impacto/custo/risco → aguardar aval.
5. **Gate de qualidade antes de marcar pronto** (spec §78): typecheck → lint →
   test → build, além de **testar SQL no banco real** (ver abaixo).
6. **Migrações compatíveis para frente** (ADR-010): nada de DROP/DELETE
   destrutivo em produção.
7. **Custo zero por princípio** (ADR-017): "Supabase ou Vercel já resolve?"
   antes de qualquer serviço externo.

## Stack e arquitetura (resumo)

- **TanStack Start** (React 19 + Vite 8 + TS 5.9 strict + Tailwind v4) — SSR
  indexável; deploy **Vercel free** via Nitro (preset vercel).
- **Supabase** = única fonte de verdade (PostgreSQL + Auth + RLS + Realtime).
- Camadas: `src/routes/` (file-based) · `src/modules/<dominio>/` (api + tipos +
  schemas zod) · `src/modules/ui/` (design system próprio).
- `PaymentProvider` como abstração (ADR-001): mock em dev, Stripe em produção.
- Padrão Medallion: `webhook_events` (Bronze) → canônico (Silver) → Gold views.

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
npx supabase db push                          # aplica migrations pendentes
node scripts/sql-tests.mjs supabase/tests/rls-security.sql   # RLS (15 testes)
node scripts/sql-tests.mjs supabase/tests/ledger-tests.sql   # ledger (11 testes)
node scripts/sql-tests.mjs supabase/tests/chat-tests.sql     # chat+notif (11 testes)
```

O runner lê `DATABASE_URL` do `.env.local` (conexão direta 5432). **Nunca
imprima a senha** dessa string. Ao criar um teste novo: crie usuários reais no
`auth.users` (o trigger cria perfis), use `set local role` + `set_config` para
simular papéis, e **volte ao papel postgres antes de qualquer setup/cleanup**.
Cleanup com `truncate ... cascade` (triggers de imutabilidade bloqueiam DELETE).

## Variáveis de ambiente (resumo — detalhes em ENVIRONMENT.md)

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — públicas por design (vão ao
  bundle); a segurança vem do RLS. Dev: `.env.local`; prod: painel Vercel.
- `DATABASE_URL` — só para testes locais (contém senha do banco; gitignored).
- `service_role`, Stripe, R2, tokens CLI — NUNCA em `VITE_*`, nunca no chat/repo.

## Estado atual (2026-08-13)

Milestones concluídos e testados no banco real: **M0 a M7** (arquitetura, auth,
RLS, busca/SEO, agendamento com double booking no banco, abstração de
pagamentos, ledger+cashback+comissão, chat+notificações). Ver `ROADMAP.md`
para o que falta (M8: reviews/confiança/disputas; M9: Premium/PRO/referral;
M10: admin; M11: Cloudflare/perf/PWA; M12: audit final).

## Como trabalhar aqui (fluxo recomendado)

1. Leia a spec e os ADRs relevantes para a tarefa.
2. Se mexer em banco: escreva a migration + a suíte de teste SQL + aplique +
   teste no banco real.
3. Se mexer em UI: mantenha os padrões do design system (`src/modules/ui/`),
   estados loading/empty/error em toda tela (spec §62), mobile-first.
4. Rode o gate completo. Só então commit (mensagem em pt-BR, escopo claro).
5. Atualize `ROADMAP.md` e, se houver decisão nova, registre um ADR (não edite
   os antigos — crie ADR novo que substitui).
