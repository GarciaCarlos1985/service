import { useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Crown, MapPin } from 'lucide-react'
import type { Catalog } from '../types'

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
  const companies = data.companies.filter(
    (company) =>
      company.image && data.plans.some((plan) => plan.id === company.plan_id && !!plan.featured),
  )
  const selectedIndex = Math.max(
    0,
    companies.findIndex((company) => company.id === activeId),
  )
  const company = companies[selectedIndex]
  if (!company) return null
  const category = data.categories.find((entry) => entry.id === company.category_id)
  const navigate = (direction: number) => {
    const index = (selectedIndex + direction + companies.length) % companies.length
    setActiveId(companies[index]?.id ?? null)
  }
  return (
    <article className="premium-spotlight" aria-label="Vitrine Premium Guide">
      <img
        key={company.id}
        src={company.image}
        width="800"
        height="450"
        alt={
          company.demo
            ? 'Imagem ilustrativa de ' + (category?.name ?? 'comércio local')
            : 'Foto de ' + company.name
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
            {company.name}
            <ArrowUpRight size={30} aria-hidden="true" />
          </a>
        </h2>
        <p className="spotlight-category">{category?.name}</p>
        <p className="spotlight-location">
          <MapPin size={15} aria-hidden="true" />
          {company.neighborhood} · {company.city}
        </p>
      </div>
      <div className="spotlight-controls">
        <span>
          {String(selectedIndex + 1).padStart(2, '0')}
          <span> / {String(companies.length).padStart(2, '0')}</span>
        </span>
        <div>
          <button
            type="button"
            aria-label="Empresa anterior na vitrine"
            disabled={companies.length < 2}
            onClick={() => {
              navigate(-1)
            }}
          >
            <ArrowLeft size={19} />
          </button>
          <button
            type="button"
            aria-label="Próxima empresa na vitrine"
            disabled={companies.length < 2}
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
