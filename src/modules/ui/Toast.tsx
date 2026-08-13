import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsClient } from '~/utils/use-is-client'
import { cn } from '~/utils/cn'
import { ToastContext } from './toast-context'
import type { ToastVariant } from './toast-context'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const isClient = useIsClient()
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, variant }])
      window.setTimeout(() => {
        dismiss(id)
      }, 5000)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {isClient
        ? createPortal(
            <div
              aria-live="polite"
              className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
            >
              {toasts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    dismiss(item.id)
                  }}
                  role="status"
                  className={cn(
                    'pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-lg',
                    item.variant === 'success' && 'bg-green-600',
                    item.variant === 'error' && 'bg-red-600',
                    item.variant === 'info' && 'bg-slate-800',
                  )}
                >
                  {item.message}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}
