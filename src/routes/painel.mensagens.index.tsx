import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Card, CardBody, EmptyState, Skeleton } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { listMyConversations } from '~/modules/chat/chat-api'

export const Route = createFileRoute('/painel/mensagens/')({
  component: MessagesPage,
})

function MessagesPage() {
  const { user } = useAuth()

  const conversationsQuery = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: listMyConversations,
    enabled: user !== null,
  })

  if (conversationsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const conversations = conversationsQuery.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Mensagens</h1>
        <p className="text-sm text-slate-500">Conversas ligadas aos seus agendamentos (spec §27)</p>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="💬"
              title="Nenhuma conversa ainda"
              description="Quando um serviço for agendado, você poderá conversar com a outra parte aqui."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <Link
              key={conversation.conversation_id}
              to="/painel/mensagens/$conversationId"
              params={{ conversationId: conversation.conversation_id }}
              className="block"
            >
              <Card className="transition hover:border-brand-blue-400">
                <CardBody className="flex items-center gap-4">
                  <Avatar name={conversation.other_party_name ?? '?'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="truncate font-semibold text-slate-900">
                        {conversation.other_party_name ?? 'Participante'}
                      </h2>
                      {conversation.last_message_at ? (
                        <span className="shrink-0 text-xs text-slate-400">
                          {new Date(conversation.last_message_at).toLocaleDateString('pt-BR')}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {conversation.last_message ?? 'Inicie a conversa'}
                    </p>
                  </div>
                  {conversation.unread_count > 0 ? (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-blue-500 text-xs font-bold text-white">
                      {conversation.unread_count}
                    </span>
                  ) : null}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
