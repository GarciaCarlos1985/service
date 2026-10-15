# SERVICE GUIDE — MASTER BUILD SPECIFICATION
## Plataforma de descoberta comercial local — Produto, Arquitetura, Segurança, Monetização e Escalabilidade

Você está construindo o **SERVICE GUIDE**, uma plataforma digital de
**descoberta comercial local**, lançada inicialmente em **Cacoal – Rondônia**.

O consumidor entra gratuitamente, pesquisa aquilo que precisa e encontra
**empresas, produtos e serviços** cadastrados pela administração da plataforma.

Exemplo:

> Pesquisa: **"tinta emborrachada"**
>
> O sistema apresenta as empresas cadastradas que possuem esse produto — não
> apenas empresas cujo nome ou categoria contenha a palavra pesquisada.

Fluxo central:

**pesquisar → descobrir → conhecer → entrar em contato → favoritar → avaliar**

E, futuramente, em fase própria:

**agendar → contratar → pagar**

> **Esta spec substitui a spec-mãe anterior (`SERVICE-PROMPT-INICIO.md`), que
> descrevia um marketplace de profissionais. Esse conceito foi abandonado.**
> Leia também `DECISIONS.md` (ADR-041+) e `REUSE-MAP.md` (o que reaproveitar,
> parar de expandir e criar).

---

# 0. REGRA MAIS IMPORTANTE

Antes de implementar qualquer coisa:

1. analise o projeto existente;
2. identifique o que já está implementado;
3. preserve o que estiver correto;
4. registre decisões estruturais nova em ADR;
5. nunca invente dados (ADR-004) e nunca conecte pagamento sem autorização.

A regra de ouro do escopo:

> **Construir agora tudo aquilo que, se deixado para depois, exigirá refazer
> banco, autenticação, permissões, relacionamentos ou fluxos principais.**
>
> **Deixar para depois aquilo que pode ser acrescentado como módulo sem quebrar
> a base.**

Isso **não** significa "preparar tudo" criando 50 tabelas vazias. A preparação é
**arquitetural**, não construção antecipada do futuro. Exemplo:

- Hoje: criar `companies` e `products.company_id → companies.id`. Isso é preparação.
- Hoje **não**: criar `orders → payments → commissions → payouts → refunds` se
  ainda não existe venda dentro da plataforma.

---

# 1. VISÃO DO NEGÓCIO

Três atores principais:

### Consumidor

Usa gratuitamente o sistema para encontrar empresas, produtos e serviços.
Pesquisa, visualiza, favorita, entra em contato, avalia e comenta.

### Empresa

Comércio ou prestador cadastrado na plataforma. É uma **entidade própria**,
independente do usuário consumidor. Inicialmente cadastrada pelo administrador.

### Administrador

Proprietário/gestor da plataforma. Controla empresas, produtos, serviços,
categorias, planos, avaliações, conteúdo e métricas. Inicialmente o Helon.

---

# 2. PRINCÍPIO FUNDAMENTAL DO PROJETO

Não construir apenas um diretório de empresas. Construir um sistema em que o
usuário possa procurar **o que precisa**.

A busca trabalha com:

- empresas;
- produtos;
- serviços;
- categorias;
- localização;
- filtros.

Exemplos de pesquisas: "tinta emborrachada", "barbearia", "celular Samsung",
"eletricista", "material escolar", "restaurante".

---

# 3. ARQUITETURA — O QUE DEVE SER FEITO DESDE O INÍCIO

Mesmo que algumas funcionalidades só sejam usadas no futuro, a arquitetura
inicial deve ser preparada para elas quando sua ausência obrigaria uma migração
estrutural posterior.

## Entidades fundamentais

Criar estrutura de dados preparada para:

- usuários;
- empresas;
- categorias;
- produtos;
- serviços;
- imagens/mídia;
- contatos;
- favoritos;
- avaliações;
- planos;
- assinaturas;
- eventos de analytics;
- conversas;
- permissões;
- campanhas/anúncios.

Não é necessário construir todas as telas agora, mas os relacionamentos
fundamentais devem ser pensados desde o início.

## Camadas técnicas (herdadas do projeto)

- **TanStack Start** (React 19 + Vite + TS strict + Tailwind) — SSR indexável.
- **Supabase** = única fonte de verdade (PostgreSQL + Auth + RLS + Realtime).
- Camadas: `src/routes/` · `src/modules/<dominio>/` · `src/modules/ui/`.
- Escrita no banco **sempre via RPC `SECURITY DEFINER`** ou backend autorizado
  (ADR-002); RLS `default deny`; nada de INSERT/UPDATE/DELETE do cliente.

---

# 4. USUÁRIO

O usuário comum cria conta gratuitamente.

Cadastro inicial:

- nome;
- telefone;
- e-mail;
- senha (ou mecanismo equivalente);
- confirmação do telefone quando implementada.

**Não exigir CPF para navegar ou pesquisar.** O CPF só entra quando existir uma
funcionalidade que realmente necessite dele (contratação, orçamento, pagamento),
e sempre com finalidade clara e minimização (LGPD).

O usuário poderá:

- pesquisar;
- visualizar empresas, produtos e serviços;
- favoritar;
- iniciar contato;
- clicar no WhatsApp;
- avaliar;
- comentar.

---

# 5. EMPRESAS

As empresas são cadastradas inicialmente pelo painel administrativo.

**Uma empresa é uma entidade própria do sistema. Não é um usuário comum.**

Estrutura:

- nome / nome comercial;
- descrição;
- categoria;
- endereço, bairro, cidade, localização;
- telefone, WhatsApp, site, redes sociais;
- horário de funcionamento;
- imagens/mídia;
- status;
- produtos;
- serviços;
- plano (FREE/PRO);
- informações de destaque.

No futuro poderá existir um usuário responsável pela empresa
(`company_members`), mas isso **não é obrigatório no MVP**.

Componentes de endereço estruturados (rua, número, bairro, cidade, CEP) desde o
início; cidade sempre pelo catálogo canônico (código IBGE — ADR-014), nunca
string livre.

---

# 6. PRODUTOS

Produtos são entidades próprias. **Não** colocar todos os produtos dentro de um
campo de texto da empresa.

Exemplo:

> **Casa das Tintas** possui: tinta emborrachada, tinta acrílica, massa corrida,
> selador.

O mesmo produto/conceito de produto poderá estar associado a várias empresas.
Isso é fundamental para que "tinta emborrachada" retorne Empresa A, Empresa B e
Empresa C.

Estrutura: nome, descrição, categoria, preço (quando houver), disponibilidade,
imagens, empresa (`products.company_id`).

---

# 7. SERVIÇOS

Serviços também possuem estrutura própria.

Exemplo:

> **Joãozinho Cortes** — corte masculino, corte + barba, degradê, corte infantil.

Estrutura: nome, descrição, categoria, preço (quando houver), duração (quando
aplicável), imagens, empresa (`services.company_id`).

Produtos e serviços devem poder ser pesquisados separadamente ou em conjunto,
conforme a evolução da busca.

---

# 8. CATEGORIAS

Catálogo canônico de categorias (slug para SEO, nome, ordem, ativa/inativa).
Categorias cobrem tanto comércio quanto serviços (beleza, barbearia, construção,
elétrica, hidráulica, automotivo, alimentação, material de construção, etc.).
Empresas, produtos e serviços referenciam categoria.

---

# 9. MÍDIA

Imagens/mídia como entidade própria, ligada a empresa, produto ou serviço:
URL, tipo, ordem, texto alternativo, empresa/produto/serviço de origem.

Upload real com storage (R2) fica para a fase de infraestrutura (ADR-013/017);
no MVP aceitar URL controlada. **IMPORTANTE:** evitar coluna única de texto com
múltiplas fotos — mídia é tabela própria desde o início.

---

# 10. PESQUISA

Uma das funcionalidades mais importantes do produto.

Deve permitir pesquisar empresas, produtos, serviços e categorias.

Filtros possíveis:

- categoria;
- localização / bairro;
- empresa;
- faixa de preço (quando houver);
- disponibilidade (quando aplicável);
- empresa PRO;
- avaliação.

O mecanismo deve ser implementado de forma que possa evoluir (full-text do
PostgreSQL, sinônimos, ranking) **sem exigir reconstrução completa**. Na Fase 1,
PostgreSQL `tsvector` + `pg_trgm` para tolerância a erro de digitação.

---

# 11. EMPRESA FREE E EMPRESA PRO

Dois níveis iniciais.

## FREE

- página com informações e localização;
- produtos/serviços dentro de limites definidos;
- fotos dentro de limites;
- participação na busca orgânica;
- possibilidade de receber contatos.

## PRO

Empresa que paga mensalidade:

- destaque;
- selo PRO;
- maior quantidade de mídia;
- maior quantidade de produtos/serviços;
- maior exposição;
- analytics;
- recursos promocionais.

**A plataforma deve ter estrutura de planos configurável. Não fixar regras
comerciais no código.** O plano é uma entidade/configuração (limites, destaque,
selo, recursos). Isso permite criar depois PRO Plus, campanhas e planos
promocionais sem alterar código.

> **Não espalhar `if plan === "pro"` pelo código.** O comportamento deriva dos
> dados do plano (`plans.limits`, `plans.features`).

## Cobrança

**Não conectar sistema de pagamento agora.** O dono fecha a mensalidade
pessoalmente com cada loja. O admin marca o plano da empresa manualmente no
painel (`company_subscriptions` com origem `manual`, quem marcou, quando e até
quando). Gateway/assinatura automatizada é evolução futura (ADR-044).

---

# 12. CONTATO

Funcionalidade central. Na página da empresa:

### Falar com a empresa

Abre uma conversa/orçamento interno na plataforma (exige login; e, quando a ação
for de contratação, telefone verificado + CPF conforme regra de negócio).

### WhatsApp

Encaminha para o WhatsApp da empresa (`wa.me`) com mensagem pré-preenchida
contendo contexto e origem. **Antes do encaminhamento externo, registrar o
evento `whatsapp_click`.**

O canal WhatsApp é o principal no comércio local brasileiro e baixa fricção.
A mensagem pré-preenchida serve para o comerciante saber que o lead veio da
plataforma — isso é o que justifica a mensalidade PRO.

Outras ações: `Ligar` (`tel:`), `Como chegar` (mapa), `Site`, redes sociais.

> **UM CLIQUE NO WHATSAPP NÃO É VENDA.** O sistema só poderá afirmar que houve
> venda se existir forma real de comprovação (fase futura). Nunca inferir venda
> de clique.

---

# 13. ANALYTICS

O sistema deverá ter, desde o início, uma **estrutura centralizada de eventos**.

Eventos:

```text
search
company_view
product_view
service_view
favorite
contact_start
whatsapp_click
phone_click
website_click
review_created
share
```

Cada evento identifica, quando aplicável:

- usuário (ou anônimo/sessão);
- empresa;
- produto;
- serviço;
- termo pesquisado;
- origem;
- data/hora;
- sessão;
- contexto.

Não é necessário construir um dashboard gigante no início, mas **a coleta dos
eventos importantes deve existir desde o começo**. Reconstruir histórico depois
é impossível — esse é um dos itens que não pode ser adiado.

Eventos são **append-only** (mesma disciplina do ledger — ADR-003), sem dado
pessoal desnecessário.

## Por que o analytics importa

O admin poderá responder:

- Quais empresas são mais visualizadas?
- Quais produtos/serviços são mais pesquisados?
- Quantas pessoas clicaram no WhatsApp?
- Quais empresas recebem mais contatos?
- Quais pesquisas estão crescendo?
- Qual empresa PRO está recebendo mais exposição?

E identificar oportunidades comerciais:

> "Tinta emborrachada" tem muitas pesquisas e poucas empresas cadastradas →
> oportunidade de o Helon buscar novos anunciantes.

---

# 14. FAVORITOS

O usuário poderá favoritar empresas (e, no futuro, produtos/serviços). Favoritar
é ação **independente** da avaliação: demonstra interesse, não julgamento
positivo.

---

# 15. AVALIAÇÕES

O usuário poderá avaliar empresas:

- 1 a 5 estrelas;
- comentário;
- data;
- usuário.

Mecanismo administrativo para visualizar, ocultar, remover avaliações
inadequadas e lidar com denúncias.

**Não** implementar inicialmente avaliação "verificada por compra". Isso poderá
ser adicionado futuramente.

---

# 16. SEGURANÇA E ABUSO

Base mínima de proteção desde o início:

- autenticação;
- confirmação de conta/telefone quando aplicável;
- controle de permissões;
- proteção das rotas administrativas;
- validação de dados;
- rate limiting onde necessário;
- controle de spam;
- possibilidade de bloquear usuário;
- possibilidade de bloquear empresa;
- registro de ações administrativas importantes (auditoria).

Não prometer que o sistema "impede golpes". A plataforma possui **mecanismos de
prevenção e controle de abuso**, que evoluem.

---

# 17. PAINEL ADMINISTRATIVO

Fundamental desde o início. Deve permitir:

- cadastrar/editar/ativar/desativar empresa;
- cadastrar/editar categoria;
- cadastrar/editar produto;
- cadastrar/editar serviço;
- administrar imagens/mídia;
- administrar avaliações;
- visualizar usuários;
- visualizar contatos básicos;
- visualizar métricas básicas;
- marcar/alterar plano da empresa (com auditoria).

Controle de acesso adequado. **Nenhuma informação administrativa em páginas
públicas.**

---

# 18. PERMISSÕES

Pensar desde o início, porque hoje existe:

> Admin → empresas.

Amanhã poderá existir:

> Super Admin → Admin → Empresa → funcionário.

Autorização construída de qualquer jeito agora pode exigir reestruturação
grande quando os comerciantes entrarem no sistema. Modelar papéis e vínculos
(`company_members`) de forma compatível com essa evolução.

---

# 19. LOCALIZAÇÃO / GEOGRAFIA

Mercado inicial: **Cacoal – Rondônia**. Não exigir GPS para tudo. Permitir
cidade, bairro, CEP e localização aproximada. Cidades e bairros pelo catálogo
canônico (código IBGE / bairros canônicos) — nunca string livre (ADR-014). Se
usar coordenadas, guardar só a precisão necessária.

---

# 20. SEO

Páginas públicas indexáveis reais:

- home;
- categorias;
- empresas (`/empresas/<cidade>/<slug>`);
- produtos e serviços quando houver conteúdo real.

Meta tags, canonical, Open Graph, structured data (schema.org — `LocalBusiness`),
URLs amigáveis. **Nunca gerar páginas vazias em massa** (ADR-014). Dados
estruturados só quando os dados existirem de verdade.

---

# 21. PERFORMANCE E CUSTO

Core Web Vitals excelentes, HTML rápido, JS mínimo, code splitting, imagens
otimizadas (WebP/AVIF), CDN, cache. Custo quase zero no início (Supabase/Vercel
free tiers com limites monitorados): "Supabase ou Vercel já resolve?" antes de
qualquer serviço externo (ADR-017).

---

# 22. O QUE NÃO DEVE SER CONSTRUÍDO AGORA

A primeira versão **não precisa** implementar:

- checkout;
- pagamento;
- comissão automática;
- repasse para empresas;
- reembolso;
- agendamento completo;
- marketplace financeiro;
- integração avançada com WhatsApp (API oficial);
- acompanhamento de vendas realizadas fora da plataforma;
- antifraude avançado;
- reputação complexa do usuário;
- algoritmo sofisticado de recomendação / IA de recomendação;
- campanhas automatizadas complexas;
- painel empresarial completo;
- sistema financeiro completo.

Esses recursos poderão ser adicionados depois.

---

# 23. MAS A ARQUITETURA DEVE PERMITIR O CRESCIMENTO

> **Não construir funcionalidades futuras agora por ansiedade, mas também não
> construir o MVP de forma que torne impossível adicioná-las depois.**

### Agora (estrutura necessária)

users · companies · products · services · categories · plans · favorites ·
reviews · conversations · analytics_events · permissions · media ·
configurações.

### Futuramente (módulos acrescentáveis)

bookings · orders · payments · transactions · commissions · payouts ·
subscriptions (gateway) · campaigns · notifications · advanced fraud controls.

---

# 24. PAGAMENTOS E COMISSÕES

**Não implementar inicialmente.** O modelo mudou: **não há comissão**. O dono
fecha a mensalidade pessoalmente e o admin marca o plano manualmente.

Não projetar o banco de forma que empresa e usuário fiquem acoplados ao modelo
atual. Quando o marketplace evoluir, poderá existir:

```text
Usuário → Booking → Order → Payment → Commission → Repasse
```

Essa evolução será feita em fase própria. Os módulos financeiros já construídos
(ledger, comissão, pagamentos) **não são deletados** — são parados de expandir e
mantidos compatíveis (ADR-010).

---

# 25. AGENDAMENTO

Evolução futura. Exemplo:

```text
Joãozinho Cortes
Corte masculino — R$ 45
[Agendar]
```

O usuário escolhe serviço, profissional, data e horário. Essa funcionalidade
**não deve ser confundida com o contato inicial**.

---

# 26. PRINCÍPIO DE DESENVOLVIMENTO (FASES)

### FASE 1 — FUNDAÇÃO
arquitetura · banco · autenticação · permissões · empresas · categorias ·
produtos · serviços · mídia · planos · eventos · estrutura administrativa.

### FASE 2 — MVP PÚBLICO
homepage · pesquisa · filtros · resultados · páginas de empresas · páginas de
produtos/serviços · cadastro/login · favoritos · contato · WhatsApp · avaliações.

### FASE 3 — MONETIZAÇÃO
planos PRO · cobrança (a definir; inicialmente manual) · recursos PRO ·
analytics para empresas · campanhas.

### FASE 4 — MARKETPLACE
Somente quando o negócio demonstrar necessidade: agendamento · orçamento ·
contratação · pagamento · (comissão/repasse, se voltarem a fazer sentido).

---

# 27. REGRA PARA NÃO PRENDER O DESENVOLVEDOR

Nenhuma funcionalidade futura é automaticamente parte do escopo da primeira
versão só porque foi mencionada neste documento. Este documento é:

> **Visão do produto + arquitetura planejada + escopo inicial.**

Funcionalidades futuras devem ser especificadas, estimadas e aprovadas
separadamente antes do desenvolvimento.

---

# 28. REGRA PARA ALTERAÇÕES

Antes de implementar uma funcionalidade nova, avaliar:

### Ela altera a estrutura fundamental?
→ planejar a arquitetura antes de desenvolver.

### Ela pode ser adicionada como módulo independente?
→ deixar para uma fase futura.

### Ela pode gerar migração de banco posteriormente?
→ considerar a estrutura agora, mesmo que a interface só venha depois.

### Ela depende de pagamento, comissão, CPF ou dados sensíveis?
→ não implementar sem antes definir regras de negócio, segurança e requisitos
legais.

---

# 29. OBJETIVO DO MVP

O primeiro lançamento não precisa provar que a plataforma processa pagamentos.
Precisa provar três coisas:

1. **As pessoas encontram o que procuram.**
2. **As pessoas demonstram interesse nas empresas.**
3. **As empresas enxergam valor em estar na plataforma.**

Se isso funcionar, teremos dados reais para decidir o que desenvolver depois.

---

# 30. RESULTADO ESPERADO

- Consumidor: *"Preciso de alguma coisa. Vou procurar aqui para descobrir onde
  encontro em Cacoal."*
- Comerciante: *"Quero que as pessoas encontrem minha empresa e meus produtos
  aqui."*
- Helon: *"Consigo saber o que as pessoas procuram, quais empresas recebem
  atenção e mostrar ao comerciante o valor da divulgação."*

**Não construir um marketplace gigante imediatamente.** Construir uma excelente
plataforma de descoberta comercial local, com arquitetura preparada para evoluir
para um marketplace quando houver demanda real.

---

# 31. GRUPOS DE FUNCIONALIDADES

| Grupo | O que fazer |
| --- | --- |
| 🔴 **Tem que existir agora** | Banco bem estruturado · autenticação · permissões · empresa como entidade · produtos/serviços separados · categorias · mídia · planos · analytics/events · favoritos · avaliações · contato · arquitetura de busca |
| 🟡 **Pode entrar depois sem quebrar a base** | Painel do comerciante · analytics avançado · campanhas · notificações · chat avançado · assinatura automatizada · recursos PRO adicionais |
| 🔵 **Futuro / outro módulo** | Booking · checkout · pagamento · comissão · repasse · reembolso · antifraude avançado · integração financeira |

---

# 32. AS 5 COISAS QUE NÃO PODEMOS ERRAR AGORA

1. **Empresa não pode ser tratada como usuário.** Vai doer muito depois se for
   feito errado.
2. **Produto não pode ser apenas texto dentro da empresa.** A busca por produto
   é ideia central.
3. **Analytics precisa nascer junto.** Um ano sem registro é um ano sem dados.
4. **Planos precisam ser configuráveis.** Nada de `if plan === "pro"` espalhado.
5. **Permissões precisam ser pensadas desde o início.** Admin → empresa →
   funcionário não pode exigir reestruturação depois.

---

# 33. IDENTIDADE E MARCA

- **Nome do produto: Service Guide** (confirmado; nome de trabalho anterior
  "SERVICE" aposentado). Nome provisório antigo ("Guia Cidade") **não** é o
  nome definitivo.
- **Logo:** `public/service-guide.png` — pin de mapa + mapa, "Service" em azul,
  "Guide" em verde, cercado por ícones de categorias. Paleta azul/verde.
  **Pendências de asset** (fase de infraestrutura): peso (1,8 MB) → WebP/AVIF;
  variantes (ícone/favicon/horizontal); recorte com transparência.
- Mobile-first, cards arredondados, visual moderno, confiável e limpo.
- Evitar espalhar o nome comercial pelo código: usar configuração central
  (`platform_settings`) para nome e branding.

---

# 34. DEFINIÇÃO DE "PRONTO"

Funcionalidade só está pronta quando: funciona, está tipada, protegida por RLS,
tem estados de UX (loading/sucesso/vazio/erro/sem-permissão), não duplica dados,
tem teste (unitário e/ou SQL no banco real quando mexer em banco), o build passa,
não expõe segredos e está documentada. Gate: **typecheck → lint → test → build**
e, se mexer em banco, aplicação + teste contra o banco real (ADR-039).

---

> **Aviso de escopo:** este documento orienta quem desenvolve, mas deixa explícito
> que **MVP não significa arquitetura descartável**. As decisões estruturais que
> seriam caras de corrigir ficam certas desde o primeiro desenvolvimento; o resto
> entra como módulo, em fase própria, com aval.
