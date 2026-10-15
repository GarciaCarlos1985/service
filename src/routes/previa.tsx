import { useState } from 'react'
import type { MouseEvent } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { GuideShell } from '~/modules/guide/GuideShell'
import Directory from '~/modules/guide/screens/Directory'
import { ratingFor, searchResultSchema } from '~/modules/guide/types'

export const Route = createFileRoute('/previa')({
  loader: async () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses structured navigation signals.
    if (!import.meta.env.DEV) throw notFound()
    const preview = await import('~/modules/guide/preview')
    return { data: preview.previewCatalog }
  },
  head: () => ({
    meta: [
      { title: 'Prévia local | Service Guide' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Preview,
})
function Preview() {
  const { data } = Route.useLoaderData()
  const [company, setCompany] = useState<string | undefined>()
  const [item, setItem] = useState<string | undefined>()
  const capture = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return
    const anchor = event.target.closest('a')
    const path = anchor?.getAttribute('href')
    if (path?.startsWith('/empresa/')) {
      event.preventDefault()
      setItem(undefined)
      setCompany(path.slice('/empresa/'.length))
      window.scrollTo({ top: 0 })
    }
    if (path?.startsWith('/item/')) {
      event.preventDefault()
      setCompany(undefined)
      setItem(path.slice('/item/'.length))
      window.scrollTo({ top: 0 })
    }
    if (path === '/') {
      event.preventDefault()
      setCompany(undefined)
      setItem(undefined)
      window.scrollTo({ top: 0 })
    }
  }
  return (
    <GuideShell>
      <div onClickCapture={capture}>
        <div className="guide-preview-note">
          Prévia local · exemplos fictícios do pacote original · nenhuma gravação no banco.{' '}
          <button
            className="text-button"
            onClick={() => {
              setCompany(undefined)
              setItem(undefined)
            }}
          >
            Voltar à busca
          </button>
        </div>
        <Directory
          key={`${company ?? ''}-${item ?? ''}`}
          companyId={company}
          itemId={item}
          initialData={data}
          previewSearch={(params) => {
            const term = (params.get('q') ?? '').toLocaleLowerCase('pt-BR')
            const companies = data.companies
              .filter(
                (record) =>
                  (!params.get('category') || params.get('category') === record.category_id) &&
                  (!params.get('neighborhood') ||
                    params.get('neighborhood') === record.neighborhood) &&
                  (params.get('featured') !== '1' ||
                    data.plans.some((plan) => plan.id === record.plan_id && plan.featured)) &&
                  ratingFor(data.reviews, record.id).average >= Number(params.get('rating') || 0) &&
                  (((!params.get('kind') || params.get('kind') === 'all') &&
                    params.get('available') !== '1' &&
                    !params.get('maxPrice')) ||
                    data.offerings.some((offer) => {
                      if (offer.company_id !== record.id) return false
                      const entry = data.items.find(
                        (row) => row.id === (offer.product_id ?? offer.service_id),
                      )
                      return (
                        (!params.get('kind') ||
                          params.get('kind') === 'all' ||
                          entry?.type === params.get('kind')) &&
                        (params.get('available') !== '1' || !!offer.available) &&
                        (!params.get('maxPrice') ||
                          (offer.price !== null && offer.price <= Number(params.get('maxPrice'))))
                      )
                    })) &&
                  (!item ||
                    data.offerings.some(
                      (offer) =>
                        offer.company_id === record.id &&
                        (offer.product_id ?? offer.service_id) === item,
                    )) &&
                  (!term ||
                    `${record.name} ${record.description} ${data.offerings
                      .filter((offer) => offer.company_id === record.id)
                      .map(
                        (offer) =>
                          data.items.find(
                            (entry) => entry.id === (offer.product_id ?? offer.service_id),
                          )?.name,
                      )
                      .join(' ')}`
                      .toLocaleLowerCase('pt-BR')
                      .includes(term)),
              )
              .sort((a, b) =>
                params.get('sort') === 'rating'
                  ? ratingFor(data.reviews, b.id).average - ratingFor(data.reviews, a.id).average ||
                    a.name.localeCompare(b.name, 'pt-BR')
                  : params.get('sort') === 'name'
                    ? a.name.localeCompare(b.name, 'pt-BR')
                    : (data.plans.find((plan) => plan.id === b.plan_id)?.featured ?? 0) -
                        (data.plans.find((plan) => plan.id === a.plan_id)?.featured ?? 0) ||
                      a.name.localeCompare(b.name, 'pt-BR'),
              )
            return searchResultSchema.parse({
              ...data,
              companies,
              pagination: { page: 1, pageSize: 12, pages: 1, total: companies.length },
            })
          }}
        />
      </div>
    </GuideShell>
  )
}
