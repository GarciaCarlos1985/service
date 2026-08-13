import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="min-h-dvh">
      <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-4 text-white">
        <span className="text-sm font-semibold">SERVICE</span>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link to="/entrar" className="hover:underline">
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="rounded-xl bg-white px-4 py-2 font-semibold text-brand-blue-600 shadow hover:bg-blue-50"
          >
            Criar conta
          </Link>
        </div>
      </nav>
      <section className="brand-gradient text-white">
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <img
            src="/service.png"
            alt="SERVICE"
            width={160}
            height={160}
            className="rounded-full bg-white/90 p-2 shadow-lg"
          />
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Encontre profissionais de confiança perto de você
          </h1>
          <p className="max-w-xl text-lg text-white/90">
            Diaristas, eletricistas, pintores, encanadores e muito mais. Agende, pague e avalie com
            segurança.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="#profissionais"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-blue-600 shadow hover:bg-blue-50"
            >
              Encontrar um profissional
            </a>
            <a
              href="#profissional"
              className="rounded-xl border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Quero oferecer meus serviços
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
