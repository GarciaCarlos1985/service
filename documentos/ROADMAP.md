# ROADMAP — Service Guide

> **Mudança de produto (2026-10-06):** o **SERVICE** (marketplace de profissionais)
> foi substituído pelo **Service Guide** (plataforma de descoberta comercial
> local). Fonte de verdade: `SERVICE-GUIDE-PROMPT-INICIO.md`. Decisões:
> `DECISIONS.md` ADR-041+. Mapa do que fazer com o código existente:
> `REUSE-MAP.md`.

Status atual (2026-10-18): **cadastro com logotipo e dias/horários publicado no Cloudflare;
15 migrações aplicadas e testadas no Supabase real, com legado preservado.** Catálogo vazio,
aguardando conteúdo real. Duas contas administrativas já estão configuradas.

### Autenticação por e-mail e CAPTCHA — publicada em 18/10/2026

Turnstile gratuito integrado aos formulários, reenvio de confirmação e proteção
da reconfirmação administrativa, com 96 unitários e cinco suítes SQL atuais
aprovados. Turnstile e confirmação de e-mail obrigatórios no Auth. SMTP Gmail
configurado com remetente autorizado `carlinhoct@gmail.com`; titular confirmou
recebimento do teste na caixa de entrada. Oito negativos sem prova/com prova
fictícia recusados. Login novo com CAPTCHA e MFA pelos titulares ainda pendentes.
A liberação e os resultados medidos são
registrados em `AUTENTICACAO-EMAIL-CAPTCHA-2026-10-18.md`.

Evolução administrativa aprovada e publicada pelo PR #1, mesclado na `main`, com
cadastro completo de empresas/produtos/serviços, imagens e ordenação, edição de
textos/títulos, seis cores e até doze vitrines com prévia, proteção contra perda
de edição e reforço de sessão/MFA. 87 unitários e sete suítes SQL no banco real
aprovados; Auth real com sessão revogada/TOTP, Storage HTTP e login online/local
também conferidos. A prévia normal na porta 3002 usa o backend real. Evidências
e versões em `PUBLICACAO-PAINEL-2026-10-17.md`; ensaio anterior em
`PAINEL-PROFISSIONAL-2026-10-16.md`. A revisão final constatou permissões
excessivas em seis helpers internos do legado, posteriormente fechadas pelo
PR #2. As pendências operacionais de segurança continuam explícitas abaixo.

### Cadastro de empresas — publicado em 18/10/2026

Logotipo, semana de funcionamento por dia, intervalos, 24 horas, validação de
conflitos e apresentação pública foram publicados após aprovação do responsável. O editor
mantém as ações de salvar/voltar fora da rolagem e elimina a criação duplicada
na visão geral. A integração final passou em 113 unitários, seis suítes SQL
atuais após aplicação, build/CI e varredura de segredos. Seleção de arquivo,
salvamento/reabertura e desativação/reativação passaram no laboratório.
O painel online abriu o novo formulário com sessão administrativa existente.
Worker `417acf48-d450-4548-848e-992a27c7592b`, fonte `45519de`, 100% do tráfego.
Evidências e limites em `PUBLICACAO-CADASTRO-2026-10-18.md`;
o histórico da extensão está em `CADASTRO-EMPRESAS-2026-10-17.md`.

### Correções de segurança publicadas — 17/10/2026

O PR #2 foi mesclado e publicado: fechamento da API antiga, grants diretos e padrões de
exposição; sessão também verifica banimento, e-mail confirmado e exclusão lógica.
43 tabelas públicas continuam com RLS ligada e os seis helpers perderam acesso
externo. Nove suítes SQL antes e cinco atuais após aplicação passaram, com
rollback, além de 89 unitários, gate de código e Auth HTTP/TOTP real.
Novas senhas exigem 12 caracteres no formulário e no Auth; senhas atuais preservadas.
Produção tem 14 migrations e Worker `f22fa7b6-0046-4a44-b44d-5582ea4f22d4`,
fonte `91999f4`, com 100% do tráfego. Evidências em
`PUBLICACAO-SEGURANCA-2026-10-17.md`. O PR #3 não foi publicado.
MFA dos titulares, confirmação de e-mail e proteção contra bots têm pendências
registradas em `AUDITORIA-RLS-2026-10-17.md`; não tratar a auditoria como encerrada.

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
