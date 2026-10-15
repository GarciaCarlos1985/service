import { createFileRoute, notFound } from '@tanstack/react-router'
import Directory from '~/modules/guide/screens/Directory'
import { GuideShell } from '~/modules/guide/GuideShell'
import { companyBySlug, companyCatalog } from '~/modules/guide/api'
import { companyHead } from '~/modules/guide/seo'
export const Route = createFileRoute('/empresas/$citySlug/$companySlug')({
  loader: async ({ params }) => {
    const company = await companyBySlug(params.citySlug, params.companySlug)
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses structured navigation signals.
    if (!company) throw notFound()
    return { id: company.id, catalog: await companyCatalog(company.id) }
  },
  head: ({ loaderData }) => companyHead(loaderData?.catalog),
  component: Company,
})
function Company() {
  const { id, catalog } = Route.useLoaderData()
  return (
    <GuideShell>
      <Directory companyId={id} initialData={catalog} />
    </GuideShell>
  )
}
