import type { ReactNode } from 'react'
import { Toaster } from '~/modules/ui/primitives/sonner'
import { Header, Footer } from './components/shared'

export function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="guide-root">
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
