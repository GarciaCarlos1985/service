# DECISIONS.md — Registro de Decisões Arquiteturais (ADR) — SERVICE

> Histórico oficial de decisões estruturais do SERVICE (marketplace de serviços
> locais). Cada nova decisão importante ganha um ADR aqui. **Não editar ADRs
> antigos** — se uma decisão for revertida, criar um novo ADR que a substitui
> (status "Substituída por ADR-NNN").
>
> Formato: Contexto · Decisão · Motivo · Consequências.
>
> **Proveniência (2026-08-12):** este arquivo foi adaptado por decisão do dono
> do produto a partir do `DECISIONS.md` do projeto eSupplyBotFarm (coleta de
> dados portuários), reaproveitando as decisões que se aplicam a um marketplace
> com pagamentos, segurança financeira e custo controlado. Cada ADR indica sua
> origem. Decisões do domínio portuário que não se aplicam ao SERVICE **não**
> foram copiadas; princípios que se aplicam foram reescritos para este domínio.

---

## ADR-001 — Camadas de domínio com adapters registrados (PaymentProvider e amigos)
**Status:** Aceita (2026-08-12) — adaptado do ADR-001/002 do eSupplyBotFarm; atende spec §9

- **Contexto:** o SERVICE precisará integrar Stripe Connect (principal), Appmax
  (futuro) e possivelmente outros providers. Se a regra de negócio dependesse de
  detalhes específicos do Stripe (`if provider == "stripe"`), trocar ou adicionar
  um provider exigiria caçar lógica espalhada por pagamentos, ledger, webhooks e
  admin.
- **Decisão:** três camadas separadas por responsabilidade — **validação** →
  **regra de negócio** → **persistência** — e qualquer integração externa entra
  por um **adapter registrado em registry**:
  - `PaymentProvider` (StripeProvider, AppmaxProvider, MockProvider) com
    contrato estável: criar intenção de pagamento, confirmar, reembolsar, consultar,
    receber webhook.
  - Mesmo padrão para `NotificationProvider` e `StorageProvider` (ver ADR-013).
  - `REGISTRY` mapeia `nome → implementação`; adicionar provider = 1 classe +
    1 linha de registro.
- **Motivo:** isolamento e extensibilidade. Mudou o contrato do Stripe → troca-se
  só o StripeProvider. Cada adapter é testável isoladamente, e o mock de
  desenvolvimento (spec §73) vive como um adapter explicitamente separado, nunca
  misturado ao de produção.
- **Consequências:** mais arquivos por integração, mas manutenção barata. O
  contrato do adapter vira o contrato do núcleo que qualquer provider futuro
  (Appmax, PIX, outros) adota. Uma tabela de "capacidades por provider" documenta
  o que cada um suporta (recorrência, pix, split).

## ADR-002 — Supabase é a fonte de verdade única; RLS é a fronteira, lida pelo efeito
**Status:** Aceita (2026-08-12) — adaptado do ADR-022/023 do eSupplyBotFarm; atende spec §2 e §63

- **Contexto:** o frontend carrega a chave anônima por design. Qualquer exposição
  por engano (policy `USING (true)`, view sem `security_invoker`, GRANT a `anon`/
  `PUBLIC`) vira vazamento ou escrita indevida de dados de terceiros. No outro
  projeto, uma policy chamada "Service role full access" concedia escrita total a
  `anon` — o nome descrevia a intenção, o efeito era o oposto.
- **Decisão:**
  1. **Default deny:** RLS ligada em toda tabela crítica com política mínima;
     sem policy = nega. Sem GRANT além do necessário (`anon` e `authenticated`
     apenas onde o produto precisa).
  2. **Toda view com `security_invoker = true`**, para que nenhuma view lave
     privilégio de tabela fechada — nem uma criada no futuro.
  3. **Escrita anônima proibida**: nenhum INSERT/UPDATE/DELETE por `anon`; o
     produto escreve via backend autorizado (service role em função segura ou
     endpoint verificado), nunca direto do navegador.
  4. **Policy se lê pelo efeito, nunca pelo nome.** Auditoria de RLS consulta o
     catálogo (`pg_policies`, `has_table_privilege`, `has_function_privilege`)
     — nunca valida fazendo escrita real.
- **Motivo:** o modelo de ameaça do marketplace é "Cliente A acessando Cliente B",
  "usuário alterando saldo" e "usuário virando admin" (spec §63). RLS é a última
  fronteira e precisa ser defensável por construção, não por convenção.
- **Consequências:** migrações de RLS sempre verificáveis por catálogo; testes de
  segurança em CI rodam como `postgres` auditando privilégios. Nome de policy
  deixa de ser tratado como documentação.

## ADR-003 — Ledger imutável + idempotência financeira
**Status:** Aceita (2026-08-12) — adaptado do ADR-006 do eSupplyBotFarm; atende spec §11 e §12

- **Contexto:** o saldo da carteira é a área financeira crítica do SERVICE. Se
  `wallet.balance` fosse gravado direto a partir do frontend, ou se transações
  fossem editáveis, qualquer bug ou ataque corromperia dinheiro de verdade.
- **Decisão:**
  - `wallet_transactions` é **append-only**: credit, debit, cashback, refund,
    adjustment, platform_fee, payout. **Nada é editado nem excluído** — correções
    geram transação compensatória, nunca UPDATE/DELETE.
  - Saldo **derivado do ledger** (ou projeção protegida e reconciliável), nunca
    enviado pelo cliente.
  - `idempotency_key` **obrigatória** em: pagamento, refund, cashback, referral,
    payout e ajustes administrativos. Operação repetida não duplica dinheiro.
  - Processo de reconciliação periódico compara ledger × provider (Stripe) ×
    bookings.
- **Motivo:** um marketplace intermediário convive com chargeback, disputa e
  erro de integração; a capacidade de reconstruir a história financeira é o que
  permite auditar sem adivinhar. "Nada é deletado" vale para dinheiro.
- **Consequências:** mais tabelas e mais código de aplicação (gerar transação
  compensatória em vez de editar), mas integridade financeira testável. Testes
  críticos: pagamento duplicado, refund duplicado, ajuste de admin (spec §63/64).

## ADR-004 — Nada inventado + linhagem auditável
**Status:** Aceita (2026-08-12) — adaptado do ADR-009 do eSupplyBotFarm; atende spec §72–§74

- **Contexto:** o SERVICE lida com dinheiro real e reputação de pessoas reais.
  Um dado inventado (avaliação falsa, meta-descrição inventada, seed tratado como
  usuário real) quebra a confiança da plataforma e pode criar passivo legal
  (LGPD, propaganda enganosa).
- **Decisão:**
  - **Dado ausente fica ausente (rotulado), nunca preenchido por inferência.**
    Conteúdo de SEO, avaliações, testemunhos e estatísticas só existem se reais.
  - **Decisão ambígua não é decidida por conveniência:** apresentar problema,
    opções, recomendação, impacto, custo e risco — e aguardar autorização quando
    a decisão for arquitetural ou financeira.
  - **Mock separado de produção por construção** (provider distinto, variável de
    ambiente, selo visual nos dados de desenvolvimento). Nunca misturar; nunca
    um pagamento "fake" que pareça real em produção.
  - **Seeds de desenvolvimento claramente identificados** e nunca confundíveis
    com usuários reais.
  - **Errata documentada:** erro em número ou afirmação vira errata no próprio
    registro — nunca correção silenciosa.
- **Motivo:** preferimos honesto e incompleto a completo e duvidoso. A linhagem
  (de onde veio cada número/registro) é parte do produto, não enfeite.
- **Consequências:** cobertura menor em campos opcionais, mas zero dado falso.
  Toda informação pública indexável (perfil de profissional, categoria, cidade)
  tem origem declarada.

## ADR-005 — Identidade de eventos: a chave da fonte vence; sem ela, incerteza declarada
**Status:** Aceita (2026-08-12) — adaptado do ADR-018 do eSupplyBotFarm; atende spec §10 e §12

- **Contexto:** webhooks e eventos de pagamento precisam de identidade estável
  para dedup e idempotência. Um webhook recebido 10 vezes deve produzir o mesmo
  resultado de recebê-lo uma vez (spec §10). Se a identidade for composta por
  campos mutáveis, o dedup falha.
- **Decisão:** quando o provedor publica identificador oficial de evento, ele é a
  identidade:
  - Webhook: `event_id` do provider (Stripe: `evt_...`) quando existir; senão
    `payload_hash` do corpo + tipo.
  - Pagamento: `payment_intent`/`charge` do provider quando existir; senão chave
    composta estável com coluna `confianca_identidade = 'fonte' | 'aproximada'`.
  - **Nenhuma janela de tolerância arbitrária** (ex.: "mesma chave ±3 dias é o
    mesmo evento"). Sem medição, não se arbitra.
- **Motivo:** transferir para o provider a decisão sobre o que é um evento é
  superior a qualquer regra nossa; onde não existe chave, o correto é declarar a
  incerteza numa coluna, não escondê-la numa heurística que aparenta precisão.
- **Consequências:** a coluna `confianca_identidade` é insumo de auditoria e de
  priorização ("providers sem chave oficial precisam de revisão"). Dedup testável
  com o mesmo webhook repetido N vezes.

## ADR-006 — Estado mutável fora da chave de identidade
**Status:** Aceita (2026-08-12) — adaptado do ADR-015 do eSupplyBotFarm; atende spec §12–§14

- **Contexto:** no projeto de origem, a chave de identidade incluía o berço — um
  estado mutável da fila — e o mesmo navio gerava dois registros quando a
  autoridade renomeava o atracadouro. Aplicado ao SERVICE: se a identidade de um
  pagamento ou booking incluísse preço, forma de pagamento ou horário reprogramado,
  o mesmo evento viraria dois.
- **Decisão:** a identidade de eventos usa apenas atributos estáveis do evento:
  - **Booking:** chave de identidade composta por entidades estáveis
    (profissional, cliente, serviço, janela de horário original) — nunca por
    preço, status ou horário remarcado. Reprogramação vira transição de estado do
    mesmo booking, não novo booking.
  - **Pagamento:** idempotency do ADR-005, sem campos de valor mutável na chave.
  - **Regra geral:** o que é "estado da fila" (status, valor, prazo, forma de
    pagamento) permanece como coluna, nunca como componente de chave.
- **Motivo:** estado mutável é justamente o que muda entre tentativas e entre
  fontes; quem o põe na chave destrói a possibilidade de dedup correto.
- **Consequências:** dedup robusto entre webhooks repetidos e pagamentos
  reenviados. Testes travam o caso "mesmo booking, horário remarcado → uma linha".

## ADR-007 — Merge por completude: não-nulo vence, nulo nunca sobrescreve
**Status:** Aceita (2026-08-12) — adaptado do ADR-016 do eSupplyBotFarm

- **Contexto:** perfis e cadastros serão atualizados por múltiplos caminhos
  (onboarding, admin, integrações). Um UPDATE que sobrescreve dado preenchido
  com nulo destrói informação verdadeira em silêncio — o cliente preencheu o
  telefone e uma atualização parcial apaga.
- **Decisão:** no upsert de perfis/serviços/profissionais, valor novo não-nulo
  vence; **nulo nunca vence nada**. Omissão de coluna no payload = não tocar a
  coluna. Conflito entre dois não-nulos diferentes resolve por precedência
  declarada do caminho de escrita e **loga o conflito** — divergência é sinal,
  não ruído a esconder.
- **Exceção explícita:** campos de **estado** (status, verification_status,
  flags) são substituíveis por desenho e ficam declarados no código, não implícitos.
- **Motivo:** o produto não pode destruir dado que o usuário ou o admin forneceu;
  é o ADR-004 pela outra ponta (não estamos inventando dado, estamos apagando
  dado que já era verdadeiro).
- **Consequências:** campos preenchidos param de "piscar" entre atualizações.
  Log de conflitos alimenta curadoria. Exigência técnica: payloads de upsert
  omitem chaves nulas (PostgREST só atualiza colunas presentes).

## ADR-008 — Medallion (Bronze/Silver/Gold) com webhook_events como Bronze
**Status:** Aceita (2026-08-12) — adaptado do ADR-005 do eSupplyBotFarm; atende spec §10 e §50

- **Contexto:** webhooks, eventos de pagamento e eventos de booking têm qualidade
  e origem diferentes (provider, retry, duplicata). Deixar o produto ler direto
  do evento cru acopla a tela à bagunça da integração.
- **Decisão:** camadas:
  - **Bronze:** `webhook_events` (raw versionado: provider, event_id, event_type,
    `payload_hash` SHA-256, received_at, processed_at, status, error, attempts)
    e demais eventos crus. Nada é alterado aqui depois de gravado.
  - **Silver:** camadas canônicas (payments, wallet_transactions, bookings) com
    dedup e validação aplicados.
  - **Gold:** views de serving com `security_invoker = true` (ADR-002). O produto
    lê só a Gold.
- **Motivo:** desacoplar fonte de produto. Trocar um provider ou o formato de um
  webhook não afeta a Silver/Gold; e o raw preservado permite reprocessar e
  auditar o que realmente chegou.
- **Consequências:** mais tabelas, mas cada mudança de integração fica isolada
  num adapter + Bronze. Reprocessar histórico (reparar um dedup) é possível sem
  reconstruir o produto.

## ADR-009 — Double booking garantido no banco, nunca "verificar depois inserir"
**Status:** Aceita (2026-08-12) — atende spec §13 e §14

- **Contexto:** dois clientes podem clicar no mesmo horário simultaneamente.
  "Verificar disponibilidade → depois inserir" deixa uma janela onde ambos
  passam na verificação e os dois bookings são criados.
- **Decisão:** a exclusividade do horário é garantida pelo **banco**, não pela
  interface:
  - Constraint única/índice exclusivo em `(professional_id, started_at)` (janela
    de serviço) ou exclusão de overlap via constraint/trigger quando a janela
    tiver duração variável.
  - Inserção em transação que valida a violação; o perdedor recebe erro de
    concorrência tratado ("horário acabou de ser reservado").
  - Disponibilidade (dias, horários, intervalos, folgas, exceções, feriados,
    bloqueios) alimenta a UI, mas a decisão final é a constraint.
- **Motivo:** o custo de um double booking é financeiro e de confiança — dois
  clientes com o mesmo profissional no mesmo horário. A proteção precisa valer
  sob concorrência real, não sob boa vontade.
- **Consequências:** teste de concorrência no conjunto de testes (spec §64,
  item 4 "double booking") disparando dois inserts simultâneos e exigindo um
  vencedor. A máquina de estados do booking (pending → confirmed →
  in_progress → completed; cancelamentos válidos) é validada no backend, nunca
  no frontend.

## ADR-010 — Migrações compatíveis para frente, nunca destrutivas em produção
**Status:** Aceita (2026-08-12) — adaptado do ADR-012/013 do eSupplyBotFarm; atende spec §43, §69

- **Contexto:** o SERVICE vai evoluir o schema com o tempo (pagamentos, PRO,
  referral, disputas). Migração destrutiva (DROP TABLE/COLUMN, DELETE em massa)
  em produção destrói dado ou quebra consumidores em silêncio.
- **Decisão:**
  - Migrações **adicionar → migrar → validar → trocar código → remover legado
    depois** (compatíveis para frente). Nada de DROP/DELETE automático em
  produção.
  - Tabela nova nunca toca tabela legada enquanto não validada; quando houver
    consumidor antigo a proteger, criar **view de compatibilidade** com os nomes
    de coluna do legado e trocar as referências — nunca reescrever o consumidor
    junto com a mudança de dado.
  - Rollback **honesto**: se uma operação não for reversível, informar
    claramente. Nunca rollback falso.
  - Ambientes development/staging/production; mudança estrutural sempre passa
    por staging e revisão antes de produção.
- **Motivo:** o crescimento previsto (fases 1–3 da spec) vai exigir mudanças
  estruturais contínuas; a disciplina de compatibilidade é o que impede o
  produto de quebrar a cada milestone.
- **Consequências:** cada milestone com schema novo mantém o anterior funcionando
  até validação; plano de retorno sempre documentado.

## ADR-011 — Frescor, cron e limiares andam juntos; relógio falso é proibido
**Status:** Aceita (2026-08-12) — adaptado do ADR-029/031 e ADR-020 do eSupplyBotFarm; atende spec §53

- **Contexto:** o SERVICE terá automações (expiração de assinatura, lembretes de
  serviço, cashback, limpeza de dados temporários). No projeto de origem, o
  monitor de frescor disparava alarme falso quando o cron mudava sem o limiar
  mudar junto — e um status exibido ("atracado") sem prazo de validade mentia
  para o usuário.
- **Decisão:**
  - **Cron e limiar de staleness mudam no mesmo lote**, nunca separados.
  - Todo status derivado de tempo tem **prazo de validade**: um `pending` que
    nunca resolve vira estado honesto ("expirado"/"sem resposta"), nunca um
    estado falso de sucesso.
  - Frescor é medido pelo **dado**, não por carimbo de sistema: "fonte verificada
    hoje" nunca vira "dado de hoje". A tela diz as duas coisas ao mesmo tempo.
  - Monitoramento por fonte/domínio, não só global (uma fonte parada não pode
    manter o painel verde).
- **Motivo:** o cliente vê a tela, não o cron; toda a disciplina de backend vale
  zero se a UI mostrar um estado que o dado não sustenta.
- **Consequências:** contratos de frescor (verde/amarelo/vermelho) definidos por
  faixa documentada e acoplados às automações; testes de "pending expirado".

## ADR-012 — Ausência de resposta não é evidência de sucesso nem de saída
**Status:** Aceita (2026-08-12) — adaptado do ADR-021 do eSupplyBotFarm; atende spec §10

- **Contexto:** no projeto de origem, uma coleta que falhava por rede devolvia
  "vazio" e o sistema marcava como sucesso; pior, uma falha parcial fazia a
  reconciliação dar baixa em massa (navios que não saíram eram marcados como
  partidos). Aplicado ao SERVICE: um webhook que não respondeu não pode ser
  marcado como processado, e uma falha temporária do provider não pode virar
  "cancelado" nos bookings.
- **Decisão:**
  1. **Falha não persiste como sucesso.** Processamento de webhook com erro
     mantém `status = failed`/`pending` com `attempts` incrementado — nunca
     `processed`.
  2. **Processamento parcial nunca resolve estados em lote.** Se mais que um
     limite declarado de eventos numa remessa entraria no mesmo estado, o lote é
     abortado e logado — uma remessa grande não muda de estado "de uma vez" sem
     prova.
  3. **Código de saída é contrato:** sucesso, falha total e falha parcial são
     distinguíveis por quem agenda (Cloudflare Cron/Queue), e cada um tem
     alerta próprio.
  4. **Baixa/reconciliação nunca acontece por silêncio** — só por evento
     explícito (provider confirmou, fonte respondeu).
- **Motivo:** afirmar sucesso porque o sistema parou de falar é inventar dado —
  a mesma classe do ADR-004, gravada no banco em vez de exibida na tela.
- **Consequências:** falha vira ruído visível (alertas, `webhook_events.status`);
  retry com backoff e idempotência (ADR-005) garante que reprocessar não
  duplica.

## ADR-013 — R2 para mídia com guardrails de custo no código
**Status:** Aceita (2026-08-12) — adaptado do ADR-014/028/032 do eSupplyBotFarm; atende spec §4 e §5

- **Contexto:** o SERVICE guarda avatar, portfólio e fotos de serviços. O custo
  "quase zero" é uma exigência de produto (spec §5) e o R2 (10 GB grátis) é a
  escolha natural; mas o tier grátis é franquia, não teto de gasto, e storage
  não pode ser o ponto de falha do fluxo principal.
- **Decisão:**
  - **R2** para mídia pública/otimizada; estrutura de objetos por dono
    (`users/{userId}/avatar/...`, `professionals/{professionalId}/portfolio/...`,
    `services/{serviceId}/...`) — o usuário **nunca escolhe a chave** de outro.
  - Upload autorizado pelo backend (MIME, extensão, tamanho, ownership,
    quantidade, plano) — nunca por URL livre do cliente.
  - **Guarda-costas de custo no código:** chave endereçada por conteúdo (hash do
    objeto), teto por objeto, orçamento de operações por execução, e **no-op sem
    credencial**: storage nunca derruba o fluxo principal (foto falhou → o
    booking segue).
  - **Uma conta Cloudflare por projeto**; token de escopo restrito ao bucket
    (Object Read & Write), nunca admin; segredos por `wrangler secret put`,
    nunca em arquivo versionado.
  - Verificar tetos de gasto configuráveis **antes** de cadastrar qualquer meio
    de pagamento; se não houver freio de gasto, o freio é de código.
- **Motivo:** a franquia do R2 é por conta; três projetos na mesma conta dividem
  o mesmo teto e o consumo de um pode derrubar os outros. E o custo zero só é
  garantido pelo desenho, não pela plataforma.
- **Consequências:** thumbnails/WebP/AVIF quando fizer sentido; URLs privadas
  geradas com tempo de expiração; monitoramento de cota com alerta de
  aproximação (spec §5).

## ADR-014 — Catálogo canônico de cidade e categoria; alias com curadoria
**Status:** Aceita (2026-08-12) — adaptado do ADR-017 do eSupplyBotFarm; atende spec §21, §30, §31

- **Contexto:** o SERVICE é movido a busca e SEO por cidade/bairro/categoria
  ("/diaristas/guaruja"). Se cidade e categoria forem texto livre, "Guaruja",
  "GUARUJÁ" e "Guarujá - SP" viram três realidades, páginas SEO duplicadas e
  filtros quebrados.
- **Decisão:**
  - **Dimensões canônicas:** Cidade (código IBGE como chave — catálogo oficial,
    nunca texto livre), Bairro (FK cidade), Categoria (slug canônico) e Serviço
    (FK categoria).
  - Resolução de alias por **uma única tabela compartilhada**
    (`alias_canonico(tipo_entidade, entidade_id, grafia, origem)`) — mesma
    interface para todas as entidades.
  - **Não-resolvido fica pendente, rotulado e visível** — nunca resolvido por
    inferência; em relatórios/serviço aparece linha "não classificado" explícita,
    nunca omissão.
  - SEO: páginas públicas indexáveis (categorias, cidades, bairros, profissionais)
    **somente com conteúdo real** (spec §21/§56). Nunca gerar páginas vazias em
    massa para manipular busca.
- **Motivo:** a causa raiz comum de SEO duplicado, busca quebrada e dados
  inconsistentes é identidade por string em vez de por entidade. Corrigir um a
  um recriaria a mesma lógica de resolução em cada tela.
- **Consequências:** URL canônica única por cidade/categoria; structured data
  (schema.org) com dados reais; curadoria inicial de grafias é trabalho manual
  não trivial, mas finito (conjunto pequeno e fechado).

## ADR-015 — Grãos separados: um registro por evento
**Status:** Aceita (2026-08-12) — adaptado do ADR-026/011 do eSupplyBotFarm; atende spec §50, §51

- **Contexto:** no projeto de origem, a dedup global por navio colapsava escalas
  legítimas e a soma de tonelagem nascia de um conjunto já colapsado. Aplicado
  ao SERVICE: somar "número de serviços" deduplicando por profissional, ou
  contar bookings pelo grão errado, produz números errados no admin.
- **Decisão:**
  - **Bookings: um registro por evento** (uma contratação). Nunca deduplicar por
    cliente ou profissional quando o que se conta é evento.
  - **Profissionais: uma linha por identidade** (usuário). Os dois grãos
    coexistem e nunca se misturam nas métricas.
  - Tabelas separadas por domínio e grão (payments, wallet_transactions,
    bookings, reviews, referrals), nunca misturadas — cada uma fecha seu total
    sozinha.
  - Analytics (admin) sempre declara o grão da métrica ("143 serviços · 141
    clientes").
- **Motivo:** métrica certa exige grão certo; dedup que destrói dado legítimo é
  o mesmo anti-padrão visto no projeto de origem, aplicado ao marketplace.
- **Consequências:** self-check/teste trava o caso real (mesmo profissional com
  dois bookings no mesmo dia → duas linhas de booking, uma linha de
  profissional). Índices planejados por consulta real (spec §51), nunca
  indiscriminados.

## ADR-016 — Dois contratos de saída: público reduzido + privado completo
**Status:** Aceita (2026-08-12) — adaptado do ADR-024 do eSupplyBotFarm; atende spec §22, §48

- **Contexto:** o perfil público do profissional é uma landing page (spec §20),
  mas o mesmo perfil contém dados pessoais (telefone, endereço, documentos,
  contatos) que não podem ser servidos ao anônimo. No projeto de origem, um
  único cano de export servia público e privado no mesmo grant — um vazamento.
- **Decisão:** dois contratos distintos:
  - **Público reduzido** (anon/authenticated): o que a landing e a busca
    precisam — nome, cidade/bairro aproximado, categoria, serviços, avaliações
    agregadas, selos. **Nunca** telefone, e-mail, endereço completo ou dados de
    verificação. Servido por view Gold com `security_invoker = true`.
  - **Privado completo:** operações que exigem o dado inteiro (export, relatório,
    gestão) rodam no backend com credencial de service role, fora do navegador,
    com registro de auditoria.
  - **Minimização no ponto de saída:** se o dado não é necessário para aquele
    contrato, não sai.
- **Motivo:** a fronteira de privacidade é o ponto de saída, não a boa intenção;
  e o mesmo dado pode ser público num contrato e privado em outro.
- **Consequências:** view pública nunca é fronteira de segurança sozinha — a
  tabela-base também está protegida por RLS (ADR-002). LGPD: consentimento,
  exportação e exclusão de dados implementados sobre esses contratos.

## ADR-017 — Infraestrutura só com consumidor; custo zero por princípio
**Status:** Aceita (2026-08-12) — adaptado do ADR-004/007/030 do eSupplyBotFarm; atende spec §5, §53, §67

- **Contexto:** o SERVICE nasce com meta de custo próximo de zero (spec §5) e
  regra explícita: antes de adicionar qualquer serviço externo, perguntar
  "Supabase ou Cloudflare já resolve isso?" (spec §67).
- **Decisão:**
  - **Infraestrutura disponível não é infraestrutura necessária:** nada de Redis,
    Elasticsearch, VPS, múltiplos bancos ou storage duplicado sem consumidor
    real e medição que justifique.
  - **Tempo de engenharia é o recurso escasso:** pagar (dentro do orçamento)
    por serviço externo quando ele elimina dias de engenharia é ROI, não
    desperdício — desde que o custo mensal seja monitorado.
  - **Automações no lugar certo:** Cloudflare Cron/Queues para tarefas leves
    (expiração de assinatura, lembretes, cashback pós-conclusão, limpeza de
    dados temporários); jobs sequenciais em vez de matrizes paralelas quando a
    cota é compartilhada.
  - **Freio de gasto sempre:** budget zero + stop usage quando a plataforma
    oferecer; guardrail de código quando não oferecer (ADR-013).
  - Rate limiting preferencialmente via Cloudflare (spec §46).
- **Motivo:** o produto precisa escalar de centenas para dezenas de milhares sem
  reconstrução (spec §66); introduzir complexidade cedo é o erro inverso — cria
  custo fixo sem retorno.
- **Consequências:** decisões de infraestrutura registradas com gatilho de
  revisão ("quando a Fase 3 chegar, avaliar search engine/filas"); dívida
  declarada em vez de infraestrutura órfã.

## ADR-018 — A tela diz a verdade: estados honestos e staleness visível
**Status:** Aceita (2026-08-12) — adaptado do ADR-020 do eSupplyBotFarm; atende spec §62

- **Contexto:** no projeto de origem, o painel exibia 152 navios "atracados"
  num porto de ~60 berços, porque um status sem prazo de validade nunca expirava
  — a lógica estava certa, a tela mentia. No SERVICE, o equivalente seria um
  booking "pendente" eterno, um profissional "verificado" que a verificação
  expirou, ou um pagamento "processando" para sempre.
- **Decisão:**
  - Toda tela considera loading, success, empty, error, unauthorized e offline
    (spec §62); nunca spinner infinito.
  - **Status derivado tem prazo de validade**: estados que dependem de tempo
    expiram para um estado honesto, com o limiar calibrado por medição do
    domínio (não arbitrado) e documentado.
  - A UI declara o frescor do dado ("atualizado às 14:00", "verificado hoje ·
    dados disponíveis até...") em vez de fingir realtime.
  - Validação final é **uso real**, não só auditoria de código: o teste de
    aceite de uma tela é olhar o que ela mostra com dados reais.
- **Motivo:** o usuário vê a tela; toda a disciplina de backend vale zero se a
  interface exibe um estado que o dado não sustenta.
- **Consequências:** estados novos (ex.: "expirado", "sem resposta") aparecem
  como informação, não como erro; faixas de frescor documentadas por domínio.

## ADR-019 — Admin: permissão, preview, confirmação, auditoria, reversão honesta
**Status:** Aceita (2026-08-12) — atende spec §35–§41, §75

- **Contexto:** o painel admin do SERVICE é uma central operacional poderosa
  (usuários, profissionais, financeiro, flags). Poder sem controle é o risco
  número um do produto — "poder não significa acesso irrestrito" (spec §75).
- **Decisão:**
  - **Permissões por least privilege:** não basta `role = admin`; roles
    escaláveis (super_admin, support, moderator, finance, operations, marketing,
    analyst) com permissões granulares; operações financeiras exigem permissão
    específica.
  - **Ciclo de operação sensível:** preview ("você está prestes a alterar...") →
    dry run (simular sem persistir) → confirmação explícita → auditoria →
    rollback quando tecnicamente seguro; **nunca rollback falso** — se não for
    reversível, informar.
  - **`admin_audit_logs`:** quem, quando, IP quando apropriado, ação, recurso,
    ID, antes, depois, motivo. Ex.: "ADMIN Carlos alterou comissão 10% → 12%,
    motivo: campanha de agosto".
  - **Financeiro nunca editável diretamente:** ajuste de admin gera transação de
    ledger auditável (ADR-003), nunca UPDATE de saldo.
  - **Kill switches protegidos e auditados** (disable_payments, disable_referrals,
    disable_cashback, disable_new_bookings) e feature flags com rollout gradual
    (1% → 10% → 50% → 100%, preparado para A/B).
- **Motivo:** o admin concentra os alvos mais valiosos de um ataque; o mesmo
  poder que opera o produto precisa deixar trilha completa e reversível.
- **Consequências:** testes de "admin sem permissão tentando ação financeira"
  (spec §63) e de auditoria obrigatória em toda operação crítica; feature flags
  em tabela própria com responsável e histórico.

## ADR-020 — Observabilidade sem segredos e sem superfície inerte
**Status:** Aceita (2026-08-12) — adaptado de lições do eSupplyBotFarm; atende spec §45, §46, §63

- **Contexto:** o SERVICE monitora pagamentos, webhooks, bookings, erros e
  latência; e os logs viajam por ferramentas de terceiros. Um log de token,
  cartão ou senha vira exposição permanente. Já uma rota ou endpoint sem
  consumidor é superfície de ataque sem função.
- **Decisão:**
  - **Logs estruturados sem dados sensíveis:** nunca senha, token, cartão,
    segredo ou PII desnecessária; campos sensíveis mascarados.
  - **Monitorar o que importa:** erros, pagamentos, webhooks (com seus
    `attempts` e `status`), bookings, falhas, latência, consumo de cota.
  - **Nada de superfície inerte:** nenhum endpoint, RPC ou worker sem consumidor
    real; rotas só nascem com contrato e são removidas quando o consumidor sai.
  - **Teste de segurança explícito** (spec §63) em CI: Cliente A acessando B,
    Profissional A acessando B, cliente alterando saldo, cliente virando admin,
    alterar próprio role, criar cashback, duplicar referral, avaliar serviço não
    realizado, reservar horário reservado, webhook duplicado, pagamento/refund
    duplicado, admin sem permissão.
- **Motivo:** o modelo de ameaça do marketplace é de identidade e dinheiro; a
  observabilidade existe para ver o ataque, e a superfície mínima existe para
  não oferecer o ataque.
- **Consequências:** dashboards de monitoramento por domínio; testes de
  intrusão rodando como suíte de regressão; alertas de aproximação de cota
  (spec §5).

---

## ADR-034 — Cloudflare Workers é o destino oficial do app; plano B não é necessário hoje
**Status:** Aceita (2026-08-12) — validada no Milestone 0; atende spec §3

- **Contexto:** a spec §3 exige verificar a compatibilidade do TanStack Start
  com Cloudflare antes de implementar, e a auditoria marcou isso como o único
  bloqueio técnico pré-código.
- **Decisão:** TanStack Start (v1.168) tem o Cloudflare como **Official Hosting
  Partner** com suporte de primeira classe: plugin `@cloudflare/vite-plugin`
  (Vite Environments, `viteEnvironment: { name: 'ssr' }`), `wrangler.jsonc` com
  `nodejs_compat`, entrada `@tanstack/react-start/server-entry` e deploy via
  `wrangler deploy`. Exemplo oficial mantido no repositório do TanStack
  (`examples/react/start-basic-cloudflare`). O app inteiro (SSR + assets) roda
  como Worker; nenhuma API exclusivamente Node.js bloqueia o edge. **Plano B
  (SSG estático + Worker leve) fica registrado como contingência**, a ser
  revisitado apenas se o custo/limite do Worker inviabilizar a operação.
- **Motivo:** evidência da documentação oficial (página Hosting) + exemplo
  executável; a spec §3 pede verificação antes de implementar, e a verificação
  passou.
- **Consequências:** stack de deploy definida — Cloudflare Workers com SSR
  completo, SEO indexável por construção. Validação local do bundle Worker via
  `wrangler deploy --dry-run` (sem credenciais). Deploy real exige conta
  Cloudflare dedicada ao projeto (ADR-013).

## ADR-035 — Versões estáveis no scaffold do M0
**Status:** Aceita (2026-08-12) — implementada

- **Contexto:** o exemplo oficial do TanStack pinava TypeScript 6/7 (linha
  `npm:@typescript/typescript6` + `@typescript/native`, prévias do compilador
  nativo). Para a fundação de um produto financeiro, o critério é estabilidade
  do ecossistema (typescript-eslint, tooling), não novidade.
- **Decisão:**
  - TypeScript **5.9 estável** com `strict` + `noUncheckedIndexedAccess` +
    `noImplicitOverride` + `noFallthroughCasesInSwitch` (tsconfig
    versionado). Reavaliar TS 6/7 quando estável no ecossistema.
  - Lint com `typescript-eslint/strictTypeChecked` + proibições da spec §60
    (`no-explicit-any: error`, `ban-ts-comment` com exceção descrita).
  - Config de teste separada (`vitest.config.ts`) para não carregar o plugin
    Cloudflare no runner de testes.
  - `wrangler.jsonc` sem segredos (regra permanente: `wrangler secret put`).
- **Motivo:** a fundação deve rodar em CI de forma reproduzível e previsível;
  a spec exige TS strict, que 5.9 entrega integralmente.
- **Consequências:** gate do M0 verde — build, typecheck, lint, test e format
  check passando; 2 warnings de fast-refresh apenas em arquivos de rota
  (padrão inerente do TanStack Start, aceito e documentado). Atualizar TS só
  com justificativa registrada.

## ADR-036 — Frontend no Netlify free enquanto o site não vende; Cloudflare fica como plano de retorno
**Status:** Aceita (2026-08-12) — implementada; substitui a escolha de deploy do ADR-034 no momento

- **Contexto:** o dono do produto decidiu que, enquanto o SERVICE não gera
  receita, a hospedagem deve custar zero em absoluto: banco no Supabase (projeto
  já criado) e frontend fora da Cloudflare. A especificação não manda hospedar
  em plataforma específica — exige custo mínimo (spec §5) e compatibilidade
  portátil (spec §3).
- **Decisão:**
  - **Frontend → Netlify (plano grátis)** com `@netlify/vite-plugin-tanstack-start`
    (suporte oficial TanStack Start, mesmo autor da framework). SSR/SEO
    mantidos por construção (spec §21).
  - **Banco → Supabase** `taabjnmsaaltsiehywbw` (já criado). Mídia no Supabase
    Storage enquanto estiver no grátis.
  - **Cloudflare vira plano de retorno** (ADR-034): stack de app não muda —
    re-adicionar `@cloudflare/vite-plugin` + `wrangler` + `wrangler.jsonc` e o
    deploy volta a ser `wrangler deploy`.
  - Tooling Cloudflare removida do repo agora (ADR-017: sem superfície sem
    consumidor): plugin, wrangler, wrangler.jsonc, cf-typegen e o passo de CI.
- **Motivo:** custo zero absoluto nesta fase; e o desenho de deploy é uma
  camada, não arquitetura — a troca não toca rotas, server functions nem banco.
- **Consequências:** netlify.toml + env vars no painel Netlify
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — nunca no repo); `.env.local`
  só para dev e protegido no `.gitignore`. Repositório GitHub
  `GarciaCarlos1985/service` é a origem do deploy contínuo. Retorno à
  Cloudflare registrado no ROADMAP (M11) e no ADR-034.

## ADR-037 — Frontend na Vercel (free) em vez do Netlify; SSR via Nitro
**Status:** Aceita (2026-08-12) — implementada; substitui a escolha de deploy do ADR-036

- **Contexto:** o dono do produto fez o deploy na **Vercel** (URL
  `service-kappa-rose.vercel.app`) e o site retornava **404 em todos os
  recursos** — o build estava configurado com o plugin do Netlify
  (ADR-036), cujo output não roda na Vercel. Medido: o 404 desaparece quando o
  build gera o formato nativo da Vercel.
- **Decisão:** trocar o deploy de Netlify para **Vercel (plano grátis)** pelo
  caminho oficial do TanStack Start: **Nitro** (`nitro/vite`, preset
  `vercel`) — Build Output API v3 (`__server.func` para SSR + CDN para
  assets). Env vars `VITE_*` no painel da Vercel; redeploy obrigatório após
  alterá-las.
- **Motivo:** plataforma é camada, não arquitetura (ADR-036); o objetivo
  continua custo zero. Nitro é o preset documentado pela TanStack para Vercel.
- **Consequências:** `netlify.toml` e plugin Netlify removidos; `vercel` CLI
  adicionada (`npm run deploy` = `vercel deploy --prod`); `.vercel/` no
  gitignore. O 404 anterior era deploy errado, não bug do app. Retorno ao
  Cloudflare segue como plano (ADR-034), o plano Netlify (ADR-036) fica
  registrado como alternativa.

## ADR-038 — Chat preso ao booking e notificações in-app centralizadas (M7)
**Status:** Aceita (2026-08-13) — implementada e testada no banco real; atende spec §27/§28

- **Contexto:** o SERVICE precisa de comunicação entre cliente e profissional,
  mas o chat não pode virar rede social (spec §27) e as notificações precisam
  ser centralizadas com arquitetura para in-app/email/push (spec §28).
- **Decisão:**
  - **Uma conversa por booking** (`conversations` com `booking_id` único):
    cliente e profissional do booking são os únicos participantes — verificado
    por RPC `open_conversation`/`send_message` (SECURITY DEFINER) + RLS por
    participação. Terceiros nunca acessam (spec §63, testado).
  - **Escrita 100% via RPC** (ADR-002): nenhuma policy de insert/update/delete
    em mensagens/conversas/notificações.
  - **Rate limit no banco**: 10 mensagens/minuto por usuário (spec §27).
  - **Unread/read status** via `conversation_participants.last_read_at`;
    contadores agregados via RPC.
  - **Realtime** via publicação `supabase_realtime` em `messages` e
    `notifications` (RLS vale para o subscriber).
  - **Notificações in-app agora** (tipos da spec §28); email/push ficam na
    arquitetura. Eventos de negócio notificam via helper `_notify`: booking
    criado → profissional; confirmado/cancelado → outra parte; cashback →
    cliente (dentro do processamento financeiro idempotente).
- **Motivo:** chat é contexto do marketplace, não rede social; e notificação
  nasce junto do evento financeiro que a gera (spec §15: sem clique manual).
- **Consequências:** 11 testes SQL de chat+notificação no banco real
  (participantes, rate limit, unread, isolamento de terceiros); nenhuma
  regressão nas suítes RLS (15) e ledger (11). Interface: lista de conversas,
  thread com realtime, sino com contadores, página de notificações.

## ADR-039 — Toda migration é validada contra o banco real (padrão de qualidade)
**Status:** Aceita (2026-08-13) — implementada

- **Contexto:** as migrations M1–M5 foram escritas "às cegas" e revelaram bugs
  só na aplicação (make_interval não-imutável em índice; UNIQUE parcial). Com o
  `DATABASE_URL` disponível localmente, o projeto ganhou a capacidade de
  executar SQL arbitrário no banco real.
- **Decisão:** a partir do M6, **toda migration nova nasce com uma suíte de
  teste SQL** (`supabase/tests/<dominio>-tests.sql`) executada por
  `node scripts/sql-tests.mjs <arquivo>` contra o banco real. A suíte cria
  usuários reais em `auth.users`, simula papéis com `set local role` +
  `set_config`, e valida as regras do ADR-002/003/009 (RLS, imutabilidade,
  double booking) além das regras de negócio do milestone.
- **Motivo:** o erro de SQL mais barato é o que nunca chega a produção; o
  segundo mais barato é o que o teste pega no dia em que foi escrito.
- **Consequências:** 37 testes SQL verdes (15 RLS + 11 ledger + 11 chat);
  padrão documentado no AGENTS.md; `pg` (dev) e `DATABASE_URL` (gitignored)
  como ferramentas de teste locais.

## ADR-040 — Reviews presas ao booking, confiança objetiva e disputas com decisão só de admin (M8)
**Status:** Aceita (2026-08-13) — implementada e testada no banco real; atende spec §32/§33/§34

- **Contexto:** o SERVICE precisava de reputação (avaliações), confiança
  (verificação + badges) e resolução de conflitos (disputas), sem abrir espaço
  para avaliações falsas, autoavaliação ou manipulação (spec §33/§47).
- **Decisão:**
  - **Reviews só de booking concluído e só pelo cliente do booking**
    (`reviews.booking_id` UNIQUE — 1 avaliação por booking no banco);
    validação no RPC `create_review` (SECURITY DEFINER). Sem edição/exclusão:
    manipulação bloqueada por construção. Profissional responde 1x
    (`review_responses.review_id` UNIQUE) via `respond_review`.
  - **Contrato público controlado**: anon lê avaliações/nota/badges via RPCs
    (`list_professional_reviews`, `professional_rating_summary`,
    `professional_badges`), nunca a tabela crua (RLS default deny nas tabelas
    novas); nome do avaliador exibido reduzido (primeiro nome + inicial) —
    perfil de cliente nunca é exposto (ADR-016).
  - **Verificação**: `profiles.verification_status`
    (unverified/pending/verified/rejected/suspended) + `profiles.is_admin`.
    Profissional solicita via `request_verification`; só admin altera via
    `set_verification_status` (M10 consome). Colunas blindadas em dobro:
    política de update com with-check (mesmo padrão do user_type) + revoke
    colunar de UPDATE para authenticated.
  - **Badges com regra objetiva** (função única `professional_badges`, defaults
    ajustáveis na M10 via `platform_settings`):
    `verificado` = status verified · `alta_avaliacao` = média ≥ 4,5 com ≥ 5
    avaliações · `top` = ≥ 10 bookings concluídos nos últimos 90 dias
    (updated_at) com média ≥ 4,5 · `pro` reservado para M9 (assinatura) e não
    emitido até lá. O selo "Verificado" fixo que existia no perfil público era
    dado inventado (ADR-004) — removido.
  - **Disputas**: 1 por booking (`disputes.booking_id` UNIQUE), estados
    open/under_review/resolved/rejected com guarda de transição no banco;
    aberta só por participante e nunca em booking `pending`; mensagens e
    evidências (URL — upload real chega com R2 na M11, ADR-017) só de
    participantes/admin; decisão (`resolve_dispute`) exige admin e nota de
    resolução.
  - **Notificações**: avaliação → profissional; resposta → cliente; disputa
    aberta → outra parte; decisão → ambos; e lembrete de avaliação disparado
    por trigger na conclusão do booking (spec §53).
- **Motivo:** reputação só vale com compra real por trás; confiança só com
  regra objetiva auditável; disputa é decisão operacional, nunca do usuário.
- **Consequências:** 36 testes SQL novos no banco real (total 73: 15 RLS + 11
  ledger + 11 chat + 36 reviews/confiança/disputas), sem regressão. Sem
  realtime em disputas (fluxo lento, decisão admin — não justifica publicação
  agora; pode ser adicionado quando houver demanda).

---

> **Regra de manutenção:** a partir de 2026-08-12, todo ADR novo do SERVICE segue
> a mesma disciplina — Contexto medido ou declarado como hipótese, Decisão com
> alternativas consideradas, Motivo, Consequências (incluindo custo aceito e
> dívida declarada). Errata é documentada, nunca silenciosa (ADR-004).

