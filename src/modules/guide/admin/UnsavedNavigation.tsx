import { useBlocker } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/modules/ui/primitives/dialog'

export function UnsavedNavigation({ dirty }: { dirty: boolean }) {
  const blocker = useBlocker({
    shouldBlockFn: () => dirty,
    withResolver: true,
    enableBeforeUnload: dirty,
  })
  return (
    <Dialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.()
      }}
    >
      <DialogContent className="app-dialog">
        <DialogTitle>Sair sem salvar?</DialogTitle>
        <DialogDescription>
          Você tem alterações nesta tela. Continue editando para salvá-las ou volte sem aplicar.
        </DialogDescription>
        <div className="wizard-actions">
          <button className="btn outline" onClick={() => blocker.reset?.()}>
            Continuar editando
          </button>
          <button className="btn primary" onClick={() => blocker.proceed?.()}>
            Sair sem salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
