import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '~/lib/supabase'
import { useAuth } from '~/modules/auth/auth-context'
import { useToast } from '~/modules/ui'
import {
  listConversationMessages,
  markConversationRead,
  sendMessage,
} from '~/modules/chat/chat-api'
import { Button, Card, CardBody, Input, Skeleton } from '~/modules/ui'

export const Route = createFileRoute('/painel/mensagens/$conversationId')({
  component: ConversationPage,
})

function ConversationPage() {
  const { conversationId } = Route.useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => listConversationMessages(conversationId, 100),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  // Realtime (spec §27): mensagens novas entram na conversa em tempo real
  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])

  // Marca como lida ao abrir
  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId)
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ['conversations'] })
          void queryClient.invalidateQueries({ queryKey: ['unread-messages'] })
        })
        .catch(() => {})
    }
  }, [conversationId, queryClient])

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(conversationId, draft.trim()),
    onSuccess: () => {
      setDraft('')
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível enviar.', 'error')
    },
  })

  const messages = messagesQuery.data ?? []

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/painel/mensagens"
          className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          ←
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Conversa</h1>
      </div>

      <Card className="flex-1">
        <CardBody className="flex max-h-[55dvh] min-h-[40dvh] flex-col">
          {messagesQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Nenhuma mensagem ainda. Diga olá!
            </p>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto">
              {[...messages].reverse().map((message) => {
                const mine = message.sender_id === user?.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine
                          ? 'rounded-br-md bg-brand-blue-500 text-white'
                          : 'rounded-bl-md bg-slate-100 text-slate-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}
                      >
                        {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (draft.trim()) {
                sendMutation.mutate()
              }
            }}
            className="mt-4 flex gap-2 border-t border-slate-100 pt-4"
          >
            <Input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
              }}
              placeholder="Escreva sua mensagem..."
              maxLength={2000}
            />
            <Button
              type="submit"
              className="shrink-0"
              loading={sendMutation.isPending}
              disabled={!draft.trim()}
            >
              Enviar
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
