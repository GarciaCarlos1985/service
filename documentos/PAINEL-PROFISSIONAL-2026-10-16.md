# Painel profissional — análise e critérios de aceitação

Pedido: priorizar cadastro de empresas, produtos e serviços; ampliar configurações,
conforto, ordenação, navegação e segurança, preservando Supabase e Cloudflare.

## Impacto

- `guide_admin_list`: corrigir isolamento de imagens por empresa e ordenação.
- `guide_private.require_user`: validar sessão ativa e exigir segundo fator quando
  o próprio titular tiver ativado MFA. Consumidores e administradores continuam
  autorizados por dados do banco, nunca por metadados editáveis.
- Novas operações administrativas devem ser auditadas e atômicas. A ordem pública
  e a apresentação passam a refletir configurações validadas do painel.
- Alterações aditivas no domínio comercial. Tabelas/rotas financeiras legadas
  permanecem preservadas; nenhuma senha real será definida ou solicitada.
- A mudança de autorização precisa ser testada contra sessões reais e revogadas,
  pois login bem-sucedido sozinho não prova que logout revoga operações.

## Matriz de aceitação

- Cadastro, edição, rascunho, publicação, validação e retorno ao contexto.
- Seleção de empresa e associação correta de itens/imagens; preços em centavos.
- Ordenação com mouse, botões e teclado; cancelamento, salvamento atômico e
  conflito concorrente sem sobrescrever alterações de outra sessão.
- Apresentação pública editável com limites, validação e prévia.
- Conta anônima, consumidor, administrador, usuário bloqueado, sessão revogada
  e segundo fator quando configurado; negação de acesso direto às tabelas.
- Estados de carregamento, vazio, falha de rede, nova tentativa e dados não salvos.
- Pesquisa pública, filtros, favoritos, navegação de retorno e celular.
- Typecheck, lint, formatação, testes unitários, SQL transacional real e build.

## Base de interação

Botões amplos e próximos ao trabalho reduzem a dificuldade de seleção, conforme
o estudo original de Fitts (1954): https://doi.org/10.1037/h0055392.
Arrastar tem alternativa por botões e teclado, conforme WCAG 2.2, critério 2.5.7:
https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html.
As escolhas de produto procuram orientação, previsibilidade e descoberta honesta;
não introduzem escassez fictícia, contagens falsas ou recompensas enganosas.

## Resultado medido no candidato local

Branch: `codex/painel-profissional`, a partir de `8a7cb7d`.
O site online permanece na versão publicada anteriormente. A migração
`20261016194717_guide_admin_workspace.sql` foi ensaiada com rollback e ainda
precisa da revisão humana antes da aplicação e publicação.

| Verificação | Evidência |
| --- | --- |
| Tipagem, lint, unitários e builds | Aprovados nos modos de laboratório e produção; 80 testes em 13 arquivos; lint sem erros e 37 avisos herdados |
| Formatação | `prettier --check src scripts package.json wrangler.jsonc` aprovado |
| Dependências | `npm audit`: zero vulnerabilidades conhecidas na consulta |
| Banco real, transação com rollback | Suítes comercial e administrativa aprovadas; nenhuma fixture persistiu |
| Regressões legadas no banco real | RLS, ledger, chat e reviews aprovados, cada uma isolada por savepoint |
| Cadastro na interface | Empresa publicada no laboratório; categoria e bairro criados dentro do editor; produto com preço e serviço sem preço salvos |
| Ordenação | Arraste, botões, teclado, confirmação de cancelamento e salvamento verificados; conflito e isolamento testados no SQL |
| Imagens | Duas imagens enviadas; edição, ocultação e empresa sem imagens verificadas; rejeição por conteúdo e recuperação de gravação incerta cobertas por unitários |
| Alterações não salvas | Bloqueio de navegação, continuar editando e salvamento de apresentação verificados; atualização manual desabilitada durante edição |
| Conexão | Falha de rede simulada no navegador; formulário preservado; reconexão, nova tentativa e recarga aprovadas |
| Sessão na interface | Três ciclos completos de entrar/sair/retornar; consumidor sem controles administrativos |
| Navegação pública | Busca com e sem resultados, foco no resultado, Voltar/Avançar e favorito persistido |
| Áreas do painel | 15 áreas acessíveis; seções de catálogo, operação, configurações e segurança |
| HTTP no runtime do Worker local | CSP com nonce consistente nos scripts SSR; `no-store` nas páginas privadas; cookies e streaming preservados |
| Responsividade | 1440×1000, 1280×720 (janela atual) e 390×844; editor de 920 px no desktop; celular sem rolagem horizontal |
| Detector visual estático | Uma execução nos alvos alterados; nenhuma ocorrência |
| Pacote de produção | 228 arquivos textuais examinados por streaming; valores privados do ambiente ausentes; backend correto; sem endpoint/banner do laboratório; nenhum arquivo .env/.rar/.zip |
| Runtime local do pacote de produção | Home, admin e recuperação retornaram 200 com CSP; páginas privadas sem cache; nonce externo substituído; `/previa` retornou 404 |

Capturas: `.impeccable/review/admin-profissional/`. A revisão independente
encontrou um defeito material: a barra inferior móvel encobria o salvamento
das configurações. O ajuste separou o posicionamento da página e dos diálogos,
reservando navegação e área segura. A captura final mostra ambos os botões e
o teste de clique confirmou o salvamento. O veredito pontuou a correção como
**resolvida**, com disposição `ship` no escopo do achado. O sistema construído
foi registrado em `DESIGN.md`, `.impeccable/design.json` e no contrato da superfície.

### Limites das evidências

- O laboratório de navegador roda SQL das migrações em PGlite. Os endpoints
  REST de Auth e Storage são simulados e **não provam a integração HTTP do
  novo bucket em produção**. Apenas nele, a restrição de URL de imagem admite
  HTTP loopback; a migração de produção e o ensaio SQL mantêm HTTPS obrigatório.
- O teste separado com o Auth real confirmou três ciclos de autenticação e
  ativação/verificação TOTP em uma conta descartável. A conta foi removida.
  Nenhuma senha ou segundo fator dos titulares foi alterado, nem e-mail enviado.
- O teste real reproduziu uma lacuna da versão publicada: um JWT antigo ainda
  consultava a administração após logout. A migração candidata nega sessões
  revogadas e exige AAL2 quando o titular ativou MFA, com aprovação no SQL real.
  A comprovação via HTTP precisa ser repetida **depois de aplicar a migração**,
  usando `npm run test:auth:security`.
- A entrega de mensagens na caixa de e-mail do titular continua sem comprovação;
  não há senha administrativa nova. Os titulares usam a senha existente ou a
  recuperação de senha, e ativam o autenticador na própria conta.
- Interrupção de conexão foi testada; disponibilidade permanente e ausência
  absoluta de vulnerabilidades não podem ser prometidas. Não foi realizado um
  pentest externo de infraestrutura.

## Roteiro de validação e publicação

1. Responsável revisa o painel no laboratório local: `http://127.0.0.1:3002/admin`.
   A sessão de teste já está aberta no navegador. Dados descartáveis são
   identificados em amarelo e nunca devem ser usados como catálogo real.
2. Após validação humana, aplicar somente a nova migração no projeto correto e
   repetir as suítes SQL e `npm run test:auth:security`.
3. Executar o build normal de produção, conferir ausência de segredos e do modo
   e2e, enviar o código ao repositório oficial e publicar o Worker existente.
4. Conferir HTTP/CSP, acesso administrativo e catálogo público online. Preservar
   as contas reais e não inserir dados comerciais de teste.

Para reproduzir o laboratório: `npm run test:admin:browser`, depois
`npm run build:lab` e `npm run preview -- --host 127.0.0.1 --port 3002`.
O arquivo `.env.e2e.local` e as credenciais de teste ficam ignorados pelo Git.
