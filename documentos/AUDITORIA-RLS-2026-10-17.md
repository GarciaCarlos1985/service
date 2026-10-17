# Auditoria de RLS e acesso — 17/10/2026

Projeto verificado: `taabjnmsaaltsiehywbw`, Service Guide, repositório
`GarciaCarlos1985/service`. Estado medido: produção com 12 migrations, duas
contas administrativas, nenhuma empresa e nenhuma conta técnica remanescente.
Esta auditoria preparou correções; **não aplicou migrations, configuração Auth
ou deploy em produção**. Os ensaios SQL foram transacionais, com rollback.

## Resultado e prioridade

Não foi encontrada tabela de aplicação em `public` com RLS desligada: **43 de
43 estão protegidas**. Isso não basta para fechar a auditoria, porque uma RPC
`SECURITY DEFINER` executa com as permissões de seu proprietário. Grants de
tabela, coluna, sequência e função precisam de controle próprio. Essa distinção
é explicada na [documentação de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
e na [segurança da API](https://supabase.com/docs/guides/api/securing-your-api).

| Prioridade | Achado medido | Correção preparada |
| --- | --- | --- |
| Crítica | Seis helpers internos de carteira/ledger/notificação executáveis por `anon` e `authenticated`, sem autorização interna de usuário | Migration `20261017130133_guide_internal_rpc_permissions.sql`, já no PR #2; revoga execução externa e preserva proprietário/backend |
| Alta | Marketplace aposentado continua acessível por RPCs e grants de tabela/coluna; algumas rotinas verificam somente `auth.uid()` | Nova migration fecha acessos diretos a tabelas/colunas/sequências e às funções fora das 18 RPCs atuais; código/dados antigos preservados |
| Alta preventiva | Objetos novos recebem privilégios automaticamente, incluindo execução de funções | Default privileges de `postgres` passam a exigir GRANT explícito para clientes; teste cria tabela, sequência e função novas e comprova recusa |
| Média | Sessão ativa não examinava banimento/exclusão lógica/ausência de confirmação no Auth | Validação compartilhada acrescenta esses estados e recusa a sessão antes de acessar o painel/dados privados |
| Média | Backend permite senha de seis caracteres; frontend exige oito | Candidato exige 12 no cadastro/recuperação; script revisável configura o mesmo mínimo no Auth, preservando senhas existentes e demais configurações |
| Preventiva | Extensão `btree_gist` instalada em `public` | Deslocada para `extensions` no ensaio; operadores e restrição de sobreposição conferidos no banco real |

Não foram executadas chamadas HTTP aos helpers perigosos para produzir crédito,
saldo ou notificação reais. O achado crítico foi confirmado pelos grants e pelos
corpos das funções, e sua correção foi exercitada com fixtures e rollback.
Não há conclusão forense de que ocorreu ou deixou de ocorrer invasão histórica.

## Fronteira do candidato

`20261017142019_guide_api_access_boundary.sql` mantém dados, tabelas, RLS e
políticas existentes. Revoga os grants diretos em `public`, incluindo os
concedidos por coluna, e expõe somente:

- Anônimo e autenticado: pesquisa, resolução de URL da empresa, apresentação,
  vitrine, identificação da própria sessão, ajuda e eventos com consentimento.
- Autenticado: atualização do próprio perfil, favoritos, avaliações, contatos
  e as operações administrativas. As operações administrativas exigem papel
  no banco, sessão válida e segundo fator quando cadastrado. Conceder acesso
  também exige autenticação recente e auditoria.

As 18 funções são uma lista explícita de assinaturas; não é um GRANT por prefixo.
As views internas não têm USAGE/SELECT para clientes e o schema `guide_private`
foi recusado pela API real. `service_role` e o proprietário mantêm acesso
interno; nenhuma chave privada é enviada ao navegador.

O navegador deixa de acessar o marketplace antigo. `/painel` e seus filhos
redirecionam para `/conta`; perfis antigos de profissionais retornam ao guia.
O painel atual continua em `/admin`. Código e dados do legado não são excluídos;
reativá-lo exige revisão de autorização e sessão, não um GRANT geral.

O bucket `guide-media` aceita somente JPG, PNG, WebP/AVIF e até 5 MiB. Escrita
exige administrador válido e caminho de empresa existente; consumidor/anônimo
não ganham upload. O bucket é público para imagens comerciais: URLs de arquivo
não devem ser tratadas como armazenamento de documentos privados. Rascunhos de
cadastro e dados pessoais continuam protegidos pela API.

## Evidências executadas

| Ensaio | Resultado |
| --- | --- |
| Inventário real | 43 tabelas públicas com RLS; 32 políticas, incluindo Storage; views internas sem acesso de cliente |
| Antes/depois transacional das funções privilegiadas | `anon`: 50 → 7; `authenticated`: 62 → 18. As restantes do candidato são as RPCs intencionais, não liberação de administração a consumidores |
| SQL real | Nove suítes: quatro regressões históricas antes do encerramento da API antiga, permissões internas, fronteira nova, comercial, painel e personalização |
| Reaplicação | Migration reaplicada na mesma transação sem reabrir privilégios; cinco suítes atuais aprovadas após reaplicação |
| Compatibilidade do PR #3 | Migration do logotipo/semana testada antes e depois da fronteira de segurança; duas ordens aprovadas, sempre com rollback |
| Negativos de autorização | Elevação por metadados, alteração de outro perfil, rascunho privado, administração por consumidor, acesso direto ao perfil/ledger/contatos, APIs antigas, sessão alheia e sessão encerrada recusados |
| Estados Auth | Conta bloqueada, banida, não confirmada, removida e sessão expirada recusadas no banco real |
| Preservação interna | Backend mantém crédito com proteção de duplicidade e notificação em fixture; GiST continua impedindo sobreposição |
| HTTP real | Schema privado 406; telefone/auditoria/admin sem login 401; JWT administrativo falsificado 401; pesquisa pública 200 |
| Auth real | Três ciclos login/logout/retorno, token pós-logout negado, TOTP real/AAL2 e senha sozinha insuficiente quando MFA está ativo; fixture removida; nenhum e-mail enviado |
| Gate de código | Typecheck, lint sem erros/37 avisos herdados, formatação, 89 testes em 14 arquivos e build passaram |
| Dependências de produção | `npm audit --omit=dev`: zero vulnerabilidades reportadas |
| Pacote de produção | 228 arquivos verificados por streaming, sem segredos privados nem backend/banner do laboratório |
| Runtime local do Worker | `/painel`, `/painel/carteira`, `/painel/agenda` e perfil antigo redirecionam; cadastro informa 12 caracteres; CSP e no-store conferidos |

Os quatro testes históricos não representam reativação do produto antigo. Após
a aplicação definitiva da fronteira, o runner substitui esses contratos antigos
pelas provas de recusa e de preservação interna. As cinco suítes atuais seguem
obrigatórias. O CI do GitHub executa o gate de código; SQL e Auth real foram
executados separadamente, com as credenciais locais autorizadas.

Evidência estruturada, sem segredos ou credenciais:
`evidencias/seguranca-rls-2026-10-17.json`.

## Itens operacionais ainda abertos

1. **MFA dos titulares:** 0 das duas contas administrativas têm fator verificado.
   A proteção existe e foi testada em conta temporária. Cada titular precisa
   cadastrar seu autenticador em `/admin?area=security`; não foi criado segredo
   TOTP nem redefinida senha de titular pela auditoria.
2. **E-mail:** auto-confirmação está ligada e não há SMTP próprio. A posse do
   e-mail de novos consumidores não está sendo verificada. Preparar remetente
   confiável e conferir entrega antes de exigir confirmação evita interromper
   o cadastro. As duas contas administrativas já estão confirmadas. A
   [documentação SMTP](https://supabase.com/docs/guides/auth/auth-smtp) explica
   as limitações do envio padrão. Não houve envio de mensagens nesta auditoria.
3. **CAPTCHA:** desligado. Há limites configurados no Auth e throttling nas RPCs
   de escrita, mas isso não equivale a proteção completa contra bots distribuídos.
   Habilitar o CAPTCHA no servidor exige integrar e testar o desafio na interface;
   ligá-lo isoladamente interromperia login/cadastro/recuperação. Referência:
   [CAPTCHA do Supabase](https://supabase.com/docs/guides/auth/auth-captcha).
4. **Senhas vazadas:** proteção HIBP está desligada; o recurso exige plano Pro
   ou superior segundo a [documentação de senhas](https://supabase.com/docs/guides/auth/password-security).
   Nenhum plano pago foi contratado. O mínimo de 12 não substitui senhas únicas
   e segundo fator.

Os 114 avisos atuais dos advisors incluem 112 alertas de funções privilegiadas,
um de extensão e um de senha vazada. Muitos alertas de RPCs do guia são esperados
pelo modelo explícito de autorização interna; o aviso não é, isoladamente,
prova de falha. O candidato reduz a superfície medida acima. Não foi declarado
um novo parecer de advisors de produção, pois as mudanças ainda não foram aplicadas.

## Liberação

O PR #2 foi ampliado com esta auditoria. O PR #3 permanece separado, em rascunho,
com o teste do seletor de logotipo pendente; não é necessário publicá-lo para
fechar as permissões perigosas. As migrations de segurança são 13 e 15; a 14
pertence ao cadastro e foi ensaiada nas duas ordens de integração. Se for aplicada
depois da 15, a CLI deve reconhecer a inclusão de uma versão anterior pendente,
sem marcar uma migration como aplicada sem executar seu SQL.

Após aprovação humana: mesclar o PR #2, aplicar somente as duas migrations de
segurança, rodar as provas após aplicação, executar
`node scripts/harden-guide-auth.mjs --apply` e publicar o build normal. O script
sem argumentos apenas mostra o plano; altera somente o mínimo de senha, jamais
reduz uma política mais forte nem redefine credenciais atuais. Confirmar os
negativos HTTP, o runtime e o inventário final antes de declarar publicado.

Aguardar revisão segue o `AGENTS.md` fornecido pelo responsável: “Sempre trate
o ambiente como um laboratório de testes: gere, valide e aguarde a revisão.”
Nenhuma promessa de sistema impenetrável ou disponibilidade permanente é feita.
