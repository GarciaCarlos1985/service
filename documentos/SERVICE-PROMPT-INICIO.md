# SERVICE — MASTER BUILD SPECIFICATION
## Marketplace de Serviços Locais — Arquitetura, Produto, Segurança, Monetização, SEO e Escalabilidade

Você está construindo o SERVICE, um marketplace brasileiro de serviços locais que conecta:

**CLIENTES** que procuram serviços

com

**PROFISSIONAIS** que oferecem serviços.

Exemplos:

- diarista
- faxineiro(a)
- limpeza residencial
- limpeza pós-obra
- pintura
- pequenos reparos
- eletricista
- encanador
- chaveiro
- montagem
- manutenção
- jardinagem
- outros serviços locais

O objetivo NÃO é criar apenas uma demonstração visual.

O objetivo é construir uma fundação de produto real, segura, econômica, escalável e preparada para milhares de usuários.

---

# 0. REGRA MAIS IMPORTANTE

Antes de implementar qualquer coisa:

1. analise o projeto existente;
2. identifique o que já está implementado;
3. preserve o que estiver correto;
4. não recrie funcionalidades existentes;
5. não substitua tecnologias sem justificativa;
6. não faça grandes alterações destrutivas;
7. não faça migrations destrutivas automaticamente;
8. não apague dados;
9. não altere contratos existentes sem avaliar impacto;
10. execute build/typecheck/testes após cada grande etapa.

Se encontrar uma decisão arquitetural ruim, explique antes de substituí-la.

NÃO quero uma IA que simplesmente gere código rapidamente.

Quero uma IA que trabalhe como:

- arquiteto
- engenheiro de software
- engenheiro de segurança
- engenheiro de banco de dados
- especialista em marketplace
- especialista em pagamentos
- especialista em SEO
- especialista em UX
- administrador de infraestrutura

---

# 1. ARQUITETURA PRINCIPAL

## Frontend / Application

Utilizar:

- TanStack Start
- React
- TypeScript strict
- Vite
- Tailwind CSS
- TanStack Query
- Zod
- React Hook Form

Não utilizar:

- Next.js
- Convex
- Firebase
- outro banco como fonte de verdade
- backend proprietário como fonte de verdade

---

# 2. SUPABASE

Supabase será a fonte de verdade dos dados da aplicação.

Utilizar:

- PostgreSQL
- Supabase Auth
- Row Level Security
- Supabase Realtime
- Supabase Storage somente quando fizer sentido para objetos privados/integrados ao ecossistema Supabase

O banco deve ser projetado para milhares de usuários.

Todas as tabelas críticas devem possuir:

- UUID
- created_at
- updated_at quando aplicável
- índices apropriados
- foreign keys
- constraints
- CHECK constraints quando apropriado
- UNIQUE constraints quando apropriado
- RLS

Não confiar somente na interface para segurança.

---

# 3. CLOUDFLARE COMO INFRAESTRUTURA

O projeto deve nascer preparado para Cloudflare.

Objetivo inicial:

- Cloudflare Pages/Workers para aplicação
- Cloudflare DNS
- CDN
- cache
- proteção DDoS
- WAF quando aplicável
- R2 para arquivos e mídia
- Workers/edge para operações compatíveis
- eventualmente Queues/Cron/Workers para automações

IMPORTANTE:

Verifique a compatibilidade atual do TanStack Start com o ambiente Cloudflare antes de implementar.

Não utilizar APIs exclusivamente Node.js quando isso impedir uma implantação edge/Cloudflare.

Se houver incompatibilidade, apresentar a solução portátil antes de implementar.

---

# 4. CLOUDFLARE R2

Para fotos e mídia de profissionais, priorizar Cloudflare R2.

Exemplos:

- avatar
- portfólio
- fotos de serviços
- imagens públicas otimizadas
- thumbnails
- documentos que não contenham dados altamente sensíveis

Não colocar imagens grandes diretamente no banco.

Criar estrutura de objetos organizada, por exemplo:

users/{userId}/avatar/...
professionals/{professionalId}/portfolio/...
services/{serviceId}/...

Não permitir que o usuário possa escolher arbitrariamente uma chave de storage pertencente a outro usuário.

Uploads devem ser autorizados pelo backend.

Validar:

- MIME type
- extensão
- tamanho
- ownership
- quantidade
- plano do usuário

Gerar URLs seguras quando o conteúdo for privado.

Criar thumbnails e otimização quando fizer sentido.

Evitar servir imagens originais gigantes quando uma versão otimizada for suficiente.

---

# 5. OBJETIVO DE CUSTO

O SERVICE deve ser projetado inicialmente para operar com o menor custo possível.

Prioridade:

1. serviços gratuitos;
2. recursos serverless;
3. cache;
4. processamento sob demanda;
5. evitar servidores 24/7;
6. evitar serviços pagos desnecessários;
7. evitar duplicação de infraestrutura.

Mas NÃO sacrificar segurança ou integridade financeira simplesmente para economizar.

O objetivo é:

**custo próximo de zero no início + arquitetura capaz de crescer gradualmente conforme a receita aparecer.**

Não assumir que os planos gratuitos são ilimitados.

Criar limites e observabilidade para detectar aproximação das cotas.

---

# 6. MODELO DE NEGÓCIO

O SERVICE é um intermediador.

Cliente paga pelo serviço através da plataforma.

O profissional presta o serviço.

O SERVICE ganha dinheiro através de:

## Comissão

Exemplo configurável:

5% a 15% por transação.

NÃO fixar definitivamente no código.

Criar configuração administrativa.

Exemplo:

serviço = R$100

cliente paga R$100

SERVICE = R$10

profissional = R$90

Os percentuais devem ser configuráveis por:

- categoria
- profissional
- plano
- campanha
- período

sem alterar código.

---

# 7. RECEITAS FUTURAS

Preparar arquitetura para:

### Comissão por serviço

### Plano Premium para clientes

Benefícios possíveis:

- cashback maior
- prioridade
- descontos
- suporte prioritário
- benefícios exclusivos

### Plano PRO para profissionais

Benefícios possíveis:

- destaque na busca
- mais fotos no portfólio
- analytics
- maior exposição
- selo PRO
- ferramentas avançadas

### Serviços patrocinados

Profissionais poderão pagar para aparecer em posições patrocinadas.

IMPORTANTE:

Resultados patrocinados devem ser claramente identificados.

Nunca manipular avaliações para vender destaque.

### Taxas adicionais

Arquitetura preparada para:

- taxa de serviço
- taxa de cancelamento quando aplicável
- taxa de conveniência
- campanhas promocionais

Tudo configurável.

---

# 8. PAGAMENTOS

Para marketplace, preparar integração para:

**Stripe Connect**

como solução principal.

Motivo:

O Stripe Connect é especificamente projetado para marketplaces, permitindo contas conectadas, onboarding, pagamentos, repasses e cobrança de tarifas da plataforma.

A arquitetura deve permitir:

CLIENTE
↓
SERVICE / STRIPE CONNECT
↓
PROFISSIONAL

A plataforma deve conseguir registrar:

- valor bruto
- taxa da plataforma
- taxa do processador
- valor líquido do profissional
- payment intent
- charge
- connected account
- payout
- refund
- dispute
- status
- timestamps

Nunca guardar dados sensíveis de cartão.

---

# 9. APPMAX

Não implementar Appmax agora.

Porém, criar uma camada de abstração de pagamentos:

PaymentProvider

para permitir futuramente:

StripeProvider
AppmaxProvider
OutroProvider

A regra de negócio do SERVICE não pode depender diretamente de detalhes específicos do Stripe.

---

# 10. WEBHOOKS

Todos os webhooks devem ser:

- autenticados
- verificados
- idempotentes
- registrados
- auditáveis

Criar tabela de eventos de webhook.

Exemplo:

webhook_events

com:

- provider
- event_id
- event_type
- payload_hash
- received_at
- processed_at
- status
- error
- attempts

Um mesmo webhook recebido 10 vezes deve produzir o mesmo resultado de recebê-lo uma única vez.

---

# 11. CARTEIRA / LEDGER

A carteira é uma área financeira crítica.

NÃO permitir:

wallet.balance = valor enviado pelo frontend.

Criar ledger imutável.

Exemplo:

wallet_transactions

Tipos:

- credit
- debit
- cashback
- refund
- adjustment
- platform_fee
- payout

Transações financeiras nunca devem ser editadas ou excluídas normalmente.

Correções devem gerar uma nova transação compensatória.

Saldo deve ser derivado do ledger ou mantido como projeção protegida e reconciliável.

Criar processo de reconciliação.

---

# 12. IDEMPOTÊNCIA FINANCEIRA

Operações financeiras precisam de:

idempotency_key

Obrigatório para:

- pagamento
- refund
- cashback
- indicação
- payout
- ajustes administrativos

Uma operação repetida não pode duplicar dinheiro.

---

# 13. AGENDAMENTO

Criar sistema robusto de disponibilidade.

Profissional define:

- dias
- horários
- intervalos
- folgas
- exceções
- feriados
- bloqueios

O cliente escolhe um horário disponível.

A proteção contra double booking deve existir no banco/backend.

NÃO confiar somente em:

"verificar disponibilidade → depois inserir".

Dois clientes podem clicar simultaneamente.

O banco deve garantir a exclusividade.

---

# 14. ESTADOS DOS AGENDAMENTOS

Criar máquina de estados.

Exemplo:

pending
→ confirmed
→ in_progress
→ completed

Possíveis caminhos:

pending → cancelled

confirmed → cancelled

completed não pode voltar para pending.

As transições devem ser validadas no backend.

---

# 15. FLUXO FINANCEIRO DO SERVIÇO

Fluxo ideal:

Cliente agenda
↓
pagamento iniciado
↓
pagamento confirmado
↓
agendamento confirmado
↓
serviço executado
↓
serviço concluído
↓
avaliação
↓
liberação financeira conforme regra
↓
comissão SERVICE
↓
repasse profissional
↓
cashback quando aplicável

Nenhuma etapa financeira deve depender de clique visual do usuário.

---

# 16. CASHBACK

Cashback somente após os eventos necessários.

Exemplo:

payment = paid
AND
booking = completed
AND
customer eligible

↓

cashback transaction

Cashback deve ser:

- idempotente
- auditável
- configurável
- limitado
- protegido contra abuso

Criar regras para:

- percentual
- teto mensal
- campanhas
- Premium
- expiração

---

# 17. INDICAÇÕES

Criar sistema de referral.

Cada usuário pode possuir código único.

Exemplo:

SERVICE10ABC

Fluxo:

usuário A indica B
↓
B cria conta
↓
B realiza primeiro serviço elegível
↓
B paga
↓
serviço é concluído
↓
recompensa A
↓
recompensa B

Nunca liberar recompensa somente pelo cadastro.

Criar antifraude:

- mesmo dispositivo
- padrões suspeitos
- contas duplicadas
- mesmo meio de pagamento
- comportamento anormal

Não bloquear automaticamente todos os casos suspeitos.

Criar estado:

pending
approved
rejected
review

---

# 18. CLIENTE

Dashboard do cliente:

- próximo serviço
- agenda
- histórico
- pagamentos
- carteira
- cashback
- favoritos
- mensagens
- notificações
- Premium
- indicações
- perfil

---

# 19. PROFISSIONAL

Dashboard profissional:

- agenda
- próximos serviços
- ganhos
- repasses
- avaliações
- nota média
- taxa de conclusão
- cancelamentos
- mensagens
- portfólio
- disponibilidade
- serviços
- clientes
- plano PRO
- analytics

---

# 20. PERFIL DO PROFISSIONAL

O perfil público deve funcionar como uma landing page individual.

Exemplo:

SERVICE
↓
Maria — Diarista em Guarujá
↓
4.9 ⭐
↓
127 avaliações
↓
R$120 a partir de
↓
portfólio
↓
serviços
↓
disponibilidade
↓
avaliações
↓
Agendar

Criar URL amigável.

Exemplo:

/profissionais/guaruja/maria-silva

---

# 21. SEO — MUITO IMPORTANTE

O SERVICE precisa ser encontrado no Google.

Não criar apenas uma SPA invisível para mecanismos de busca.

Implementar SEO técnico.

Criar páginas públicas indexáveis para:

- categorias
- cidades
- bairros
- profissionais
- serviços
- combinações relevantes

Exemplos:

/diaristas/guaruja
/diaristas/santos
/limpeza/guaruja
/chaveiro/santos
/pintor/guaruja

Somente criar páginas com conteúdo real.

NÃO gerar milhares de páginas vazias para tentar manipular SEO.

---

# 22. SEO DOS PROFISSIONAIS

Cada profissional público deve possuir:

- title
- meta description
- canonical
- Open Graph
- structured data quando apropriado
- endereço aproximado
- categoria
- avaliações
- serviços
- disponibilidade quando apropriado

Nunca expor dados pessoais sensíveis.

---

# 23. STRUCTURED DATA

Quando aplicável, utilizar schema.org apropriado.

Avaliar:

- LocalBusiness
- Service
- BreadcrumbList
- WebSite
- Organization

Não inventar avaliações ou informações estruturadas.

---

# 24. PERFORMANCE

O SERVICE precisa carregar muito rápido.

Prioridades:

- HTML rápido
- JavaScript mínimo
- lazy loading
- code splitting
- imagens WebP/AVIF quando suportadas
- thumbnails
- CDN
- cache
- prefetch apenas quando fizer sentido
- evitar bibliotecas pesadas desnecessárias
- evitar componentes gigantes
- evitar requests duplicadas

Meta:

Core Web Vitals excelentes.

Especialmente:

- LCP
- CLS
- INP

---

# 25. MOBILE FIRST

A maior parte dos usuários provavelmente estará no celular.

Interface:

- touch friendly
- botões grandes
- bottom navigation
- carregamento rápido
- baixa utilização de dados
- skeletons
- estados offline quando possível

---

# 26. PWA

Preparar para PWA.

Possibilitar:

- instalação
- ícone
- splash
- cache de assets
- experiência semelhante a aplicativo

Offline não deve permitir operações financeiras.

Offline pode permitir:

- abrir algumas telas
- visualizar dados previamente armazenados
- mostrar estado offline

---

# 27. CHAT

Chat exclusivamente relacionado ao contexto do marketplace.

Cada conversa deve estar ligada a:

- booking
- cliente
- profissional

Nunca permitir acesso a conversas de terceiros.

Utilizar Supabase Realtime onde fizer sentido.

Implementar:

- paginação
- unread count
- timestamps
- read status
- rate limiting
- denúncia
- bloqueio
- moderação futura

Não transformar o chat em uma rede social.

---

# 28. NOTIFICAÇÕES

Criar sistema centralizado.

Tipos:

- booking
- payment
- payout
- cashback
- review
- referral
- system
- dispute
- security

Preparar arquitetura para:

- in-app
- email
- push

Não implementar todos os canais imediatamente.

---

# 29. FAVORITOS

Cliente pode favoritar profissionais.

Busca deve permitir:

- favoritos
- bairro
- categoria
- avaliação
- preço
- disponibilidade

---

# 30. BUSCA

Criar busca inicialmente baseada em PostgreSQL bem indexado.

Preparar arquitetura para evolução futura para mecanismo de busca especializado somente quando houver necessidade real.

Filtros:

- categoria
- cidade
- bairro
- preço
- nota
- disponibilidade
- distância quando houver geolocalização apropriada

Ranking:

- proximidade
- relevância
- avaliação
- disponibilidade
- taxa de conclusão
- qualidade do perfil
- profissional PRO
- patrocinado

Resultados patrocinados devem ser identificados.

---

# 31. GEOLOCALIZAÇÃO

Não exigir GPS para tudo.

Permitir:

- cidade
- bairro
- CEP
- localização aproximada

Se usar coordenadas:

não armazenar localização precisa desnecessariamente.

Usar somente a precisão necessária.

---

# 32. CONFIANÇA

Profissionais devem poder passar por verificação.

Criar:

verification_status

Exemplo:

unverified
pending
verified
rejected
suspended

Admin controla a verificação.

Criar badges:

- Verificado
- PRO
- Top profissional
- Alta avaliação

Cada badge precisa ter regra objetiva.

---

# 33. AVALIAÇÕES

Somente permitir avaliação se:

- usuário é cliente daquele booking
- booking pertence ao cliente
- booking está concluído
- ainda não existe avaliação válida

Profissional pode responder avaliação.

Criar proteção contra:

- avaliações duplicadas
- avaliações falsas
- autoavaliação
- manipulação

---

# 34. DISPUTAS

Criar sistema interno de disputas.

Cliente ou profissional pode abrir disputa relacionada a um booking.

Estados:

open
under_review
resolved
rejected

Permitir:

- motivo
- descrição
- evidências
- imagens
- mensagens
- decisão administrativa
- histórico

---

# 35. ADMIN — SUPER PAINEL

Criar painel administrativo poderoso, modular e seguro.

Não quero apenas CRUD.

Quero uma central operacional.

## Dashboard

Mostrar:

- usuários
- clientes
- profissionais
- profissionais verificados
- bookings
- GMV
- receita SERVICE
- comissões
- pagamentos
- reembolsos
- cashback
- assinaturas
- indicações
- disputas
- crescimento
- conversão
- retenção

---

# 36. ADMIN — USUÁRIOS

Permitir:

- pesquisar
- filtrar
- visualizar
- editar campos permitidos
- suspender
- reativar
- verificar
- alterar plano dentro das regras
- visualizar histórico

Operações perigosas devem exigir confirmação.

---

# 37. ADMIN — PROFISSIONAIS

Permitir:

- verificar
- suspender
- analisar portfólio
- visualizar avaliações
- visualizar taxa de conclusão
- visualizar cancelamentos
- visualizar receita
- visualizar disputas
- destacar
- remover destaque

---

# 38. ADMIN — FINANCEIRO

Dashboard:

- pagamentos
- taxas
- comissão SERVICE
- saldo pendente
- repasses
- refunds
- chargebacks
- cashback
- receita por período

Nunca permitir edição direta de saldo.

Admin financeiro deve gerar transações de ajuste auditáveis.

---

# 39. ADMIN — AUDITORIA

Criar:

admin_audit_logs

Registrar:

- quem
- quando
- IP quando apropriado
- ação
- recurso
- ID
- antes
- depois
- motivo

Exemplo:

ADMIN Carlos
alterou comissão
10% → 12%
motivo: campanha de agosto

---

# 40. ADMIN — PERMISSÕES

Não usar apenas:

role = admin

Criar possibilidade futura de:

super_admin
support
moderator
finance
operations
marketing
analyst

Princípio:

**least privilege.**

Cada função recebe somente o que precisa.

Operações financeiras críticas exigem permissões específicas.

---

# 41. ADMIN — PREVIEW / SAFE MODE

O painel administrativo deve ter mecanismo seguro para alterações.

Operações sensíveis devem possuir:

### Preview

Mostrar:

"Você está prestes a alterar..."

antes de aplicar.

### Dry Run

Simular alteração sem persistir.

### Confirmation

Confirmar explicitamente.

### Audit

Registrar operação.

### Rollback

Quando tecnicamente seguro, oferecer reversão.

NUNCA criar rollback falso.

Se uma operação não for reversível, informar claramente.

---

# 42. FEATURE FLAGS

Criar sistema de feature flags.

Exemplo:

premium_enabled
referrals_enabled
new_search_enabled
new_checkout_enabled

Permitir ativar funcionalidades gradualmente.

Possibilitar:

- 1% dos usuários
- 10%
- 50%
- 100%

Preparar para A/B testing futuro.

---

# 43. DEPLOY SEGURO

Arquitetura preparada para:

development
staging
production

Nunca testar migrations perigosas diretamente em produção.

Toda mudança estrutural deve ser:

1. criada;
2. validada;
3. testada;
4. aplicada;
5. monitorada.

---

# 44. BACKUPS E RECUPERAÇÃO

Não assumir que backup significa recuperação automática.

Documentar:

- backup
- restore
- disaster recovery
- RPO
- RTO

Criar procedimentos.

---

# 45. OBSERVABILIDADE

Criar logs estruturados.

Monitorar:

- erros
- pagamentos
- webhooks
- bookings
- falhas
- latência
- consumo
- exceções

Não registrar:

- senha
- token
- cartão
- segredo
- dados sensíveis desnecessários

---

# 46. RATE LIMITING

Preparar rate limit para:

- login
- cadastro
- chat
- busca
- criação de booking
- pagamento
- referral
- avaliações
- upload
- endpoints administrativos

Preferir mecanismos Cloudflare quando apropriado.

---

# 47. ANTI-FRAUDE

Criar camada preparada para:

- múltiplas contas
- abuso de referral
- abuso de cashback
- spam
- fake reviews
- chargebacks
- comportamento automatizado
- tentativas de privilege escalation

Não bloquear automaticamente usuários apenas por heurística fraca.

Criar score de risco e revisão.

---

# 48. LGPD

Implementar:

- consentimento
- política de privacidade
- termos de uso
- controle de dados
- exclusão quando legalmente possível
- minimização
- logs apropriados
- exportação de dados quando aplicável

Não coletar dados sem necessidade.

---

# 49. AUTENTICAÇÃO

Durante desenvolvimento:

cadastro pode entrar diretamente no onboarding.

Arquitetura deve permitir ativar confirmação de email posteriormente em produção.

Preparar:

- email/password
- recuperação de senha
- sessão segura
- logout
- proteção contra abuso

---

# 50. BANCO — ENTIDADES PRINCIPAIS

Criar/avaliar pelo menos:

profiles

services

service_categories

professional_availability

availability_exceptions

bookings

booking_events

payments

payment_events

wallets

wallet_transactions

reviews

review_responses

favorites

messages

message_reads

notifications

subscriptions

referrals

referral_events

professional_gallery

disputes

dispute_messages

admin_audit_logs

feature_flags

platform_settings

webhook_events

risk_events

---

# 51. INDEXAÇÃO

Planejar índices para:

- user_id
- professional_id
- client_id
- booking status
- booking date
- category
- city
- neighborhood
- rating
- created_at
- payment status
- subscription status

Não criar índices indiscriminadamente.

Avaliar consultas reais.

---

# 52. PAGINAÇÃO

Nunca carregar milhares de registros de uma vez.

Utilizar:

- cursor pagination quando apropriado
- limit
- filtros
- índices

Principalmente:

- mensagens
- bookings
- notificações
- avaliações
- usuários admin
- transações financeiras

---

# 53. AUTOMATIZAÇÃO

Preparar automações para:

- expiração de assinatura
- lembrete de serviço
- lembrete de avaliação
- cashback
- referral
- limpeza de dados temporários
- processamento de eventos
- notificações
- relatórios

Cloudflare Workers/Queues/Cron podem ser utilizados quando fizer sentido e quando os limites/custos forem adequados.

Cloudflare Queues atualmente possui uma franquia gratuita de operações por dia, portanto pode ser considerada para tarefas assíncronas leves.

---

# 54. AUTOSSUSTENTAÇÃO

O produto deve possuir mecanismos que aumentem receita sem depender exclusivamente de aquisição paga.

Criar estrutura para:

- comissão
- Premium
- PRO
- destaque patrocinado
- campanhas
- referral
- recorrência
- retenção

O objetivo é:

mais clientes
→ mais serviços
→ mais profissionais
→ mais oferta
→ melhor busca
→ mais confiança
→ mais serviços
→ maior receita
→ reinvestimento
→ crescimento.

---

# 55. RETENÇÃO

Toda jornada deve pensar no próximo passo.

Depois do serviço:

concluir
→ avaliar
→ cashback
→ contratar novamente
→ Premium
→ indicar

Mas sem spam.

Criar regras de frequência para mensagens promocionais.

---

# 56. SEO + CONTEÚDO

Preparar estrutura para conteúdo orgânico.

Futuro:

/guias/como-escolher-diarista
/guias/quanto-custa-uma-diarista
/guias/limpeza-pos-obra
/cidades/guaruja
/cidades/santos

Conteúdo deve ser útil e original.

Não criar páginas automaticamente apenas para gerar milhares de URLs.

---

# 57. LANDING PAGE

Criar uma landing page extremamente rápida.

Mensagem clara:

"Encontre profissionais de confiança perto de você."

CTAs:

"Encontrar um profissional"

"Quero oferecer meus serviços"

Mostrar:

- categorias
- cidades atendidas
- benefícios
- segurança
- avaliações
- como funciona

---

# 58. DESIGN

Identidade:

verde → azul claro

Visual:

- moderno
- confiável
- limpo
- amigável
- profissional

Mobile-first.

Cards arredondados.

Microinterações discretas.

Não sacrificar performance por animações.

---

# 59. ACESSIBILIDADE

Implementar:

- semantic HTML
- keyboard navigation
- contraste
- labels
- aria quando necessário
- foco visível
- mensagens de erro acessíveis

---

# 60. TYPESCRIPT

Strict.

Proibido:

any

quando existir alternativa tipada.

Não esconder erros com:

as any

@ts-ignore

@ts-expect-error

sem justificativa documentada.

---

# 61. COMPONENTES

Criar design system reutilizável.

Exemplos:

Button
Input
Select
Modal
Dialog
Toast
Card
Badge
Avatar
Skeleton
Table
Pagination
EmptyState
ErrorState
LoadingState

Não duplicar componentes sem necessidade.

---

# 62. ESTADOS DE UX

Toda tela precisa considerar:

- loading
- success
- empty
- error
- unauthorized
- offline quando aplicável

Nunca deixar spinner infinito.

---

# 63. SEGURANÇA

Testar explicitamente:

Cliente A tentando acessar Cliente B.

Profissional A tentando acessar Profissional B.

Cliente tentando alterar saldo.

Cliente tentando virar admin.

Usuário tentando alterar próprio role.

Usuário tentando criar cashback.

Usuário tentando duplicar referral.

Usuário tentando avaliar serviço que não realizou.

Usuário tentando reservar horário já reservado.

Webhook duplicado.

Pagamento duplicado.

Refund duplicado.

Admin sem permissão tentando ação financeira.

---

# 64. TESTES

Criar testes para regras críticas.

Prioridade:

1. autenticação
2. RLS
3. booking
4. double booking
5. pagamento
6. webhook
7. ledger
8. cashback
9. referral
10. permissions
11. disputas

---

# 65. PERFORMANCE TESTING

Antes de declarar pronto:

avaliar:

- bundle
- imagens
- requests
- consultas SQL
- índices
- cache
- Core Web Vitals

Evitar overengineering prematuro.

---

# 66. ESCALABILIDADE

Projetar progressivamente.

### Fase 1

0–1.000 usuários

Priorizar simplicidade.

### Fase 2

1.000–10.000

Melhorar:

- índices
- cache
- queries
- filas
- observabilidade

### Fase 3

10.000–100.000+

Avaliar:

- search engine
- filas
- processamento assíncrono
- read models
- caching avançado
- particionamento quando necessário

NÃO introduzir infraestrutura complexa antes de existir necessidade real.

---

# 67. PRINCÍPIO DE ECONOMIA

Antes de adicionar qualquer serviço externo:

perguntar:

"Supabase ou Cloudflare já resolve isso?"

Se sim, preferir a infraestrutura existente.

Evitar:

- Redis prematuramente
- Elasticsearch prematuramente
- servidores VPS
- múltiplos bancos
- múltiplos storage providers
- serviços pagos sem necessidade

---

# 68. ADMIN — KILL SWITCH

Para funcionalidades problemáticas, preparar possibilidade de desligamento controlado.

Exemplo:

disable_payments
disable_referrals
disable_cashback
disable_new_bookings

Isso deve ser protegido e auditado.

---

# 69. MIGRATIONS

Nunca fazer:

DROP TABLE
DROP COLUMN
DELETE DATA

automaticamente em produção.

Mudanças destrutivas devem exigir análise explícita.

Preferir migrations compatíveis para frente:

1. adicionar
2. migrar
3. validar
4. mudar código
5. remover legado posteriormente

---

# 70. DOCUMENTAÇÃO

Criar:

ARCHITECTURE.md
SECURITY.md
DATABASE.md
PAYMENTS.md
DEPLOYMENT.md
SEO.md
ADMIN.md
DISASTER-RECOVERY.md
ROADMAP.md

Documentar decisões arquiteturais importantes.

---

# 71. ROADMAP

Preparar evolução:

## MVP

Auth
Profiles
Services
Search
Booking
Payment architecture
Chat
Reviews

## V1

Wallet
Cashback
Premium
PRO
Referral
Portfolio
Notifications
Admin

## V2

Stripe Connect
Disputes avançadas
Analytics
PWA
SEO avançado
Automação

## V3

Ranking inteligente
recomendação
anti-fraude avançado
expansão geográfica
novas categorias
novas formas de monetização

---

# 72. REGRA SOBRE IA

Se uma decisão for ambígua:

NÃO invente.

Apresente:

- problema
- opções
- recomendação
- impacto
- custo
- risco

Depois aguarde autorização quando a decisão for arquitetural ou financeira.

---

# 73. REGRA SOBRE PAGAMENTOS

Nunca implementar um pagamento "fake" que pareça real em produção.

Durante desenvolvimento pode existir mock.

Mas deve ser claramente separado:

MOCK
vs
PRODUCTION

Nunca misturar.

---

# 74. REGRA SOBRE DADOS

Não utilizar dados fictícios como se fossem usuários reais.

Seeds de desenvolvimento devem ser claramente identificados.

---

# 75. REGRA SOBRE ADMIN

O painel pode ser extremamente poderoso.

Mas poder não significa acesso irrestrito.

Toda operação crítica deve ter:

- permissão
- confirmação
- auditoria
- validação
- possibilidade de reversão quando segura

---

# 76. REGRA FINAL DE IMPLEMENTAÇÃO

Não tente construir tudo em uma única operação.

Divida em milestones.

### Milestone 0
Arquitetura + auditoria

### Milestone 1
Database + Auth + RLS

### Milestone 2
Cliente + Profissional + Serviços

### Milestone 3
Busca + SEO + Perfil público

### Milestone 4
Agendamento + disponibilidade + proteção contra double booking

### Milestone 5
Pagamentos + Stripe abstraction

### Milestone 6
Ledger + cashback + comissão

### Milestone 7
Chat + notificações

### Milestone 8
Reviews + confiança + disputas

### Milestone 9
Premium + PRO + Referral

### Milestone 10
Admin completo

### Milestone 11
Cloudflare + R2 + performance + PWA

### Milestone 12
Security audit + load/performance audit + production readiness

---

# 77. ANTES DE CADA MILESTONE

Você deve:

1. ler o código existente;
2. identificar dependências;
3. explicar o que será alterado;
4. implementar;
5. executar typecheck;
6. executar lint;
7. executar testes;
8. executar build;
9. verificar regressões;
10. somente então marcar como concluído.

---

# 78. DEFINIÇÃO DE "PRONTO"

Uma funcionalidade só está pronta quando:

- funciona;
- está tipada;
- está protegida;
- possui estados de erro;
- possui loading;
- possui RLS quando aplicável;
- não duplica dados;
- não quebra funcionalidades existentes;
- foi testada;
- build passa;
- não possui secrets expostos;
- possui documentação quando necessário.

---

# 79. OBJETIVO FINAL

O SERVICE deve evoluir para uma plataforma onde:

CLIENTE

encontra profissionais confiáveis
→ agenda
→ paga
→ conversa
→ recebe o serviço
→ avalia
→ recebe benefícios
→ retorna.

PROFISSIONAL

entra
→ cria perfil
→ comprova identidade quando necessário
→ cadastra serviços
→ recebe clientes
→ trabalha
→ recebe
→ constrói reputação
→ cresce dentro da plataforma.

SERVICE

intermedia
→ cobra comissão
→ oferece Premium/PRO
→ controla qualidade
→ reduz fraude
→ aumenta retenção
→ gera receita
→ reinveste no crescimento.

---

# 80. PRIMEIRA AÇÃO

NÃO comece construindo telas.

Primeiro faça uma auditoria do projeto atual.

Entregue:

1. arquitetura atual;
2. tecnologias detectadas;
3. funcionalidades já existentes;
4. banco atual;
5. problemas encontrados;
6. riscos de segurança;
7. riscos financeiros;
8. problemas de escalabilidade;
9. problemas de SEO;
10. problemas de performance;
11. compatibilidade Cloudflare;
12. dependências que podem gerar custo;
13. o que deve ser preservado;
14. o que deve ser corrigido;
15. roadmap recomendado.

Depois apresente o plano do **Milestone 0**.

Aguarde minha autorização antes de executar mudanças estruturais.

O objetivo não é simplesmente gerar o máximo de código.

O objetivo é construir o SERVICE como um produto real, sustentável, seguro, rápido, encontrável no Google e capaz de crescer de centenas para milhares e posteriormente dezenas de milhares de usuários sem precisar ser reconstruído do zero.