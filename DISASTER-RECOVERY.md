# DISASTER-RECOVERY — SERVICE

Backup não significa recuperação automática (spec §44). Este documento define
procedimentos e metas.

## Responsabilidades por serviço

| serviço               | quem garante persistência                                  | risco principal                         |
| --------------------- | ---------------------------------------------------------- | --------------------------------------- |
| PostgreSQL (Supabase) | Supabase (PITR em planos pagos; retenção limitada no free) | perda acidental, migration mal aplicada |
| Mídia (R2)            | Cloudflare R2 (replicação regional padrão)                 | exclusão acidental de objetos           |
| Segredos              | `wrangler secret put` + `.env` (fora do repo)              | perda de acesso humano                  |

## Metas (spec §44)

- **RPO** (perda máxima aceitável): alvo para a base transacional — ver
  retenção do plano Supabase contratado; documentar o número real em cada
  ambiente.
- **RTO** (tempo máximo para restaurar): app restaurado do deploy anterior
  (imagem de Worker + assets) em minutos; banco conforme o plano Supabase.

## Procedimentos

### Restaurar o app (Cloudflare)

```bash
npx wrangler rollback      # última versão boa
# ou redeploy de um commit anterior (CI)
```

### Restaurar o banco (Supabase)

1. Identificar a migration ou operação que causou o problema (ADR-010:
   migrations compatíveis para frente).
2. Correção via nova migration (adicionar/migrar/validar) — **não** reverter
   destrutivamente.
3. Em desastre real: restaurar de backup/PITR do Supabase e reaplicar
   migrations posteriores em staging antes de produção.

### Incidente de custo/quota

Tier grátis é franquia, não teto (ADR-013). Alertas de aproximação de cota
(spec §5). Freio de código: se a franquia esgotar, degradar graciosamente
(no-op), nunca estourar conta.

## Regras permanentes

- **Nada de rollback falso** (spec §41): operação irreversível é informada
  claramente antes.
- Migrations destrutivas jamais automáticas em produção (spec §69).
- Dados fictícios nunca tratados como reais; seeds identificados (spec §74).
- Plano de retorno de cada mudança estrutural registrado no ADR correspondente.
- Exercícios de restauração (game days) periódicos: 1x por semestre ou a cada
  mudança estrutural grande.
