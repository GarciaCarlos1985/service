import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  listMyNotifications,
  markNotificationsRead,
  notificationIcon,
} from '~/modules/notifications/notifications-api'
import { Card, CardBody, EmptyState, Skeleton } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'

export const Route = createFileRoute('/painel/notificacoes')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => listMyNotifications(100),
    enabled: user !== null,
  })

  useEffect(() => {
    if (user) {
      markNotificationsRead()
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ['unread-notifications'] })
          void queryClient.invalidateQueries({ queryKey: ['notifications'] })
        })
        .catch(() => {})
    }
  }, [user, queryClient])

  if (notificationsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const notifications = notificationsQuery.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Notificações</h1>
        <p className="text-sm text-slate-500">Centralizadas por tipo (spec §28)</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="🔔"
              title="Nenhuma notificação"
              description="Avisos de agendamento, pagamento, cashback e segurança aparecem aqui."
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li key={notification.id} className="flex gap-3 px-5 py-4">
                  <span className="text-2xl">{notificationIcon[notification.type] ?? '🔔'}</span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold text-slate-900 ${
                        notification.read_at ? '' : 'text-brand-blue-700'
                      }`}
                    >
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="mt-0.5 text-sm text-slate-500">{notification.body}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(notification.created_at).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
