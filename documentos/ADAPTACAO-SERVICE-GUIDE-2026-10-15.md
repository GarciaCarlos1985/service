# Adaptação do Service Guide — 15/10/2026

**Estado:** código preparado para envio à `main`, autorizado expressamente
pelo usuário em 15/10/2026, a partir de `codex/service-guide-adaptacao`.
Migração comercial validada em PostgreSQL isolado; ainda não aplicada ao
Supabase real. O envio do código não aplica SQL nem torna o catálogo real
operacional. As etapas locais registradas abaixo antecedem essa autorização.
As alterações que já existiam foram preservadas.

## Envio do código à main

- O repositório é público e sua integração Vercel publica a branch `main`.
- Configuração local com credencial, `.env.local`, pacote ZIP original e
  capturas temporárias permanecem fora do commit. A configuração e o ZIP
  receberam regras específicas no `.gitignore`.
- Typecheck, lint sem erros, 56 testes e build passaram. O formato de todos os
  arquivos versionados também passou; quatro arquivos legados receberam
  somente a formatação necessária para corrigir o gate de CI já falho.
- A varredura dos arquivos candidatos não encontrou chaves privadas, tokens
  de acesso, senhas em URLs PostgreSQL ou JWTs com papel `service_role`.
- A publicação de código mantém o estado de preparação da home enquanto
  faltar a fundação comercial no banco. `/previa` continua exclusiva de DEV.
- Aplicação da migração, testes no Supabase real e conteúdo comercial real
  seguem pendentes; não são presumidos pela autorização de envio ao Git.

Prévia: <http://127.0.0.1:3001/previa>. Para iniciar novamente:

```powershell
npm run dev -- --host 127.0.0.1 --port 3001 --strictPort
```

## Resultado da adaptação

### Atualização visual Premium Master

**Ajuste posterior solicitado na prévia:** o selo passou a **PREMIUM GUIDE**,
com fundo dourado champanhe `#e5c77f` e texto `#3a2a11` (contraste 8,43:1).
O componente compartilhado mantém “Destaque patrocinado” e a elegibilidade
por recurso do plano. Gate completo passou novamente com 56 testes; revisão
restrita de desktop e perfil móvel aprovada em
`.impeccable/review/premium-guide-badge/finish-review.md`.

Após o primeiro candidato, o usuário solicitou a nova logo de `public/` e
um padrão premium com maior presença para empresas pagantes. A interface
agora usa `public/service-guide.png` no cabeçalho e no rodapé, com o arquivo
original preservado e origem registrada em sidecar.

A amplificação mantém Manrope, azul, verde e marinho. A home ganha título de
grande escala, busca prioritária e vitrine fotográfica com navegação manual.
Cartões e perfis em destaque recebem apresentação **Premium Master** e o
rótulo visível **Destaque patrocinado**. A seleção segue o recurso `featured`
do plano; não depende de seu nome e não altera avaliações, preços, quotas ou
cobrança. Sem empresas com fotografia e permissão de destaque, a vitrine
não inventa conteúdo. Entrada, cadastro e recuperação de senha compartilham
o cabeçalho, rodapé e identidade do guia; os handlers de autenticação continuam
os mesmos.

Gate atualizado: **typecheck, lint sem erros, 56 testes em 9 arquivos e build
aprovados**. Os três testes novos verificam recurso do plano, identificação do
patrocínio e ausência de fotografia. O detector executado nesta atualização
retornou zero achados; a proveniência cobre cinco rasters, sem pendências.

A revisão visual independente pediu correções no contraste de acesso e na
posição das categorias. O lote corrigido recebeu **disposition: ship**, com
ambos os itens resolvidos, conforme o adendo de
`.impeccable/review/premium/finish-review.md`. Categorias ficam abaixo dos nomes;
os controles de acesso usam marinho sólido. As medições locais de contraste
foram 14,74:1 no botão, 8,86:1 no hover e 5,98:1 nos placeholders. A promessa
não medida de duração do cadastro foi substituída por texto factual. Os 37
avisos de lint permanecem descritos nos logs; não há erros.

O registro final foi sincronizado em `documentos/DESIGN.md` e
`.impeccable/design.json`, com JSON validado e exemplos dos componentes.
As versões anteriores estão preservadas em `documentos/referencias/` nos
arquivos `DESIGN-antes-premium-2026-10-15.md` e
`design-antes-premium-2026-10-15.json`. A documentação encerra a pendência de
persistência do parecer visual, sem ampliar seu escopo para produção.

Evidência visual atual em `.impeccable/review/premium/`, nos arquivos JPEG.
O mecanismo de captura full-page do navegador ficou indisponível nesta sessão;
foram usadas capturas nativas de viewport e estados de rolagem. O desktop em
CSS 1440 px foi reduzido temporariamente para caber na área nativa, sem alterar
o código da página. As emulações foram removidas após a conferência. Tentativas
inválidas estão preservadas separadamente e não constituem evidência de revisão.

Esta atualização é visual e local. A migração e os dados remotos continuam
no estado descrito abaixo; não houve publicação.

O arquivo fornecido era um ZIP, não um RAR. O original está preservado em
`documentos/referencias/service-guide-codigo-completo.zip`. Ele foi retirado
de `public/`, e o build novo já confirmou que não publica o arquivo-fonte.

A versão do ChatGPT tem backend próprio: código de Workers, D1/R2 e login
ChatGPT. A inspeção conectada do site confirmou banco D1 com 21 tabelas.
Esse backend não é o Supabase configurado neste checkout. O candidato usa
a interface do pacote e mantém a infraestrutura existente: TanStack Start,
Supabase Auth/PostgreSQL e build Vercel.

Foram adaptados:

- Home com pesquisa, categorias, filtros, ordenação e paginação.
- Perfis comerciais e páginas de itens; empresas têm rota canônica
  `/empresas/<cidade>/<slug>`, metadados e JSON-LD baseado em dados reais.
- Conta, favoritos, avaliações moderadas, denúncia e solicitação de contato.
- Ajuda/inclusão de negócios com protocolo de solicitação.
- Cadastro com telefone, confirmação de e-mail e redirecionamento local seguro.
- Administração de empresas, produtos/serviços, categorias, bairros, planos,
  imagens por URL, avaliações, contatos, solicitações, usuários e denúncias.
- Auditoria e métricas agregadas no banco, com paginação de 20 registros.
  “Exportar página” gera somente os registros visíveis, sem backup integral.
- Preferências de estatísticas opcionais, com consentimento e eventos sem
  conteúdo de formulários. Cliques representam interesse, não venda.

As fontes e imagens do pacote foram reaproveitadas, com origem registrada em
`public/guide/`. O manifesto original usa `repair.webp` para a imagem entregue
como `tech.webp`; essa divergência está explicitada no sidecar de origem.

## Prévia e dados

`/previa` carrega seis exemplos fictícios do pacote, identificados no topo,
nos cartões e nos perfis. Não grava exemplos no Supabase, não emite analytics
e desabilita contatos reais. A rota é exclusiva de DEV e retorna 404 no build
de produção. A busca do aplicativo normal nunca substitui dados ausentes por
exemplos.

Sem a migração aplicada, `/` mostra “O guia está sendo preparado”. Isso é o
estado esperado do candidato atual. A área `/admin` exige autenticação e
autorização; esconder botões não é usado como mecanismo de segurança.

## Impacto na estrutura existente

| Área | Alteração e dependências |
| --- | --- |
| Home e busca | `src/modules/guide/` passa a atender o produto comercial; `/buscar` preserva filtros e redireciona à nova home |
| Conta e onboarding | Reutiliza Supabase Auth e `profiles`; onboarding passa a consumidor; cadastro envia telefone como metadado |
| Raiz React | Adiciona o QueryClientProvider já exigido pelos hooks de Query, atendendo também o painel legado |
| Banco | Novas entidades comerciais e funções RPC; nenhuma conversão de `services`, favoritos, avaliações, reservas ou conversas legadas |
| Trigger de usuário | `handle_new_user()` conserva assinatura/trigger e passa a aceitar telefone válido opcional do novo cadastro |
| Publicação | Preserva a saída Vercel; o ZIP fica fora de assets estáticos |

O SQL é `supabase/migrations/20261015032437_guide_commercial_foundation.sql`.
Seu SHA-256 no candidato inicial validado é
`D6048ACC50CA3FE12BEFBC1A0B9FE1FED8FD77864A13040F2DF3F9DA6F25C4FF`.
Mudanças posteriores exigem nova validação e atualização desta referência.

As tabelas novas têm RLS e não concedem leitura/escrita direta ao navegador.
As RPCs públicas retornam DTOs limitados; funções privadas não são acessíveis
ao usuário. Escritas verificam o usuário autenticado; administração verifica
o papel administrativo e bloqueios. Limites de plano são checados no banco
com bloqueio do registro da empresa. Moderação e mudanças administrativas
gravam auditoria na mesma transação. Analytics e auditoria rejeitam UPDATE e
DELETE, inclusive em sessões privilegiadas.

As decisões ainda sujeitas a revisão estão na **ADR-048**, especialmente os
nomes das entidades, a caixa de contato acompanhada pela equipe e os recursos
iniciais dos planos. O patch local não promove essa proposta a decisão aceita.

## Validação do candidato inicial, antes da atualização Premium Master

| Verificação | Evidência |
| --- | --- |
| TypeScript | `npm run typecheck` passou |
| Lint | Zero erros, 37 avisos de Fast Refresh e diretiva herdada sem uso; a base anterior tinha 29 avisos |
| Testes | 53 testes em 8 arquivos passaram |
| PostgreSQL isolado | 18 testes em PGlite; executadas as 9 migrações legadas e a nova, com roles/JWT de laboratório |
| Build | `npm run build` passou e gerou `.vercel/output` |
| Dependências de produção | `npm audit --omit=dev`: zero vulnerabilidades conhecidas após atualização de três transitivas |
| Interface | Desktop 1440 px, celular 390 px e janela atual 1101 px; busca, filtros, vazio, perfil, abas, ajuda e bloqueio de acesso conferidos |
| Assets | Quatro rasters com origem registrada; scan de proveniência sem pendências |
| Detector de interface | Executado uma vez nos arquivos alterados; zero achados |
| Supabase real | Somente leitura: 25 tabelas, todas com RLS, 9 migrações; `companies` ainda ausente |

Os testes de banco verificam busca por produto, combinação de tipo/filtros,
paginação com total correto, isolamento de rascunhos, recusa de leitura direta,
recusa de administração para consumidor, favoritos vinculados ao usuário,
moderação, auditoria, imutabilidade, limites de plano, bloqueios, consentimento,
protocolo de ajuda e contratos de todas as áreas administrativas. Não usam
credenciais nem dados de produção. PGlite não reproduz integralmente a
plataforma Supabase; não substitui o gate obrigatório no banco real.

Capturas e logs locais estão em `.impeccable/review/`. A revisão visual
independente terminou com **disposition: ship**, sem correções materiais no
escopo local das oito capturas, conforme `finish-review.md`. Esse parecer não
valida CRUD autenticado, execução remota de SQL nem prontidão de produção.
O sistema visual é documentado em `documentos/DESIGN.md` e
`.impeccable/design.json`.

## Pendências para ativação

1. Revisar a prévia, a ADR-048 e a migração aditiva. Aprovar ou ajustar os
   limites/recursos iniciais dos planos e o canal de contatos internos.
2. Autorizar um ambiente Supabase para aplicação e testes reais; preferir
   projeto de homologação isolado. O `.env.local` atual aponta para a base
   existente e não foi modificado. A regra de revisão humana impede presumir
   autorização para alterar esse ambiente.
3. Executar a migração e as suítes SQL, validar Auth/roles/PostgREST e testar
   os fluxos reais com uma conta de consumidor e uma conta administrativa.
   Os 73 testes SQL legados citados em documentos anteriores não foram
   reexecutados contra a base remota nesta etapa.
4. Cadastrar ou importar somente conteúdo comercial real, com conferência de
   cidade, bairros, planos, contato e direitos de imagem. Dados do D1 não foram
   importados. Não houve leitura massiva ou cópia de informações pessoais.
5. Definir responsável/canal operacional de privacidade e prazos de atendimento;
   revisar limites de abuso antes de tráfego público. O limite de requisições
   anônimas atual é compartilhado por minuto.
6. Validar publicação separadamente, com aprovação humana. O site hospedado
   no ChatGPT permanece intacto.

## Recortes explícitos

- Contatos internos ficam com a equipe do guia; não há chat ou entrega
  automática ao estabelecimento. A UI descreve esse funcionamento.
- Imagens são cadastradas por URL HTTPS; upload para Storage/R2 não foi portado.
- Discord, campanhas, cobrança, painel do comerciante, analytics avançado e
  exportação integral não fazem parte deste candidato.
- Destaques são identificados pelo recurso do plano. A distribuição limitada
  de patrocinados e relatórios individuais de exposição continuam na Fase 3.
- Autenticação, confirmação/recuperação de e-mail e ações administrativas
  precisam de conferência real em ambiente autorizado. Não foram criadas
  contas remotas nem enviados formulários pelo navegador nesta etapa.
