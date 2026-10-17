# Publicação do painel profissional — 17/10/2026

O responsável aprovou explicitamente a versão do PR #1, sua mesclagem na `main`,
as duas migrações comerciais e a publicação no Cloudflare. A entrega foi
concluída sem alterar senhas ou autenticadores das contas reais.

## Entrega online

| Item | Evidência medida |
| --- | --- |
| Site | https://service-guide.helon280.workers.dev/ |
| Entrada administrativa | https://service-guide.helon280.workers.dev/entrar?redirect=%2Fadmin |
| GitHub oficial | https://github.com/GarciaCarlos1985/service |
| PR aprovado e mesclado | https://github.com/GarciaCarlos1985/service/pull/1 |
| Fonte do aplicativo publicado | `02fa5b2d7a284902c2d6ba4ef21672c4be833f2f` |
| CI dessa fonte | https://github.com/GarciaCarlos1985/service/actions/runs/39004517601 — sucesso |
| Worker | `service-guide` |
| Versão Cloudflare | `b5129bd3-46ec-4d5a-a97c-d43e61f3b5a5` |
| Implantação | `01eaaf8e-a8ca-44c0-8a0d-2b12ad84350f`, 100% do tráfego, `2026-10-17T12:49:22Z` |
| Supabase | Projeto `taabjnmsaaltsiehywbw`, 12 migrações no histórico |

Foram aplicadas, pela CLI oficial e com TLS validado, somente as duas migrações
novas aprovadas: `20261016194717_guide_admin_workspace.sql` e
`20261017005400_guide_site_customization.sql`. Nenhuma tabela legada foi removida.
Atualizações posteriores apenas de documentação não alteram o SHA do aplicativo
que gerou o Worker acima.

O painel oferece cadastro de empresas, produtos e serviços, gerenciamento de
imagens e ordem por arraste/botões/teclado, quinze áreas, proteção de rascunhos,
auditoria e controles de sessão. **Aparência do site** reúne treze textos e
títulos, seis cores, vitrines automáticas/manuais e prévia antes de salvar.

## Acesso e correção da prévia local

As duas contas administrativas indicadas pelo titular existem no Auth, estão
confirmadas, têm senha cadastrada e não estão bloqueadas. O acesso usa a senha
do **Service Guide** para o e-mail informado. A sessão do Gmail/Chrome não faz
login no guia; Google OAuth está desativado. Nenhuma senha real foi lida ou
redefinida. Se o titular não souber sua senha, deve usar
https://service-guide.helon280.workers.dev/recuperar-senha.

A porta 3002 anteriormente compartilhada era um laboratório PGlite, com Auth e
Storage simulados. Por isso as credenciais reais eram recusadas. A prévia normal
`http://127.0.0.1:3002/entrar?redirect=%2Fadmin` agora executa o build de produção
com o Supabase real. O servidor do laboratório está encerrado; seu arquivo de
ambiente descartável foi removido após conferir os dois valores de laboratório.
As duas URLs exatas de retorno de Auth na porta 3002 foram acrescentadas à lista
permitida, preservando o endereço principal e a configuração de autenticação.

## Verificações

| Escopo | Resultado |
| --- | --- |
| Gate da fonte mesclada | Typecheck, lint, formatação, 87 testes unitários e build aprovados no CI |
| SQL depois da aplicação | Sete suítes aprovadas contra PostgreSQL real; fixtures revertidas por rollback |
| Auth HTTP real | Três ciclos de entrar/sair/retornar, JWT revogado recusado, metadados sem elevação de privilégio e TOTP/AAL2 conferidos |
| Storage HTTP real | Anônimo e consumidor sem upload; administrador envia, lê publicamente e remove a própria imagem; SVG e caminho sem empresa recusados |
| Privacidade dos testes | Empresa/categoria técnicas inativas não apareceram no catálogo e foram removidas com o arquivo enviado |
| Navegador online | Dois logins reais na conta temporária, retorno em nova aba, encerramento de sessões e painel sem acesso após logout |
| Editor online | Textos, cores e vitrines carregados; título alterado apenas na prévia e desfeito; formulário de empresa aberto sem gravar |
| Navegador local | Mesma conta temporária autenticada no backend real; recarga preservou a sessão; saída e entrada vazia conferidas |
| Pacote | 228 arquivos textuais examinados por streaming; sem valores privados, arquivos de ambiente/compactados ou modo de laboratório |
| HTTP local e online | Home, admin e recuperação com 200; CSP com nonce; nonce externo substituído; páginas privadas `no-store`; `/previa` com 404 |
| Limpeza final | Conta temporária e suas sessões removidas; duas contas administradoras reais; zero usuários técnicos e zero empresas no catálogo |

As capturas reais da publicação estão em
`.impeccable/review/admin-publicado-2026-10-17/`. O ensaio completo de cadastro,
ordenação, responsividade e falhas de rede permanece documentado em
`PAINEL-PROFISSIONAL-2026-10-16.md`. No navegador de produção foram feitas
leituras e edição local desfeita, preservando o catálogo vazio.

Os relatórios técnicos locais, sem credenciais, ficam em `.wrangler/`:
`admin-live-production-verification-20261017.json`,
`release-browser-verification-20261017.json`,
`release-storage-verification-20261017.json`,
`auth-security-verification.json` e `release-preflight-20261017.json`.
O registro temporário de senha da conta de teste foi excluído na limpeza.

## Segurança pendente no legado

A consulta final dos advisors retornou **0 ERROR e 114 WARN** no nível solicitado.
O nível WARN não significa que todos sejam inofensivos: a verificação direta de
privilégios confirmou seis helpers internos legados executáveis por `anon` e
`authenticated`, incluindo rotinas financeiras e de notificação. Seus corpos
são `SECURITY DEFINER`; os módulos financeiros continuam fora do MVP, mas isso
não elimina o risco de chamada direta pela API.

A correção deve retirar a execução direta dos papéis da API, preservando o
proprietário e as chamadas internas das RPCs. Trata-se de uma migração adicional,
fora das duas já aprovadas, a ser ensaiada com rollback e submetida a revisão
antes de aplicar em produção. A liberação do painel não encerra esse achado.
Os demais grupos incluem RPCs públicas intencionais, extensão no schema público
e proteção contra senhas vazadas desativada; não foi contratado plano pago.

A entrega de mensagens na caixa de e-mail dos titulares depende de conferência
pelo próprio titular. Os testes de autenticação não usaram suas senhas nem
enviaram mensagens. Não foi realizado pentest externo nem prometida ausência
absoluta de vulnerabilidades ou disponibilidade permanente.
