# ADMIN — SERVICE

Painel administrativo: central operacional, não CRUD (spec §35). Poder não
significa acesso irrestrito (spec §75).

## Permissões (spec §40, ADR-019)

Roles escaláveis, **least privilege**:

- `super_admin` · `support` · `moderator` · `finance` · `operations` ·
  `marketing` · `analyst`

Operações financeiras exigem permissão específica. Nunca apenas `role = admin`.

## Ciclo de operação sensível (spec §41, ADR-019)

1. **Preview** — "você está prestes a alterar..."
2. **Dry run** — simula sem persistir
3. **Confirmação** explícita
4. **Auditoria** — registro obrigatório
5. **Rollback** quando tecnicamente seguro; **nunca rollback falso** — se não
   for reversível, informar claramente

## Auditoria (spec §39)

`admin_audit_logs`: quem · quando · IP quando apropriado · ação · recurso · ID
· antes · depois · motivo.

```
ADMIN Carlos alterou comissão 10% → 12% — motivo: campanha de agosto
```

## Financeiro (spec §38)

- Dashboard: pagamentos, taxas, comissão SERVICE, saldo pendente, repasses,
  refunds, chargebacks, cashback, receita por período.
- **Nunca** edição direta de saldo: ajuste gera transação de ledger auditável
  (ADR-003).

## Áreas (spec §35–§37)

- **Dashboard:** usuários, clientes, profissionais (+verificados), bookings,
  GMV, receita, comissões, pagamentos, reembolsos, cashback, assinaturas,
  indicações, disputas, crescimento, conversão, retenção.
- **Usuários:** buscar/filtrar/visualizar, editar campos permitidos, suspender,
  reativar, verificar, alterar plano dentro das regras, histórico. Operações
  perigosas exigem confirmação.
- **Profissionais:** verificar, suspender, analisar portfólio, avaliações,
  taxa de conclusão, cancelamentos, receita, disputas, destacar/remover
  destaque.
- **Configuração:** comissão (por categoria/profissional/plano/campanha/
  período), cashback, referral, planos — tudo auditado (spec §6–§7).

## Kill switches e feature flags (spec §42, §68)

- Kill switches protegidos e auditados: `disable_payments`,
  `disable_referrals`, `disable_cashback`, `disable_new_bookings`.
- Feature flags com rollout gradual (1% → 10% → 50% → 100%), preparado para
  A/B.

## Testes de segurança do admin (spec §63)

Admin sem permissão tentando ação financeira → negado e auditado.
