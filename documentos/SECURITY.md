# SECURITY — SERVICE

## Estado confirmado em 18/10/2026

O cadastro de marca/horários foi publicado com 15 migrações; 43/43 tabelas
públicas mantêm RLS. Seis suítes SQL atuais passaram no banco real após aplicação,
incluindo IDOR, negação anônima/consumidor, papéis e sessão/MFA. Edição,
desativação e reativação de empresas permanecem sob RPC e auditoria.
Confirmação por e-mail e Turnstile são obrigatórios; oito negativos de Auth
sem prova/com token fictício foram recusados. Entrega SMTP confirmada pelo
titular. MFA pelos administradores e login novo com CAPTCHA ainda precisam
ser concluídos pelos titulares. Essas verificações não prometem segurança
absoluta. Ver `PUBLICACAO-CADASTRO-2026-10-18.md` e
`AUTENTICACAO-EMAIL-CAPTCHA-2026-10-18.md`.

Postura: segurança por construção, não por convenção. O frontend carrega a chave
anônima do Supabase por design — toda fronteira real está no banco (RLS) e no
backend.

## Auditoria atual do Service Guide — 17/10/2026

43/43 tabelas públicas com RLS ligadas; foram encontrados acessos excessivos
em funções internas e na API do marketplace aposentado. O PR #2, já publicado,
fecha essas entradas, exige GRANT explícito para objetos novos e valida
banimento/confirmação/exclusão do Auth. Somente as 18 RPCs do guia ficam expostas
aos papéis correspondentes; autorização continua no banco, inclusive sessão/MFA.

Nove suítes SQL reais antes da liberação e cinco atuais após aplicação, Auth
HTTP com TOTP e três ciclos de login/logout, testes negativos da API, 89 unitários
e build aprovados. Produção tem 14 migrations, mínimo de novas senhas de 12 e
os seis helpers sem acesso externo. MFA dos dois titulares, entrega de e-mail, CAPTCHA e proteção contra
senhas vazadas têm limites/pendências explícitos. Ver
`PUBLICACAO-SEGURANCA-2026-10-17.md`, `AUDITORIA-RLS-2026-10-17.md` e as
evidências estruturadas correspondentes. Os advisors têm 26 avisos, sem erros:
25 de RPCs intencionais e um de proteção contra senha vazada desativada.

## Modelo de ameaça (spec §63)

Modelo herdado, exercitado por suítes SQL reais separadas do CI de código:

1. Cliente A acessando dados do Cliente B
2. Profissional A acessando dados do Profissional B
3. Cliente tentando alterar saldo
4. Cliente tentando virar admin
5. Usuário tentando alterar o próprio role
6. Usuário tentando criar cashback
7. Usuário tentando duplicar referral
8. Usuário avaliando serviço que não realizou
9. Usuário reservando horário já reservado
10. Webhook duplicado
11. Pagamento duplicado / refund duplicado
12. Admin sem permissão tentando ação financeira

## Regras fundamentais (ADR-002)

- **Default deny:** RLS ligada em toda tabela crítica; sem policy = nega.
- **Sem escrita anônima:** nenhum INSERT/UPDATE/DELETE por `anon` direto do
  navegador além do que RLS autoriza por policy explícita.
- **Views com `security_invoker = true`** — nenhuma view lava privilégio de
  tabela fechada.
- **Policy se lê pelo efeito, nunca pelo nome.** Auditoria por catálogo
  (`pg_policies`, `has_table_privilege`, `has_function_privilege`), nunca
  validando com escrita real.

## Financeiro (ADR-003, ADR-005)

- Ledger append-only; saldo derivado, nunca vindo do frontend.
- `idempotency_key` obrigatória em pagamento, refund, cashback, referral,
  payout e ajustes.
- Identidade de eventos: chave oficial do provider quando existir; senão chave
  composta com `confianca_identidade` declarada. Sem janelas de tolerância
  arbitrárias.
- Nenhuma etapa financeira depende de clique visual (spec §15).

## Uploads (spec §4, ADR-013)

- Upload autorizado pelo backend: MIME, extensão, tamanho, ownership,
  quantidade, plano.
- Chave de objeto determinada pelo backend (`users/{userId}/...` etc.) — o
  usuário nunca escolhe chave de storage de outro.

## Segredos

- Nunca commit de `.env`, chaves, tokens ou segredos (`.gitignore` + CI).
- Workers: `wrangler secret put`; variáveis públicas só com prefixo `VITE_`.
- Logs estruturados sem senha, token, cartão ou PII desnecessária (ADR-020).

## LGPD (spec §48, ADR-016)

- Consentimento registrado; política de privacidade e termos de uso.
- Minimização: só coleta o necessário.
- Contratos de saída separados: público reduzido vs privado completo (export
  roda no backend com service role, fora do navegador).
- Exportação e exclusão de dados implementadas.
- Dado não resolvido fica pendente rotulado — nunca inferido (ADR-004).

## Observabilidade (spec §45)

Monitora: erros, pagamentos, webhooks, bookings, falhas, latência, consumo de
cota. Rate limiting em login, cadastro, chat, busca, booking, pagamento,
referral, avaliação, upload e admin (preferência Cloudflare).
