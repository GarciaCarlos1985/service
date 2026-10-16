import type { ReactNode } from 'react'
import { Toaster } from '~/modules/ui/primitives/sonner'
import { Header, Footer } from './components/shared'
import { NetworkNotice } from './NetworkNotice'

export function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="guide-root">
      {import.meta.env.MODE === 'e2e' && (
        <div className="guide-lab-notice" role="status">
          Laboratório local · dados fictícios e descartáveis · nenhuma alteração no site online
        </div>
      )}
      <NetworkNotice />
      {children}
      <Toaster />
    </div>
  )
}

export function GuideAuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuideShell>
      <Header />
      <main id="main-content" className="guide-auth">
        {children}
      </main>
      <Footer />
    </GuideShell>
  )
}
