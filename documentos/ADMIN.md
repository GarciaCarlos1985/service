# ADMIN — SERVICE

## Operação atual do Service Guide (16/10/2026)

O painel comercial está em `/admin`. A entrada pode ser feita em
`/entrar?redirect=%2Fadmin`, com a senha já cadastrada no Supabase Auth.
Duas contas indicadas e confirmadas pelo responsável foram ativadas e auditadas.
No site publicado, a entrada direta é
`https://service-guide.helon280.workers.dev/entrar?redirect=%2Fadmin`.
Em caso de esquecimento, use `/recuperar-senha`: o link recebido retorna ao site
publicado e permite definir a nova senha. As senhas reais foram preservadas.
As ações comerciais verificam `profiles.is_admin` no banco por `_is_admin()` e
`guide_private.require_user(true)`; metadados editáveis do usuário não concedem
acesso. Ver `ATIVACAO-SUPABASE-2026-10-16.md` para a validação.

O catálogo real ainda precisa de categorias, bairros e empresas. O painel
permite essa configuração e a gestão manual dos planos/destaques. Os módulos
financeiros descritos no histórico abaixo continuam fora do MVP comercial.

## Referência histórica do marketplace

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
