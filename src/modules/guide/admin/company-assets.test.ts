import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ upload: vi.fn(), url: vi.fn(), save: vi.fn(), remove: vi.fn() }))
vi.mock('~/lib/supabase', () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({ upload: mocks.upload, getPublicUrl: mocks.url, remove: mocks.remove }),
    },
  }),
}))
vi.mock('../admin', () => ({ adminSave: mocks.save }))
import { uploadCompanyAsset, uploadCompanyImage, validateCompanyImage } from './image-upload'
const image = () =>
  new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0])],
    'marca.png',
    { type: 'image/png' },
  )

describe('imagens de empresas e logotipos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.upload.mockResolvedValue({ error: null })
    mocks.url.mockReturnValue({ data: { publicUrl: 'https://storage.example/marca.png' } })
    mocks.save.mockResolvedValue({ ok: true, id: 'media' })
  })
  it('envia o logotipo com caminho estável, sem colocá-lo na galeria', async () => {
    const file = image()
    expect(await uploadCompanyAsset(file, 'company', 'asset')).toEqual({
      url: 'https://storage.example/marca.png',
      name: 'company/asset.png',
    })
    expect(mocks.upload).toHaveBeenCalledWith('company/asset.png', file, {
      contentType: 'image/png',
      upsert: false,
      cacheControl: '31536000',
    })
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it.each([
    { statusCode: '409', message: 'Resource already exists' },
    { statusCode: '400', message: 'The resource already exists' },
  ])('recupera repetição do mesmo envio sem gerar outra imagem', async (error) => {
    mocks.upload.mockResolvedValue({ error })
    await expect(uploadCompanyAsset(image(), 'company', 'same-asset')).resolves.toHaveProperty(
      'name',
      'company/same-asset.png',
    )
  })
  it('preserva erro de permissão e não confirma uma imagem ausente', async () => {
    mocks.upload.mockResolvedValue({ error: { statusCode: '403', message: 'Unauthorized' } })
    await expect(uploadCompanyAsset(image(), 'company', 'asset')).rejects.toThrow(
      'Não foi possível enviar',
    )
    expect(mocks.url).not.toHaveBeenCalled()
  })
  it('mantém o registro e a descrição dos uploads de galeria', async () => {
    await uploadCompanyImage(image(), 'company', 'Empresa')
    expect(mocks.save).toHaveBeenCalledWith(
      'media',
      expect.objectContaining({
        company_id: 'company',
        url: 'https://storage.example/marca.png',
        alt: 'marca',
        is_active: true,
      }),
    )
  })
  it('rejeita conteúdo ativo e tamanho excessivo antes de enviar', async () => {
    await expect(
      validateCompanyImage(new File(['<svg onload="bad"/>'], 'marca.png')),
    ).rejects.toThrow('SVG')
    const file = image()
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 })
    await expect(validateCompanyImage(file)).rejects.toThrow('5 MB')
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})
