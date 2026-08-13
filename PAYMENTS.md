# PAYMENTS — SERVICE

## Modelo (spec §6–§9)

Intermediador: **cliente paga pela plataforma → SERVICE retém comissão
configurável → repasse ao profissional** via Stripe Connect (contas conectadas).

```
CLIENTE → SERVICE / STRIPE CONNECT → PROFISSIONAL
```

## Abstração PaymentProvider (ADR-001)

A regra de negócio nunca depende do Stripe. Contrato estável:

```ts
interface PaymentProvider {
  createPaymentIntent(...)
  confirmPayment(...)
  refund(...)
  getPaymentStatus(...)
  handleWebhook(payload)
}
```

Providers: `StripeProvider` (produção), `MockProvider` (dev, **claramente
separado**, spec §73), `AppmaxProvider` (futuro). Registro por registry —
adicionar provider = 1 classe + 1 linha.

## Dados registrados por pagamento (spec §8)

valor bruto · taxa da plataforma · taxa do processador · valor líquido do
profissional · payment intent · charge · connected account · payout · refund ·
dispute · status · timestamps. **Nunca** dados sensíveis de cartão.

## Regras duras

- **Ledger imutável** (ADR-003): `wallet_transactions` append-only; saldo
  derivado; correções via transação compensatória; reconciliação periódica.
- **Idempotência** (ADR-005): `idempotency_key` obrigatória em pagamento,
  refund, cashback, referral, payout e ajustes. Operação repetida não duplica
  dinheiro.
- **Webhooks** (ADR-012): autenticados, verificados, idempotentes, registrados
  em `webhook_events` (Bronze), auditáveis. Webhook que falha não marca
  processado; retry com backoff.
- **Fluxo** (spec §15): pagamento iniciado → confirmado → agendamento
  confirmado → serviço → concluído → avaliação → liberação conforme regra →
  comissão → repasse → cashback. Nenhuma etapa depende de clique visual.
- **Cashback** (spec §16): somente após `payment = paid` AND `booking =
completed` AND cliente elegível. Idempotente, auditável, configurável,
  limitado, protegido contra abuso.
- **Mock vs produção** (spec §73): nunca misturar; nunca um pagamento fake que
  pareça real em produção.

## Comissão (spec §6–§7)

Configurável por categoria, profissional, plano, campanha e período — via
configuração administrativa auditada (ADR-019), nunca fixa em código.

## Estrutura do Milestone 5

1. Contrato `PaymentProvider` + `MockProvider`
2. Tabelas payments/payment_events + Bronze de webhooks
3. `StripeProvider` (sandbox) atrás do contrato
4. Ledger + idempotência (M6) sobre o mesmo contrato
