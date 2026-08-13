import { createFileRoute } from '@tanstack/react-router'
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
  Skeleton,
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

function AgendaPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

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
          return cancelBooking(booking.id, cancelReason || 'SolicitaÃ§Ã£o do usuÃ¡rio')
        default:
          throw new Error('AÃ§Ã£o desconhecida')
      }
    },
    onSuccess: () => {
      invalidate()
      setCancelTarget(null)
      setCancelReason('')
      toast('Atualizado.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'NÃ£o foi possÃ­vel atualizar.', 'error')
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
  const isProfessional = profileQuery.data?.user_type === 'professional'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500">
          {isProfessional ? 'Seus serviÃ§os agendados' : 'Seus agendamentos'}
        </p>
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
    </div>
  )
}
