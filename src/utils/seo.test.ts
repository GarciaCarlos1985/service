import { describe, expect, it } from 'vitest'
import { seo } from './seo'

describe('seo', () => {
  it('gera tags obrigatórias com título e descrição', () => {
    const tags = seo({
      title: 'SERVICE',
      description: 'Marketplace de serviços locais',
    })

    expect(tags).toContainEqual({ title: 'SERVICE' })
    expect(tags).toContainEqual({ name: 'description', content: 'Marketplace de serviços locais' })
    expect(tags).toContainEqual({ name: 'og:title', content: 'SERVICE' })
  })

  it('remove tags com valores vazios', () => {
    const tags = seo({ title: 'SERVICE' })

    expect(tags.some((tag) => Object.values(tag)[0] === undefined)).toBe(false)
    expect(tags.some((tag) => Object.values(tag)[0] === '')).toBe(false)
  })

  it('inclui imagem apenas quando fornecida', () => {
    const semImagem = seo({ title: 'X' })
    const comImagem = seo({ title: 'X', image: '/logo.png' })

    expect(semImagem.some((tag) => Object.keys(tag)[0] === 'name' && tag.name === 'og:image')).toBe(
      false,
    )
    expect(comImagem).toContainEqual({ name: 'og:image', content: '/logo.png' })
    expect(comImagem).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })
})
