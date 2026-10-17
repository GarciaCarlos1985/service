---
name: Service Guide
description: Descoberta comercial local com presença ampla e destaque patrocinado explícito.
colors:
  primary: "#1264ce"
  primary-hover: "#0b50aa"
  premium-ink: "#0b2948"
  premium-ink-hover: "#194c7d"
  premium-green: "#a2e579"
  search-green-hover: "#b7f199"
  search-ink: "#123510"
  whatsapp: "#137c3e"
  background: "#fff"
  foreground: "#172c47"
  muted: "#52657c"
  border: "#d8e2ed"
  card-border: "#dce5ee"
  surface-soft: "#f5f8fc"
  brand-soft: "#eaf3ff"
  field-soft: "#f4f7fb"
  master-soft: "#e5c77f"
  master-ink: "#3a2a11"
  premium-muted: "#c5d7e7"
  destructive: "#b42318"
  admin-muted: "#52677d"
  admin-field-border: "#b7c7d8"
  admin-field-ink: "#16324c"
  admin-button-hover: "#174d79"
  site-primary: "#005cc5"
  site-navy: "#0b2948"
  site-accent: "#a2e579"
  site-background: "#ffffff"
  site-surface: "#f1f6fa"
  site-badge: "#e9cc7a"
typography:
  display:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "clamp(4rem, 6.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 1.01
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "clamp(1.6rem, 2.3vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  metadata:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
rounded:
  chip: "6px"
  badge: "7px"
  field: "8px"
  control: "10px"
  panel: "12px"
  company-card: "16px"
  circle: "50%"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  control: "18px"
  panel: "20px"
  card-compact: "22px"
  section: "24px"
  card: "26px"
  grid: "28px"
  wide: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-auth:
    backgroundColor: "{colors.premium-ink}"
    textColor: "{colors.background}"
  button-auth-hover:
    backgroundColor: "{colors.premium-ink-hover}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-search:
    backgroundColor: "{colors.premium-green}"
    textColor: "{colors.search-ink}"
    rounded: "{rounded.field}"
    height: "54px"
    padding: "12px 20px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  company-card:
    rounded: "{rounded.company-card}"
    textColor: "{colors.foreground}"
    padding: "26px"
  company-card-master:
    backgroundColor: "{colors.premium-ink}"
    textColor: "{colors.background}"
    rounded: "{rounded.company-card}"
  filter-chip:
    backgroundColor: "{colors.brand-soft}"
    rounded: "{rounded.chip}"
    padding: "8px 10px"
  master-badge:
    backgroundColor: "{colors.master-soft}"
    textColor: "{colors.master-ink}"
    rounded: "{rounded.badge}"
    padding: "9px 12px"
  navigation:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
  admin-button-primary:
    backgroundColor: "{colors.premium-ink}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "48px"
  admin-button-primary-hover:
    backgroundColor: "{colors.admin-button-hover}"
  admin-input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.admin-field-ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
    height: "48px"
---

# Design System: Service Guide

## Overview

**Creative North Star: "Guia comercial local"**

Branco, marinho, azul e verde apresentam o comércio de Cacoal com busca direta, Manrope ampla e fotografias comerciais. A evolução Premium Master autorizada em 15/10/2026 amplia a identidade escolhida: títulos grandes, maior respiro e superfícies marinho distinguem exposição patrocinada, mantendo a descoberta legível no celular.

Em 15/10/2026, por solicitação do usuário, o selo passou a “PREMIUM GUIDE” em dourado champanhe, mantendo “Destaque patrocinado” e a elegibilidade por `plan.featured`; contraste informado entre fundo e texto: 8.43:1.

Este registro mescla as decisões confirmadas do sistema anterior com o código final em `src/styles/guide.css` e seus overrides prioritários em `src/styles/guide-premium.css`. A logo horizontal fornecida pelo usuário (`public/service-guide.png`, original 1672 × 941) aparece sem edição, com proporção preservada por `object-fit: contain`; sua procedência está em `public/service-guide.png.json`. Fotografias demonstrativas mantêm rótulos e procedência. A composição específica da primeira tela permanece em `.impeccable/surfaces/directory.md`.

A revisão `.impeccable/review/premium/finish-review.md` preserva o parecer inicial `fix` e registra adendo `ship` para as duas correções visuais: autenticação e categorias abaixo dos nomes. A pendência documental desse parecer é atendida por este registro e pelo sidecar. As oito capturas em `.impeccable/review/premium/` são recortes de viewport ou estados após rolagem: desktop de 1440 reduzido nativamente a 600, mobile de 390 × 640 e `user-614` de 614 × 672; nenhuma captura é de página inteira. O adendo não certifica independentemente medições computadas de hover/foco, CRUD autenticado, banco remoto ou produção. Gates e procedência comunicados pelo agente principal constam no sidecar; esta documentação não abre nova auditoria.

A extensão administrativa e sua personalização final de 16/10/2026 foram registradas a partir de `src/styles/guide-admin.css`, `src/modules/guide/screens/Admin.tsx` e `src/modules/guide/admin/`. É uma evolução Operate da identidade existente, com prioridade em cadastrar empresas, produtos e serviços. Seu contrato e medidas de superfície ficam em `.impeccable/surfaces/admin-workspace.md`. O painel documentado é candidato local na branch `codex/painel-profissional`; este registro não declara aplicação de migração nem publicação em produção.

**Key Characteristics:**

- Logo azul/verde original e Manrope local mantêm continuidade.
- Marinho profundo, campo branco e verde claro organizam ações e exposição paga.
- Fotografias grandes e cartões com variantes comum e Premium Guide.
- Categoria como informação de apoio abaixo do nome da empresa.
- Refluxo móvel, navegação inferior, movimento reduzido e estados explícitos.


## Colors

Azul orienta ações gerais; marinho profundo sustenta a expressão premium; verde claro destaca busca, contato premium e patrocínio sobre branco e marinho.

### Primary

- **Azul de ação** (`primary`, `primary-hover`): ações gerais, links e seleção; mantém o valor original.
- **Marinho premium** (`premium-ink`, `premium-ink-hover`): busca, acesso à conta, submit de autenticação, cartões e painéis patrocinados.

### Secondary

- **Verde premium** (`premium-green`): busca e ações sobre marinho, com tinta escura; busca tem hover próprio (`search-green-hover`).
- **Verde de contato** (`whatsapp`): contato convencional com texto branco. O perfil Premium Guide usa verde premium com texto escuro.
- **Dourado champanhe de patrocínio** (`master-soft`, `master-ink`): selo “PREMIUM GUIDE” com a descrição “Destaque patrocinado”.

### Neutral

- **Branco** (`background`): página, cabeçalho e campos.
- **Tinta azul** (`foreground`): leitura principal; a regra sem layer do contêiner mantém a variável global sobre a declaração de cor do layer premium.
- **Cinza azulado** (`muted`): descrições, metadados e placeholders da autenticação com opacidade integral.
- **Texto premium suave** (`premium-muted`): metadados e descrição sobre cartões marinho.
- **Linhas** (`border`, `card-border`): campos e cartões, respectivamente.
- **Superfícies claras** (`surface-soft`, `field-soft`, `brand-soft`): painéis, autenticação e filtros. O erro usa `destructive` com mensagem textual.
- **Leitura administrativa** (`admin-muted`, `admin-field-ink`, `admin-field-border`): ajuda, texto e contorno dos campos do editor, configurações e segurança. A ação administrativa reutiliza marinho premium e recebe hover próprio (`admin-button-hover`). A lateral marinho é estrutura de navegação; não indica patrocínio. Champanhe continua reservado ao selo patrocinado.


**Paleta pública configurável.** O tema público configurável tem seis papéis normativos (`site-primary`, `site-navy`, `site-accent`, `site-background`, `site-surface`, `site-badge`); seus valores iniciais vêm de `defaultTheme`, aplicados pelos overrides de tema sobre a base premium preservada. Aceita apenas hexadecimal de seis dígitos. As tintas de texto e link são derivadas por contraste; título e sugestões acompanham a tinta calculada do marinho, inclusive quando esse fundo é branco. Vitrines fotográficas conservam texto claro próprio sobre sua camada escura. A personalização pública não recolore o espaço operacional administrativo.

**The Cor com Função Rule.** Patrocínio e reputação têm evidências separadas: dourado e marinho acompanham o selo textual, nunca substituem avaliações.

## Typography

**Display Font:** Manrope, com Arial e sans-serif como alternativas.

**Body Font:** a mesma família, carregada localmente de `public/guide/fonts/` com `font-display: swap`; o contêiner do guia define sua família explicitamente.

**Character:** uma única família conecta descoberta, perfil, autenticação e administração. Títulos fortes e fechados contrastam com descrições de altura confortável; o aumento de escala não elimina rótulos nem dados operacionais.

### Hierarchy

- **Display:** peso e escala do frontmatter; na busca, até 1180px usa `clamp(3.8rem, 7vw, 5rem)`, até 950px (`3.6rem`), até 720px (`4.25rem`) e até 640px `clamp(3.3rem, 14vw, 4.2rem)`.
- **Headline:** resultados fluidos; no celular (`27px`). O nome da vitrine usa `clamp(2rem, 3vw, 2.75rem)`, altura (`1.12`), com variantes de (`29px`) até 950px e (`32px`) até 640px.
- **Title:** nome de cartão conforme frontmatter, móvel (`24px`). O perfil Premium Guide usa `clamp(2.5rem, 4vw, 4rem)`, móvel (`36px`).
- **Body:** leitura corrente; descrição de cartão usa altura (`1.75`) e limite de duas linhas; no celular (`14px`). Texto de apresentação limita comprimento a (`42ch`).
- **Label / Metadata:** controles fortes e metadados discretos; selo (`12px`, peso `800`) com explicação de patrocínio menor. Não promover o texto auxiliar do selo a escala de leitura corrente.

**The Leitura Antes da Densidade Rule.** Reduza colunas e reorganize controles ao adaptar, preservando nomes, rótulos e ações visíveis.

Na administração, a mesma Manrope usa título principal (`2rem`, altura `1.2`), reduzido a (`1.75rem`) até 1100px e (`1.5rem`) até 600px. Títulos de seção usam (`1.5rem`), móvel (`1.25rem`); legendas de grupos usam (`1.0625rem`, peso `800`). Campos de edição usam (`15px`, peso `400`), rótulos (`14px`, peso `700`) e ajuda (`12px`, altura `1.6`). Essa escala operacional não herda o display da busca pública.

## Layout

O contêiner amplo usa `min(1344px, calc(100% - 96px))`, até 1180px mantém (`32px`) laterais e até 640px (`20px`). O cabeçalho mede (`116px`) no desktop e (`94px`) no celular. A logo ocupa caixa (`224 × 112px`) e móvel (`172 × 90px`), sem distorção; no rodapé (`180 × 102px`), móvel (`170 × 96px`).

A busca premium organiza texto e vitrine em duas colunas quando há fotografia de empresa destacada; até 720px empilha. A vitrine é omitida quando não há empresa elegível com imagem. Categorias preservam rolagem horizontal nas faixas estreitas. A grade comercial conserva três colunas, duas até 950px e uma até 640px; seus intervalos finais são (`28px`), até 1180px (`22px`) e móvel (`24px`). Capas comuns usam altura (`222px`) e proporção móvel (`16/9`); capas Premium Guide usam (`258px`) e móvel (`242px`).

No perfil, contato lateral aderente no desktop passa ao fluxo vertical no celular. Ajuda passa a uma coluna até 800px. Não promover a composição de vitrine da descoberta a exigência de todas as telas.

O painel administrativo usa contêiner `min(1440px, calc(100% - 64px))`, lateral (`230px`) e intervalo (`32px`). Até 1100px reduz a lateral a (`200px`) e o intervalo a (`22px`); até 850px troca a lateral por seletor de áreas e converte tabelas em registros verticais, preservando nome, situação e ações. Até 600px mantém margens laterais de (`16px`). Formulários organizam campos em duas colunas com intervalo (`20px`), passando a uma até 600px. Espaçamento entre grupos, linhas e painéis usa os passos existentes, sobretudo (`8px`, `12px`, `20px`, `24px`).

**Área segura.** Navegação inferior fixa e consentimento reservam espaço com `env(safe-area-inset-bottom)`; o rodapé móvel premium usa base (`108px`) mais área segura. O consentimento permanece acima da navegação.

## Elevation & Depth

Bordas, contraste tonal e fotografia estabelecem profundidade. Cartões comuns se elevam por deslocamento leve, sem sombra em hover; cartões patrocinados têm sombra ambiente. A busca premium remove a sombra da versão anterior. O gradiente escuro sobre a fotografia da vitrine garante leitura e pertence ao material fotográfico deste mundo.

### Shadow Vocabulary

- **Cartão Premium Guide:** `0 12px 30px rgb(11 41 72 / 12%)`, hover `0 16px 36px rgb(11 41 72 / 16%)`.
- **Favorito:** `0 3px 8px rgb(0 0 0 / 10%)` sobre fotografias.
- **Consentimento:** `0 10px 30px rgb(18 47 82 / 10%)`.
- **Navegação móvel:** `0 -6px 24px rgb(11 41 72 / 5%)`.

Botões transitam fundo e texto em (`0.18s`). Cartões deslocam (`-5px`) em (`250ms`) com `cubic-bezier(0.16, 1, 0.3, 1)`; fotografia conserva ampliação de hover (`1.035`) em (`0.3s`). Trocar a empresa da vitrine revela a foto em (`650ms`), sem autoplay. Movimento reduzido remove revelação, transições e deslocamento dos cartões.

## Shapes

Campos e busca têm cantos suaves; controles gerais usam raio intermediário e cartões, fotografias de perfil e painéis premium compartilham o raio maior. Selos patrocinados têm raio próprio; favorito e navegação da vitrine são circulares. Fotografias são recortadas com `object-fit: cover`; a logo preserva integralmente a composição. Não uniformizar todos os componentes em pílulas.

## Components

### Buttons

Ações legíveis com texto, ícone SVG auxiliar e estados explícitos.

- **Primary / Outline:** cores e preenchimento do frontmatter; altura mínima (`48px`), intervalo (`9px`). Contorno azul suave em hover; ações do perfil premium são transparentes com texto branco.
- **Search:** verde claro com texto escuro; altura desktop do botão (`54px`), móvel (`50px`); conjunto de busca mínimo (`72px`), móvel (`64px`).
- **WhatsApp:** usa cor convencional fora do contato premium; painel Premium Guide usa verde claro e tinta escura.
- **Auth:** login, cadastro e recuperação compartilham `GuideAuthLayout`. Submit sólido marinho com texto branco e hover marinho mais claro, mantendo altura herdada (`44px`), texto (`14px`) e raio (`12px`); regras scoped fora de layers removem o gradiente legado e vencem utilities sem alterar handlers. Contrastes informados pelo agente principal: normal (`14.74:1`), hover (`8.86:1`), placeholders sobre branco (`5.98:1`).
- **Focus / Disabled:** contorno do guia (`3px`), afastamento (`3px`), azul (`#2078d3`) em fundos claros; verde claro (`#c8f2a9`) na busca, cartão e cabeçalho premium. Primitivos Radix/Tailwind podem conservar seu anel próprio. Desabilitado usa opacidade e cursor apropriados.
- **Admin:** ação principal marinho, mínimo (`48px`) e cantos de controle; foco de botão azul (`#2376cb`, `3px`, afastamento `3px`). Botões de mover no celular conservam altura mínima (`44px`).

### Chips

Filtros ativos são removíveis e nomeados, com fundo azul suave e altura mínima (`40px`). Sugestões de busca têm borda clara sobre marinho. Produtos são links que quebram linha. Categorias selecionadas combinam fundo, contorno e texto azuis.

### Cards / Containers

Cartões comuns claros e patrocinados marinho compartilham estrutura e raio. Corpo desktop (`26px`), até 1180px (`22px`), móvel (`24px`). Ordem: nome, categoria, localização, descrição, produtos e avaliação/perfil; o selo patrocinado permanece sobre a capa. A categoria não antecede o título como kicker.

Favorito circular (`44px`) inclui nome da empresa no nome acessível e `aria-pressed`. O link decorativo da capa não duplica o foco do título. Sem imagem, usa ícone SVG de categoria, nunca glifo tipográfico. Avaliações e contagem vêm dos dados; sem avaliações, informa ausência ou “Perfil de exemplo”.

### Inputs / Fields

Campos nomeados, brancos e contornados, com leitura (`16px`) e `min-width: 0`; readonly suave, erro textual e textarea redimensionável. Busca é exceção compacta (`15px` desktop, `14px` móvel), preserva nome acessível e ação de limpar nomeada. Placeholders de autenticação usam a tinta `muted` com opacidade (`1`), não o tom tênue legado.

Editores, configurações e TOTP administrativos usam os tokens `admin-input`, altura mínima em vez de altura fixa e foco azul (`#297bc8`, `2px`, afastamento `2px`). Textareas crescem verticalmente. Erros aparecem em texto com anúncio acessível; o contorno de erro acompanha `aria-invalid` no editor. Seletores de empresa mantêm pesquisa e contexto explícito.

### Navigation

Cabeçalho com marca original, links textuais e conta sólida marinho; página atual por `aria-current` e atalho para conteúdo. Até 1180px o convite comercial sai do cabeçalho; no celular links auxiliares cedem lugar à barra inferior de quatro itens com ícone SVG e texto. Cada item móvel conserva mínimo (`48px`) de altura e (`64px`) de largura. Ajuda vira Painel para administrador; a navegação administrativa preserva seleção azul suave.

Na lateral administrativa marinho, a seleção usa fundo azul muito claro e texto azul escuro; ícones SVG acompanham rótulos. O seletor móvel nomeia a área atual, sem depender de rolagem horizontal para descobrir seções.

### Administrative editing and ordering

Editores amplos agrupam campos por assunto, com descrições e prévia textual; diálogos usam largura máxima (`920px`) para cadastro e (`760px`) para ordenação, rolagem vertical própria e limites baseados em `100dvh`. Salvar e Voltar permanecem na barra aderente do diálogo. Alterações não salvas pedem decisão ao sair; erros mantêm o contexto de edição e o estado de salvamento fica explícito.

**The Ação ao Alcance Rule.** Barras de diálogo e de configurações têm contextos próprios de posicionamento. Nas configurações, a barra é aderente (`position: sticky`, `bottom: 0`) no desktop; até 800px é fixa (`position: fixed`), acima da navegação inferior (`bottom: calc(76px + env(safe-area-inset-bottom))`), com laterais (`clamp(16px, 4vw, 32px)`) e camada (`z-index: 35`). O formulário reserva (`calc(208px + env(safe-area-inset-bottom))`) para as ações. Os offsets negativos dos diálogos não se aplicam ao formulário da página.

Ordenação combina alça de arraste, posição numérica e botões nomeados para mover acima/abaixo por toque ou teclado. O feedback de destino transita fundo em (`160ms ease-out`), removido com movimento reduzido. Mudança local anuncia a ordem pendente; Salvar aplica a ordem, Voltar preserva a decisão sobre alterações não salvas.

A apresentação do site organiza Textos, Cores e Vitrines em três abas; a faixa tem altura automática, e os gatilhos móveis têm mínimo de (`72px`). Campos, seletores e fieldsets podem encolher (`min-width: 0`); controles respeitam a largura disponível (`max-width: 100%`). Checkbox e seu rótulo ficam em linha. No desktop, os campos ficam à esquerda e a prévia à direita. Até 1100px, a prévia começa recolhida; um botão com estado expandido a abre no fluxo. Com múltiplas chamadas manuais, o seletor da prévia permite inspecionar qualquer uma, inclusive desativada. Abrir a prévia ou trocar essa seleção não publica alterações. Salvar configurações publica; a gravação transporta a revisão atual para detectar conflito. Os treze textos têm limites explícitos, sugestões de busca têm edição própria e as seis cores oferecem seletor, HEX e restauração. Vitrines mantêm modo automático ou até doze chamadas manuais, imagem da galeria/HTTPS, ativação individual, ordenação por arraste e botões/teclado, sem autoplay. Sua exibição pública independe dos filtros de busca e depende da elegibilidade da empresa. Segurança apresenta a conta do titular, configuração TOTP e mensagens distintas de confirmação/erro; não usa aparência de conta protegida como substituto da confirmação do autenticador.

### Premium Guide and evidence states

O selo diz “PREMIUM GUIDE” e “Destaque patrocinado”. Sua elegibilidade, assim como cartões e perfil premium, deriva de `plan.featured`, nunca de comparação com o nome do plano. Não representa verificação de reputação, altera preços ou conecta billing. A vitrine filtra empresas destacadas com imagem, usa navegação manual circular, contador e controles nomeados (`44px`); com menos de duas empresas desabilita navegação. Mudanças anunciam o conteúdo com `aria-live="polite"`.

Exemplos DEV são rotulados no catálogo, vitrine e perfil; contatos e avaliações de demonstração continuam bloqueados. Loading, vazio, erro e preparação de catálogo têm mensagens distintas; resultados usam anúncio educado, filtros expõem expansão e remoção. Esses estados não autorizam cadastros, avaliações ou promessas de duração inventados.

## Do's and Don'ts

### Do:

- **Do** preservar logo original azul/verde, Manrope e marinho com verde funcional.
- **Do** usar escala ampla com refluxo e leitura confortável nas faixas observadas.
- **Do** apresentar categoria abaixo do nome e patrocínio explicitamente rotulado.
- **Do** manter foco visível, controles nomeados, movimento reduzido e área segura.
- **Do** distinguir dados comerciais reais, exemplos e ausência de dados.
- **Do** preservar contexto da empresa, alternativa de teclado à ordenação e ações de salvamento acessíveis acima da navegação móvel.

### Don't:

- **Don't** inferir reputação ou patrocínio do nome do plano.
- **Don't** tratar fotos ilustrativas, preços ou avaliações ausentes como evidência comercial real.
- **Don't** restaurar gradiente de autenticação, placeholders tênues ou categorias como kickers acima do título.
- **Don't** adicionar autoplay à vitrine ou reutilizar medidas superadas ignorando a cascata final.
- **Don't** tratar aprovação visual local como validação de CRUD autenticado, banco remoto ou produção.
- **Don't** compartilhar offsets de diálogos com barras de formulários de página nem usar champanhe para estados administrativos comuns.

Não canonizado: a declaração de tinta premium (`#18334f`) superada pela regra sem layer, valores isolados e variáveis sem aplicação, padrões do legado fora do guia e as antigas categorias como eyebrows e controles de autenticação de baixo contraste, corrigidos no lote final; defeitos de craft não constituem linguagem a herdar. Os backups completos do sistema anterior estão em `documentos/referencias/DESIGN-antes-premium-2026-10-15.md` e `design-antes-premium-2026-10-15.json`.

Na extensão administrativa, não canonizados: variáveis sem uso como `--admin-ink`, tons isolados como novos tokens e a antiga barra de configurações encoberta pela navegação inferior, corrigida no lote final. Também não canonizados: overflow intrínseco de seletores/fieldsets, abas de altura insuficiente, checkbox empilhado, prévia móvel longa obrigatória ou tintas ilegíveis ao personalizar o marinho. São defeitos corrigidos, não linguagem visual a herdar. O cálculo localizado de contraste e o parecer visual não certificam conformidade WCAG global ou produção.
