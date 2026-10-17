import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, ExternalLink } from 'lucide-react'
import { adminCompany, adminOrder } from '../admin'
import type { Company } from '../types'
import type { Presentation, Spotlight } from '../presentation'
import { CompanyPicker } from './CompanyPicker'
import { moveRecord } from './editor-model'

export function SpotlightEditor({
  value,
  onChange,
  busy,
}: {
  value: Presentation
  onChange: (next: Spotlight[]) => void
  busy: boolean
}) {
  const [company, setCompany] = useState<Company | null>(null)
  const drag = useRef<{ id: string; last: string } | null>(null)
  const move = (from: string, to: string) => {
    onChange(moveRecord(value.spotlights, from, to))
  }
  return (
    <div className="admin-spotlight-editor">
      <p className="secondary">
        Escolha as empresas, personalize cada chamada e organize a sequência. Os destaques continuam
        identificados como patrocinados.
      </p>
      <CompanyPicker
        company={company}
        onChange={setCompany}
        disabled={busy || value.spotlights.length >= 12}
      />
      <button
        className="btn outline"
        type="button"
        disabled={busy || !company || value.spotlights.length >= 12}
        onClick={() => {
          if (!company) return
          onChange([
            ...value.spotlights,
            {
              id: crypto.randomUUID(),
              companyId: company.id,
              title: '',
              description: '',
              imageUrl: '',
              imageAlt: '',
              enabled: false,
            },
          ])
          setCompany(null)
        }}
      >
        <Plus size={18} />
        Adicionar à vitrine
      </button>
      <small>
        Até 12 chamadas. Uma nova vitrine começa desativada para você revisar antes de exibir.
      </small>
      {!value.spotlights.length && (
        <p className="admin-empty-note">
          Nenhuma vitrine manual. Adicione uma empresa acima ou use o modo automático.
        </p>
      )}
      <ol className="admin-spotlight-list">
        {value.spotlights.map((slide, index) => (
          <li key={slide.id} data-spotlight-id={slide.id}>
            <div className="admin-spotlight-row-actions">
              <button
                className="admin-drag-handle"
                type="button"
                aria-label={'Arrastar vitrine ' + String(index + 1)}
                disabled={busy}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  drag.current = { id: slide.id, last: slide.id }
                }}
                onPointerMove={(event) => {
                  const current = drag.current
                  if (!current) return
                  const target = document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest<HTMLElement>('[data-spotlight-id]')?.dataset.spotlightId
                  if (target && target !== current.id && target !== current.last) {
                    current.last = target
                    move(current.id, target)
                  }
                }}
                onPointerUp={() => {
                  drag.current = null
                }}
                onPointerCancel={() => {
                  drag.current = null
                }}
              >
                <GripVertical size={20} />
              </button>
              <strong>Vitrine {index + 1}</strong>
              <button
                className="btn outline icon-btn"
                type="button"
                disabled={busy || index === 0}
                aria-label={'Mover vitrine ' + String(index + 1) + ' para cima'}
                onClick={() => {
                  const target = value.spotlights[index - 1]
                  if (target) move(slide.id, target.id)
                }}
              >
                <ArrowUp size={18} />
              </button>
              <button
                className="btn outline icon-btn"
                type="button"
                disabled={busy || index === value.spotlights.length - 1}
                aria-label={'Mover vitrine ' + String(index + 1) + ' para baixo'}
                onClick={() => {
                  const target = value.spotlights[index + 1]
                  if (target) move(slide.id, target.id)
                }}
              >
                <ArrowDown size={18} />
              </button>
              <button
                className="btn outline icon-btn"
                type="button"
                disabled={busy}
                aria-label={'Remover vitrine ' + String(index + 1)}
                onClick={() => {
                  onChange(value.spotlights.filter((row) => row.id !== slide.id))
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <SpotlightFields
              slide={slide}
              index={index}
              busy={busy}
              onChange={(next) => {
                onChange(value.spotlights.map((row) => (row.id === slide.id ? next : row)))
              }}
            />
          </li>
        ))}
      </ol>
      {!!value.spotlights.length && (
        <p className="secondary" role="status">
          Sequência preparada:{' '}
          {value.spotlights
            .map(
              (slide, index) => String(index + 1) + '. ' + (slide.title || 'Empresa selecionada'),
            )
            .join(' · ')}
          . Salve as configurações para aplicar.
        </p>
      )}
    </div>
  )
}
function SpotlightFields({
  slide,
  index,
  onChange,
  busy,
}: {
  slide: Spotlight
  index: number
  onChange: (next: Spotlight) => void
  busy: boolean
}) {
  const [open, setOpen] = useState(index === 0)
  const company = useQuery({
    queryKey: ['guide-admin', 'spotlight-company', slide.companyId],
    queryFn: () => adminCompany(slide.companyId),
    retry: false,
  })
  const media = useQuery({
    queryKey: ['guide-admin', 'spotlight-images', slide.companyId],
    queryFn: () => adminOrder('media', slide.companyId),
    enabled: open,
    retry: false,
  })
  const update = <K extends keyof Spotlight>(key: K, next: Spotlight[K]) => {
    onChange({ ...slide, [key]: next })
  }
  const prefix = 'spotlight-' + slide.id
  return (
    <details
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
      }}
    >
      <summary>
        {company.data?.name ?? (company.isError ? 'Empresa indisponível' : 'Carregando empresa…')}
        <span>{slide.enabled ? 'Ativa' : 'Desativada'}</span>
      </summary>
      <fieldset disabled={busy}>
        <label htmlFor={prefix + '-title'}>Título da vitrine</label>
        <input
          id={prefix + '-title'}
          value={slide.title}
          maxLength={80}
          placeholder={company.data?.name ?? 'Usar nome da empresa'}
          onChange={(event) => {
            update('title', event.target.value)
          }}
        />
        <small>Deixe vazio para usar o nome da empresa.</small>
        <label htmlFor={prefix + '-description'}>Texto da vitrine</label>
        <textarea
          id={prefix + '-description'}
          rows={3}
          value={slide.description}
          maxLength={160}
          placeholder="Deixe vazio para mostrar a categoria"
          onChange={(event) => {
            update('description', event.target.value)
          }}
        />
        <label htmlFor={prefix + '-gallery'}>Imagem da galeria da empresa</label>
        <select
          id={prefix + '-gallery'}
          value={media.data?.some((image) => image.url === slide.imageUrl) ? slide.imageUrl : ''}
          onChange={(event) => {
            const image = media.data?.find((row) => row.url === event.target.value)
            onChange({ ...slide, imageUrl: image?.url ?? '', imageAlt: image?.name ?? '' })
          }}
        >
          <option value="">Usar capa atual ou endereço personalizado abaixo</option>
          {media.data?.map((image) => (
            <option key={image.id} value={image.url}>
              {image.name}
              {image.active ? '' : ' (oculta no perfil)'}
            </option>
          ))}
        </select>
        {media.isError && (
          <p role="alert">
            Não foi possível ler a galeria.{' '}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                void media.refetch()
              }}
            >
              Tentar novamente
            </button>
          </p>
        )}
        <a
          href={'/admin?area=media&company=' + slide.companyId}
          target="_blank"
          rel="noopener noreferrer"
          className="text-button admin-gallery-link"
        >
          <ExternalLink size={16} />
          Enviar novas imagens na galeria
        </a>
        <label htmlFor={prefix + '-image'}>Endereço personalizado da imagem (https://)</label>
        <input
          id={prefix + '-image'}
          type="url"
          value={slide.imageUrl}
          maxLength={2048}
          placeholder="Deixe vazio para usar a capa da empresa"
          onChange={(event) => {
            update('imageUrl', event.target.value)
          }}
        />
        <label htmlFor={prefix + '-alt'}>Descrição da imagem</label>
        <input
          id={prefix + '-alt'}
          value={slide.imageAlt}
          maxLength={160}
          placeholder="Descreva a foto para quem usa leitor de tela"
          onChange={(event) => {
            update('imageAlt', event.target.value)
          }}
        />
        {(slide.imageUrl || company.data?.image) && (
          <img
            className="admin-spotlight-image"
            src={slide.imageUrl || company.data?.image}
            alt={slide.imageAlt || 'Prévia da vitrine'}
          />
        )}
        <label className="guide-checkbox">
          <input
            type="checkbox"
            checked={slide.enabled}
            onChange={(event) => {
              update('enabled', event.target.checked)
            }}
          />
          Exibir esta vitrine
        </label>
        <small>
          Para exibir, a empresa precisa estar publicada, com destaque no plano e imagem. Você pode
          editar rascunhos mantendo a vitrine desativada.
        </small>
      </fieldset>
    </details>
  )
}
