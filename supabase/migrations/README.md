# Migrations do banco

Regras deste projeto (spec §69, DECISIONS.md ADR-010):

- **Nunca** migration destrutiva automática em produção: sem `DROP TABLE`,
  `DROP COLUMN` ou `DELETE` em massa sem análise explícita.
- Compatíveis para frente: **adicionar → migrar → validar → trocar código →
  remover legado depois**.
- Sequência de nomeação do Supabase: `<timestamp>_<nome>.sql`
  (ex.: `20260812120000_profiles.sql`).
- RLS ligada por default em tabelas críticas (ADR-002); views com
  `security_invoker = true`; sem escrita anônima.
- Mudanças estruturais passam por staging e revisão antes de produção.

Comandos:

```bash
npx supabase link --project-ref <ref>   # uma vez por ambiente
npx supabase db push                    # aplica migrations pendentes
npx supabase db diff                    # gera migration a partir do schema local
npx supabase start                      # dev local (requer Docker)
```

O Milestone 1 cria a primeira migration real (profiles, services,
service_categories + baseline de RLS).
