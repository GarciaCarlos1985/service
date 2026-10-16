import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideError } from '../api'
import { PendingImageRecord, uploadCompanyImage } from './image-upload'

const mocks = vi.hoisted(() => ({
  save: vi.fn<(action: string, payload: Record<string, unknown>) => Promise<unknown>>(),
  upload: vi.fn<(name: string, file: File, options: unknown) => Promise<{ error: null }>>(),
  remove: vi.fn<(names: string[]) => Promise<unknown>>(),
}))
vi.mock('../admin', () => ({ adminSave: mocks.save }))
vi.mock('~/lib/supabase', () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: (name: string) => ({
          data: { publicUrl: 'https://images.example.test/' + name },
        }),
      }),
    },
  }),
}))
const image = () =>
  new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])],
    'capa.png',
    { type: 'image/png' },
  )
beforeEach(() => {
  mocks.save.mockReset()
  mocks.upload.mockReset().mockResolvedValue({ error: null })
  mocks.remove.mockReset().mockResolvedValue({})
})
describe('upload e cadastro em duas etapas', () => {
  it('usa o mesmo identificador para o objeto e o cadastro', async () => {
    mocks.save.mockResolvedValue({ ok: true })
    await uploadCompanyImage(image(), 'empresa-teste', 'Empresa')
    const payload = mocks.save.mock.calls[0]?.[1]
    const id = payload?.id
    expect(typeof id).toBe('string')
    if (typeof id === 'string')
      expect(mocks.upload.mock.calls[0]?.[0]).toBe('empresa-teste/' + id + '.png')
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('preserva a imagem e o identificador quando a confirmação de rede é incerta', async () => {
    mocks.save.mockRejectedValue(new TypeError('Failed to fetch'))
    let pending: unknown
    try {
      await uploadCompanyImage(image(), 'empresa-teste', 'Empresa')
    } catch (error) {
      pending = error
    }
    expect(pending).toBeInstanceOf(PendingImageRecord)
    if (pending instanceof PendingImageRecord)
      expect(pending.record).toEqual(mocks.save.mock.calls[0]?.[1])
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('limpa somente o novo objeto quando o servidor recusa o cadastro por validação', async () => {
    mocks.save.mockRejectedValue(new GuideError('Limite atingido.', 'VALIDATION'))
    await expect(uploadCompanyImage(image(), 'empresa-teste', 'Empresa')).rejects.toThrow(
      'Limite atingido.',
    )
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]?.[0]])
  })
})
