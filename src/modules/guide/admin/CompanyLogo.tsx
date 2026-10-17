import { useEffect, useRef, useState } from 'react'
import { ImagePlus, UploadCloud, X } from 'lucide-react'
import { validateCompanyImage } from './image-upload'

export type LogoSelection = { file: File; id: string; preview: string }
export function CompanyLogo({
  value,
  selection,
  name,
  disabled,
  onChange,
}: {
  value: string
  selection: LogoSelection | null
  name: string
  disabled: boolean
  onChange: (url: string, selection: LogoSelection | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const attempt = useRef(0)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    const preview = selection?.preview
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [selection?.preview])
  const select = async (file?: File) => {
    if (!file || disabled) return
    const current = ++attempt.current
    try {
      await validateCompanyImage(file)
      if (current !== attempt.current) return
      setError('')
      onChange(value, { file, id: crypto.randomUUID(), preview: URL.createObjectURL(file) })
    } catch (failure) {
      if (current === attempt.current)
        setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a imagem.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }
  const preview = selection?.preview || value
  return (
    <div
      className={'company-logo-editor' + (dragging ? ' dragging' : '')}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => {
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void select(event.dataTransfer.files[0])
      }}
    >
      <div className="company-logo-preview">
        {preview ? (
          <img
            src={preview}
            alt={'Logotipo de ' + (name || 'sua empresa')}
            width="96"
            height="96"
          />
        ) : (
          <UploadCloud size={30} aria-hidden="true" />
        )}
      </div>
      <div className="company-logo-content">
        <strong>
          Logotipo da empresa <span className="secondary">(opcional)</span>
        </strong>
        <p>Arraste ou selecione a marca para o perfil e os resultados.</p>
        <small>JPG, PNG, WebP ou AVIF · até 5 MB. Enviado ao salvar.</small>
      </div>
      <div className="company-logo-actions">
        <button
          type="button"
          className="btn outline"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={18} />
          {preview ? 'Trocar logotipo' : 'Adicionar logotipo'}
        </button>
        {preview && (
          <button
            type="button"
            className="text-button"
            aria-label="Remover logotipo"
            disabled={disabled}
            onClick={() => {
              attempt.current++
              setError('')
              onChange('', null)
            }}
          >
            <X size={16} />
            Remover
          </button>
        )}
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label="Arquivo do logotipo da empresa"
        disabled={disabled}
        tabIndex={-1}
        onChange={(event) => {
          void select(event.target.files?.[0])
        }}
      />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
