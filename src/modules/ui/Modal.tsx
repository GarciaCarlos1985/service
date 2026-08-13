import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsClient } from '~/utils/use-is-client'
import { cn } from '~/utils/cn'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isClient = useIsClient()
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', onCancel)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
    }
  }, [onClose])

  if (!isClient) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'm-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm',
        'open:animate-in',
        className,
      )}
    >
      {title ? (
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p id={descriptionId} className="mt-1 text-sm text-slate-600">
          {description}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
      {footer ? (
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">{footer}</div>
      ) : null}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute top-4 right-4 grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        ✕
      </button>
    </dialog>,
    document.body,
  )
}

interface DialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  children?: ReactNode
}

export function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  children,
}: DialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
