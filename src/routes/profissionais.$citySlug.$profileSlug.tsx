import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ErrorState } from '~/modules/ui'
import { Avatar, Badge, Button, Card, CardBody, Modal, Skeleton, useToast } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { getProfessionalBySlugs, type PublicProfessionalProfile } from '~/modules/search/search-api'
import { addFavorite, isFavorite, removeFavorite } from '~/modules/favorites/favorites-api'
import { createBooking, getAvailableSlots } from '~/modules/booking/booking-api'

export const Route = createFileRoute('/profissionais/$citySlug/$profileSlug')({
  loader: async ({ params }) => {
    let professional: PublicProfessionalProfile | null = null
    try {
      professional = await getProfessionalBySlugs(params.citySlug, params.profileSlug)
    } catch {
      return { professional: null, dbError: true }
    }
    if (!professional) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- notFound() é o mecanismo do TanStack Router
      throw notFound()
    }
    return { professional, dbError: false }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.professional) return {}
    const p = loaderData.professional
    const city = p.city?.name ?? ''
    const title = `${p.full_name ?? 'Profissional'} — ${city} | SERVICE`
    const description =
      p.services.length > 0
        ? `${p.full_name ?? 'Profissional'} oferece ${p.services
            .slice(0, 3)
            .map((s) => s.category?.name ?? s.title)
            .join(', ')} em ${city}.`
        : `Conheça ${p.full_name ?? 'este profissional'} em ${city} no SERVICE.`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: p.full_name,
      address: city ? { '@type': 'PostalAddress', addressLocality: city } : undefined,
      url: `https://service-kappa-rose.vercel.app/profissionais/${p.city?.slug ?? ''}/${p.slug ?? ''}`,
      makesOffer: p.services.map((s) => ({
        '@type': 'Offer',
        name: s.title,
        ...(s.price_from_cents !== null
          ? { price: (s.price_from_cents / 100).toFixed(2), priceCurrency: 'BRL' }
          : {}),
      })),
    }

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
      ],
      links: [
        {
          rel: 'canonical',
          href: `https://service-kappa-rose.vercel.app/profissionais/${p.city?.slug ?? ''}/${p.slug ?? ''}`,
        },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(jsonLd),
        },
      ],
    }
  },
  component: ProfessionalProfilePage,
})

function ProfessionalProfilePage() {
  const { professional, dbError } = Route.useLoaderData()
  const { user } = useAuth()
  const { toast } = useToast()
  const [bookingService, setBookingService] = useState<
    PublicProfessionalProfile['services'][number] | null
  >(null)

  if (!professional) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {dbError ? (
            <ErrorState
              title="Não foi possível carregar o perfil"
              description="O banco de dados ainda não está disponível. Verifique se as migrations foram aplicadas (documentos/APLICANDO_MIGRATIONS.md)."
            />
          ) : (
            <ErrorState title="Profissional não encontrado" />
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card>
          <CardBody className="space-y-6">
            <ProfileHeader
              professional={professional}
              isProfessionalUser={user?.id === professional.id}
            />

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Serviços</h2>
              <div className="mt-3 space-y-3">
                {professional.services.length === 0 ? (
                  <p className="rounded-xl bg-slate-100 px-4 py-6 text-center text-sm text-slate-500">
                    Este profissional ainda não cadastrou serviços.
                  </p>
                ) : (
                  professional.services.map((service) => (
                    <Card key={service.id} className="bg-slate-50">
                      <CardBody className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{service.title}</p>
                          {service.category ? (
                            <Badge variant="default" className="mt-1">
                              {service.category.name}
                            </Badge>
                          ) : null}
                          {service.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {service.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          {service.price_from_cents !== null ? (
                            <p className="font-semibold text-brand-blue-600">
                              {service.price_from_cents.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                              <span className="block text-xs font-normal text-slate-400">
                                a partir de
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400">Sob consulta</p>
                          )}
                          <Button
                            size="sm"
                            className="mt-2"
                            disabled={user?.id === professional.id}
                            onClick={() => {
                              if (!user) {
                                toast('Faça login para agendar.', 'info')
                                return
                              }
                              setBookingService(service)
                            }}
                          >
                            Agendar
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400">
          <Link to="/" className="hover:underline">
            ← Voltar
          </Link>
        </p>
      </div>

      {bookingService ? (
        <BookingModal
          professional={professional}
          service={bookingService}
          onClose={() => {
            setBookingService(null)
          }}
        />
      ) : null}
    </main>
  )
}

function ProfileHeader({
  professional,
  isProfessionalUser,
}: {
  professional: PublicProfessionalProfile
  isProfessionalUser: boolean
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const favoriteQuery = useQuery({
    queryKey: ['favorite', user?.id, professional.id],
    queryFn: () => {
      if (!user) return Promise.resolve(false)
      return isFavorite(user.id, professional.id)
    },
    enabled: user !== null && !isProfessionalUser,
  })

  const favoriteMutation = useMutation({
    mutationFn: async (favorite: boolean) => {
      if (!user) throw new Error('Faça login para favoritar')
      if (favorite) {
        await removeFavorite(user.id, professional.id)
      } else {
        await addFavorite(user.id, professional.id)
      }
      return !favorite
    },
    onSuccess: (favorite) => {
      void queryClient.invalidateQueries({ queryKey: ['favorite'] })
      toast(favorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível atualizar.', 'error')
    },
  })

  return (
    <div className="flex items-start gap-4">
      <Avatar
        name={professional.full_name ?? '?'}
        size="lg"
        src={professional.avatar_url ?? undefined}
      />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-slate-900">{professional.full_name}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {professional.city
            ? `${professional.city.name} — ${professional.city.state}`
            : 'Localização a definir'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="success">Verificado</Badge>
          {professional.services.length > 0 ? (
            <Badge variant="info">
              {professional.services.length}{' '}
              {professional.services.length === 1 ? 'serviço' : 'serviços'}
            </Badge>
          ) : null}
        </div>
      </div>
      {!isProfessionalUser ? (
        <Button
          variant="outline"
          loading={favoriteMutation.isPending}
          disabled={favoriteQuery.isLoading}
          onClick={() => {
            if (!user) {
              toast('Faça login para favoritar.', 'info')
              return
            }
            favoriteMutation.mutate(favoriteQuery.data ?? false)
          }}
        >
          {favoriteQuery.data ? '♥ Favorito' : '♡ Favoritar'}
        </Button>
      ) : null}
    </div>
  )
}

function BookingModal({
  professional,
  service,
  onClose,
}: {
  professional: PublicProfessionalProfile
  service: PublicProfessionalProfile['services'][number]
  onClose: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const slotsQuery = useQuery({
    queryKey: ['slots', professional.id, today],
    queryFn: () => getAvailableSlots(professional.id, today, 14, 30),
    enabled: true,
  })

  const dates = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const slot of slotsQuery.data ?? []) {
      if (!seen.has(slot.slot_date)) {
        seen.add(slot.slot_date)
        list.push(slot.slot_date)
      }
    }
    return list.slice(0, 7)
  }, [slotsQuery.data])

  const timesForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    return (slotsQuery.data ?? [])
      .filter((slot) => slot.slot_date === selectedDate)
      .map((slot) => slot.slot_time)
  }, [slotsQuery.data, selectedDate])

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Faça login para agendar')
      if (!selectedDate || !selectedTime) throw new Error('Escolha um horário')
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
      return createBooking({
        professionalId: professional.id,
        serviceId: service.id,
        scheduledAt,
        durationMinutes: 60,
      })
    },
    onSuccess: () => {
      toast('Agendamento solicitado! O profissional precisa confirmar.', 'success')
      void queryClient.invalidateQueries({ queryKey: ['slots'] })
      onClose()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível agendar.', 'error')
      void queryClient.invalidateQueries({ queryKey: ['slots'] })
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Agendar serviço"
      description={`${service.title} com ${professional.full_name ?? 'Profissional'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={bookingMutation.isPending}>
            Cancelar
          </Button>
          <Button
            loading={bookingMutation.isPending}
            disabled={!selectedDate || !selectedTime}
            onClick={() => {
              bookingMutation.mutate()
            }}
          >
            Solicitar agendamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {slotsQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : dates.length === 0 ? (
          <p className="rounded-xl bg-slate-100 px-4 py-6 text-center text-sm text-slate-500">
            Este profissional ainda não tem horários disponíveis nos próximos dias.
          </p>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Dia</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date)
                      setSelectedTime(null)
                    }}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium ${
                      selectedDate === date
                        ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-brand-blue-300'
                    }`}
                  >
                    {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate ? (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Horário</p>
                <div className="grid grid-cols-3 gap-2">
                  {timesForSelectedDate.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setSelectedTime(time)
                      }}
                      className={`rounded-xl border px-2 py-2 text-sm font-medium ${
                        selectedTime === time
                          ? 'border-brand-blue-500 bg-brand-blue-50 text-brand-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-brand-blue-300'
                      }`}
                    >
                      {time.slice(0, 5)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-xs text-slate-400">
              Duração estimada: 60 min · preço a partir de{' '}
              {(service.price_from_cents ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
