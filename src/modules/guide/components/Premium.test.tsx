import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { previewCatalog } from '../preview'
import { PremiumSpotlight } from './Premium'

describe('Premium Guide showcase', () => {
  it('uses the plan feature rather than its commercial name', () => {
    const data = {
      ...previewCatalog,
      plans: previewCatalog.plans.map((plan) => ({ ...plan, name: 'Nome configurável' })),
    }
    const html = renderToStaticMarkup(<PremiumSpotlight data={data} />)
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
    expect(renderToStaticMarkup(<PremiumSpotlight data={data} />)).toBe('')
  })
  it('does not invent a photograph when no featured company has one', () => {
    const data = {
      ...previewCatalog,
      companies: previewCatalog.companies.map((company) => ({ ...company, image: '' })),
    }
    expect(renderToStaticMarkup(<PremiumSpotlight data={data} />)).toBe('')
  })
})
