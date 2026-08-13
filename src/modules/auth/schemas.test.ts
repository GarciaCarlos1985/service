import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema } from './schemas'

describe('signUpSchema', () => {
  it('aceita dados válidos', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Maria da Silva',
      email: 'maria@exemplo.com.br',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome muito curto', () => {
    const result = signUpSchema.safeParse({
      fullName: 'M',
      email: 'maria@exemplo.com',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Maria da Silva',
      email: 'nao-e-email',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita senha curta (spec: mínimo 8)', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Maria da Silva',
      email: 'maria@exemplo.com',
      password: '1234567',
    })
    expect(result.success).toBe(false)
  })

  it('normaliza espaços do email e nome', () => {
    const result = signUpSchema.safeParse({
      fullName: '  Maria da Silva  ',
      email: '  MARIA@EXEMPLO.COM  ',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Maria da Silva')
      expect(result.data.email).toBe('MARIA@EXEMPLO.COM')
    }
  })
})

describe('signInSchema', () => {
  it('aceita email + senha', () => {
    const result = signInSchema.safeParse({
      email: 'maria@exemplo.com',
      password: 'qualquer',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita senha vazia', () => {
    const result = signInSchema.safeParse({ email: 'maria@exemplo.com', password: '' })
    expect(result.success).toBe(false)
  })
})
