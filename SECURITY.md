# SECURITY — SERVICE

Postura: segurança por construção, não por convenção. O frontend carrega a chave
anônima do Supabase por design — toda fronteira real está no banco (RLS) e no
backend.

## Modelo de ameaça (spec §63)

Testados explicitamente na suíte de segurança (CI):

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
