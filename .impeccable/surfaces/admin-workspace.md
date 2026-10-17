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

## Extensão solicitada — cadastro de empresas (17/10/2026)

- Herda o modo Operate, a identidade e o editor de 920px, sem substituir o sistema visual.
- Logotipo com seleção/arraste, prévia, troca e remoção; envio apenas ao salvar, sem confundir a marca com a capa da galeria.
- Navegação direta entre perfil, localização/contato, funcionamento e publicação; ações Salvar/Voltar permanecem acessíveis.
- Semana com dias abertos/fechados, até três intervalos por dia, atendimento 24 horas e encerramento no dia seguinte explícito. Copiar para os demais dias abertos reduz repetição.
- Horários ainda não informados permanecem ausentes; texto legado preservado. Validação impede horários incompletos, sobrepostos e conflitantes entre dias.
- Logotipo e semana persistem na RPC com auditoria e aparecem no perfil público; falha de upload mantém o novo cadastro como rascunho recuperável.
- Um único botão global “Nova empresa”; a visão geral não repete a mesma criação com outro nome.

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

### Adendo ao Built record — cadastro de empresas, 17/10/2026

Registro do candidato local Operate/code-led, pelas fontes `CatalogEditor.tsx`, `CompanyLogo.tsx`, `WeeklyHoursEditor.tsx`, `shared.tsx`, `CompanyDetail.tsx`, `guide-admin.css` e `guide.css`. Preserva o histórico acima e os tokens globais; as medidas abaixo descrevem somente esta extensão. Seed/roll não aplicável a esta ampliação do editor existente, conforme referência e justificativa em `.impeccable/review/company-registration/evidence.md`.

- Diálogo: máximo de 920px, largura `min(920px, calc(100vw - 32px))`, altura máxima `calc(100dvh - 36px)`, padding efetivo de 30px e `overflow: clip`. Até 600px: largura `calc(100vw - 16px)`, altura máxima `calc(100dvh - 20px)` e padding efetivo de 22px. Medidas conferidas pelo agente principal no navegador: a regra `.app-dialog` com `!important` prevalece sobre os valores declarados no editor. Layout flexível mantém título, fechamento, navegação e ações fora dos campos roláveis. A barra de cadastro usa `position: static` e `flex-shrink: 0`; substitui somente neste editor os offsets aderentes da etapa anterior. Configurações e ordenação preservam seus contextos próprios.
- Navegação: Perfil, Localização e contato, Funcionamento e Publicação em quatro colunas, duas até 600px, intervalo de 8px e ações de pelo menos 48px. `revealField` foca com `preventScroll` e desloca apenas a área de campos; animação respeita movimento reduzido. O conjunto rolável tem intervalo de 26px; campos agrupados mantêm duas colunas e intervalo de 20px, uma coluna no celular.
- Logotipo: contorno tracejado, raio de 10px, padding/intervalo de 20px e prévia de 96px; imagem com `object-fit: contain`. Até 600px, prévia de 64px, padding de 12px, intervalo de 10px 12px e ações em linha com quebra. Instrução redundante é ocultada no celular, mantendo formato/limite e aviso de envio ao salvar. Trocar e remover permanecem nomeados, com altura mínima de 48px; arraste recebe seleção azul suave. Não confundir logotipo com capa da galeria.
- Funcionamento: semana opcional com status textual Aberto/Fechado/24 horas, até três intervalos por dia, cópia para demais dias abertos e encerramento no dia seguinte explícito. Desativar/reativar preserva a semana na edição. Grade diária de 160px mais coluna flexível, intervalo de 12px 20px, padding vertical de 18px e divisores; até 600px, dia em coluna única. Intervalos mantêm dois campos flexíveis e ação de 48px, números tabulares, rótulos e erros associados ao dia. Conferência textual expansível; sem semana, texto legado ou orientação de consulta. Não são inventados horários de empresas.
- Público: logotipo sem recorte, fundo branco, contorno e raio de 8px; cartões usam 48px, identidade do perfil 80px e 56px até 600px. Horários em lista descritiva com coluna de dia de 130px mais coluna flexível, uma coluna até 600px. Ausência da semana mantém texto legado ou “Consulte a empresa.” Essas medidas são locais, não novos tokens universais.
- Entrada: somente o atalho global “Nova empresa”; a visão geral deixa de repetir a criação sob outro rótulo.

Evidência: `.impeccable/review/company-registration/evidence.md`, sete JPEGs finais de viewport (`profile-desktop.jpg`, `hours-desktop.jpg`, `profile-mobile.jpg`, `hours-mobile.jpg`, `profile-user-1254.jpg`, `public-desktop.jpg`, `public-mobile.jpg`), nas faixas lógicas 1440×1000, 390×844 e 1254×884. Estados `*-initial.jpg` são históricos. Segundo o pacote, no celular o campo de nome está em y=612–660 e Salvar termina em y=811; essas coordenadas são evidência localizada, não regra de composição.

Revisão independente: parecer inicial e disposição final `fix`; dos cinco itens, três correções visuais resolvidas, seed/roll não aplicável e um não resolvido por bloqueio externo: selecionar arquivo no Chrome, salvar e reabrir usando essa seleção. A permissão da extensão impediu esse fluxo. Upload/leitura por SDK real na API local não substitui essa verificação. Não declarar aprovação global, finalização ou produção pronta.

Gates comunicados pelo agente principal e pacote, não reexecutados pelo documenter: typecheck, lint com 0 erros/37 avisos herdados, formatação, 104 testes/16 arquivos, builds laboratório/produção e nove suítes SQL no PostgreSQL real com migrations candidatas 13/14 dentro da transação e rollback final. Detector sem ocorrências foi executado uma vez antes do ajuste final da barra; não houve nova varredura. Nenhuma migration 13/14 ou deploy aplicado em produção. Este registro conferiu fontes e documentos; não reexecutou fluxos, capturas, gates ou revisão.

Não canonizados: rolagem ancestral que afastava controles, introdução móvel longa, alvos complementares pequenos e duplicação de criação, corrigidos no candidato. A permissão externa do seletor não vira comportamento aprovado; os valores isolados desta extensão não se tornam tokens globais.
