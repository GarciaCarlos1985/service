# ROADMAP — Service Guide

> **Mudança de produto (2026-10-06):** o **SERVICE** (marketplace de profissionais)
> foi substituído pelo **Service Guide** (plataforma de descoberta comercial
> local). Fonte de verdade: `SERVICE-GUIDE-PROMPT-INICIO.md`. Decisões:
> `DECISIONS.md` ADR-041+. Mapa do que fazer com o código existente:
> `REUSE-MAP.md`.

Status atual (2026-10-16): **site publicado no Cloudflare; fundação comercial
aplicada e testada no Supabase real, com legado preservado.** Catálogo vazio,
aguardando conteúdo real. Duas contas administrativas já estão configuradas.

Evolução administrativa em revisão local: `codex/painel-profissional`, com
cadastro completo de empresas/produtos/serviços, imagens e ordenação, edição de
textos/títulos, seis cores e até doze vitrines com prévia, proteção contra perda
de edição e reforço de sessão/MFA. 87 unitários e sete suítes SQL no banco real
aprovados; **as duas migrações candidatas e o novo Worker ainda não foram
publicados**. Evidências e validação humana pendente em
`PAINEL-PROFISSIONAL-2026-10-16.md`.

### Candidato local de 15/10/2026

A interface do pacote foi adaptada ao TanStack Start existente, com Supabase
Auth e RPCs próprias para o domínio comercial. Busca, perfis, conta, favoritos,
avaliações, ajuda e administração estão implementados no candidato local.
O legado permanece separado. Ver a proposta **ADR-048**, o relatório
`ADAPTACAO-SERVICE-GUIDE-2026-10-15.md` e a prévia DEV `/previa`.

O código está na `main` do repositório `GarciaCarlos1985/service`. Em 16/10,
o usuário autorizou a hospedagem no Cloudflare Workers (ADR-049); o adaptador
foi substituído e a evidência de validação/publicação está em
`CLOUDFLARE-2026-10-16.md`. Em seguida, autorizou a ativação do Supabase
(ADR-050): a migração foi aplicada e validada, incluindo cadastro/login/perfil
reais e preservação dos dados antigos. A home passou a retornar catálogo vazio
funcional. Ver `ATIVACAO-SUPABASE-2026-10-16.md`. A integração antiga da Vercel
não é o destino do novo build.

Atualização visual solicitada em 15/10: nova logo horizontal, composição de
maior escala e apresentação **Premium Guide** para destaques patrocinados,
derivada do recurso do plano existente. Inclui vitrine manual, cartões, perfis
e identidade compartilhada nas telas de acesso; não conecta cobrança nem
promove a fase de monetização a produção.

Ajuste posterior na prévia: selo **PREMIUM GUIDE** com fundo dourado champanhe
e texto escuro, aplicado pelo componente compartilhado.

A aplicação e a suíte SQL comercial no Supabase real foram concluídas.
Cadastro, login, perfil e negação de administração para consumidor foram
validados contra o Auth real. Após confirmação dos e-mails, duas contas foram
promovidas a administradoras com auditoria e validação de permissões.
As URLs de retorno do Auth foram ajustadas para o Cloudflare e o fluxo de
recuperação de senha foi completado, com teste real de link, troca e novo login
em conta descartável. Os advisors de segurança foram consultados; os avisos
remanescentes estão registrados no relatório de ativação. Permanecem abertos:
entrega de e-mail ao titular, conteúdo comercial real e validação operacional
pelo responsável. A prévia continua com exemplos identificados somente em DEV.

---

## FASE 1 — FUNDAÇÃO (aplicada; configuração operacional pendente)

Arquitetura · banco · autenticação · permissões · empresas · categorias ·
produtos · serviços · mídia · planos · eventos · estrutura administrativa.

- [ ] ADRs de schema da Fase 1 (nomenclatura de produto/serviço e categorias)
- [ ] Migrations: `companies`, `company_members`, `products`, `services`(novo),
      `company_media`, `plans`, `company_subscriptions`, `analytics_events`,
      `conversations`, `platform_settings` + RLS default deny
- [ ] Suítes SQL de teste por domínio no banco real (ADR-039)
- [x] Branding **Service Guide** + `platform_settings` (nome/branding central)
- [ ] Reapontar favoritos/reviews do profissional → empresa
- [ ] Simplificar onboarding (usuário = consumidor; sem client/professional)
- [ ] Cacoal como cidade de lançamento (catálogo IBGE) + bairros canônicos

## FASE 2 — MVP PÚBLICO

Homepage · pesquisa (produto/serviço/empresa) · filtros · resultados · páginas
de empresa · páginas de produto/serviço · cadastro/login · favoritos · contato
(WhatsApp rastreado + orçamento interno) · avaliações · eventos de analytics.

- [ ] Home de descoberta
- [ ] Busca (PostgreSQL `tsvector` + `pg_trgm`) com filtros
- [ ] Página de empresa `/empresas/<cidade>/<slug>` (SEO + JSON-LD LocalBusiness)
- [ ] Páginas de produto/serviço (só com conteúdo real — ADR-014)
- [ ] Adapter/credential do logotipo
- [ ] Contato: botão WhatsApp (`wa.me` + origem) e orçamento interno
- [ ] Favoritos e avaliações de empresa
- [ ] Coleta de eventos (`analytics_events`) em todas as ações públicas
- [ ] Estados de UX obrigatórios (loading/empty/error) em toda tela

## FASE 3 — MONETIZAÇÃO

Planos PRO · cobrança (inicialmente manual, sem gateway) · recursos PRO ·
analytics para empresas · campanhas.

- [ ] `plans` configuráveis (limites/recursos) — sem `if plan === "pro"`
- [ ] Admin marca plano da empresa manualmente, com auditoria
- [ ] Destaques rotulados; ranking com proporção limitada de patrocinados
- [ ] Painel/relatório de exposição e leads por empresa (analytics)
- [ ] Painel do comerciante (opcional; pode seguir manual no admin)
- [ ] (Futuro) assinatura automatizada via gateway — novo ADR antes

## FASE 4 — MARKETPLACE (somente com demanda real)

Agendamento · orçamento formal · contratação · pagamento · (comissão/repasse, se
voltar a fazer sentido).

- [ ] Reativar/adaptar módulos hoje parados (booking, payments, ledger)
- [ ] Regras de negócio, segurança e requisitos legais (CPF/pagamento) antes de cód.

---

## Legado — SERVICE (marketplace de profissionais) — concluído e parado

M0–M8 foram construídos, aplicados e testados no banco real (73 testes SQL).
**Não são mais a linha de trabalho**, mas a fundação reaproveitável é mantida
(ver `REUSE-MAP.md`). Módulos financeiros ficam parados, não deletados (ADR-010).

- **M0** Arquitetura + auditoria + deploy Vercel
- **M1** Database + Auth + RLS (15 testes)
- **M2** Cliente + Profissional + Serviços
- **M3** Busca + SEO + perfil público
- **M4** Agendamento + double booking
- **M5** Pagamentos + Stripe abstraction
- **M6** Ledger + cashback + comissão (11 testes)
- **M7** Chat + notificações (11 testes)
- **M8** Reviews + confiança + disputas (36 testes)
- **M9** Premium + PRO + Referral — ❌ substituído pelas Fases do Service Guide
- **M10** Admin completo — ⚙️ vira o painel admin do Service Guide (Fase 1/3)
- **M11** Cloudflare + R2 + performance + PWA — ⚙️ vale para o Service Guide
- **M12** Security audit + production readiness — ⚙️ vale para o Service Guide

---

## Princípios de execução

Antes de marcar cada fase pronta: ler código existente → identificar
dependências → explicar alterações → implementar → typecheck → lint → test →
build → verificar regressões. Funcionalidade só é "pronta" quando funciona, está
tipada, protegida por RLS, tem estados de erro/loading, sem duplicar dados,
testada (incluindo SQL no banco real quando mexer em banco), build passa, sem
secrets expostos e documentada (spec Service Guide §34).
