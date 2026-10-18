# Autenticação — e-mail e CAPTCHA — 18/10/2026

## Escopo e autorização

O responsável solicitou ativar e-mail e CAPTCHA e confirmou que as ferramentas
devem continuar gratuitas. Autorizou um e-mail transacional de teste para
`helon280@gmail.com`, também escolhido como remetente. A senha de aplicativo
precisa ser criada e fornecida privadamente pelo titular; nunca pelo chat.

Esta alteração preserva o backend, as 14 migrações já aplicadas, as políticas RLS,
os titulares e suas senhas. O formulário de empresas do PR #3 permanece separado.

## Estado antes da publicação deste candidato

- Worker oficial ainda na versão de segurança de 17/10; CAPTCHA não obrigatório
  no Supabase. Nenhum novo deploy deste candidato foi feito nesta etapa.
- Widget Turnstile gerenciado provisionado gratuitamente na conta já autorizada,
  restrito a `service-guide.helon280.workers.dev`. Localhost usa somente chave
  oficial de teste; não foi adicionado ao widget real.
- Em 18/10, o titular ativou a confirmação por e-mail no painel Supabase.
  A consulta posterior confirmou `mailer_autoconfirm=false`, sem SMTP salvo,
  com limite padrão de dois e-mails por hora. A ativação não prova entrega.
- Os dados públicos do SMTP Gmail foram preparados no `.env.local` e no
  formulário aberto pelo titular. A senha de aplicativo continua ausente.
  Nenhum e-mail foi enviado por esta implementação nesta etapa.

## Implementação

Login, cadastro, recuperação, reenvio de confirmação e reautenticação por senha
para alterações administrativas incluem Turnstile. Cada tentativa consome uma
prova; sucesso, erro, expiração e nova tentativa invalidam a anterior. A interface
recusa envio enquanto não há prova e o Supabase fará a validação autoritativa
depois da ativação. A confirmação administrativa por TOTP continua existente.

O widget compartilha um único carregamento do script oficial, limpa recursos
ao sair da tela, adapta o tamanho e oferece repetição quando falha. A CSP mantém
nonce, bloqueio de enquadramento externo e cache privado; acrescenta somente
`challenges.cloudflare.com` às origens necessárias ao widget. A origem no
`script-src` também cobre a navegação cliente após a hidratação.

Há uma tela própria para reenviar confirmação, com mensagem que não revela a
existência de contas e intervalo local de 60 segundos. O limite do servidor
permanece autoritativo. Modelos de confirmação e recuperação em português
usam o link gerado pelo Supabase. Os destinos de retorno continuam no próprio site.

A ferramenta de configuração é somente leitura por padrão, tem teste sem rede,
recusa chaves fictícias e SMTP sem TLS, preserva configurações fora do escopo e
guarda uma cópia privada dos campos anteriores em `.wrangler/`.

## Validação do candidato

- Typecheck, lint sem erros (37 avisos herdados), formatação, 96 testes unitários
  em 15 arquivos, autoteste da ferramenta e build de produção aprovados.
- Cinco suítes SQL atuais passaram no Postgres real com TLS e rollback. Não há
  migração de banco nesta alteração.
- Varredura em fluxo de 233 arquivos do build: sem segredos ou backend de
  laboratório; backend oficial e site key real presentes; chave fictícia ausente.
- HTTP no runtime Worker local: home/admin/recuperação disponíveis, nonce novo,
  telas privadas sem cache e `/previa` com 404.
- Laboratório isolado: senha incorreta recusada; campos mantidos e nova prova
  emitida; login válido, conta carregada e logout concluídos. Recuperação simulada
  chegou à mensagem genérica. Falha do reenvio exibiu erro seguro e renovou a prova.
- Reautenticação administrativa exibiu o widget e liberou o botão somente após
  verificação; nenhuma permissão de titular foi alterada.
- CAPTCHA concluído no desktop e em 375 px, sem transbordamento horizontal.
  O teste usa a chave oficial sempre aprovada e não prova a validação do servidor
  de produção. Os negativos reais serão medidos após ativação.
- Detector mecânico de UI nos seis alvos: nenhuma ocorrência. A direção visual
  e os componentes existentes foram preservados.

Evidências locais ficam em `.wrangler/auth-*` (ignoradas; algumas contêm fixtures
privadas) e capturas em `.impeccable/review/auth-protection/`.

## Ordem de liberação

1. Publicar o frontend validado com a site key real e conferir o widget no domínio.
2. Exigir Turnstile no Supabase e testar recusas sem prova e com prova fictícia,
   além de um login válido pelo navegador com conta técnica descartável.
3. Após o titular fornecer a senha de aplicativo, verificar SMTP/TLS, configurar
   os modelos, enviar o único teste autorizado e solicitar confirmação de recebimento.

Gmail não é infraestrutura de envio ilimitado; o próprio painel Supabase avisa
sobre possíveis limites de entrega de provedores pessoais. CAPTCHA reduz abuso,
mas não substitui RLS, autorização, limites de requisição nem MFA dos titulares.

Referências: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha),
[Turnstile gratuito](https://developers.cloudflare.com/turnstile/plans/),
[CSP do Turnstile](https://developers.cloudflare.com/turnstile/reference/content-security-policy/),
[senhas de app Google](https://support.google.com/accounts/answer/185833?hl=pt-BR).
