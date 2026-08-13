import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import { z } from 'zod'
import { Avatar, Badge, Button, Card, CardBody, EmptyState, Select } from '~/modules/ui'
import { listCategories, listLaunchCities, searchProfessionals } from '~/modules/search/search-api'

const searchSchema = z.object({
  categorySlug: z.string().optional(),
  citySlug: z.string().optional(),
})

export const Route = createFileRoute('/buscar')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }) => {
    try {
      const [categories, cities, professionals] = await Promise.all([
        listCategories(),
        listLaunchCities(),
        searchProfessionals({
          categorySlug: deps.search.categorySlug,
          citySlug: deps.search.citySlug,
        }),
      ])
      return { categories, cities, professionals }
    } catch {
      // Banco ainda não migrado — busca exibe estado vazio honesto (ADR-018).
      return { categories: [], cities: [], professionals: [] }
    }
  },
  head: () => ({
    meta: [
      { title: 'Buscar profissionais | SERVICE' },
      {
        name: 'description',
        content:
          'Busque diaristas, eletricistas, pintores, encanadores e outros profissionais locais por cidade e categoria.',
      },
    ],
  }),
  component: SearchPage,
})

type SelectProps = ComponentProps<typeof Select>

function SearchPage() {
  const { categories, cities, professionals } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const { categorySlug, citySlug } = Route.useSearch()
  const [filtering, setFiltering] = useState(false)

  const categoryValue = categorySlug ?? ''
  const cityValue = citySlug ?? ''

  async function applyFilters(nextCategory: string, nextCity: string) {
    setFiltering(true)
    await navigate({
      to: '/buscar',
      search: {
        categorySlug: nextCategory || undefined,
        citySlug: nextCity || undefined,
      },
    })
    setFiltering(false)
  }

  const selectProps: Omit<SelectProps, 'children'> = {
    size: undefined,
  }

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Buscar profissionais</h1>

        <Card className="mt-4">
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Categoria"
                value={categoryValue}
                placeholder="Todas as categorias"
                {...selectProps}
                onChange={(event) => {
                  void applyFilters(event.target.value, cityValue)
                }}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Cidade"
                value={cityValue}
                placeholder="Todas as cidades"
                {...selectProps}
                onChange={(event) => {
                  void applyFilters(categoryValue, event.target.value)
                }}
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.slug}>
                    {city.name} — {city.state}
                  </option>
                ))}
              </Select>
            </div>
            {(categoryValue || cityValue) && !filtering ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void applyFilters('', '')
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </CardBody>
        </Card>

        <div className="mt-6">
          <p className="text-sm text-slate-500">
            {professionals.length}{' '}
            {professionals.length === 1 ? 'profissional encontrado' : 'profissionais encontrados'}
          </p>

          {professionals.length === 0 ? (
            <Card className="mt-4">
              <CardBody>
                <EmptyState
                  icon="🔎"
                  title="Nada encontrado"
                  description="Ajuste os filtros ou volte em breve — a base cresce todo dia."
                />
              </CardBody>
            </Card>
          ) : (
            <div className="mt-4 space-y-3">
              {professionals.map((professional) => {
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
                          citySlug: professional.city?.slug ?? 'cidade',
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
                              : 'Localização a definir'}
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
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
