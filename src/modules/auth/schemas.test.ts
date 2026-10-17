import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema, updatePasswordSchema } from './schemas'

describe('signUpSchema', () => {
  it('aceita dados válidos', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Maria da Silva',
      phone: '(69) 99999-9999',
      email: 'maria@exemplo.com.br',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita nome muito curto', () => {
    const result = signUpSchema.safeParse({
      fullName: 'M',
      phone: '(69) 99999-9999',
      email: 'maria@exemplo.com',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Maria da Silva',
      phone: '(69) 99999-9999',
      email: 'nao-e-email',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(false)
  })

  it.each(['1234567', '12345678', '12345678901'])('rejeita senha curta: %s', (password) => {
    const result = signUpSchema.safeParse({
      fullName: 'Maria da Silva',
      phone: '(69) 99999-9999',
      email: 'maria@exemplo.com',
      password,
    })
    expect(result.success).toBe(false)
  })

  it('normaliza espaços do email e nome', () => {
    const result = signUpSchema.safeParse({
      fullName: '  Maria da Silva  ',
      phone: '(69) 99999-9999',
      email: '  MARIA@EXEMPLO.COM  ',
      password: 'senha-segura-1',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Maria da Silva')
      expect(result.data.email).toBe('MARIA@EXEMPLO.COM')
      expect(result.data.phone).toBe('69999999999')
    }
  })

  it('exige telefone com DDD no cadastro comercial', () => {
    expect(
      signUpSchema.safeParse({
        fullName: 'Maria da Silva',
        email: 'maria@exemplo.com',
        password: 'senha-segura-1',
        phone: '123',
      }).success,
    ).toBe(false)
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

describe('updatePasswordSchema', () => {
  it('aceita a nova senha com confirmação igual', () => {
    expect(
      updatePasswordSchema.safeParse({
        password: 'nova-senha-segura',
        confirmPassword: 'nova-senha-segura',
      }).success,
    ).toBe(true)
  })

  it('aponta a confirmação quando as senhas diferem', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'nova-senha-segura',
      confirmPassword: 'outra-senha-segura',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword'])
    }
  })

  it.each([7, 73])('rejeita uma nova senha com %i caracteres', (length) => {
    const password = 'a'.repeat(length)
    expect(updatePasswordSchema.safeParse({ password, confirmPassword: password }).success).toBe(
      false,
    )
  })
})
