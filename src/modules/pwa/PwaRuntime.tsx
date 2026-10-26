import { useEffect } from 'react'
import { startInstallSupport } from './install-store'

export function PwaRuntime() {
  useEffect(() => {
    startInstallSupport()
  }, [])
  return null
}
