import { createFileRoute } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Select,
  Skeleton,
  useToast,
} from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import { serviceFormSchema, parseCategoryId } from '~/modules/services/schemas'
import type { ServiceFormInput } from '~/modules/services/schemas'
import {
  createService,
  deleteService,
  listMyServices,
  listServiceCategories,
  updateService,
} from '~/modules/services/services-api'
import type { Service } from '~/modules/services/types'

export const Route = createFileRoute('/painel/servicos')({
  component: ServicesPage,
})

function ServicesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const userId = user?.id
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)

  const servicesQuery = useQuery({
    queryKey: ['my-services', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([])
      return listMyServices(userId)
    },
    enabled: userId !== undefined,
  })

  const categoriesQuery = useQuery({
    queryKey: ['service-categories'],
    queryFn: listServiceCategories,
  })

  const createMutation = useMutation({
    mutationFn: (input: ServiceFormInput) => {
      if (!userId) throw new Error('Usuário não autenticado')
      return createService(userId, {
        category_id: parseCategoryId(input.category_id) ?? 0,
        title: input.title,
        description: input.description || undefined,
        price_from_cents:
          input.price_from_cents === ''
            ? undefined
            : Math.round(Number(input.price_from_cents) * 100),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-services'] })
      toast('Serviço criado com sucesso.', 'success')
      setModalOpen(false)
    },
    onError: () => {
      toast('Não foi possível criar o serviço.', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceFormInput }) =>
      updateService(id, {
        category_id: parseCategoryId(input.category_id) ?? 0,
        title: input.title,
        description: input.description || null,
        price_from_cents:
          input.price_from_cents === '' ? null : Math.round(Number(input.price_from_cents) * 100),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-services'] })
      toast('Serviço atualizado.', 'success')
      setModalOpen(false)
      setEditing(null)
    },
    onError: () => {
      toast('Não foi possível atualizar o serviço.', 'error')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateService(id, { is_active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-services'] })
    },
    onError: () => {
      toast('Não foi possível alterar o status.', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-services'] })
      toast('Serviço excluído.', 'success')
      setDeleting(null)
    },
    onError: () => {
      toast('Não foi possível excluir o serviço.', 'error')
    },
  })

  if (servicesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (servicesQuery.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar seus serviços"
        description="Verifique se as migrations do banco foram aplicadas (documentos/APLICANDO_MIGRATIONS.md)."
        onRetry={() => {
          void queryClient.invalidateQueries({ queryKey: ['my-services'] })
        }}
      />
    )
  }

  const services = servicesQuery.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meus serviços</h1>
          <p className="text-sm text-slate-500">
            {services.length} cadastrado{services.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          + Novo
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="🧰"
              title="Nenhum serviço ainda"
              description="Cadastre o primeiro serviço para começar a ser encontrado pelos clientes."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-slate-900">{service.title}</h2>
                    <Badge variant={service.is_active ? 'success' : 'default'}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {service.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {service.description}
                    </p>
                  ) : null}
                  {service.price_from_cents !== null ? (
                    <p className="mt-1 text-sm font-semibold text-brand-blue-600">
                      {service.price_from_cents.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}{' '}
                      <span className="text-xs font-normal text-slate-400">a partir de</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    size="sm"
                    variant={service.is_active ? 'outline' : 'primary'}
                    loading={toggleMutation.isPending}
                    onClick={() => {
                      toggleMutation.mutate({
                        id: service.id,
                        is_active: !service.is_active,
                      })
                    }}
                  >
                    {' '}
                    {service.is_active ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(service)
                      setModalOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setDeleting(service)
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ServiceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        editing={editing}
        categories={categoriesQuery.data ?? []}
        saving={createMutation.isPending || updateMutation.isPending}
        onSubmit={(input) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, input })
          } else {
            createMutation.mutate(input)
          }
        }}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null)
        }}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
        title="Excluir serviço"
        description={`Tem certeza que deseja excluir "${deleting?.title ?? ''}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function ServiceModal({
  open,
  onClose,
  editing,
  categories,
  saving,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  editing: Service | null
  categories: Array<{ id: number; name: string }>
  saving: boolean
  onSubmit: (input: ServiceFormInput) => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormInput>({
    resolver: zodResolver(serviceFormSchema),
  })

  useEffect(() => {
    if (open) {
      reset({
        category_id: editing ? String(editing.category_id) : '',
        title: editing?.title ?? '',
        description: editing?.description ?? '',
        price_from_cents:
          editing?.price_from_cents !== null && editing?.price_from_cents !== undefined
            ? String(editing.price_from_cents / 100).replace('.', ',')
            : '',
      })
    }
  }, [open, editing, reset])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar serviço' : 'Novo serviço'}
      description={
        editing ? 'Atualize as informações do seu serviço.' : 'Cadastre o serviço que você oferece.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form" loading={saving}>
            {editing ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form
        id="service-form"
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event)
        }}
        className="space-y-4"
        noValidate
      >
        <Select
          label="Categoria"
          placeholder="Escolha a categoria"
          error={errors.category_id?.message}
          {...register('category_id')}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Input
          label="Título"
          placeholder="Ex.: Limpeza residencial completa"
          error={errors.title?.message}
          {...register('title')}
        />
        <Input
          label="Descrição"
          placeholder="Descreva o que está incluso..."
          error={errors.description?.message}
          {...register('description')}
        />
        <Input
          label="Preço a partir de (R$)"
          placeholder="Ex.: 120,00"
          hint="Opcional — quanto você cobra para começar."
          error={errors.price_from_cents?.message}
          {...register('price_from_cents')}
        />
      </form>
    </Modal>
  )
}
