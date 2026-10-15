import { describe, expect, it } from 'vitest'
import { companyHead, serializeStructuredData } from './seo'
import { catalogSchema } from './types'

describe('company structured data', () => {
  it('escapes HTML delimiters without changing the JSON data', () => {
    const value = { name: '</script><script>alert(1)</script>', description: 'A & B\u2028C' }
    const serialized = serializeStructuredData(value)
    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('&')
    expect(JSON.parse(serialized)).toEqual(value)
  })
  it('does not invent a company or ratings when the catalog is empty', () => {
    const catalog = catalogSchema.parse({
      source: 'supabase',
      companies: [],
      categories: [],
      plans: [],
      items: [],
      offerings: [],
      reviews: [],
    })
    expect(companyHead(catalog)).not.toHaveProperty('scripts')
  })
})
