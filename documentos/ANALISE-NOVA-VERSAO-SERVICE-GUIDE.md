# Análise da nova versão e reaproveitamento da base atual

Data: **14/10/2026**, horário de referência America/Sao_Paulo.

Escopo: entender o projeto existente, inspecionar o pacote em `public/` e definir um caminho de adaptação. Este documento é um diagnóstico e uma proposta; não aprova decisões novas de schema nem representa uma migração executada.

## Conclusão

**É viável adotar a interface e os fluxos do pacote preservando TanStack Start, Supabase, autenticação existente, organização por domínios, CI e hospedagem Vercel.**

A abordagem recomendada é portar a apresentação e conectar suas funcionalidades aos módulos do projeto. O pacote é outra aplicação completa, com premissas diferentes de infraestrutura, identidade e banco. Substituir o repositório pelo seu conteúdo não atende ao objetivo de reaproveitamento.

A mudança também exige implementar a fundação comercial do Service Guide no Supabase deste repositório: esse banco ainda está no modelo anterior de profissionais. Isso confirma o estado descrito em `ROADMAP.md`; não se trata apenas de trocar o visual. A versão hospedada no ChatGPT possui um backend separado, confirmado no complemento abaixo.

## Complemento: backend hospedado confirmado em 15/10/2026

Após o esclarecimento do proprietário sobre a criação da versão no ChatGPT, foram feitas consultas somente de leitura pelo conector Sites:

- O Site **Service Guide** está ativo, associado ao projeto `appgprj_6ac464c6cd1c8191b6fc4f232342790b`, com URL `https://service-guide-cacoal.helon280.chatgpt.site` e última versão salva número 2.
- A configuração de acesso consultada está restrita ao proprietário; a existência do link não significa acesso público ao guia.
- O banco hospedado tem binding **DB** e **21 tabelas**, incluindo `companies`, `products`, `services`, `offerings`, `plans`, `favorites`, `reviews`, `conversations`, `analytics_events` e `support_requests`.
- Isso confirma um backend persistente provisionado pelo Sites, além do código de interface. A arquitetura exportada usa Cloudflare Workers, banco D1 e armazenamento R2, com identidade gerenciada pelo ChatGPT.
- A OpenAI documenta que Sites provisiona armazenamento relacional D1 e arquivos R2: [documentação oficial de Sites](https://learn.chatgpt.com/docs/sites?surface=web).

Portanto, há **dois ambientes independentes**: o Service Guide hospedado pelo ChatGPT/Sites e o projeto local com Supabase/Vercel. As ausências de empresas/produtos mencionadas nesta análise se referem ao Supabase atual do repositório; essas tabelas já existem no banco D1 do Site.

Para manter a hospedagem Sites, não é necessário recriar seu backend apenas porque o ZIP foi exportado. Para trazer a nova versão ao projeto atual, conforme o objetivo original, continua necessária a adaptação de autenticação, schema, armazenamento e execução. Regras e validações do backend exportado podem ser reaproveitadas após revisão; os bancos não passam a compartilhar registros automaticamente.

A consulta confirmou o cadastro do Site e a existência das tabelas D1. Não validou todos os fluxos em execução, os arquivos R2, credenciais externas ou uma integração ativa com Supabase. Não foram alterados dados, acesso, versões ou publicação do Site.

## Material inspecionado

- Arquivo encontrado: `public/service-guide-codigo-completo.zip`; nenhum `.rar` encontrado em `public/`.
- Tamanho do ZIP: **2.353.904 bytes**; **182 arquivos**, somando **3.239.400 bytes** descompactados.
- SHA-256: `69F9A248FAD8BB2C2FFBD7F5C7361144B9A5A162295387554570FCEF3CDB778C`.
- Extração feita em diretório temporário, com validação de contenção dos caminhos e cópia por stream. Nenhum conteúdo foi sobreposto ao código do projeto.
- A referência visual do pacote inclui `app/globals.css`, `DESIGN.md`, `.impeccable/surfaces/directory.md`, fontes Manrope locais e assets WebP. A versão WebP da marca tem **32.458 bytes**.

As referências `ZIP:...` abaixo indicam entradas dentro desse arquivo, não arquivos já incorporados ao repositório.

## Base atual: fatos medidos

Código e configuração:

- TanStack Start, React 19, Vite, Tailwind 4 e TypeScript estrito, com `noUncheckedIndexedAccess`.
- Módulos em `src/modules/`, rotas em `src/routes/`, componentes compartilhados em `src/modules/ui/`.
- Supabase Auth utilizado por `src/modules/auth/auth-context.tsx`; cliente em `src/lib/supabase.ts`.
- Busca atual sobre `profiles` de profissionais; o texto filtra `full_name`. A rota pública `/buscar` ainda não oferece a busca comercial por produtos da nova spec.
- Favoritos apontam para profissionais; avaliações e conversas dependem de bookings.
- Há marcador administrativo protegido (`profiles.is_admin` e `_is_admin()`), mas não há painel administrativo comercial nas rotas atuais.
- Build SSR configurado para Vercel via Nitro. CI possui typecheck, lint, formatação, testes e build.
- Há alterações locais anteriores à análise. Elas foram preservadas; nenhum commit, push ou deploy foi executado.

Banco real, consultado com `default_transaction_read_only=on`:

- A conexão corresponde ao mesmo projeto configurado na URL pública do aplicativo.
- **25 tabelas** no schema `public`, todas com RLS habilitado. Isso confirma a configuração, não constitui auditoria completa das políticas.
- **9 migrações** registradas, de `20260812120000` a `20260813120000`, correspondentes aos arquivos existentes.
- Não existem `companies`, `products`, `plans`, `company_subscriptions`, `analytics_events`, `company_members`, `platform_settings` ou `admin_audit_logs`.
- **Cacoal não está cadastrada** em `cities`.
- A leitura REST de `cities` com `limit=0` respondeu HTTP 200. Cadastro, login e recuperação de senha não foram exercitados nesta análise.

## O que a nova versão contém

O código do ZIP contém home de descoberta, busca paginada com filtros na URL, categorias, cards, perfil de empresa, página de item e suas empresas, favoritos, conta, ajuda, privacidade e painel administrativo.

O painel inclui empresas com cadastro em etapas e rascunho, produtos/serviços, categorias, planos, moderação de avaliações, contatos, solicitações de ajuda/inclusão, usuários, métricas e integrações. Existem implementações de mídia, consentimento para analytics, limites de requisições, auditoria, exportação e avisos via Discord.

Esses são fluxos encontrados no código, não funcionalidades validadas em execução nesta análise. O pacote inclui empresas e ofertas demonstrativas identificadas; não são cadastros comerciais reais.

Sua stack é **Vinext, com convenções de Next App Router**, React, Cloudflare Workers, D1 e R2. O login depende do Sign in with ChatGPT gerenciado pelo Sites. Existe um adaptador opcional para Supabase, mas ele não reutiliza Supabase Auth nem elimina a dependência operacional de D1.

`ZIP:SETUP.md` menciona outro projeto Supabase, diferente do configurado neste repositório. As afirmações sobre migrações, publicação e testes daquele ambiente não foram verificadas e não comprovam integração com o backend atual.

## Mapa de reaproveitamento

| Área | Aproveitar | Adaptação necessária |
| --- | --- | --- |
| Interface | Composição, marca, estilos, imagens, estados e fluxos do ZIP | Componentes nas camadas atuais; navegação, loaders e parâmetros via TanStack Router |
| Autenticação | Supabase Auth, cadastro, login e recuperação existentes | Remover dependência de cabeçalhos e rotas de login do Sites; simplificar onboarding para consumidor |
| Banco | Projeto Supabase atual, histórico de migrações, cidades e perfis | Acrescentar entidades comerciais com relacionamentos, RLS e RPCs compatíveis |
| Administração | Telas, formulário em etapas, rascunhos, moderação e métricas do ZIP | Autorização no servidor/banco e auditoria; não transportar a allowlist de e-mails como autorização definitiva |
| Busca | Experiência e filtros do ZIP; rotas e infraestrutura atuais | Consultas comerciais paginadas e indexadas em PostgreSQL; cobrir empresa, produto e serviço |
| Favoritos, reviews e contato | Experiência do ZIP e padrões dos módulos atuais | Entidades ligadas à empresa, sem exigir booking e sem reinterpretar registros legados |
| Mídia | Assets otimizados; experiência de gestão de mídia | URL controlada no MVP ou storage autorizado em fase própria; o código R2 não funciona diretamente na Vercel |
| Analytics e avisos | Vocabulário de eventos, consentimento e apresentação | Persistência append-only e métricas agregadas no Supabase; Discord exige adaptação específica se entrar no escopo |
| Deploy e qualidade | Vercel/Nitro, npm, lockfile, ESLint, Vitest e CI atuais | Preservar o pipeline; não importar o runtime, instaladores e ferramentas de publicação do Sites |
| Legado financeiro | Código e tabelas existentes | Permanecem preservados e fora dos fluxos comerciais novos, conforme ADR-041/044 |

## Incompatibilidades e impactos

### 1. O SQL do ZIP não pode ser aplicado diretamente

`ZIP:supabase/schema.sql` começa orientando a execução em um projeto Supabase **novo**. Ele recria nomes já utilizados aqui:

| Tabela | Banco atual, confirmado ao vivo | Pacote novo |
| --- | --- | --- |
| `services` | `id uuid`, `professional_id`, `title`, preço em centavos | `id text`, `name`, categoria; vínculo à empresa via `offerings` |
| `favorites` | Chave por `client_id` e `professional_id` | `id text`, `user_id`, `company_id` |
| `reviews` | `booking_id`, `reviewer_id`, `professional_id` | `user_id`, `company_id`, status de moderação |
| `conversations` | Booking e participantes, com mensagens separadas | Solicitação com `user_id`, `company_id`, `message` e status |

O SQL integral falharia por colisão de objetos. Excluir tabelas para fazê-lo funcionar destruiria compatibilidade. A solução é migração aditiva, mantendo o significado dos registros antigos.

### 2. Identidade e permissões são diferentes

`ZIP:app/chatgpt-auth.ts` obtém identidade de cabeçalhos fornecidos pelo Sites. `ZIP:lib/security.ts` usa essa identidade e `ADMIN_EMAILS`. Esses mecanismos não substituem a sessão e os UUIDs de `auth.users` deste projeto.

As rotas e RPCs comerciais precisam validar o usuário e suas permissões em ambiente confiável. O redirecionamento de interface do painel atual não é autorização suficiente para operações administrativas.

O ZIP revoga acesso de `anon`/`authenticated` às suas tabelas e depende de acesso privilegiado pelo servidor. A regra local exige escrita nova via RPC/backend autorizado. Existem escritas diretas autorizadas por policies em módulos legados; sua existência não deve ser tomada como padrão para o domínio novo.

### 3. A opção Supabase do ZIP continua dependendo de Cloudflare

`ZIP:lib/integrations.ts` mantém cofre e estado operacional em D1. `ZIP:lib/security.ts` usa D1 para rate limiting, e `ZIP:lib/notifications.ts` usa D1 para a fila do Discord. Imagens continuam em R2.

Portanto, fornecer uma chave Supabase ao pacote não o torna uma aplicação compatível com a infraestrutura atual. Seus adaptadores de dados, armazenamento e integrações precisam ser substituídos ou redesenhados dentro da stack mantida.

### 4. Alguns contratos ainda divergem da spec local

- O pacote usa cidade, bairro e endereço como texto livre; aqui, cidade deve referenciar o catálogo IBGE e o endereço deve ser estruturado.
- Rotas do pacote usam `/empresa/<id>` e `/item/<id>`; a spec pede empresa em `/empresas/<cidade>/<slug>`. Há também uma origem de SEO fixa em `ZIP:lib/seo.ts` que não deve ser copiada.
- `products` e `services` são conceitos compartilhados ligados por `offerings` no ZIP; a spec/ADR-043 descreve registros ligados à empresa. Essa diferença precisa ser resolvida antes da migration.
- Planos têm limites configuráveis, mas o fluxo encontrado altera `companies.plan_id`. A existência das tabelas `subscriptions`, `permissions` e `campaigns` não comprova gestão de assinatura com validade/auditoria nem permissões hierárquicas implementadas.
- Eventos usam o helper genérico de upsert; não foi encontrada proteção de banco contra alteração/exclusão de analytics no SQL fornecido. A nova implementação deve impor o contrato append-only.
- A solicitação de contato do ZIP é um registro para a equipe acompanhar. Não equivale ao chat existente nem comprova entrega automática à empresa.

### 5. Exportação e métricas precisam respeitar o limite de memória

`ZIP:lib/db.ts` acumula até 10 mil registros por tabela. `ZIP:app/api/admin/export/route.ts` carrega as tabelas em paralelo e monta um JSON integral. O painel também busca conjuntos extensos para calcular métricas no cliente.

Preservar a experiência, mas usar agregações e paginação no servidor. Exportações e processamento de grandes volumes devem usar streams/buffers e lotes limitados, conforme a regra do projeto. A exportação JSON do ZIP também não inclui imagens e não constitui backup completo.

### 6. O arquivo-fonte está em uma pasta pública

O build local copiou o ZIP para `.vercel/output/static/service-guide-codigo-completo.zip`, com o mesmo tamanho do original. Se essa saída for publicada, o pacote ficará disponível como arquivo estático.

Antes de um próximo deploy, guardar o arquivo-fonte fora de `public/` e ajustar o processo de build para que ele não seja publicado. O ZIP foi mantido no lugar nesta análise; nenhum deploy foi executado.

## Sequência recomendada de adaptação

1. **Definir o contrato de integração.** Manter a stack vigente e usar a versão nova como referência de interface e experiência. Registrar ADRs somente para as decisões de schema ainda abertas.
2. **Preparar preview isolado.** Portar a composição visual, fontes e assets para componentes da estrutura atual, preservando as alterações locais e identificando qualquer dado demonstrativo.
3. **Implementar a fundação comercial.** Empresas, catálogo, serviços de empresa, mídia, planos/assinaturas manuais, eventos, auditoria e permissões necessárias. Incluir Cacoal no catálogo canônico por migração apropriada. Testar relacionamentos, RLS e RPCs antes de ligar as telas a dados persistentes.
4. **Conectar os fluxos públicos.** Home, busca, perfis de empresas/itens, conta, favoritos, avaliações e contato. Preservar Supabase Auth; adaptar SEO e rotas à spec; coletar eventos conforme a política definida.
5. **Conectar administração e operação.** Cadastros, rascunhos, moderação, solicitações, planos manuais e métricas. Adaptar integrações do pacote conforme necessidade real, sem introduzir D1 apenas para conservar código do starter.
6. **Validar antes de publicar.** Gate completo, testes de SQL em ambiente autorizado, revisão desktop/mobile, ações autenticadas e negativas de permissão. A validação humana precede alterações de produção e deploy.

### Decisões de schema a confirmar antes da implementação

- **Colisões com legado:** recomendação alinhada ao `REUSE-MAP.md`: criar entidades separadas, como `company_services`, em vez de converter a `services` existente. Aplicar o mesmo raciocínio a favoritos, reviews e contato. Benefício: baixo impacto sobre contratos atuais; custo: coexistência explícita de dois domínios.
- **Itens e ofertas:** seguir o vínculo por empresa da spec vigente ou adotar catálogo compartilhado e ofertas do ZIP com novo ADR. A segunda opção facilita uma página de item com várias empresas, mas altera o contrato de dados já documentado.
- **Categorias e contato:** escolher evolução compatível do catálogo atual ou nova entidade; definir solicitação acompanhada pela equipe versus conversa com mensagens. Os nomes finais e seus relacionamentos dependem desses contratos.

Nenhuma dessas opções foi implementada ou aplicada ao banco durante a análise.

## Verificações e limites

| Verificação da base atual | Resultado |
| --- | --- |
| `npm run typecheck` | Passou |
| `npm run lint` | Passou: zero erros e 29 avisos, de Fast Refresh e diretiva de lint sem uso |
| `npm run test` | Passou: 19 testes em 4 arquivos |
| `npm run build` | Passou; saída Vercel gerada localmente |
| Metadados do banco real | Leitura confirmada em modo somente leitura; 25 tabelas com RLS e 9 migrations |
| API REST de cidades | HTTP 200 em consulta sem linhas |
| Preservação do trabalho existente | Arquivos de código e alterações locais preservados |

O build atual não valida o ZIP, porque ele é tratado como asset estático. Não foram instaladas dependências nem executados scripts do pacote. As alegações de testes de seu `SETUP.md` são históricas e não foram reproduzidas.

Não foram executados testes SQL que criam/removem dados, migrations, login real, revisão visual no navegador, envios ao Discord ou publicação. Os 73 testes SQL mencionados na documentação existente não foram reexecutados.

O Graphify fez extração estrutural de 73 arquivos atuais e 53 arquivos centrais do pacote. Seu grafo contém referências não resolvidas, portanto não foi tratado como mapa completo. As incompatibilidades e relações relevantes foram conferidas diretamente no código, no SQL e nos metadados do banco real.

O único arquivo acrescentado ao repositório por esta análise é este documento. O build gerou artefatos locais ignorados pelo Git. Não houve alteração de dependências, código da aplicação, dados ou configuração remota.

## Continuação autorizada — candidato local de 15/10/2026

Após a análise, o usuário autorizou começar a adaptação. As afirmações acima
sobre ausência de alterações descrevem a etapa de análise, não o estado do
candidato atual. A implementação e seus limites estão em
`ADAPTACAO-SERVICE-GUIDE-2026-10-15.md`; a proposta de integração é a ADR-048.

O ZIP foi movido de `public/` para
`documentos/referencias/service-guide-codigo-completo.zip`, preservando o
original e evitando sua publicação como asset. O site hospedado no ChatGPT e
seu banco permanecem sem alterações. A migração comercial está apenas local.
