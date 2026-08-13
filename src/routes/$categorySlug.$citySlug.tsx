/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions --
   O `loaderData` do `head()` é tipado como any pelo framework; os dados reais
   vêm do loader tipado (categoria/cidade/profissionais). */
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Avatar, Badge, Card, CardBody, EmptyState, ErrorState } from '~/modules/ui'
import { listCategories, searchProfessionals } from '~/modules/search/search-api'
import { getCityBySlug } from '~/modules/search/search-api'
import type { ProfessionalListItem } from '~/modules/search/search-api'

export const Route = createFileRoute('/$categorySlug/$citySlug')({
  loader: async ({ params }) => {
    let category: { id: number; slug: string; name: string } | null = null
    let city: { id: number; name: string; state: string; slug: string } | null = null
    let professionals: ProfessionalListItem[] = []

    try {
      const [categories, cityResult, professionalsResult] = await Promise.all([
        listCategories(),
        getCityBySlug(params.citySlug),
        searchProfessionals({
          categorySlug: params.categorySlug,
          citySlug: params.citySlug,
        }),
      ])
      category = categories.find((c) => c.slug === params.categorySlug) ?? null
      city = cityResult
      professionals = professionalsResult
    } catch {
      return { dbError: true, category: null, city: null, professionals: [] }
    }

    if (!category || !city) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- notFound() é o mecanismo do TanStack Router
      throw notFound()
    }

    return { dbError: false, category, city, professionals }
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category
    const city = loaderData?.city
    if (!category || !city) return {}
    const title = `${category.name} em ${city.name} — ${city.state} | SERVICE`
    const description = `Encontre ${category.name.toLowerCase()} de confiança em ${city.name}. Compare preços, avalie e agende pela plataforma.`
    const url = `https://service-kappa-rose.vercel.app/${category.slug}/${city.slug}`

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
      ],
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: `${category.name} em ${city.name}`,
            provider: { '@type': 'Organization', name: 'SERVICE' },
            areaServed: { '@type': 'City', name: city.name },
          }),
        },
      ],
    }
  },
  component: CategoryCityPage,
})

function CategoryCityPage() {
  const { category, city, professionals, dbError } = Route.useLoaderData()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- o loader retorna null na variante dbError; o TS não discrimina sem o guard
  if (dbError || !category || !city) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <ErrorState
            title="Não foi possível carregar esta página"
            description="O banco de dados ainda não está disponível. Verifique se as migrations foram aplicadas (documentos/APLICANDO_MIGRATIONS.md)."
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <nav aria-label="breadcrumb" className="mb-4 text-sm text-slate-500">
          <Link to="/" className="hover:underline">
            Início
          </Link>{' '}
          / <span className="font-medium text-slate-700">{category.name}</span> /{' '}
          <span className="font-medium text-slate-700">{city.name}</span>
        </nav>

        <h1 className="text-2xl font-bold text-slate-900">
          {category.name} em {city.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {professionals.length}{' '}
          {professionals.length === 1 ? 'profissional encontrado' : 'profissionais encontrados'}
        </p>

        <div className="mt-6 space-y-4">
          {professionals.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon="🔎"
                  title="Nenhum profissional encontrado"
                  description={`Ainda não há ${category.name.toLowerCase()} cadastrados em ${city.name}. Volte em breve ou cadastre-se para oferecer seus serviços.`}
                  action={
                    <Link
                      to="/cadastro"
                      className="inline-flex h-11 items-center justify-center rounded-xl brand-gradient px-5 text-sm font-semibold text-white"
                    >
                      Quero oferecer meus serviços
                    </Link>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            professionals.map((professional) => {
              const cheapest = professional.services
                .map((s) => s.price_from_cents)
                .filter((p): p is number => p !== null)
                .sort((a, b) => a - b)[0]

              return (
                <Card key={professional.id}>
                  <CardBody>
                    <Link
                      to="/profissionais/$citySlug/$profileSlug"
                      params={{
                        citySlug: professional.city?.slug ?? city.slug,
                        profileSlug: professional.slug ?? 'perfil',
                      }}
                      className="flex items-start gap-4"
                    >
                      <Avatar
                        name={professional.full_name ?? '?'}
                        size="lg"
                        src={professional.avatar_url ?? undefined}
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-slate-900">{professional.full_name}</h2>
                        <p className="text-sm text-slate-500">
                          {professional.city
                            ? `${professional.city.name} — ${professional.city.state}`
                            : city.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="success">Verificado</Badge>
                          {professional.services.slice(0, 3).map((service) => (
                            <Badge key={service.id} variant="info">
                              {service.category?.name ?? service.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {cheapest !== undefined ? (
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-brand-blue-600">
                            {cheapest.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </p>
                          <p className="text-xs text-slate-400">a partir de</p>
                        </div>
                      ) : null}
                    </Link>
                  </CardBody>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
