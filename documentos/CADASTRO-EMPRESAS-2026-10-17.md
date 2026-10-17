# Cadastro de empresas — candidato de 17/10/2026

O responsável solicitou logotipo e caixas para definir os dias e horários de
funcionamento no formulário de empresas. O candidato preserva o painel e o
backend existentes, acrescentando essas informações ao cadastro e ao perfil
público. A visão geral mantém apenas o botão global **Nova empresa**: o antigo
**Cadastrar empresa** abria exatamente o mesmo formulário.

## Alteração e impacto

- Marca opcional com seleção/arraste, prévia, troca e remoção da referência.
  JPG, PNG, WebP ou AVIF, até 5 MiB; conteúdo ativo recusado. A imagem é enviada
  apenas ao salvar, usando Storage existente, e não ocupa a galeria/capa.
- Sete dias com caixas aberto/fechado, até três intervalos, pausa, atendimento
  24 horas, indicação de encerramento no dia seguinte e cópia para outros dias
  marcados. Não são sugeridos horários fictícios para a empresa.
- Horários não informados ficam ausentes. O texto anterior continua aceito;
  clientes antigos que não mandam os novos campos preservam os valores salvos.
- Logotipo e semana aparecem nos resultados/perfil. A RPC mantém auditoria,
  sessão administrativa e validação de objetos do Storage da própria empresa.
- Navegação por quatro seções, campos com rótulos e ações de salvar/voltar fora
  da área rolável. As regras compartilhadas também atendem os demais editores
  comerciais, mantendo seus campos e comandos existentes.
- Novo cadastro com arquivo começa como rascunho antes do upload. Falha mantém
  o rascunho e os valores da tela; a tentativa seguinte reutiliza o cadastro e o
  identificador da imagem, evitando criação duplicada.

Remover/trocar o logotipo altera a referência do perfil; não é uma promessa de
exclusão física de arquivos antigos do Storage. Não foi adicionado serviço,
dependência ou cobrança.

## Banco de dados

Migration candidata `20261017132355_guide_company_identity_hours.sql`: adiciona
`companies.logo_url` e `weekly_hours`, amplia o texto legado de horários de 300
para 2.000 caracteres e integra a RPC e o catálogo existentes. Sem exclusão de
colunas ou dados. Semana estrita, tamanho limitado, validação de períodos e de
conflitos entre dias, inclusive domingo/segunda. Logo exige objeto previamente
enviado no caminho da empresa, além de formato e HTTPS em produção.

O PR #2 foi mesclado na main e publicado, com as migrations
`20261017130133_guide_internal_rpc_permissions.sql` e
`20261017142019_guide_api_access_boundary.sql`. O candidato de cadastro foi
sincronizado com a main, sem incorporar a extensão ao site publicado. Somente
a migration `20261017132355` deste formulário continua sem aplicação definitiva.
Ela foi ensaiada na conexão transacional ao PostgreSQL real, com rollback.
Sua publicação futura exige dry-run com `--include-all`, pois sua versão é
anterior à última migration de segurança; nunca simular aplicação pelo histórico.

## Validação original do formulário

| Verificação | Resultado |
| --- | --- |
| Typecheck | passou |
| Lint | 0 erros, 37 avisos herdados |
| Formatação Prettier | passou |
| Unitários | 104 testes em 16 arquivos |
| SQL real, incluindo regressões legadas | nove suítes, transação e rollback |
| Builds laboratório e produção | passaram |
| Segredos/modo laboratório no pacote de produção | ausentes nos 228 arquivos verificados |
| Novo cadastro, reabertura e horários públicos | passou no laboratório |
| Horário sobreposto e fechamento com dados pendentes | recusa/recuperação conferidas no navegador |
| Falha de rede e nova tentativa | dados preservados, salvamento concluído após reconectar |
| Upload HTTP local, referência e leitura do logotipo | passaram, sem item na galeria |
| Remoção do logo e desativação/reativação da semana | referência removida persiste; intervalos preservados ao reabrir |
| Seleção pelo file chooser do Chrome | bloqueada pela permissão da extensão no perfil Carlos; ainda não concluída |

Os testes de UI usam Auth/Storage/PGlite descartáveis em `127.0.0.1:3004`,
com prévia em `http://127.0.0.1:3005/admin?area=companies`. A empresa e os horários
ilustrativos estão identificados como ensaio local. Os testes SQL usam o banco
real com TLS validado e rollback, sem inserir fixture permanente. A prévia
normal 3002 mantém a versão publicada e o backend real.

Capturas e parecer visual: `.impeccable/review/company-registration/evidence.md`.
A revisão independente retornou **fix**. O verdict confirmou três correções
visuais resolvidas (rolagem, primeiro viewport móvel e alvos), retirou o pedido
de seed como não aplicável à extensão local e manteve um item aberto: selecionar
o arquivo pelo Chrome, salvar e reabrir com a seleção. O transporte HTTP e a
exibição foram testados, mas não substituem esse fluxo. O navegador bloqueou
também a abertura automatizada de `chrome://extensions`, pois permite somente
HTTP/HTTPS. O responsável recebeu instruções manuais; nenhuma tentativa de
contornar a política foi realizada. Não há pass global do candidato.
O detector estático não encontrou ocorrências na única execução desta extensão.

### Integração com a auditoria de segurança

Após sincronizar o PR #2, o candidato integrado passou novamente em typecheck,
lint (0 erros, 37 avisos herdados), 106 testes unitários em 16 arquivos, build
normal e dez suítes SQL no PostgreSQL real com rollback. A verificação por
streaming dos 228 arquivos do pacote não encontrou credenciais privadas nem
modo laboratório. A migração de cadastro foi ensaiada antes e depois da
fronteira de API; os dois cenários passaram. Essa integração não altera o
parecer visual nem conclui o teste pendente do seletor de arquivos.

Após a publicação do PR #2, a main foi incorporada com alterações somente de
documentação. As seis suítes SQL atuais do candidato também passaram contra
essa base aplicada, com rollback. O formulário e suas colunas continuam fora
da produção.

## Publicação

Produção tem o painel do PR #1 e as correções de segurança do PR #2, com
14 migrations. Esta extensão no PR #3 exige revisão humana antes de merge,
aplicação das migrations e deploy, conforme o `AGENTS.md` do projeto. Uma versão
de laboratório nunca deve ser enviada ao Cloudflare.

Conferência posterior no banco real: 14 migrations, nenhuma empresa, duas
contas administradoras e nenhuma conta técnica; a fixture local não existe em
produção e a coluna candidata ainda não foi aplicada. O rollback foi preservado.
