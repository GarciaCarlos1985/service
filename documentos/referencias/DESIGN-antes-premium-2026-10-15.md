---
name: Service Guide
description: Guia comercial local, legível e orientado à busca no celular.
colors:
  primary: "#1264ce"
  primary-hover: "#0b50aa"
  navy: "#102d52"
  search-green: "#6dd329"
  search-green-hover: "#90e34b"
  search-ink: "#17390c"
  whatsapp: "#137c3e"
  background: "#fff"
  foreground: "#172c47"
  muted: "#52657c"
  border: "#d8e2ed"
  surface-soft: "#f5f8fc"
  brand-soft: "#eaf3ff"
  field-soft: "#f4f7fb"
  plan-soft: "#e9f7dd"
  plan-ink: "#376a18"
  destructive: "#b42318"
typography:
  display:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "clamp(2rem, 3.5vw, 3.1rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
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
  tag: "4px"
  chip: "6px"
  control: "8px"
  category: "10px"
  panel: "12px"
  company-card: "14px"
  circle: "50%"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  control: "18px"
  panel: "20px"
  card: "22px"
  section: "24px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-search:
    backgroundColor: "{colors.search-green}"
    textColor: "{colors.search-ink}"
    rounded: "{rounded.control}"
    height: "48px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  company-card:
    rounded: "{rounded.company-card}"
    textColor: "{colors.foreground}"
  filter-chip:
    backgroundColor: "{colors.brand-soft}"
    rounded: "{rounded.chip}"
    padding: "8px 10px"
  plan-badge:
    backgroundColor: "{colors.plan-soft}"
    textColor: "{colors.plan-ink}"
    rounded: "{rounded.tag}"
    padding: "3px 8px"
  navigation:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
---

# Design System: Service Guide

## Overview

**Creative North Star: "Guia comercial local"**

O sistema registra a versão exportada escolhida pelo usuário e sua adaptação local. Branco, marinho, azul e verde organizam um guia comercial direto, amigável e legível. A busca tem o maior contraste; cartões, categorias e perfis apresentam o comércio de Cacoal com informação progressiva.

O documento descreve o artefato em `src/styles/guide.css`, seus componentes em `src/modules/guide/` e os primitivos efetivamente usados. Considera as declarações posteriores do CSS, que substituem medidas anteriores. A revisão visual registrada em `.impeccable/review/finish-review.md` cobre esta adaptação local. A prévia `/previa` é exclusiva de desenvolvimento, rotulada e sem escritas; migração remota, CRUD autenticado e prontidão de produção não são garantias deste documento.

**Key Characteristics:**

- Busca em faixa marinho, campo branco e botão verde.
- Manrope nos títulos, textos e controles do guia.
- Cartões com borda suave, fotografia ou alternativa de categoria.
- Refluxo para celular com navegação inferior e área segura.
- Destaques, exemplos, ausência de dados e estados de consulta identificados em texto.

## Colors

A paleta combina azuis de orientação com verdes de ação e planos, sobre superfícies claras.

### Primary

- **Azul de ação** (`primary`): botões principais, links, seleção e navegação atual; escurece no hover.
- **Marinho de busca** (`navy`): área de busca e atalho de acesso ao conteúdo; oferece contraste com o campo branco.

### Secondary

- **Verde de busca** (`search-green`): ação de pesquisar, com texto verde escuro e hover mais claro. É a cor realmente aplicada ao botão; a variável legada `--green` não determina esse controle.
- **Verde de contato** (`whatsapp`): contato por WhatsApp com texto branco.
- **Verde de plano** (`plan-soft`, `plan-ink`): selo textual de plano em destaque; não representa reputação.

### Neutral

- **Branco** (`background`): fundo, campos, cabeçalho e navegação inferior.
- **Tinta azul** (`foreground`): leitura principal.
- **Cinza azulado** (`muted`): localização, descrições e metadados.
- **Linha suave** (`border`): divisões, campos e painéis. O cartão comercial usa a variante observada de borda (`#dce5ef`).
- **Superfícies suaves** (`surface-soft`, `field-soft`): contato, ajuda, filtros e avisos neutros; são valores distintos do CSS, não aliases intercambiáveis.
- **Azul suave** (`brand-soft`): filtros aplicados e seleção administrativa.

O vermelho `destructive` identifica erros e ações destrutivas dos primitivos. Estados de sucesso e avisos têm tratamentos contextuais; não constituem uma escala cromática completa. As rampas do sidecar são apenas visualizações sintetizadas, sem autoridade para adicionar cores ao produto.

**The Cor com Função Rule.** Azul orienta ações gerais, verde vivo destaca a busca e o selo de plano permanece identificado pelo nome; cor sozinha não comunica estado.

## Typography

**Display Font:** Manrope, com Arial e sans-serif como alternativas.

**Body Font:** a mesma família, fornecida localmente em `public/guide/fonts/` com `font-display: swap`. O contêiner do guia estabelece a família explicitamente, mesmo com estilos legados globais.

**Character:** uma família sem serifa mantém continuidade entre descoberta e administração. Títulos têm peso forte e espaçamento ligeiramente fechado; textos descritivos preservam altura de linha confortável.

### Hierarchy

- **Display:** título de busca fluido conforme o frontmatter; no celular usa tamanho fixo (`2rem`).
- **Headline:** título geral de seção; a barra de resultados usa sua variante menor (`1.5rem`, reduzida a `1.35rem` no celular).
- **Title:** nome da empresa no cartão; títulos genéricos de terceiro nível usam a variante (`21px`).
- **Body:** leitura corrente; descrições de cartão usam altura de linha (`1.65`) e limite visual de duas linhas. O corpo do perfil e as respostas de ajuda mantêm leitura maior que os metadados.
- **Label:** rótulos de formulário e botões fortes, sem impor caixa alta globalmente.
- **Metadata:** localização, categorias e ações auxiliares; o selo de plano usa tamanho menor (`12px`), peso (`800`) e espaçamento (`0.04em`). Navegação inferior usa (`0.75rem`).

**The Leitura Antes da Densidade Rule.** Preserve o corpo de leitura e os rótulos explícitos ao adaptar para celular; reduza colunas e reorganize controles.

## Layout

O contêiner central tem largura limitada (`min(1180px, calc(100% - 64px))`). A partir de (`1400px`), usa (`min(1240px, calc(100% - 100px))`); até (`640px`), mantém margens laterais (`16px`). O ritmo usa vários intervalos recorrentes registrados no frontmatter; a variável `--space-unit` existente não implica uma grade rígida aplicada a todos os valores.

A grade comercial tem três colunas, duas até (`950px`) e uma até (`640px`), com espaçamento desktop (`25px`) e menor (`20px`) nas duas faixas reduzidas. Categorias passam a rolar horizontalmente até (`950px`); no celular mantêm largura mínima (`110px`). A barra de resultados quebra linha, filtros passam de quatro para duas colunas e ações podem ocupar toda a largura.

O cabeçalho tem altura desktop (`96px`) e móvel (`82px`). No celular, a busca mantém campo e ação na mesma linha, reduz o botão e omite a localização secundária. As capas dos cartões usam altura desktop (`194px`), intermediária (`180px`) e proporção móvel (`16/9`); a declaração antiga de capa larga não vence a regra posterior.

No perfil, o contato é lateral e aderente no desktop; no celular vem em fluxo vertical com largura total. Ajuda passa a uma coluna até (`800px`). A administração efetivamente usada tem lateral (`210px`) e intervalo (`32px`); até (`1050px`), vira navegação horizontal rolável. Tabelas rolam dentro de seu contêiner e formulários longos têm rolagem própria nos diálogos.

**Área segura.** Navegação inferior fixa, rodapé e consentimento reservam espaço com `env(safe-area-inset-bottom)`; o aviso de consentimento fica acima da navegação, sem cobrir suas ações.

## Elevation & Depth

Superfícies claras e bordas estabelecem a estrutura. Sombras suaves distinguem busca, favorito e consentimento; o cartão ganha elevação no hover. Não há sombra dura deslocada como linguagem estrutural.

### Shadow Vocabulary

- **Busca:** (`0 7px 20px rgb(0 0 0 / 12%)`), separa o campo branco da faixa marinho.
- **Cartão em hover:** (`0 8px 24px rgb(16 45 82 / 8%)`), junto da mudança de borda.
- **Favorito:** (`0 3px 8px rgb(0 0 0 / 10%)`), destaca o botão sobre a imagem.
- **Consentimento:** (`0 10px 30px rgb(18 47 82 / 10%)`), valor de `--elevation` para a superfície sobreposta.

Botões transitam fundo e texto em (`0.18s`); cartões transitam borda e sombra no mesmo tempo. A imagem amplia no hover (`scale(1.035)`) em (`0.3s`). O modo de movimento reduzido remove essas transições e a animação do indicador de carregamento. A variável `--motion-ease` declarada não é aplicada a esses movimentos e não se torna token normativo.

## Shapes

Controles usam cantos suaves; etiquetas são menores e cartões comerciais mais arredondados que campos. Fotografias são recortadas com `object-fit: cover`; o favorito é circular. Sugestões de busca usam pílulas (`30px`), enquanto categorias, chips de filtros e selos conservam suas formas próprias. Não uniformizar todos os componentes em um único raio.

## Components

### Buttons

Ações legíveis e compactas, com alinhamento central e possibilidade de quebra de texto.

- **Primary / Outline:** medidas e cores no frontmatter; altura mínima (`44px`), intervalo entre ícone e texto (`9px`). O contorno usa linha de borda suave, com fundo azulado no hover e quando pressionado.
- **Search:** ação verde com altura (`48px`); largura mínima desktop (`112px`) e móvel (`72px`).
- **WhatsApp:** verde escuro e texto branco, exibido quando há contato real disponível.
- **Focus / Disabled:** foco global com contorno (`3px solid #3584ec`) e afastamento (`3px`); controles desabilitados perdem opacidade e usam cursor apropriado. Primitivos Radix/Tailwind podem usar seu anel próprio; não confundir esse comportamento com o botão CSS do guia.

### Chips

Filtros ativos são removíveis, com fundo azul suave, texto (`#164b8e`), altura mínima (`40px`) e hover (`#dceaff`). Sugestões são pílulas sobre marinho. Etiquetas de produto são links com fundo suave e quebra em múltiplas linhas. Categorias selecionadas combinam preenchimento azul claro, borda e texto azul; a antiga barra verde inferior foi removida pelo CSS posterior.

### Cards / Containers

Cartões comerciais têm borda fina, raio próprio e corpo desktop (`22px`), reduzido no celular (`20px`). Conteúdo segue categoria/plano, nome, localização, descrição, produtos e rodapé de avaliação/perfil. O rodapé alinha-se ao fim pela distribuição flexível. A capa usa foto quando disponível e ícone SVG de categoria quando ausente; os ícones não são caracteres tipográficos.

O favorito tem alvo circular (`44px`), nome acessível que inclui a empresa e `aria-pressed`. A imagem vinculada decorativa evita repetir o foco do link do título. Fotos demonstrativas têm texto alternativo ilustrativo.

### Inputs / Fields

Campos brancos com borda, raio e preenchimento registrados; texto (`16px`) e largura flexível com `min-width: 0`. Textareas podem crescer verticalmente. Readonly recebe superfície suave. Rótulos visíveis, mensagens de erro e seletores nomeados acompanham os campos. O campo de busca usa nome acessível, borda externa do conjunto, botão de limpar nomeado e tamanho desktop (`1.0625rem`), móvel (`1rem`).

### Navigation

Cabeçalho com marca e links textuais, conta em controle contornado e item atual indicado por `aria-current`. Há atalho de teclado para o conteúdo. Até a faixa móvel, links auxiliares saem do cabeçalho e surge barra inferior fixa com quatro itens, ícones SVG e texto; cada item tem altura mínima (`48px`) e largura mínima (`64px`). O item Ajuda é substituído por Painel para administrador. A navegação administrativa lateral tem seleção azul suave e torna-se horizontal em telas menores.

### Plan badges and evidence states

O selo usa o nome configurado do plano e só aparece quando seu atributo `featured` é verdadeiro. Ele identifica destaque comercial; avaliação continua sendo média e quantidade próprias. Sem avaliações, o cartão real informa essa ausência; o exemplo informa “Perfil de exemplo”.

Exemplos recebem aviso de ficção no catálogo e no perfil, com contatos e avaliações bloqueados. A prévia local tem aviso próprio. Loading usa `aria-busy`, resultados anunciam atualização com `aria-live="polite"`, filtros expõem expansão e remoção e vazio oferece caminhos para ajustar a busca. Erro, ausência de dados e preparação do catálogo são mensagens distintas. Esses estados não autorizam números ou cadastros fictícios na experiência real.

## Do's and Don'ts

### Do:

- **Do** preservar a busca marinho com campo branco e ação verde da versão escolhida.
- **Do** usar Manrope, hierarquia de leitura e refluxo de colunas observados.
- **Do** manter nomes acessíveis, foco visível, estados anunciados e texto nos controles principais.
- **Do** identificar planos em destaque, dados demonstrativos e ausência de avaliações em texto.
- **Do** reservar espaço para navegação móvel, consentimento e área segura.

### Don't:

- **Don't** apresentar exemplos, preços ilustrativos ou contagens ausentes como dados comerciais reais.
- **Don't** substituir avaliação por selo de plano ou deduzir reputação da posição comercial.
- **Don't** reintroduzir medidas antigas do CSS sem considerar as regras posteriores de adaptação.
- **Don't** tratar a aprovação visual local como comprovação de migração remota ou operação em produção.

Não canonizado: valores isolados, variáveis sem aplicação e padrões do legado fora do guia; não há defeito material de craft apontado pela revisão final local. As rampas sintetizadas do sidecar são exploratórias, não cores aprovadas para novas telas.
