import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Avatar, LoadingState } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { getProfile } from '~/modules/profile/profile-api'
import { getUnreadMessagesCount } from '~/modules/chat/chat-api'
import { getUnreadNotificationsCount } from '~/modules/notifications/notifications-api'

export const Route = createFileRoute('/painel')({
  component: PainelLayout,
})

const navItems = [
  { to: '/painel', label: 'Início', icon: '🏠' },
  { to: '/painel/agenda', label: 'Agenda', icon: '📅' },
  { to: '/painel/mensagens', label: 'Mensagens', icon: '💬' },
  { to: '/painel/servicos', label: 'Serviços', icon: '🧰' },
  { to: '/painel/perfil', label: 'Perfil', icon: '👤' },
]

function PainelLayout() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      void router.navigate({ to: '/entrar' })
    }
  }, [isLoading, user, router])

  const userId = user?.id

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(null)
      return getProfile(userId)
    },
    enabled: userId !== undefined,
  })

  if (isLoading || !user) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <LoadingState rows={2} />
        </div>
      </main>
    )
  }

  const profile = profileQuery.data

  const unreadNotificationsQuery = useQuery({
    queryKey: ['unread-notifications', userId],
    queryFn: getUnreadNotificationsCount,
    enabled: userId !== undefined,
    refetchInterval: 60_000,
  })

  const unreadMessagesQuery = useQuery({
    queryKey: ['unread-messages', userId],
    queryFn: getUnreadMessagesCount,
    enabled: userId !== undefined,
    refetchInterval: 60_000,
  })

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link to="/" className="text-sm font-bold text-brand-blue-600">
            SERVICE
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/painel/mensagens"
              aria-label="Mensagens"
              className="relative grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              💬
              {(unreadMessagesQuery.data ?? 0) > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid size-4.5 min-h-4 min-w-4 place-items-center rounded-full bg-brand-blue-500 px-1 text-[10px] font-bold text-white">
                  {unreadMessagesQuery.data}
                </span>
              ) : null}
            </Link>
            <Link
              to="/painel/notificacoes"
              aria-label="Notificações"
              className="relative grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              🔔
              {(unreadNotificationsQuery.data ?? 0) > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 grid size-4.5 min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotificationsQuery.data}
                </span>
              ) : null}
            </Link>
            <Avatar name={profile?.full_name ?? user.email ?? '?'} size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-5">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/painel' }}
              activeProps={{ className: 'text-brand-blue-600' }}
              className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-slate-500"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
