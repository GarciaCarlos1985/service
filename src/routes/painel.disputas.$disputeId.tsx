import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  useToast,
} from '~/modules/ui'
import { useAuth } from '~/modules/auth/auth-context'
import {
  addDisputeEvidence,
  addDisputeMessage,
  disputeStatusLabel,
  getDispute,
  listDisputeEvidence,
  listDisputeMessages,
} from '~/modules/disputes/disputes-api'
import type { EvidenceKind } from '~/modules/disputes/disputes-api'

export const Route = createFileRoute('/painel/disputas/$disputeId')({
  component: DisputeDetailPage,
})

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  open: 'warning',
  under_review: 'info',
  resolved: 'success',
  rejected: 'danger',
}

function DisputeDetailPage() {
  const { disputeId } = Route.useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [messageBody, setMessageBody] = useState('')
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('link')
  const [evidenceUrl, setEvidenceUrl] = useState('')

  const disputeQuery = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => getDispute(disputeId),
    enabled: user !== null,
  })

  const messagesQuery = useQuery({
    queryKey: ['dispute-messages', disputeId],
    queryFn: () => listDisputeMessages(disputeId),
    enabled: user !== null,
  })

  const evidenceQuery = useQuery({
    queryKey: ['dispute-evidence', disputeId],
    queryFn: () => listDisputeEvidence(disputeId),
    enabled: user !== null,
  })

  const messageMutation = useMutation({
    mutationFn: () => addDisputeMessage(disputeId, messageBody),
    onSuccess: () => {
      setMessageBody('')
      void queryClient.invalidateQueries({ queryKey: ['dispute-messages', disputeId] })
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.', 'error')
    },
  })

  const evidenceMutation = useMutation({
    mutationFn: () => addDisputeEvidence(disputeId, evidenceKind, evidenceUrl),
    onSuccess: () => {
      setEvidenceUrl('')
      void queryClient.invalidateQueries({ queryKey: ['dispute-evidence', disputeId] })
      toast('Evidência anexada.', 'success')
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Não foi possível anexar a evidência.', 'error')
    },
  })

  if (disputeQuery.isLoading) {
    return <Skeleton className="h-40 w-full" />
  }

  const dispute = disputeQuery.data
  if (!dispute) {
    return (
      <ErrorState
        title="Disputa não encontrada"
        description="A disputa não existe ou você não participa dela."
      />
    )
  }

  const closed = dispute.status === 'resolved' || dispute.status === 'rejected'
  const messages = messagesQuery.data ?? []
  const evidence = evidenceQuery.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Disputa</h1>
          <p className="text-sm text-slate-500">{dispute.service_title}</p>
        </div>
        <Badge variant={statusVariant[dispute.status]}>{disputeStatusLabel[dispute.status]}</Badge>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">Motivo</p>
            <p className="text-sm text-slate-900">{dispute.reason}</p>
          </div>
          {dispute.description ? (
            <div>
              <p className="text-xs font-semibold text-slate-500">Descrição</p>
              <p className="text-sm text-slate-600">{dispute.description}</p>
            </div>
          ) : null}
          <p className="text-xs text-slate-400">
            Aberta em {new Date(dispute.created_at).toLocaleString('pt-BR')} · com{' '}
            {dispute.other_party_name ?? 'a outra parte'}
          </p>
          {dispute.resolution_note ? (
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-700">Decisão da equipe</p>
              <p className="mt-1 text-sm text-slate-600">{dispute.resolution_note}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">Evidências</h2>
        <div className="mt-3 space-y-2">
          {evidence.length === 0 ? (
            <p className="rounded-xl bg-slate-100 px-4 py-4 text-center text-xs text-slate-500">
              Nenhuma evidência anexada ainda.
            </p>
          ) : (
            evidence.map((item) => (
              <Card key={item.id} className="bg-slate-50">
                <CardBody className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 uppercase">{item.kind}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-sm text-brand-blue-600 hover:underline"
                  >
                    {item.url}
                  </a>
                </CardBody>
              </Card>
            ))
          )}
          {!closed ? (
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3">
              <div className="w-32">
                <Select
                  label="Tipo"
                  value={evidenceKind}
                  onChange={(event) => {
                    setEvidenceKind(event.target.value as EvidenceKind)
                  }}
                >
                  <option value="link">Link</option>
                  <option value="image">Imagem (URL)</option>
                  <option value="document">Documento (URL)</option>
                </Select>
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  label="URL da evidência"
                  placeholder="https://…"
                  value={evidenceUrl}
                  onChange={(event) => {
                    setEvidenceUrl(event.target.value)
                  }}
                />
              </div>
              <Button
                size="sm"
                loading={evidenceMutation.isPending}
                disabled={evidenceUrl.trim().length < 5}
                onClick={() => {
                  evidenceMutation.mutate()
                }}
              >
                Anexar
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900">Mensagens</h2>
        <div className="mt-3 space-y-2">
          {messages.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon="💬"
                  title="Sem mensagens"
                  description="Use o campo abaixo para conversar sobre a disputa."
                />
              </CardBody>
            </Card>
          ) : (
            messages.map((message) => {
              const mine = message.author_id === user?.id
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      mine ? 'bg-brand-blue-500 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    <p>{message.body}</p>
                    <p className={`mt-0.5 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(message.created_at).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {closed ? (
          <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-center text-xs text-slate-500">
            Esta disputa foi encerrada e não aceita novas mensagens.
          </p>
        ) : (
          <div className="mt-3 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                placeholder="Escreva uma mensagem…"
                value={messageBody}
                onChange={(event) => {
                  setMessageBody(event.target.value)
                }}
              />
            </div>
            <Button
              size="sm"
              loading={messageMutation.isPending}
              disabled={messageBody.trim().length < 2}
              onClick={() => {
                messageMutation.mutate()
              }}
            >
              Enviar
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        <Link to="/painel/agenda" className="hover:underline">
          ← Voltar para a agenda
        </Link>
      </p>
    </div>
  )
}
