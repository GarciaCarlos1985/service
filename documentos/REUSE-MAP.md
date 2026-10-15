# REUSE-MAP — Service Guide

> O que fazer com o que já foi construído no **SERVICE** (marketplace de
> profissionais, M0–M8) ao migrar para o **Service Guide** (descoberta comercial
> local). Baseado no código real do repositório.
>
> Regra: **nada é deletado** (ADR-010 — migrações compatíveis para frente);
> módulos do modelo antigo são **parados de expandir**, não removidos.

Legenda:

- 🟢 **Reaproveitar** — continua na linha principal, com adaptação.
- 🟡 **Parar de expandir** — manter compatível, não evoluir; pode voltar na Fase 4.
- 🔴 **Criar** — não existe; nasce para o Service Guide.
- ⚙️ **Adaptar/renomear** — existe, mas muda de alvo (profissional → empresa).

---

## Fundação e plataforma

| Item | Hoje | Ação |
| --- | --- | --- |
| TanStack Start + React + TS strict + Tailwind | escaffold completo | 🟢 manter |
| Supabase (Postgres/Auth/RLS/Realtime) | em uso | 🟢 manter |
| Padrão RLS default deny (ADR-002) | implementado | 🟢 manter como regra |
| Harness de teste SQL (`scripts/sql-tests.mjs` + `supabase/tests/`) | 73 testes verdes | 🟢 manter; criar suítes novas por domínio |
| Design system (`src/modules/ui/`) | 15 componentes | 🟢 manter |
| Auth (cadastro, entrar, recuperar-senha, onboarding) | implementado | 🟢 manter; ⚙️ revisar onboarding |
| `onboarding` com escolha client/professional | implementado | ⚙️ usuários são **consumidores**; escolha de tipo perde o sentido → simplificar |
| `cities` + seed IBGE (ADR-014) | 11 cidades | 🟢 manter; adicionar Cacoal como launch, bairros canônicos |
| Deploy Vercel free | no ar | 🟢 manter |

---

## Banco — o que fica, para, e nasce

### 🟢 Reaproveitar

| Objeto | Observação |
| --- | --- |
| `cities` | catálogo canônico; incluí-la no produto |
| `profiles` | usuário consumidor; manter. `user_type` deixa de ser eixo do produto |
| Favoritos (`favorites`) | ⚙️ reapontar de profissional para **empresa** |
| Reviews (`reviews`, `review_responses`) | ⚙️ hoje presas a booking; desacoplar (avaliação de empresa, moderação admin) |
| Notificações (`notifications`) | 🟢 manter a arquitetura; ⚙️ eventos de negócio novos |
| Catálogo de categorias (`service_categories`) | ⚙️ generalizar para **categorias** (comércio + serviços) — decisão de ADR na Fase 1 |
| `platform_settings` | se existir, 🟢 usar para nome/branding e regras configuráveis |

### 🟡 Parar de expandir (modelo antigo — manter compatível)

| Objeto | Motivo |
| --- | --- |
| `bookings`, `professional_availability`, `availability_exceptions` | agendamento é Fase 4 |
| `payments`, `payment_events`, `webhook_events` | sem gateway no MVP (ADR-044) |
| `wallets`, `wallet_transactions`, `commission_rules`, `cashback_rules` | sem comissão no MVP (ADR-044) |
| `disputes` | presas a booking; parar |
| `services` (com `professional_id`) | modelo antigo; ver "Produtos/serviços" abaixo |

> Estes módulos não recebem novas features e não são chamados pelo fluxo novo.
> Permanecem no banco e no código, candidatos a reutilização se o marketplace
> financeiro voltar (Fase 4).

### 🔴 Criar (Fase 1)

| Objeto | Papel |
| --- | --- |
| `companies` | entidade própria (ADR-042): dados comerciais, endereço, contato, horário, status, plano, destaque |
| `company_members` | vínculo usuário↔empresa + papel (ADR-047), opcional no MVP |
| `products` | entidade própria (`company_id`), busca por produto (ADR-043) |
| `services` (novo, ligado à empresa) | ver decisão de nomenclatura abaixo |
| `company_media` | mídia de empresa/produto/serviço (tabela própria, não texto) |
| `plans` | limites/recursos configuráveis (ADR-044) |
| `company_subscriptions` | plano vigente da empresa, origem `manual`, auditoria |
| `analytics_events` | append-only, event-sourced (ADR-045) |
| `conversations` (+ mensagens) | contato/orçamento interno empresa↔consumidor (ADR-046) |
| `admin_audit_logs` | auditoria de ações administrativas (verificar se já existe) |
| `platform_settings` | nome do produto, branding, defaults |

### ⚠️ Decisão de schema pendente (Fase 1)

A tabela `services` atual tem `professional_id` (modelo antigo). Para o Service
Guide, serviços pertencem a `companies`. Opções:

1. **Criar tabela nova** (ex.: `company_services`) e deixar a `services` antiga
   parada — mais limpa, sem risco de migração; nomes podem causar confusão.
2. **Evoluir `services`**: adicionar `company_id`, tornar `professional_id`
   anulável — mantém o nome, mas mexe em tabela com RLS/policies existentes.

> **Recomendação:** opção 1 (tabela nova) na Fase 1, com um ADR registrando a
> escolha. Menor risco e não toca no schema antigo (ADR-010).

---

## Módulos de código (`src/modules/`)

| Módulo | Ação |
| --- | --- |
| `auth` | 🟢 manter |
| `ui` | 🟢 manter |
| `search` | ⚙️ reaproveitar estrutura; nova busca cobre empresa/produto/serviço |
| `favorites` | ⚙️ reapontar para empresa |
| `reviews` | ⚙️ desacoplar de booking; avaliação de empresa |
| `notifications` | 🟢 manter base; novos eventos |
| `chat` | ⚙️ hoje por booking; vira conversa/orçamento por empresa (ou reaproveitar na Fase 2) |
| `services` | ⚙️ substituir pelo CRUD de empresa/produto/serviço do admin |
| `profile` | 🟢 manter para consumidor |
| `payment` | 🟡 parado (não usado no fluxo novo) |
| `wallet` | 🟡 parado |
| `booking` | 🟡 parado (Fase 4) |
| `disputes` | 🟡 parado |
| — | 🔴 criar: `companies`, `catalog` (products/services/categories), `admin`, `analytics`, `plans` |

## Rotas (`src/routes/`)

| Rota hoje | Ação |
| --- | --- |
| `index` (home) | ⚙️ nova home de descoberta |
| `buscar` | 🟢 manter; ⚙️ busca por produto/serviço |
| `$categorySlug.$citySlug` | 🟢 manter padrão SEO; ⚙️ categoria × cidade |
| `profissionais.$citySlug.$profileSlug` | ⚙️ → `empresas.<cidade>.<slug>` |
| `cadastro` / `entrar` / `recuperar-senha` | 🟢 manter |
| `onboarding` | ⚙️ simplificar (sem escolha client/professional) |
| `painel.*` (serviços, agenda, carteira, disponibilidade, disputas, mensagens) | 🟡 a maioria é do modelo antigo; criar painel admin novo |
| — | 🔴 criar: admin (empresas/produtos/serviços/categorias/mídia/planos/métricas), página de empresa, página de produto/serviço |

---

## Marca / branding

| Item | Ação |
| --- | --- |
| Nome "SERVICE" espalhado em UI/config | ⚙️ substituir por **Service Guide**; idealmente centralizar em `platform_settings` |
| `public/service.png` (logo antiga) | 🟡 aposentar |
| `public/service-guide.png` | 🟢 novo logo; otimizar (WebP/AVIF/variantes) na fase de infra |
| Nome do repositório/pasta (`service-helon`) | opcional; não bloqueia o produto |

---

## Checklist da Fase 1 (derivado deste mapa)

1. ADR da nomenclatura de produto/serviço e categorias.
2. Migrations: `companies`, `company_members`, `products`, `services`(novo),
   `company_media`, `plans`, `company_subscriptions`, `analytics_events`,
   `conversations`, `platform_settings` + RLS default deny.
3. Suíte SQL de testes no banco real por domínio (ADR-039).
4. Painel admin: CRUD de empresa/categoria/produto/serviço/mídia + marcar plano.
5. Reapontar favoritos/reviews para empresa; simplificar onboarding.
6. Branding "Service Guide" + `platform_settings`.
