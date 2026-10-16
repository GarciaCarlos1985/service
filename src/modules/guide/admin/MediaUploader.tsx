import { useId, useRef, useState } from 'react'
import { ImagePlus, UploadCloud } from 'lucide-react'
import type { Company } from '../types'
import { PendingImageRecord, uploadCompanyImage } from './image-upload'
import { adminSave } from '../admin'
import type { AdminRow } from '../admin'
import { useUnsavedChanges } from './use-unsaved'
import { UnsavedNavigation } from './UnsavedNavigation'

export function MediaUploader({
  company,
  onUploaded,
}: {
  company: Company
  onUploaded: () => Promise<unknown>
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [pendingRecord, setPendingRecord] = useState<AdminRow | null>(null)
  useUnsavedChanges(!!progress || !!pendingRecord)
  const upload = async (files: File[]) => {
    if (progress || pendingRecord) return
    setError('')
    setResult('')
    if (files.length > 10) {
      setError('Selecione até 10 imagens por envio.')
      return
    }
    let saved = 0
    try {
      for (const file of files) {
        setProgress({ current: saved + 1, total: files.length })
        await uploadCompanyImage(file, company.id, company.name)
        saved++
      }
    } catch (failure) {
      if (failure instanceof PendingImageRecord) setPendingRecord(failure.record)
      setError(failure instanceof Error ? failure.message : 'Não foi possível cadastrar a imagem.')
    } finally {
      setProgress(null)
      if (saved) {
        setResult(
          `${String(saved)} ${saved === 1 ? 'imagem cadastrada' : 'imagens cadastradas'}. Você pode editar a descrição e organizar a galeria abaixo.`,
        )
        await onUploaded()
      }
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div className="admin-media-upload">
      <UnsavedNavigation dirty={!!progress || !!pendingRecord} />
      <div
        className={'admin-drop-zone' + (dragging ? ' dragging' : '')}
        onDragOver={(event) => {
          event.preventDefault()
          if (!progress) setDragging(true)
        }}
        onDragLeave={() => {
          setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void upload(Array.from(event.dataTransfer.files))
        }}
      >
        <UploadCloud size={30} />
        <div>
          <strong>
            {progress
              ? `Enviando imagem ${String(progress.current)} de ${String(progress.total)}…`
              : 'Arraste suas imagens para cá'}
          </strong>
          <p>JPG, PNG, WebP ou AVIF · até 5 MB por imagem · até 10 por envio</p>
          <small>As imagens cadastradas ficam disponíveis no perfil público da empresa.</small>
        </div>
        <button
          type="button"
          className="btn outline"
          disabled={!!progress || !!pendingRecord}
          onClick={() => {
            input.current?.click()
          }}
        >
          <ImagePlus size={18} />
          Selecionar imagens
        </button>
        <input
          ref={input}
          id={id}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={!!progress || !!pendingRecord}
          tabIndex={-1}
          aria-label="Arquivos de imagem para o perfil público"
          onChange={(event) => {
            void upload(Array.from(event.target.files ?? []))
          }}
        />
      </div>
      {pendingRecord && (
        <button
          className="btn primary"
          disabled={!!progress}
          onClick={() => {
            setProgress({ current: 1, total: 1 })
            void adminSave('media', pendingRecord)
              .then(async () => {
                setPendingRecord(null)
                setError('')
                setResult('Cadastro da imagem confirmado.')
                await onUploaded()
              })
              .catch((failure: unknown) => {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Confira a conexão e tente novamente.',
                )
              })
              .finally(() => {
                setProgress(null)
              })
          }}
        >
          Concluir cadastro da imagem enviada
        </button>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {result && (
        <p role="status" className="admin-success-note">
          {result}
        </p>
      )}
    </div>
  )
}
