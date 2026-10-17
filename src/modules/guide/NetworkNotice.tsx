import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
export function NetworkNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  return online ? null : (
    <div className="guide-network-notice" role="status">
      <WifiOff size={20} />
      <div>
        <strong>Você está sem conexão.</strong>
        <span>
          Os dados desta tela continuam disponíveis. Reconecte para buscar ou salvar; as alterações
          não são enviadas automaticamente.
        </span>
      </div>
    </div>
  )
}
