# APLICANDO MIGRATIONS NO SUPABASE

As migrations do Milestone 1 estão prontas em `supabase/migrations/` mas **ainda
não foram aplicadas** no seu projeto (`taabjnmsaaltsiehywbw`) — aplicação exige
suas credenciais (não automatizável por mim).

## Opção A — CLI (recomendada, versionada)

No terminal do projeto:

```bash
npx supabase login          # abre o navegador para autorizar (1x)
npx supabase link --project-ref taabjnmsaaltsiehywbw   # pede a senha do banco
npx supabase db push        # aplica as migrations pendentes
```

Depois, teste a segurança:

```bash
# 1. Abrir Supabase Dashboard → SQL Editor
# 2. Colar o conteúdo de supabase/tests/rls-security.sql
# 3. Executar — esperado ao final: "TODOS OS TESTES PASSARAM"
```

## Opção B — SQL Editor (sem CLI)

1. Supabase Dashboard → **SQL Editor** → New query
2. Colar o conteúdo de `supabase/migrations/20260812120000_init.sql` → Run
3. Colar `supabase/migrations/20260812120010_seed_catalog.sql` → Run
4. Colar `supabase/tests/rls-security.sql` → Run (esperado: TODOS OS TESTES PASSARAM)

## O que a migration cria

- `profiles` (1:1 com auth.users, trigger automático no cadastro, `user_type`
  client|professional — **não alterável pelo próprio usuário**)
- `cities` (catálogo canônico IBGE, ADR-014) + seed de 11 cidades
  (SP capital, RJ, BH, Curitiba, Florianópolis, Porto Alegre, Brasília,
  Goiânia, Campinas, Guarulhos, Santos)
- `service_categories` + seed das 12 categorias (diaristas, faxina, ...)
- `services` (oferta do profissional)
- RLS baseline (ADR-002): default deny, anon só lê catálogo/serviços,
  escrita anônima proibida, perfil só do dono

## Observação sobre dev local

O cadastro/login **funcionam antes** da migration (o Supabase Auth é próprio),
mas o perfil só é criado depois que o trigger existir. Aplique as migrations
antes de testar o fluxo completo de cadastro → onboarding → painel.
