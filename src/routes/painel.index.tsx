import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, CardBody, EmptyState, Skeleton } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { getProfile } from '~/modules/profile/profile-api'
import { listMyServices } from '~/modules/services/services-api'
import { formatBRL, getWalletBalance } from '~/modules/wallet/wallet-api'

export const Route = createFileRoute('/painel/')({
  component: PainelHome,
})

function PainelHome() {
  const { user } = useAuth()
  const userId = user?.id

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(null)
      return getProfile(userId)
    },
    enabled: userId !== undefined,
  })

  const servicesQuery = useQuery({
    queryKey: ['my-services', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([])
      return listMyServices(userId)
    },
    enabled: userId !== undefined,
  })

  const balanceQuery = useQuery({
    queryKey: ['wallet-balance', userId],
    queryFn: getWalletBalance,
    enabled: userId !== undefined,
  })

  if (profileQuery.isLoading || servicesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (profileQuery.isError || servicesQuery.isError) {
    return (
      <Card>
        <CardBody>
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Não foi possível carregar seus dados. Verifique se as migrations do banco já foram
            aplicadas (documentos/APLICANDO_MIGRATIONS.md).
          </p>
        </CardBody>
      </Card>
    )
  }

  const profile = profileQuery.data
  const services = servicesQuery.data ?? []

  if (profile?.user_type === 'professional') {
    const activeCount = services.filter((s) => s.is_active).length

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Olá, {profile.full_name?.split(' ')[0] ?? 'profissional'} 👋
          </h1>
          <p className="text-sm text-slate-500">Resumo da sua atividade</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500">Serviços ativos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{activeCount}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500">Próximos serviços</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">—</p>
              <p className="text-[10px] text-slate-400">chega no M4</p>
            </CardBody>
          </Card>
        </div>

        <Link to="/painel/carteira" className="block">
          <Card className="brand-gradient border-0 text-white transition hover:opacity-95">
            <CardBody className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/80">Saldo na carteira</p>
                <p className="text-2xl font-bold">
                  {formatBRL(balanceQuery.data?.balance_cents ?? 0)}
                </p>
              </div>
              <span className="text-sm font-semibold text-white/90">Ver →</span>
            </CardBody>
          </Card>
        </Link>

        <Card>
          <CardBody>
            <EmptyState
              icon="🧰"
              title="Cadastre seus serviços"
              description="Quanto mais serviços cadastrados, mais fácil o cliente encontrar você."
              action={
                <Link to="/painel/servicos" className="w-full">
                  <span className="inline-flex h-11 w-full items-center justify-center rounded-xl brand-gradient px-5 text-sm font-semibold text-white">
                    Gerenciar serviços
                  </span>
                </Link>
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <Badge variant="info">PRO</Badge>
            <p className="text-sm text-slate-600">
              O plano PRO com destaque na busca chega em breve.
            </p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Olá, {profile?.full_name?.split(' ')[0] ?? 'cliente'} 👋
        </h1>
        <p className="text-sm text-slate-500">O que você precisa hoje?</p>
      </div>

      <Card>
        <CardBody>
          <EmptyState
            icon="🔎"
            title="Encontre um profissional"
            description="A busca por categoria e cidade chega no próximo milestone. Por enquanto, explore a página inicial."
            action={
              <Link to="/" className="w-full">
                <span className="inline-flex h-11 w-full items-center justify-center rounded-xl brand-gradient px-5 text-sm font-semibold text-white">
                  Explorar
                </span>
              </Link>
            }
          />
        </CardBody>
      </Card>

      <Link to="/painel/carteira" className="block">
        <Card className="brand-gradient border-0 text-white transition hover:opacity-95">
          <CardBody className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white/80">Cashback na carteira</p>
              <p className="text-2xl font-bold">
                {formatBRL(balanceQuery.data?.balance_cents ?? 0)}
              </p>
            </div>
            <span className="text-sm font-semibold text-white/90">Ver →</span>
          </CardBody>
        </Card>
      </Link>

      <Card>
        <CardBody>
          <EmptyState
            icon="📅"
            title="Nenhum serviço agendado"
            description="Seus próximos serviços aparecerão aqui depois que o agendamento estiver disponível."
          />
        </CardBody>
      </Card>
    </div>
  )
}
