import { useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Crown, MapPin } from 'lucide-react'
import type { Catalog } from '../types'
import { catalogSchema } from '../types'
import { useQuery } from '@tanstack/react-query'
import { guideRpc } from '../api'
import { useSitePresentation } from '../site-presentation-context'

export function PremiumBadge() {
  return (
    <span className="master-badge">
      <Crown size={17} aria-hidden="true" />
      <span>
        PREMIUM GUIDE<small>Destaque patrocinado</small>
      </span>
    </span>
  )
}

export function PremiumSpotlight({ data }: { data: Catalog }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const presentation = useSitePresentation()
  const showcase = useQuery({
    queryKey: ['guide-showcase'],
    queryFn: async () => catalogSchema.parse(await guideRpc('guide_showcase')),
    enabled: data.source === 'supabase',
    retry: false,
    staleTime: 60_000,
  })
  const source = showcase.data ?? data
  const companies = source.companies.filter(
    (company) =>
      company.status === 'active' &&
      source.plans.some((plan) => plan.id === company.plan_id && !!plan.featured),
  )
  const slides =
    presentation.spotlightMode === 'manual'
      ? presentation.spotlights
          .filter((slide) => slide.enabled)
          .flatMap((slide) => {
            const company = companies.find((row) => row.id === slide.companyId)
            return company && (slide.imageUrl || company.image) ? [{ ...slide, company }] : []
          })
      : companies
          .filter((company) => company.image)
          .map((company) => ({
            id: company.id,
            title: '',
            description: '',
            imageUrl: '',
            imageAlt: '',
            company,
          }))
  const selectedIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.id === activeId),
  )
  const slide = slides[selectedIndex]
  const company = slide?.company
  if (!company) return null
  const category = source.categories.find((entry) => entry.id === company.category_id)
  const navigate = (direction: number) => {
    const index = (selectedIndex + direction + slides.length) % slides.length
    setActiveId(slides[index]?.id ?? null)
  }
  return (
    <article className="premium-spotlight" aria-label="Vitrine Premium Guide">
      <img
        key={slide.id}
        src={slide.imageUrl || company.image}
        width="800"
        height="450"
        alt={
          slide.imageAlt ||
          (company.demo
            ? 'Imagem ilustrativa de ' + (category?.name ?? 'comércio local')
            : 'Foto de ' + company.name)
        }
        fetchPriority="high"
      />
      <div className="spotlight-heading">
        <PremiumBadge />
        {company.demo ? <span className="spotlight-demo">Perfil de exemplo</span> : null}
      </div>
      <div className="spotlight-caption" aria-live="polite" aria-atomic="true">
        <h2>
          <a href={'/empresa/' + company.id}>
            {slide.title || company.name}
            <ArrowUpRight size={30} aria-hidden="true" />
          </a>
        </h2>
        <p className="spotlight-category">{slide.description || category?.name}</p>
        <p className="spotlight-location">
          <MapPin size={15} aria-hidden="true" />
          {company.neighborhood} · {company.city}
        </p>
      </div>
      <div className="spotlight-controls">
        <span>
          {String(selectedIndex + 1).padStart(2, '0')}
          <span> / {String(slides.length).padStart(2, '0')}</span>
        </span>
        <div>
          <button
            type="button"
            aria-label="Empresa anterior na vitrine"
            disabled={slides.length < 2}
            onClick={() => {
              navigate(-1)
            }}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            type="button"
            aria-label="Próxima empresa na vitrine"
            disabled={slides.length < 2}
            onClick={() => {
              navigate(1)
            }}
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </article>
  )
}
