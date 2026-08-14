import { createFileRoute } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Badge, Button, Card, CardBody, Input, Select, Skeleton, useToast } from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { profileFormSchema, parseCityId } from '~/modules/profile/schemas'
import type { ProfileFormInput } from '~/modules/profile/schemas'
import {
  getProfile,
  listCities,
  requestVerification,
  updateProfile,
} from '~/modules/profile/profile-api'
import { verificationStatusLabel } from '~/modules/profile/types'

export const Route = createFileRoute('/painel/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const userId = user?.id

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(null)
      return getProfile(userId)
    },
    enabled: userId !== undefined,
  })

  const citiesQuery = useQuery({
    queryKey: ['cities'],
    queryFn: listCities,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
  })

  useEffect(() => {
    const profile = profileQuery.data
    if (profile) {
      reset({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        city_id: profile.city_id !== null ? String(profile.city_id) : '',
      })
    }
  }, [profileQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: (input: ProfileFormInput) => {
      if (!userId) throw new Error('Usuário não autenticado')
      return updateProfile(userId, {
        full_name: input.full_name,
        phone: input.phone === '' ? null : input.phone,
        city_id: parseCityId(input.city_id),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast('Perfil atualizado.', 'success')
    },
    onError: () => {
      toast('Não foi possível salvar o perfil.', 'error')
    },
  })

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <Card>
        <CardBody>
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Não foi possível carregar o perfil. Verifique se as migrations foram aplicadas
            (documentos/APLICANDO_MIGRATIONS.md).
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Meu perfil</h1>
        <p className="text-sm text-slate-500">
          Essas informações aparecem para os profissionais/clientes.
        </p>
      </div>

      <Card>
        <CardBody>
          <form
            onSubmit={(event) => {
              void handleSubmit((values) => {
                updateMutation.mutate(values)
              })(event)
            }}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Nome completo"
              placeholder="Maria da Silva"
              error={errors.full_name?.message}
              {...register('full_name')}
            />
            <Input
              label="Telefone"
              placeholder="11987654321"
              hint="Opcional — usado para contato sobre serviços."
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Select
              label="Cidade"
              placeholder="Escolha sua cidade"
              error={errors.city_id?.message}
              {...register('city_id')}
            >
              {citiesQuery.data?.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} — {city.state}
                </option>
              ))}
            </Select>
            <Button type="submit" loading={updateMutation.isPending}>
              Salvar perfil
            </Button>
          </form>
        </CardBody>
      </Card>

      {profileQuery.data?.user_type === 'professional' ? (
        <VerificationCard
          status={profileQuery.data.verification_status}
          onChanged={() => {
            void queryClient.invalidateQueries({ queryKey: ['profile'] })
          }}
        />
      ) : null}
    </div>
  )
}

const verificationVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  unverified: 'default',
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
  suspended: 'danger',
}

function VerificationCard({
  status,
  onChanged,
}: {
  status: string
  onChanged: () => void
}) {
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: requestVerification,
    onSuccess: () => {
      onChanged()
      toast('Solicitação enviada! A equipe vai analisar seu perfil.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível solicitar.', 'error')
    },
  })

  const canRequest = status === 'unverified' || status === 'rejected'

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Verificação</h2>
            <p className="mt-1 text-xs text-slate-500">
              Profissionais verificados ganham um selo de confiança no perfil público.
            </p>
          </div>
          <Badge variant={verificationVariant[status]}>
            {(verificationStatusLabel as Record<string, string | undefined>)[status] ?? status}
          </Badge>
        </div>
        {canRequest ? (
          <Button
            size="sm"
            loading={mutation.isPending}
            onClick={() => {
              mutation.mutate()
            }}
          >
            Solicitar verificação
          </Button>
        ) : status === 'pending' ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Sua solicitação está em análise. Você será notificado sobre o resultado.
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}
