import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, GripVertical, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/modules/ui/primitives/dialog'
import { adminOrder, saveOrder } from '../admin'
import type { OrderRow, OrderScope } from '../admin'
import { moveRecord } from './editor-model'
import { useUnsavedChanges } from './use-unsaved'
import { UnsavedNavigation } from './UnsavedNavigation'

export function OrderBoard({
  scope,
  companyId,
  onClose,
  onSaved,
}: {
  scope: OrderScope
  companyId?: string
  onClose: () => void
  onSaved: () => Promise<unknown>
}) {
  const query = useQuery({
    queryKey: ['guide-admin', 'order', scope, companyId],
    queryFn: () => adminOrder(scope, companyId),
    retry: false,
  })
  return query.data ? (
    <OrderEditor
      key={query.dataUpdatedAt}
      initial={query.data}
      scope={scope}
      companyId={companyId}
      onClose={onClose}
      onSaved={onSaved}
      onReload={() => query.refetch()}
    />
  ) : (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="app-dialog">
        <DialogTitle>Organizar a apresentação</DialogTitle>
        <DialogDescription>
          {query.isError ? 'Não foi possível carregar a lista.' : 'Carregando a ordem atual…'}
        </DialogDescription>
        {query.isError && (
          <button
            className="btn primary"
            onClick={() => {
              void query.refetch()
            }}
          >
            Tentar novamente
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}
function OrderEditor({
  initial,
  scope,
  companyId,
  onClose,
  onSaved,
  onReload,
}: {
  initial: OrderRow[]
  scope: OrderScope
  companyId?: string
  onClose: () => void
  onSaved: () => Promise<unknown>
  onReload: () => Promise<unknown>
}) {
  const [rows, setRows] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const drag = useRef<{ id: string; last: string } | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)
  const dirty = rows.some((row, index) => row.id !== initial[index]?.id)
  useUnsavedChanges(dirty)
  const close = () => {
    if (!saving) {
      if (dirty) setDiscard(true)
      else onClose()
    }
  }
  const move = (from: string, to: string) => {
    setRows((previous) => moveRecord(previous, from, to))
    setAnnouncement('Ordem alterada. Salve para aplicar no site.')
  }
  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await saveOrder(
        scope,
        rows,
        initial.map((row) => row.id),
        companyId,
      )
      await onSaved()
      onClose()
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível salvar a ordem. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      <UnsavedNavigation dirty={dirty} />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent className="app-dialog admin-order-dialog sm:max-w-[760px]">
          <DialogTitle>
            Organizar{' '}
            {scope === 'categories'
              ? 'categorias'
              : scope === 'media'
                ? 'imagens'
                : 'produtos e serviços'}
          </DialogTitle>
          <DialogDescription>
            Arraste pela alça ou use os botões de mover, também disponíveis pelo teclado.{' '}
            {scope === 'media' && 'A primeira imagem visível será a capa. '}A ordem só muda no site
            depois de salvar.
          </DialogDescription>
          <p role="status" className="sr-only">
            {announcement}
          </p>
          {rows.length === 0 ? (
            <p className="status-note">
              Cadastre registros nesta área para organizar a apresentação.
            </p>
          ) : (
            <ol className="admin-sort-list">
              {rows.map((row, index) => (
                <li
                  key={row.id}
                  data-sort-id={row.id}
                  className={dragged === row.id ? 'is-dragging' : ''}
                >
                  <button
                    type="button"
                    className="admin-drag-handle"
                    aria-label={'Arrastar ' + row.name}
                    disabled={saving}
                    onPointerDown={(event) => {
                      if (event.button !== 0) return
                      event.currentTarget.setPointerCapture(event.pointerId)
                      drag.current = { id: row.id, last: row.id }
                      setDragged(row.id)
                    }}
                    onPointerMove={(event) => {
                      const current = drag.current
                      if (!current) return
                      const target = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>('[data-sort-id]')
                      const targetId = target?.dataset.sortId
                      if (targetId && targetId !== current.id && targetId !== current.last) {
                        current.last = targetId
                        move(current.id, targetId)
                      }
                    }}
                    onPointerUp={() => {
                      drag.current = null
                      setDragged(null)
                    }}
                    onPointerCancel={() => {
                      drag.current = null
                      setDragged(null)
                    }}
                  >
                    <GripVertical size={20} />
                  </button>
                  <span className="admin-sort-position">{index + 1}</span>
                  {row.url && <img src={row.url} alt="" loading="lazy" />}
                  <div className="admin-sort-name">
                    <strong>{row.name}</strong>
                    <small>
                      {row.active ? 'Visível no catálogo' : 'Oculto ou indisponível'}
                      {row.type === 'service'
                        ? ' · Serviço'
                        : row.type === 'product'
                          ? ' · Produto'
                          : ''}
                    </small>
                  </div>
                  <div className="admin-sort-controls">
                    <button
                      type="button"
                      className="btn outline icon-btn"
                      aria-label={'Mover ' + row.name + ' para cima'}
                      disabled={saving || index === 0}
                      onClick={() => {
                        const target = rows[index - 1]
                        if (target) move(row.id, target.id)
                      }}
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      type="button"
                      className="btn outline icon-btn"
                      aria-label={'Mover ' + row.name + ' para baixo'}
                      disabled={saving || index === rows.length - 1}
                      onClick={() => {
                        const target = rows[index + 1]
                        if (target) move(row.id, target.id)
                      }}
                    >
                      <ArrowDown size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {error && (
            <div role="alert" className="status-note">
              <p>{error}</p>
              <button
                className="text-button"
                disabled={saving}
                onClick={() => {
                  setRows(initial)
                  setError('')
                  void onReload()
                }}
              >
                Descartar esta ordem e recarregar a lista
              </button>
            </div>
          )}
          <div className="admin-savebar">
            <span>{dirty ? 'Ordem ainda não salva' : 'Ordem atual do site'}</span>
            <button className="btn outline" disabled={saving} onClick={close}>
              Voltar
            </button>
            <button
              className="btn primary"
              disabled={saving || !dirty}
              onClick={() => {
                void save()
              }}
            >
              <Save size={18} />
              {saving ? 'Salvando…' : 'Salvar ordem'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent className="app-dialog">
          <DialogTitle>Descartar a ordem não salva?</DialogTitle>
          <DialogDescription>A ordem atual do site será preservada.</DialogDescription>
          <div className="wizard-actions">
            <button
              className="btn outline"
              onClick={() => {
                setDiscard(false)
              }}
            >
              Continuar organizando
            </button>
            <button className="btn primary" onClick={onClose}>
              Descartar e voltar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
