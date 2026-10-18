# Publicação do cadastro de empresas — 18/10/2026

O responsável revisou a prévia local e autorizou salvar na `main` e publicar
para o Helon cadastrar a primeira empresa. O PR #3 foi mesclado às 02:10 de
18/10/2026 (Brasília), preservando a autenticação do PR #4.

## Versão e destinos confirmados

| Item | Resultado |
| --- | --- |
| Repositório | `https://github.com/GarciaCarlos1985/service` |
| PR | `https://github.com/GarciaCarlos1985/service/pull/3` |
| Candidato integrado | `4cb8071d33dfc5cc0cb688a6ef6ba803eba3246c` |
| Merge | `82a713b5ad8ab96412d91f6f15f24b7b92bc4bd4` |
| Fonte publicada na main | `45519de892d906957022f1c0929829342798c05b` |
| Worker | `417acf48-d450-4548-848e-992a27c7592b` |
| Deployment / tráfego | `058be96c-9de5-458f-b95f-b2c4cf1aaf53` / 100% |
| Supabase | `taabjnmsaaltsiehywbw`, 15 migrações |
| Site | `https://service-guide.helon280.workers.dev` |
| Painel | `https://service-guide.helon280.workers.dev/admin` |

O commit posterior ao merge ajusta somente a independência e as mensagens de
sucesso de duas suítes SQL; o código do aplicativo é o mesmo candidato validado.
A fonte foi recompilada da main antes da publicação. Não houve contratação de
serviço ou plano pago, troca de backend, DNS ou alteração de senha dos titulares.

## O que o administrador pode fazer

- Criar ou editar empresa: nome, marca, descrição, categoria, endereço,
  telefone, WhatsApp, site, plano e publicação.
- Selecionar/arrastar o logotipo, trocar ou remover a referência. O arquivo é
  validado e enviado pelo Storage existente ao salvar.
- Marcar os sete dias, abrir/fechar, configurar até três intervalos, pausa,
  24 horas e conferir o resumo público.
- Desativar por **Editar → Publicação → Situação no guia → Bloqueada** e salvar;
  reativar escolhendo **Publicada**. O cadastro e a auditoria são preservados.
  Não há exclusão física definitiva de empresas pelo painel.
- Gerenciar produtos/serviços, imagens e disponibilidade, além de textos,
  títulos, cores e vitrines do site. Uma única ação global **Nova empresa**
  abre o cadastro; a ação redundante da visão geral foi removida.

## Validação

Typecheck, lint (0 erros/37 avisos herdados), Prettier, 113 unitários em 17
arquivos, autoteste da configuração Auth e build passaram. CIs aprovados:
`39099537010` (PR), `39099634986` (merge) e `39099763222` (fonte publicada).

O dry-run oficial listou somente
`20261017132355_guide_company_identity_hours.sql`, com `--include-all`, sem
seeds, roles ou Vault. A aplicação foi confirmada no histórico do banco, uma
única vez. As seis suítes SQL atuais passaram depois da aplicação com TLS
validado e rollback individual: permissões internas, fronteira da API,
comercial, painel, aparência e identidade/horários. O ensaio prévio também
havia passado com rollback. O teste de aparência recebeu fixture completa
própria, eliminando dependência do teste do painel.

O novo teste confere troca de marca/nome/endereço/contatos, retirada da busca ao
desativar, retorno ao reativar e auditoria. Anônimo e consumidor não podem
alterar a empresa. Permanecem 43/43 tabelas públicas com RLS, duas contas
administrativas ativas/confirmadas e nenhuma conta técnica permanente.

No laboratório, seleção pelo file chooser, upload, salvamento e reabertura do
logo foram concluídos pelo navegador interno. Desativação/reativação também.
No site online, a sessão administrativa existente sobreviveu à atualização,
o painel carregou, a ação duplicada desapareceu e o novo formulário exibiu
logo e os sete controles de dias. A inspeção foi descartada sem gravar uma
empresa; o catálogo continua vazio, reservado ao primeiro cadastro real.

233 arquivos do build foram varridos por streaming: nenhum segredo ou backend
de laboratório. O pacote usa o projeto oficial; o Worker não recebeu bindings
privados. HTTP online: home, admin e recuperação 200; nonce CSP próprio,
`no-store` nas telas privadas e `/previa` com 404. Essa medição pontual não é
uma promessa de disponibilidade contínua.

## Autenticação e próximos testes dos titulares

Confirmação de e-mail, Turnstile obrigatório, senha mínima de 12 caracteres e
SMTP Gmail continuam ativos. Entrega do teste de recuperação confirmada na
caixa de entrada pelo responsável; oito negativos de CAPTCHA recusados. Sem
novo envio de teste nesta liberação. Use a senha do Service Guide, não a sessão
do Gmail. A recuperação está disponível em `/recuperar-senha`.

O Helon ainda deve fazer um login novo com CAPTCHA e cadastrar a primeira
empresa real. O teste online realizado usou uma sessão já existente, sem logout
do titular. MFA ainda deve ser ativado pelos dois administradores em Segurança
da conta. Registro anterior: `AUTENTICACAO-EMAIL-CAPTCHA-2026-10-18.md`.

Evidência estruturada: `evidencias/publicacao-cadastro-2026-10-18.json`.
Capturas: `.impeccable/review/company-registration/`.
