# Cadastro de empresas — candidato local de 17/10/2026

Pedido: logotipo no cadastro e caixas para dias/horários abertos e fechados; formulário confortável e profissional. Pergunta posterior: por que existem “Nova empresa” e “Cadastrar empresa”? Ambos abriam o mesmo editor; o candidato mantém apenas o atalho global “Nova empresa”.

Superfície Operate, code-led, ampliação do painel aprovado. Sem comp de substituição ou nova identidade. Direção: `.impeccable/surfaces/admin-workspace.md`. Preservar Manrope, marca fornecida, branco, azul/verde/marinho; champanhe apenas para patrocínio. Contrato de qualidade: tarefa identificável, campos com rótulos, erros recuperáveis, teclado, mínimo 48px nas ações, semana sem horários inventados, dados reais somente em produção.

### QUALITY BAR — extensão Operate

O administrador deve reconhecer o cadastro, alcançar a seleção da marca e iniciar os campos obrigatórios na primeira área útil do celular. Título/fechamento, navegação entre assuntos e salvar/voltar continuam acessíveis; apenas os campos rolam. Marca, legibilidade, foco e alvos de 48px acompanham o sistema existente. Sem invenção de valores comerciais nem alteração de identidade. Os controles operam por teclado e preservam dados em erro.

Seed/roll não se aplica: `C:/Users/CarlosAlineBianca/.agents/skills/impeccable/reference/new-work.md`, §3 “Extend an existing surface”: “Inherit its world and composition” e “No concept tournament”; a mesma seção manda “Never run the script for a local extension or a precisely specified narrow request; shape those directly.” Este pedido acrescenta campos ao editor existente, sem novo fluxo de página nem novo mundo visual.

## Artefato

- Fontes: `src/modules/guide/admin/{CatalogEditor,CompanyLogo,WeeklyHoursEditor}.tsx`, `src/modules/guide/hours.ts`, `src/modules/guide/admin/{editor-model,image-upload}.ts`.
- Público: `src/modules/guide/components/shared.tsx`, `src/modules/guide/screens/CompanyDetail.tsx`.
- Estilos: `src/styles/guide-admin.css`, `src/styles/guide.css`.
- Prévia isolada: `http://127.0.0.1:3005/admin?area=companies`. API PGlite/Auth/Storage descartáveis em 3004, sem conexão ao Supabase remoto. Prévia normal 3002 preservada, usando backend real e UI publicada anterior.
- Fixture identificada: “Service Guide — ensaio local”; marca existente `public/service-guide.png` usada como arquivo de teste, sem novo raster produzido.
- Incumbente: `.impeccable/review/admin-profissional/editor-desktop.jpg`. Sem comparação com mock novo.

## Capturas obrigatórias para revisão

Arquivos nesta pasta, JPEG viewport, abertos e inspecionados. Desktop lógico 1440×1000; móvel 390×844; largura do comentário do usuário 1254×884. O bitmap pode perder alguns pixels por escala/scrollbar da captura Chrome.

- `profile-desktop.jpg`: editor final no início, logo carregado, ações.
- `hours-desktop.jpg`: editor final após navegar para Funcionamento.
- `profile-mobile.jpg`: início do editor no celular.
- `hours-mobile.jpg`: Funcionamento no celular.
- `profile-user-1254.jpg`: início do editor na largura informada pelo usuário.
- `public-desktop.jpg`, `public-mobile.jpg`: perfil público local com logotipo.

Os arquivos `*-initial.jpg` registram estados anteriores e NÃO são a aparência vigente. As sete capturas finais foram substituídas/confirmadas após o lote da revisão. O layout agora mantém título, fechamento, navegação por seções e barra de ações fora da área rolável. `revealField` foca sem rolar ancestrais e move somente `.admin-catalog-fields`; o diálogo usa `overflow: clip`. Em 390px, nome do negócio fica em y=612–660 e seleção de marca termina em y=545; navegação em y=123 e botão Salvar termina em y=811. Depois de navegar para Funcionamento, `dialog.scrollTop` continua zero. A introdução foi encurtada, marca móvel reduzida para 64px com ações em linha e ações complementares elevadas a 48px. Os perfis públicos não mudaram no lote da revisão.

## Verificação funcional já executada

- Cadastro novo com pausa 08:00–12:00 / 13:30–18:00, cópia para demais dias selecionados, sábado 24h e domingo fechado. Salvamento, reabertura e perfil público conferidos.
- Horário sobreposto recusado com mensagem no dia e foco no campo.
- Fechamento de formulário alterado abre confirmação; continuar mantém os dados.
- Rede desligada somente na aba de teste: erro recuperável, valores preservados e nova tentativa com sucesso após restaurar a rede.
- No candidato corrigido, desativar/reativar a semana antes de salvar preserva os intervalos. Remover logotipo, salvar e reabrir mantém a referência vazia e os horários anteriores; o arquivo foi restaurado somente na fixture local por HTTP para manter a prévia ilustrativa.
- Upload e leitura HTTP do logotipo com SDK real contra API local e referência salva na RPC; carregamento da imagem no editor e perfil público conferidos.
- Seleção pelo file chooser do Chrome ainda bloqueada pela permissão da extensão, inclusive após o primeiro aviso de ativação. O perfil usado é Carlos; o responsável não soube confirmar o perfil e recebeu instruções manuais. A abertura automatizada de chrome://extensions foi recusada pela política HTTP/HTTPS do navegador; nenhum contorno foi tentado. Não declarar esse fluxo do seletor concluído até novo teste.

## Evidências técnicas

Typecheck; lint com 0 erros/37 avisos herdados; formatação; 104 testes unitários/16 arquivos; builds laboratório e produção passaram. Detector estático em `detector.json`: nenhuma ocorrência; executado uma vez antes do ajuste final da barra, sem nova varredura. Nove suítes SQL no PostgreSQL real, migrations candidatas 13/14 aplicadas dentro da transação e rollback final, aprovadas. `dist` de produção verificado: 228 arquivos sem segredos privados nem API/banner de laboratório; backend público correto.

Nenhuma migration/deploy desta extensão foi aplicada em produção. PR #2 de permissões internas continua separado e sem aprovação. O parecer visual deve respeitar esse escopo local, sem certificar segurança absoluta ou produção.

## Revisão independente — parecer e verdict

Primeira revisão: `fix` com cinco itens. O lote corrigiu navegação externa, primeiro viewport móvel e alvos de ação. O pedido de seed/roll foi retirado como não aplicável à extensão local, após leitura da referência literal acima. O verdict do mesmo revisor sobre as recapturas confirmou **três correções resolvidas e uma não aplicável**. O quinto item permanece **não resolvido por bloqueio externo**: selecionar arquivo pelo Chrome, salvar e reabrir com essa seleção. Disposição final do revisor: **fix**, sem regressão material identificada nas correções pontuadas. Não é pass global nem autorização de publicação. Parecer limitado a esses cinco achados; nenhum segundo detector foi executado.
