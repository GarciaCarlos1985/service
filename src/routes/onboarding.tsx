import { createFileRoute } from '@tanstack/react-router'
import { GuideShell } from '~/modules/guide/GuideShell'
import { Header, Footer } from '~/modules/guide/components/shared'
import { useAuth } from '~/modules/auth/auth-context'
export const Route = createFileRoute('/onboarding')({ component: Onboarding })
function Onboarding() {
  const { user, isLoading } = useAuth()
  return (
    <GuideShell>
      <Header />
      <main id="main-content" className="wrap state-box">
        <h1>Bem-vindo ao Service Guide</h1>
        {isLoading ? (
          <p role="status">Conferindo sua conta…</p>
        ) : user ? (
          <>
            <p>Pesquise o que precisa em Cacoal, salve empresas e compartilhe sua experiência.</p>
            <a className="btn primary" href="/">
              Explorar o guia
            </a>
            <a className="btn outline" href="/conta">
              Conferir meus dados
            </a>
          </>
        ) : (
          <>
            <p>Se você acabou de se cadastrar, confirme seu e-mail antes de entrar.</p>
            <a className="btn primary" href="/entrar">
              Entrar na minha conta
            </a>
          </>
        )}
      </main>
      <Footer />
    </GuideShell>
  )
}
