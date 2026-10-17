import { getSupabase } from '~/lib/supabase'
import { adminSave } from '../admin'
import { GuideError } from '../api'
import type { AdminRow } from '../admin'

export class PendingImageRecord extends Error {
  constructor(readonly record: AdminRow) {
    super(
      'A imagem foi enviada, mas não conseguimos confirmar o cadastro. Reconecte e conclua o cadastro abaixo.',
    )
  }
}

export function imageExtension(header: Uint8Array): 'jpg' | 'png' | 'webp' | 'avif' | null {
  if (header[0] === 255 && header[1] === 216 && header[2] === 255) return 'jpg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)) return 'png'
  const text = new TextDecoder().decode(header)
  if (text.slice(0, 4) === 'RIFF' && text.slice(8, 12) === 'WEBP') return 'webp'
  if (text.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(text.slice(8, 12))) return 'avif'
  return null
}
export async function validateCompanyImage(file: File) {
  if (file.size < 12 || file.size > 5 * 1024 * 1024)
    throw new Error('Cada imagem precisa ter até 5 MB.')
  const extension = imageExtension(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
  if (!extension)
    throw new Error('Use uma imagem JPG, PNG, WebP ou AVIF. SVG e outros arquivos não são aceitos.')
  return extension
}
export async function uploadCompanyAsset(file: File, companyId: string, mediaId: string) {
  const extension = await validateCompanyImage(file)
  const mime = extension === 'jpg' ? 'image/jpeg' : 'image/' + extension
  const storage = getSupabase().storage.from('guide-media')
  const name = `${companyId}/${mediaId}.${extension}`
  const uploaded = await storage.upload(name, file, {
    contentType: mime,
    upsert: false,
    cacheControl: '31536000',
  })
  const alreadyUploaded =
    uploaded.error &&
    (uploaded.error.statusCode === '409' ||
      (uploaded.error.statusCode === '400' &&
        uploaded.error.message.toLowerCase().includes('already exists')))
  // O UUID pertence ao arquivo selecionado; repetir um envio incerto não substitui outra imagem.
  if (uploaded.error && !alreadyUploaded)
    throw new Error('Não foi possível enviar a imagem. Confira a conexão e tente novamente.')
  const url = storage.getPublicUrl(name).data.publicUrl
  return { url, name }
}
export async function uploadCompanyImage(file: File, companyId: string, companyName: string) {
  const mediaId = crypto.randomUUID()
  const { url, name } = await uploadCompanyAsset(file, companyId, mediaId)
  const storage = getSupabase().storage.from('guide-media')
  const alt = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]/g, ' ')
    .trim()
    .slice(0, 200)
  const record = {
    id: mediaId,
    company_id: companyId,
    url,
    alt: alt.length >= 2 ? alt : `Imagem de ${companyName}`.slice(0, 200),
    is_active: true,
  }
  try {
    await adminSave('media', record)
  } catch (error) {
    if (error instanceof GuideError && ['VALIDATION', 'DUPLICATE'].includes(error.code)) {
      await storage.remove([name]).catch(() => undefined)
      throw error
    }
    throw new PendingImageRecord(record)
  }
}
