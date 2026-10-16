import { describe, expect, it } from 'vitest'
import { imageExtension } from './image-upload'
describe('validação de upload', () => {
  it('reconhece imagens pelo cabeçalho, sem confiar no nome do arquivo', () => {
    expect(imageExtension(new Uint8Array([255, 216, 255, 0]))).toBe('jpg')
    expect(imageExtension(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('png')
    expect(imageExtension(new TextEncoder().encode('RIFF0000WEBP0000'))).toBe('webp')
    expect(imageExtension(new TextEncoder().encode('0000ftypavif0000'))).toBe('avif')
  })
  it.each(['<svg onload=bad>', '<html>fake.png', 'arquivo.zip', ''])(
    'recusa conteúdo não suportado: %s',
    (value) => {
      expect(imageExtension(new TextEncoder().encode(value))).toBe(null)
    },
  )
})
