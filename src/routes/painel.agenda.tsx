import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  EmptyState,
  Input,
  Modal,
  Skeleton,
  StarRating,
  useToast,
} from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import {
  bookingStatusLabel,
  cancelBooking,
  completeBooking,
  confirmBooking,
  listMyBookings,
  startBooking,
} from '~/modules/booking/booking-api'
import type { Booking } from '~/modules/booking/booking-api'
import { openConversation } from '~/modules/chat/chat-api'
import { createReview, listMyReviews } from '~/modules/reviews/reviews-api'
import {
  disputeStatusLabel,
  listMyDisputes,
  openDispute,
} from '~/modules/disputes/disputes-api'

export const Route = createFileRoute('/painel/agenda')({
  component: AgendaPage,
})

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
}

const disputeStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  open: 'warning',
  under_review: 'info',
  resolved: 'success',
  rejected: 'danger',
}

function AgendaPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null)
  const [disputeTarget, setDisputeTarget] = useState<Booking | null>(null)

  const bookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: listMyBookings,
    enabled: user !== null,
  })

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve(null)
      return import('~/modules/profile/profile-api').then((m) => m.getProfile(user.id))
    },
    enabled: user !== null,
  })

  const isProfessional = profileQuery.data?.user_type === 'professional'

  const reviewsQuery = useQuery({
    queryKey: ['my-reviews'],
    queryFn: listMyReviews,
    enabled: user !== null && !isProfessional,
  })

  const disputesQuery = useQuery({
    queryKey: ['my-disputes'],
    queryFn: listMyDisputes,
    enabled: user !== null,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
  }

  const actionMutation = useMutation({
    mutationFn: async ({ booking, action }: { booking: Booking; action: string }) => {
      switch (action) {
        case 'confirm':
          return confirmBooking(booking.id)
        case 'start':
          return startBooking(booking.id)
        case 'complete':
          return completeBooking(booking.id)
        case 'cancel':
          return cancelBooking(booking.id, cancelReason || 'Solicitação do usuário')
        default:
          throw new Error('Ação desconhecida')
      }
    },
    onSuccess: () => {
      invalidate()
      setCancelTarget(null)
      setCancelReason('')
      toast('Atualizado.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível atualizar.', 'error')
    },
  })

  const openChatMutation = useMutation({
    mutationFn: (bookingId: string) => openConversation(bookingId),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      void router.navigate({
        to: '/painel/mensagens/$conversationId',
        params: { conversationId: conversation.id },
      })
    },
    onError: () => {
      toast('Não foi possível abrir a conversa.', 'error')
    },
  })

  if (bookingsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const bookings = bookingsQuery.data ?? []

  const reviewsByBooking = new Map(
    (reviewsQuery.data ?? []).map((review) => [review.booking_id, review]),
  )
  const disputesByBooking = new Map(
    (disputesQuery.data ?? []).map((dispute) => [dispute.booking_id, dispute]),
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">
            {isProfessional ? 'Seus serviços agendados' : 'Seus agendamentos'}
          </p>
        </div>
        {isProfessional ? (
          <Link
            to="/painel/disponibilidade"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Gerenciar horários
          </Link>
        ) : null}
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="ðŸ“…"
              title="Nada por aqui"
              description={
                isProfessional
                  ? 'Quando um cliente agendar, o serviÃ§o aparece aqui.'
                  : 'Agende um serviÃ§o pela pÃ¡gina do profissional para ver seus horÃ¡rios.'
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {isProfessional
                        ? (booking.client?.full_name ?? 'Cliente')
                        : (booking.service?.title ?? 'ServiÃ§o')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(booking.scheduled_at).toLocaleString('pt-BR', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <Badge variant={statusVariant[booking.status]}>
                    {bookingStatusLabel[booking.status]}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-slate-500">
                    {booking.service?.title ?? 'ServiÃ§o'} Â·{' '}
                    {booking.price_cents.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {booking.status !== 'cancelled' && booking.status !== 'completed' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={openChatMutation.isPending}
                        onClick={() => {
                          openChatMutation.mutate(booking.id)
                        }}
                      >
                        💬 Conversar
                      </Button>
                    ) : null}
                    {isProfessional && booking.status === 'pending' ? (
                      <Button
                        size="sm"
                        loading={actionMutation.isPending}
                        onClick={() => {
                          actionMutation.mutate({ booking, action: 'confirm' })
                        }}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    {isProfessional && booking.status === 'confirmed' ? (
                      <Button
                        size="sm"
                        loading={actionMutation.isPending}
                        onClick={() => {
                          actionMutation.mutate({ booking, action: 'start' })
                        }}
                      >
                        Iniciar
                      </Button>
                    ) : null}
                    {!isProfessional && booking.status === 'in_progress' ? (
                      <Button
                        size="sm"
                        loading={actionMutation.isPending}
                        onClick={() => {
                          actionMutation.mutate({ booking, action: 'complete' })
                        }}
                      >
                        Concluir serviÃ§o
                      </Button>
                    ) : null}
                    {booking.status === 'pending' || booking.status === 'confirmed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => {
                          setCancelTarget(booking)
                          setCancelReason('')
                        }}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isProfessional && booking.status === 'completed' ? (
                    reviewsByBooking.has(booking.id) ? (
                      <Badge variant="success" className="gap-1">
                        ★ {reviewsByBooking.get(booking.id)?.rating} Avaliado
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReviewTarget(booking)
                        }}
                      >
                        Avaliar
                      </Button>
                    )
                  ) : null}

                  {booking.status !== 'pending' ? (
                    (() => {
                      const dispute = disputesByBooking.get(booking.id)
                      return dispute ? (
                        <Link
                          to="/painel/disputas/$disputeId"
                          params={{ disputeId: dispute.id }}
                          className="inline-flex items-center"
                        >
                          <Badge variant={disputeStatusVariant[dispute.status]}>
                            Disputa: {disputeStatusLabel[dispute.status]}
                          </Badge>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-500"
                          onClick={() => {
                            setDisputeTarget(booking)
                          }}
                        >
                          Abrir disputa
                        </Button>
                      )
                    })()
                  ) : null}
                </div>

                {booking.status === 'cancelled' && booking.cancellation_reason ? (
                  <p className="text-xs text-slate-400">Motivo: {booking.cancellation_reason}</p>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={cancelTarget !== null}
        onClose={() => {
          setCancelTarget(null)
        }}
        onConfirm={() => {
          if (cancelTarget) actionMutation.mutate({ booking: cancelTarget, action: 'cancel' })
        }}
        title="Cancelar agendamento"
        description="O cancelamento fica registrado para o profissional e o cliente."
        confirmLabel="Cancelar agendamento"
        cancelLabel="Voltar"
        variant="destructive"
        loading={actionMutation.isPending}
      >
        <Input
          label="Motivo (opcional)"
          placeholder="Ex.: imprevisto"
          value={cancelReason}
          onChange={(event) => {
            setCancelReason(event.target.value)
          }}
        />
      </Dialog>

      {reviewTarget ? (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => {
            setReviewTarget(null)
          }}
        />
      ) : null}

      {disputeTarget ? (
        <DisputeModal
          booking={disputeTarget}
          onClose={() => {
            setDisputeTarget(null)
          }}
        />
      ) : null}
    </div>
  )
}

function ReviewModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const mutation = useMutation({
    mutationFn: () => createReview(booking.id, rating, comment.trim() === '' ? null : comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      toast('Avaliação enviada. Obrigado!', 'success')
      onClose()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível enviar a avaliação.', 'error')
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Avaliar serviço"
      description={`Como foi "${booking.service?.title ?? 'o serviço'}"?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={rating < 1}
            onClick={() => {
              mutation.mutate()
            }}
          >
            Enviar avaliação
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-center">
          <StarRating size="md" value={rating} onChange={setRating} />
        </div>
        <textarea
          value={comment}
          onChange={(event) => {
            setComment(event.target.value)
          }}
          rows={3}
          placeholder="Conte como foi a experiência (opcional)"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-brand-blue-400"
        />
      </div>
    </Modal>
  )
}

function DisputeModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      openDispute(booking.id, reason, description.trim() === '' ? null : description),
    onSuccess: (dispute) => {
      void queryClient.invalidateQueries({ queryKey: ['my-disputes'] })
      toast('Disputa aberta. A outra parte foi notificada.', 'success')
      onClose()
      void router.navigate({
        to: '/painel/disputas/$disputeId',
        params: { disputeId: dispute.id },
      })
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível abrir a disputa.', 'error')
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Abrir disputa"
      description="Descreva o problema para que ele seja analisado."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={reason.trim().length < 3}
            onClick={() => {
              mutation.mutate()
            }}
          >
            Abrir disputa
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Motivo"
          placeholder="Ex.: serviço diferente do combinado"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
          }}
        />
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
          }}
          rows={4}
          placeholder="Descreva o que aconteceu (opcional, mínimo 10 caracteres)"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-brand-blue-400"
        />
      </div>
    </Modal>
  )
}
