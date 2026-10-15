import type { Catalog } from './types'

// Prevent user-controlled text from ending an HTML script element during SSR.
export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
}

export function companyHead(catalog?: Catalog) {
  const company = catalog?.companies[0]
  if (!company || company.demo || catalog.source !== 'supabase')
    return { meta: [{ title: 'Empresa | Service Guide' }] }
  const path = `/empresas/${encodeURIComponent(company.city_slug)}/${encodeURIComponent(company.slug)}`
  const title = `${company.name} | Service Guide`
  const rating = catalog.rating_summary[company.id]
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': path,
    name: company.name,
    description: company.description,
    url: path,
    ...(company.image ? { image: company.image } : {}),
    ...(company.phone ? { telephone: company.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: company.city,
      addressRegion: 'RO',
      addressCountry: 'BR',
      ...(company.street ? { streetAddress: `${company.street}, ${company.address_number}` } : {}),
      ...(company.postal_code ? { postalCode: company.postal_code } : {}),
    },
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.average,
            reviewCount: rating.count,
          },
        }
      : {}),
  }
  return {
    meta: [
      { title },
      { name: 'description', content: company.description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: company.description },
    ],
    links: [{ rel: 'canonical', href: path }],
    scripts: [{ type: 'application/ld+json', children: serializeStructuredData(structuredData) }],
  }
}
