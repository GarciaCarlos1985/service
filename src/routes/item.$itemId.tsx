import { createFileRoute, notFound } from '@tanstack/react-router'
import { searchCatalog } from '~/modules/guide/api'
import Directory from '~/modules/guide/screens/Directory'
import { GuideShell } from '~/modules/guide/GuideShell'
export const Route = createFileRoute('/item/$itemId')({
  loader: async ({ params }) => {
    const data = await searchCatalog({ itemId: params.itemId })
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses structured navigation signals.
    if (!data.items.some((item) => item.id === params.itemId)) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.items[0]?.name ?? 'Produtos e serviços'} | Service Guide` }],
  }),
  component: Item,
})
function Item() {
  return (
    <GuideShell>
      <Directory itemId={Route.useParams().itemId} initialData={Route.useLoaderData()} />
    </GuideShell>
  )
}
