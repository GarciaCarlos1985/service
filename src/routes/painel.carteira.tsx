import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '~/modules/auth/auth-context'
import {
  formatBRL,
  getMyTransactions,
  getWalletBalance,
  isIncome,
  walletTypeLabel,
} from '~/modules/wallet/wallet-api'
import { Card, CardBody, EmptyState, Skeleton } from '~/modules/ui'

export const Route = createFileRoute('/painel/carteira')({
  component: WalletPage,
})

function WalletPage() {
  const { user } = useAuth()

  const balanceQuery = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: getWalletBalance,
    enabled: user !== null,
  })

  const transactionsQuery = useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: () => getMyTransactions(50),
    enabled: user !== null,
  })

  if (balanceQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const balance = balanceQuery.data
  const transactions = transactionsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Minha carteira</h1>
        <p className="text-sm text-slate-500">
          Saldo derivado do ledger — nunca editado manualmente (ADR-003)
        </p>
      </div>

      <Card className="brand-gradient border-0 text-white">
        <CardBody>
          <p className="text-sm font-medium text-white/80">Saldo disponível</p>
          <p className="mt-1 text-4xl font-extrabold">{formatBRL(balance?.balance_cents ?? 0)}</p>
          <p className="mt-2 text-xs text-white/70">
            {balance
              ? 'Transações auditáveis no histórico abaixo'
              : 'Você ainda não tem transações'}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Histórico de transações</h2>
          {transactions.length === 0 ? (
            <EmptyState
              icon="💰"
              title="Nenhuma transação ainda"
              description="Quando um serviço for concluído, cashback e créditos aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {walletTypeLabel[transaction.type]}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {transaction.description ?? 'Transação'} ·{' '}
                      {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        isIncome(transaction.type) ? 'text-green-600' : 'text-slate-700'
                      }`}
                    >
                      {isIncome(transaction.type) ? '+' : ''}
                      {formatBRL(transaction.amount_cents)}
                    </p>
                    <p className="text-xs text-slate-400">
                      saldo {formatBRL(transaction.balance_after_cents)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
