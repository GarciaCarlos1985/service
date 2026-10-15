import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { companyCatalog } from '~/modules/guide/api'
export const Route = createFileRoute('/empresa/$companyId')({
  loader: async ({ params }) => {
    const company = (await companyCatalog(params.companyId)).companies[0]
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses structured navigation signals.
    if (!company) throw notFound()
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses a structured redirect signal.
    throw redirect({
      to: '/empresas/$citySlug/$companySlug',
      params: { citySlug: company.city_slug, companySlug: company.slug },
      replace: true,
    })
  },
})
