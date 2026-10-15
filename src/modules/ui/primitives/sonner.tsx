import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return <Sonner theme="light" position="top-right" closeButton richColors {...props} />
}
