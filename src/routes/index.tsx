import { createFileRoute } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import Directory from '~/modules/guide/screens/Directory'
import { GuideShell } from '~/modules/guide/GuideShell'
import { searchCatalog } from '~/modules/guide/api'
import { searchSchema } from '~/modules/guide/types'

export const Route = createFileRoute('/')({
  validateSearch: (input: Record<string, unknown> & SearchSchemaInput) =>
    searchSchema.parse({
      ...input,
      available: input.available === '1' || input.available === true,
      featured: input.featured === '1' || input.featured === true,
      maxPrice: input.maxPrice ?? null,
    }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }) => {
    try {
      return await searchCatalog(deps.search)
    } catch {
      return null
    }
  },
  head: () => ({
    meta: [
      { title: 'Service Guide · Encontre em Cacoal' },
      {
        name: 'description',
        content:
          'Encontre empresas, produtos e serviços em Cacoal. Pesquise o que precisa e fale com quem atende você.',
      },
    ],
  }),
  component: Home,
})
function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const query = Object.fromEntries(
    Object.entries(search).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? (value ? '1' : '') : value === null ? '' : String(value),
    ]),
  )
  return (
    <GuideShell presentation={data?.presentation}>
      <Directory initialData={data} initialQuery={query} />
    </GuideShell>
  )
}
