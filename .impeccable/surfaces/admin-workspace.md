# Administração do Service Guide

Mode: Operate. Extensão do sistema existente; não substitui a identidade aprovada.
Primary target: src/modules/guide/screens/Admin.tsx
Related targets: src/modules/guide/admin/, src/styles/guide-admin.css

## Direction contract

THESIS: cadastrar e manter empresas, produtos e serviços com orientação clara e autonomia.
OWN-WORLD: Manrope local, logo fornecida, branco, marinho, azul e verde; champanhe reservado ao patrocínio.
FIRST VIEWPORT: título operacional, acesso ao site, criação de empresa, navegação agrupada e próximo passo real do catálogo.
FORM: área de trabalho com navegação estável, listas legíveis, editor amplo com seções, ações de 48 px e barra de salvamento persistente.
SIGNATURE INTERACTION: organizar categorias, catálogo e imagens por arrastar e soltar; mover acima/abaixo oferece a mesma operação por toque e teclado; salvar aplica a ordem atomicamente.
MOTION: transições de estado de 160 ms; feedback de salvamento e destino de reordenação; respeitar movimento reduzido.
STORY: preparar categorias e bairros, cadastrar empresa como rascunho, acrescentar catálogo e imagens, revisar e publicar.
SUCCESS: concluir o cadastro sem perder dados, voltar ao contexto correto, reconhecer o que foi salvo e acessar as configurações do site.
CONSTRAINTS: dados reais somente no público; testes com rollback/contas descartáveis; permissões e auditoria preservadas; sem cobrança, serviços pagos ou alterações nas senhas dos titulares.
BUILD PATH: code-led; ampliação de uma superfície operacional existente, com marca e componentes estabelecidos.
FINISH: gate local, SQL real, fluxos Auth/ACL, inspeção desktop/celular, revisão independente e documentação.

## Extensão solicitada — aparência e vitrines

Pedido confirmado: além do catálogo, o administrador deve editar vitrines, cores, textos e títulos. Mantém o modo Operate, a marca existente e o caminho code-led, sem comp de substituição.

- Textos e títulos: treze campos com limites, sugestões de busca e prévia local; publicação somente ao salvar.
- Cores: seis papéis de cor, seletor e código hexadecimal, restauração da paleta original e cálculo de texto legível.
- Vitrines: seleção de empresas, imagem da galeria ou HTTPS, chamada e descrição, ativação individual, arraste e alternativas por botões/teclado. Até doze chamadas, sem rotação automática.
- A vitrine pública independe dos filtros da pesquisa; empresas não elegíveis e rascunhos de chamadas não são publicados.
- Prévia lateral no computador; até 1100px, botão de expansão permite abrir a prévia durante a edição.
- Conflito de revisão, proteção de edição pendente, auditoria e verificação das permissões permanecem obrigatórios.

O registro abaixo consolida a etapa administrativa e a extensão final de personalização, a partir do candidato local construído e da revisão independente comunicada pelo agente principal.

## Built record — 16/10/2026

Fonte: `src/styles/guide-admin.css`, `src/modules/guide/screens/Admin.tsx` e componentes em `src/modules/guide/admin/`. Registro descritivo do candidato local em `codex/painel-profissional`, sem nova migração aplicada ou deploy por este registro.

- Área ampla: contêiner máximo de 1440px, lateral de 230px e intervalo de 32px; até 1100px lateral de 200px e intervalo de 22px. Até 850px, seletor de áreas substitui a lateral e tabelas viram registros em coluna. Até 600px, margens laterais de 16px.
- Editor: máximo de 920px, rolagem própria, campos em duas colunas com intervalo de 20px; até 600px uma coluna e largura de viewport menos 16px. Seções orientam perfil, endereço/contato e publicação da empresa; produtos/serviços mantêm contexto da empresa.
- Ordenação: máximo de 760px; alça, posição e botões acima/abaixo oferecem operações equivalentes. A ordem fica pendente até salvar, com confirmação de descarte ao voltar.
- Persistência de ações: diálogos usam barra aderente com offsets de seu padding. Configurações usam regra independente: `position: sticky; bottom: 0` no desktop; até 800px, `position: fixed`, laterais `clamp(16px, 4vw, 32px)`, bottom `calc(76px + env(safe-area-inset-bottom))` e z-index 35, com reserva no formulário de `calc(208px + env(safe-area-inset-bottom))`. As medidas finais acomodam a barra completa acima da navegação móvel.
- Apresentação: prévia acompanha os campos e informa que a alteração pública ocorre ao salvar. Revisão segue na gravação para conflito concorrente. Até 1100px, a prévia começa recolhida e pode ser aberta por botão com `aria-expanded`. O seletor permite inspecionar qualquer chamada manual, inclusive desativada, sem publicação. Salvar configurações publica a edição.
- Personalização: Textos, Cores e Vitrines em três abas de altura automática (`h-auto!` sobre o primitivo); gatilhos móveis de pelo menos 72px. Fieldsets e seletores encolhem sem impor largura intrínseca, controles respeitam 100% do espaço e checkbox/rótulo ficam em linha. A paleta pública usa seis papéis com HEX de seis dígitos validado; preserva os defaults azul, verde, marinho, branco e champanhe. As tintas derivadas acompanham títulos e sugestões no marinho personalizado; fotografias mantêm texto claro sobre camada escura. O workspace permanece neutro.
- Segurança: conta do titular, configuração/confirmação TOTP, estados explícitos e encerramento de sessões. Descrição visual não comprova ativação do fator em conta real.

O histórico da primeira etapa permanece em `.impeccable/review/admin-profissional/`. Para a extensão final, o agente principal informou revisão independente completa com cinco correções (`fix`), seguida de `pass`, cinco itens resolvidos e disposição `ship` limitada às correções do candidato local. O pacote é `.impeccable/review/site-customization/evidence.md`, com capturas atualizadas, incluindo `preview-second-mobile.jpg`. O arquivo de evidências conserva observações da confirmação anterior como histórico; elas não são orientação visual vigente. Gates comunicados: 87 testes unitários, typecheck, lint com 0 erros/37 avisos herdados, formatação e builds laboratório/produção; sete testes SQL com rollback comprovado. Nenhuma migration 11/12 ou deploy foi aplicado. O documenter verificou o código; não reexecutou gates, detector, fluxos remotos ou inspeção das capturas. O histórico premium público permanece preservado no sidecar. O parecer e o contraste calculado não certificam WCAG global, segurança absoluta ou produção.

Sistema consolidado em `documentos/DESIGN.md` e `.impeccable/design.json`. Não herdar a barra anteriormente encoberta, reserva de 104px, prévia móvel obrigatória, overflow intrínseco, abas comprimidas, checkbox empilhado, variáveis sem aplicação, kickers ou tons isolados como novas regras globais.
