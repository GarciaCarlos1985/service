'use client'
import { useEffect, useState } from 'react'
import {
  MapPin,
  Heart,
  Clock,
  Share2,
  MessageCircle,
  Phone,
  Globe,
  Mail,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/modules/ui/primitives/tabs'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '~/modules/ui/primitives/dialog'
import { Empty, EmptyTitle, EmptyDescription } from '~/modules/ui/primitives/empty'
import { toast } from 'sonner'
import type { Catalog, Company, Viewer } from '~/modules/guide/types'
import { money } from '~/modules/guide/types'
import { api, track } from '~/modules/guide/api'
import { Picker } from '../components/shared'
import { PremiumBadge } from '../components/Premium'
export default function CompanyDetail({
  id,
  data,
  viewer,
  onFavorite,
}: {
  id: string
  data: Catalog
  viewer: Viewer | null
  onFavorite: (c: Company) => void
}) {
  const c = data.companies.find((c) => c.id === id)
  const [modal, setModal] = useState(''),
    [message, setMessage] = useState(''),
    [stars, setStars] = useState(5),
    [busy, setBusy] = useState(false),
    [reported, setReported] = useState('')
  const hasCompany = !!c
  useEffect(() => {
    if (hasCompany) track('company_view', { company_id: id })
  }, [id, hasCompany])
  if (!c)
    return (
      <div className="wrap state-box">
        <h1>Perfil não encontrado.</h1>
        <a className="btn primary" href="/">
          Voltar ao guia
        </a>
      </div>
    )
  const signIn = () => {
    window.location.href = '/entrar?redirect=' + encodeURIComponent('/empresa/' + id)
  }
  const open = (m: string) => {
    if (!viewer) {
      signIn()
      return
    }
    setMessage('')
    setModal(m)
  }
  const send = async () => {
    if (busy) return
    setBusy(true)
    try {
      await api(
        modal === 'contact' ? '/api/contact' : '/api/reviews',
        modal === 'contact'
          ? { company_id: id, message }
          : modal === 'report'
            ? { report: true, review_id: reported, reason: message }
            : { company_id: id, rating: stars, comment: message },
      )
      toast.success(
        modal === 'review'
          ? 'Avaliação enviada para moderação.'
          : modal === 'report'
            ? 'Denúncia enviada para análise.'
            : 'Solicitação registrada para a equipe do Service Guide acompanhar.',
      )
      if (modal !== 'report')
        track(modal === 'review' ? 'review_created' : 'contact_start', { company_id: id })
      setModal('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const category = data.categories.find((a) => a.id === c.category_id)
  const plan = data.plans.find((p) => p.id === c.plan_id)
  const offers = data.offerings.filter((o) => o.company_id === id)
  const reviews = data.reviews.filter((r) => r.company_id === id)
  return (
    <div className={'wrap detail-page' + (plan?.featured ? ' company-master' : '')}>
      <a href="/" className="breadcrumb">
        Explorar / {category?.name}
      </a>
      <div className="company-heading">
        <div>
          <h1>{c.name}</h1>
          <div className="detail-tags">
            <span>{category?.name}</span>
            {plan?.featured ? <PremiumBadge /> : null}
          </div>
          <p className="location">
            <MapPin size={17} />
            {c.neighborhood} · {c.city}, RO
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="btn outline"
            onClick={() => {
              onFavorite(c)
            }}
          >
            <Heart size={18} />
            {viewer?.favorites.includes(id) ? 'Salvo' : 'Salvar'}
          </button>
          <button
            className="btn outline"
            onClick={() => {
              void (async () => {
                try {
                  await navigator.clipboard.writeText(location.href)
                  track('share', { company_id: id })
                  toast.success('Link copiado.')
                } catch {
                  toast.error('Copie o endereço da página para compartilhar.')
                }
              })()
            }}
          >
            <Share2 size={18} />
            Compartilhar
          </button>
        </div>
      </div>
      {!!c.demo && (
        <div className="demo-notice">
          <ShieldCheck size={18} />
          Perfil demonstrativo. Fotos, serviços e valores são ilustrativos; esta empresa não está
          cadastrada no guia.
        </div>
      )}
      <div className="detail-grid">
        <div>
          {c.image && (
            <img
              className="detail-photo"
              src={c.image}
              alt={c.demo ? 'Foto ilustrativa do segmento' : 'Foto de ' + c.name}
              width="800"
              height="450"
            />
          )}
          <div className="gallery">
            {data.media
              .filter((m) => m.company_id === id && m.url !== c.image)
              .map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer">
                  <img src={m.url} alt={m.alt || 'Foto de ' + c.name} loading="lazy" />
                </a>
              ))}
          </div>
          <Tabs defaultValue="about">
            <TabsList variant="line" className="detail-tabs">
              <TabsTrigger value="about">Sobre</TabsTrigger>
              <TabsTrigger value="items">Produtos e serviços</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            </TabsList>
            <TabsContent value="about">
              <h2>Conheça {c.name}</h2>
              <p className="detail-description">{c.description}</p>
              <div className="info-row">
                <MapPin />
                <div>
                  <strong>Onde encontrar</strong>
                  <p>{c.address}</p>
                  {!c.demo && (
                    <a
                      href={
                        'https://www.google.com/maps/search/?api=1&query=' +
                        encodeURIComponent(c.address + ' ' + c.city)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir no mapa
                    </a>
                  )}
                </div>
              </div>
              <div className="info-row">
                <Clock />
                <div>
                  <strong>Horários informados</strong>
                  <p>{c.hours || 'Consulte a empresa.'}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="items">
              <h2>Produtos e serviços</h2>
              {offers.map((o) => {
                const i = data.items.find((i) => i.id === (o.product_id || o.service_id))
                return (
                  i && (
                    <a className="offering-row" key={o.id} href={'/item/' + i.id}>
                      <div>
                        <span className="secondary">
                          {i.type === 'product' ? 'Produto' : 'Serviço'}
                        </span>
                        <h3>{i.name}</h3>
                        <p>{i.description}</p>
                      </div>
                      <div>
                        <strong>{money(o.price)}</strong>
                        <p>{o.available ? 'Disponível' : 'Indisponível'}</p>
                      </div>
                    </a>
                  )
                )
              })}
              {!offers.length && (
                <Empty>
                  <EmptyTitle>Nenhum item informado</EmptyTitle>
                  <EmptyDescription>
                    Converse com a empresa para saber o que ela oferece.
                  </EmptyDescription>
                </Empty>
              )}
            </TabsContent>
            <TabsContent value="reviews">
              <div className="section-top">
                <h2>Avaliações</h2>
                <button
                  className="btn outline"
                  disabled={!!c.demo}
                  onClick={() => {
                    open('review')
                  }}
                >
                  Avaliar empresa
                </button>
              </div>
              <p className="secondary">
                Opiniões de usuários, com moderação. A contratação não é verificada.
              </p>
              {reviews.map((r) => (
                <article className="review-row" key={r.id}>
                  <div>
                    <strong>{r.author || 'Cliente'}</strong>
                    <span className="stars" aria-label={String(r.rating) + ' estrelas'}>
                      {Array.from({ length: r.rating }, (_, i) => (
                        <Star key={i} size={15} fill="currentColor" />
                      ))}
                    </span>
                    <time>{new Date(r.created_at).toLocaleDateString('pt-BR')}</time>
                  </div>
                  <p>{r.comment}</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setReported(r.id)
                      open('report')
                    }}
                  >
                    Denunciar
                  </button>
                </article>
              ))}
              {!reviews.length && (
                <Empty>
                  <EmptyTitle>A primeira opinião pode ser a sua.</EmptyTitle>
                  <EmptyDescription>
                    {c.demo
                      ? 'Perfis demonstrativos não recebem avaliações.'
                      : 'Avalie somente se você teve experiência com a empresa.'}
                  </EmptyDescription>
                </Empty>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <aside className="contact-panel">
          <h2>Converse com a empresa</h2>
          <p>Combine atendimento, disponibilidade e valores diretamente.</p>
          {c.whatsapp && !c.demo ? (
            <a
              className="btn whatsapp"
              href={
                'https://wa.me/' +
                c.whatsapp +
                '?text=' +
                encodeURIComponent(
                  'Olá! Encontrei ' +
                    c.name +
                    ' no Service Guide de Cacoal. Gostaria de informações.',
                )
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track('whatsapp_click', { company_id: id })
              }}
            >
              <MessageCircle size={20} />
              Chamar no WhatsApp
            </a>
          ) : (
            <button className="btn whatsapp" disabled>
              <MessageCircle size={20} />
              WhatsApp indisponível no guia
            </button>
          )}
          {c.phone && !c.demo && (
            <a
              className="btn outline"
              href={'tel:' + c.phone.replace(/[^+\d]/g, '')}
              onClick={() => {
                track('phone_click', { company_id: id })
              }}
            >
              <Phone size={18} />
              Ligar
            </a>
          )}
          {c.website && !c.demo && (
            <a
              className="btn outline"
              href={c.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track('website_click', { company_id: id })
              }}
            >
              <Globe size={18} />
              Visitar site
            </a>
          )}
          <button
            className="btn outline"
            disabled={!!c.demo}
            onClick={() => {
              open('contact')
            }}
          >
            <Mail size={18} />
            Solicitar contato pelo guia
          </button>
          <small>Cliques indicam interesse e não confirmam uma contratação.</small>
        </aside>
      </div>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) setModal('')
        }}
      >
        <DialogContent className="app-dialog">
          <DialogTitle>
            {modal === 'review'
              ? 'Como foi sua experiência?'
              : modal === 'report'
                ? 'Denunciar avaliação'
                : 'Solicitar contato'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'review'
              ? 'Avalie somente se conhece o atendimento. Sua opinião será analisada antes da publicação.'
              : modal === 'report'
                ? 'Explique o problema para a equipe analisar.'
                : 'Sua mensagem ficará disponível para a equipe do guia encaminhar e acompanhar.'}
          </DialogDescription>
          {modal === 'review' && (
            <Picker
              label="Nota"
              value={String(stars)}
              onChange={(v) => {
                setStars(Number(v))
              }}
              options={[5, 4, 3, 2, 1].map((n) => ({
                id: String(n),
                name: String(n) + ' estrelas',
              }))}
            />
          )}
          <label>
            {modal === 'review'
              ? 'Seu comentário'
              : modal === 'report'
                ? 'Motivo da denúncia'
                : 'O que você precisa?'}
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
              }}
              minLength={10}
              maxLength={1200}
              rows={4}
            />
          </label>
          <button
            className="btn primary"
            disabled={busy || message.trim().length < 10}
            onClick={() => {
              void send()
            }}
          >
            {busy ? 'Enviando…' : 'Enviar'}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
