import type { ReactNode } from 'react'
import { Toaster } from '~/modules/ui/primitives/sonner'
import { Header, Footer } from './components/shared'
import { NetworkNotice } from './NetworkNotice'
import { SitePresentation } from './site-presentation'
import type { Presentation } from './presentation'

export function GuideShell({
  children,
  presentation,
}: {
  children: ReactNode
  presentation?: Presentation
}) {
  return (
    <SitePresentation initial={presentation}>
      {import.meta.env.MODE === 'e2e' && (
        <div className="guide-lab-notice" role="status">
          Laboratório local · dados fictícios e descartáveis · nenhuma alteração no site online
        </div>
      )}
      <NetworkNotice />
      {children}
      <Toaster />
    </SitePresentation>
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
