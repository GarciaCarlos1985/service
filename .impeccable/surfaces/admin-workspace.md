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

## Built record — 16/10/2026

Fonte: `src/styles/guide-admin.css`, `src/modules/guide/screens/Admin.tsx` e componentes em `src/modules/guide/admin/`. Registro descritivo do candidato local em `codex/painel-profissional`, sem nova migração aplicada ou deploy por este registro.

- Área ampla: contêiner máximo de 1440px, lateral de 230px e intervalo de 32px; até 1100px lateral de 200px e intervalo de 22px. Até 850px, seletor de áreas substitui a lateral e tabelas viram registros em coluna. Até 600px, margens laterais de 16px.
- Editor: máximo de 920px, rolagem própria, campos em duas colunas com intervalo de 20px; até 600px uma coluna e largura de viewport menos 16px. Seções orientam perfil, endereço/contato e publicação da empresa; produtos/serviços mantêm contexto da empresa.
- Ordenação: máximo de 760px; alça, posição e botões acima/abaixo oferecem operações equivalentes. A ordem fica pendente até salvar, com confirmação de descarte ao voltar.
- Persistência de ações: diálogos usam barra aderente com offsets de seu padding. Configurações usam regra independente: bottom 0 no desktop; até 800px, bottom `calc(76px + env(safe-area-inset-bottom))`, com reserva no formulário de `calc(104px + env(safe-area-inset-bottom))`. Esta é a correção material final para manter ações acima da navegação móvel.
- Apresentação: prévia acompanha os campos e informa que a alteração pública ocorre ao salvar. Revisão segue na gravação para conflito concorrente. Até 1100px, prévia vem antes do formulário.
- Segurança: conta do titular, configuração/confirmação TOTP, estados explícitos e encerramento de sessões. Descrição visual não comprova ativação do fator em conta real.

O agente principal informou revisão inicial `fix`, seguida de `pass` / `ship` no escopo da correção da barra de configurações, e uma execução do detector sem ocorrências. Capturas finais estão em `.impeccable/review/admin-profissional/`, incluindo `settings-mobile-form.jpg`. O documenter verificou o código; não reexecutou o gate, o detector, os fluxos remotos ou a inspeção das capturas. O histórico da revisão premium pública permanece preservado no sidecar.

Sistema consolidado em `documentos/DESIGN.md` e `.impeccable/design.json`. Não herdar a barra anteriormente encoberta, variáveis sem aplicação, kickers ou tons isolados como novas regras globais.
