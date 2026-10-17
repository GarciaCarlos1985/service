import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { previewCatalog } from '../preview'
import { PremiumSpotlight } from './Premium'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SitePresentationContext } from '../site-presentation-context'
import { defaultPresentation } from '../presentation'
import type { Presentation } from '../presentation'
import type { Catalog } from '../types'
const markup = (data: Catalog, presentation: Presentation = defaultPresentation) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <SitePresentationContext.Provider value={presentation}>
        <PremiumSpotlight data={data} />
      </SitePresentationContext.Provider>
    </QueryClientProvider>,
  )

describe('Premium Guide showcase', () => {
  it('uses the plan feature rather than its commercial name', () => {
    const data = {
      ...previewCatalog,
      plans: previewCatalog.plans.map((plan) => ({ ...plan, name: 'Nome configurável' })),
    }
    const html = markup(data)
    expect(html).toContain('PREMIUM GUIDE')
    expect(html).toContain('Destaque patrocinado')
    expect(html).toContain('Perfil de exemplo')
    expect(html).toContain('Ateliê do Corte')
    expect(html).not.toContain('Oficina do Bairro')
  })
  it('does not promote a company whose plan has no featured permission', () => {
    const data = {
      ...previewCatalog,
      plans: previewCatalog.plans.map((plan) => ({ ...plan, featured: 0 })),
    }
    expect(markup(data)).toBe('')
  })
  it('does not invent a photograph when no featured company has one', () => {
    const data = {
      ...previewCatalog,
      companies: previewCatalog.companies.map((company) => ({ ...company, image: '' })),
    }
    expect(markup(data)).toBe('')
  })
  it('edita a chamada e a imagem sem interpretar texto como HTML', () => {
    const company = previewCatalog.companies.find((company) =>
      previewCatalog.plans.some((plan) => plan.id === company.plan_id && plan.featured),
    )
    if (!company) throw new Error('Fixture precisa de empresa com destaque.')
    const html = markup(
      { ...previewCatalog, companies: [{ ...company, image: '' }] },
      {
        ...defaultPresentation,
        spotlightMode: 'manual',
        spotlights: [
          {
            id: 'slide-1',
            companyId: company.id,
            title: '<script>alert(1)</script>',
            description: 'Chamada personalizada',
            imageUrl: 'https://example.test/vitrine.jpg',
            imageAlt: 'Foto escolhida',
            enabled: true,
          },
        ],
      },
    )
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('Chamada personalizada')
    expect(html).toContain('https://example.test/vitrine.jpg')
    expect(html).toContain('Destaque patrocinado')
  })
  it('não exibe chamadas manuais desativadas ou sem empresa elegível', () => {
    const company = previewCatalog.companies[0]
    if (!company) throw new Error('Fixture precisa de uma empresa.')
    const slide = {
      id: 'slide-1',
      companyId: company.id,
      title: 'Não deve aparecer',
      description: '',
      imageUrl: '',
      imageAlt: '',
      enabled: false,
    }
    expect(
      markup(previewCatalog, {
        ...defaultPresentation,
        spotlightMode: 'manual',
        spotlights: [slide],
      }),
    ).toBe('')
    expect(
      markup(
        { ...previewCatalog, companies: [{ ...company, status: 'inactive' }] },
        {
          ...defaultPresentation,
          spotlightMode: 'manual',
          spotlights: [{ ...slide, enabled: true }],
        },
      ),
    ).toBe('')
  })
})
