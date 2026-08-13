import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardBody } from '~/modules/ui'
import { listCategories, listLaunchCities } from '~/modules/search/search-api'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const [categories, cities] = await Promise.all([listCategories(), listLaunchCities()])
      return { categories, cities }
    } catch {
      // Banco ainda não migrado ou indisponível — landing continua de pé
      // com seções vazias (estado honesto, ADR-018).
      return { categories: [], cities: [] }
    }
  },
  component: Home,
})

function Home() {
  const { categories, cities } = Route.useLoaderData()

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
              href="#categorias"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-blue-600 shadow hover:bg-blue-50"
            >
              Encontrar um profissional
            </a>
            <Link
              to="/cadastro"
              className="rounded-xl border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Quero oferecer meus serviços
            </Link>
          </div>
        </div>
      </section>

      <section id="categorias" className="mx-auto w-full max-w-3xl px-4 py-12">
        <h2 className="text-xl font-bold text-slate-900">Categorias populares</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              to="/buscar"
              search={{ categorySlug: category.slug }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 transition hover:border-brand-blue-400 hover:text-brand-blue-600"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section id="cidades" className="mx-auto w-full max-w-3xl px-4 pb-12">
        <h2 className="text-xl font-bold text-slate-900">Cidades atendidas</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {cities.map((city) => (
            <Link
              key={city.id}
              to="/buscar"
              search={{ citySlug: city.slug }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-blue-400 hover:text-brand-blue-600"
            >
              {city.name} — {city.state}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-16">
        <Card>
          <CardBody className="space-y-3 text-center">
            <h2 className="text-lg font-bold text-slate-900">Como funciona</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl">1️⃣</p>
                <p className="mt-1 text-sm font-medium text-slate-700">Escolha o profissional</p>
              </div>
              <div>
                <p className="text-2xl">2️⃣</p>
                <p className="mt-1 text-sm font-medium text-slate-700">Agende e pague</p>
              </div>
              <div>
                <p className="text-2xl">3️⃣</p>
                <p className="mt-1 text-sm font-medium text-slate-700">Avalie com segurança</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>
    </main>
  )
}
