import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge, Button, Card, CardBody, EmptyState, Input, Skeleton, useToast } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import {
  addAvailabilityRow,
  addException,
  listAvailability,
  listExceptions,
  removeAvailabilityRow,
  removeException,
} from '~/modules/booking/booking-api'

export const Route = createFileRoute('/painel/disponibilidade')({
  component: AvailabilityPage,
})

const dayNames = ['Domingo', 'Segunda', 'TerÃ§a', 'Quarta', 'Quinta', 'Sexta', 'SÃ¡bado']

function AvailabilityPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const userId = user?.id

  const [day, setDay] = useState('1')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [exceptionDate, setExceptionDate] = useState('')
  const [exceptionReason, setExceptionReason] = useState('')

  const availabilityQuery = useQuery({
    queryKey: ['availability', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([])
      return listAvailability(userId)
    },
    enabled: userId !== undefined,
  })

  const exceptionsQuery = useQuery({
    queryKey: ['availability-exceptions', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([])
      return listExceptions(userId)
    },
    enabled: userId !== undefined,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['availability'] })
  }

  const addRowMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('UsuÃ¡rio nÃ£o autenticado')
      return addAvailabilityRow(userId, Number(day), startTime, endTime)
    },
    onSuccess: () => {
      invalidate()
      toast('HorÃ¡rio adicionado.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'NÃ£o foi possÃ­vel adicionar.', 'error')
    },
  })

  const removeRowMutation = useMutation({
    mutationFn: (id: string) => removeAvailabilityRow(id),
    onSuccess: () => {
      invalidate()
    },
    onError: () => {
      toast('NÃ£o foi possÃ­vel remover.', 'error')
    },
  })

  const addExceptionMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('UsuÃ¡rio nÃ£o autenticado')
      return addException(userId, exceptionDate, exceptionReason || undefined)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] })
      setExceptionDate('')
      setExceptionReason('')
      toast('Folga adicionada.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'NÃ£o foi possÃ­vel adicionar.', 'error')
    },
  })

  const removeExceptionMutation = useMutation({
    mutationFn: (id: string) => removeException(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['availability-exceptions'] })
    },
    onError: () => {
      toast('NÃ£o foi possÃ­vel remover.', 'error')
    },
  })

  if (availabilityQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const slots = availabilityQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Disponibilidade</h1>
        <p className="text-sm text-slate-500">Defina os dias e horÃ¡rios em que vocÃª atende.</p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">HorÃ¡rios da semana</h2>

          {slots.length === 0 ? (
            <EmptyState
              icon="ðŸ“…"
              title="Nenhum horÃ¡rio definido"
              description="Sem horÃ¡rios, os clientes nÃ£o conseguem agendar com vocÃª."
            />
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5"
                >
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">{dayNames[slot.day_of_week]}</span>
                    <span className="text-slate-500">
                      {' '}
                      Â· {slot.start_time.slice(0, 5)} Ã s {slot.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      removeRowMutation.mutate(slot.id)
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Dia</span>
              <select
                value={day}
                onChange={(event) => {
                  setDay(event.target.value)
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                {dayNames.map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">InÃ­cio</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => {
                  setStartTime(event.target.value)
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Fim</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => {
                  setEndTime(event.target.value)
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
              />
            </label>
            <div className="flex items-end">
              <Button
                fullWidth
                loading={addRowMutation.isPending}
                disabled={endTime <= startTime}
                onClick={() => {
                  addRowMutation.mutate()
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Folgas e bloqueios</h2>

          {exceptionsQuery.data && exceptionsQuery.data.length > 0 ? (
            <div className="space-y-2">
              {exceptionsQuery.data.map((exception) => (
                <div
                  key={exception.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5"
                >
                  <div className="text-sm">
                    <span className="font-medium text-slate-900">
                      {new Date(`${exception.exception_date}T12:00:00`).toLocaleDateString('pt-BR')}
                    </span>
                    {exception.reason ? (
                      <span className="text-slate-500"> â€” {exception.reason}</span>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      removeExceptionMutation.mutate(exception.id)
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma folga registrada.</p>
          )}

          <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Data</span>
              <Input
                type="date"
                value={exceptionDate}
                onChange={(event) => {
                  setExceptionDate(event.target.value)
                }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Motivo</span>
              <Input
                placeholder="Ex.: feriado, viagem"
                value={exceptionReason}
                onChange={(event) => {
                  setExceptionReason(event.target.value)
                }}
              />
            </label>
            <div className="flex items-end">
              <Button
                fullWidth
                loading={addExceptionMutation.isPending}
                disabled={!exceptionDate}
                onClick={() => {
                  addExceptionMutation.mutate()
                }}
              >
                Bloquear
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Badge variant="info">O double booking Ã© bloqueado pelo banco (ADR-009).</Badge>
    </div>
  )
}
