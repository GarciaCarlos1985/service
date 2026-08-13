# Módulos de domínio

Estrutura de pastas por domínio (decisão do Milestone 0 — spec §61, ADR-001/015).

| pasta                       | domínio                                                       | quando entra   |
| --------------------------- | ------------------------------------------------------------- | -------------- |
| `ui/`                       | design system base (Button, Input, Select, Modal, Toast, ...) | **M0 — ativo** |
| `auth/`                     | login, cadastro, sessão, recuperação de senha                 | M1             |
| `booking/`                  | agendamento, disponibilidade, máquina de estados              | M4             |
| `payment/`                  | PaymentProvider, checkout, webhooks (contrato)                | M5             |
| `wallet/`                   | ledger, saldo, cashback                                       | M6             |
| `search/`                   | busca, filtros, ranking                                       | M3             |
| `chat/`                     | mensagens ligadas a booking                                   | M7             |
| `review/`                   | avaliações e respostas                                        | M8             |
| `referral/`                 | indicações                                                    | M9             |
| `admin/`                    | painel administrativo                                         | M10            |
| `client/` e `professional/` | dashboards e fluxos dos dois lados                            | M2+            |

**Regra:** nenhuma pasta é criada sem consumidor real (ADR-017 — infraestrutura
disponível não é infraestrutura necessária). Pastas nascem quando o milestone
delas começa.
