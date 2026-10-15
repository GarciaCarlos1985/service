import type { Company } from './types'
const companies = [
  [
    'atelier-cortes',
    'Ateliê do Corte',
    'beleza',
    'Centro',
    'Cortes, barba e cuidados para renovar o visual. Atendimento combinado diretamente com a equipe.',
    'barber',
  ],
  [
    'casa-cor',
    'Casa & Cor',
    'casa',
    'Jardim Clodoaldo',
    'Tintas e materiais para transformar sua casa. Converse sobre os acabamentos para o seu projeto.',
    'paint',
  ],
  [
    'conecta-tech',
    'Conecta Tech',
    'tecnologia',
    'Centro',
    'Manutenção de computadores e celulares. Diagnóstico e orçamento antes do serviço.',
    'tech',
  ],
  [
    'oficina-bairro',
    'Oficina do Bairro',
    'automotivo',
    'Princesa Isabel',
    'Manutenção preventiva e revisão automotiva para cuidar do seu carro.',
    '',
  ],
  [
    'sabor-casa',
    'Sabor de Casa',
    'alimentacao',
    'Centro',
    'Refeições e marmitas para a rotina. Consulte o cardápio do dia.',
    '',
  ],
  [
    'resolve-casa',
    'Resolve em Casa',
    'servicos',
    'Teixeirão',
    'Pequenos reparos elétricos e hidráulicos, combinados com o profissional.',
    '',
  ],
].map(
  (a, i) =>
    ({
      id: a[0],
      name: a[1],
      category_id: a[2],
      neighborhood: a[3],
      description: a[4],
      image: a[5] ? '/catalog/' + a[5] + '.webp' : '',
      city: 'Cacoal',
      address: 'Endereço ilustrativo · ' + String(a[3]),
      phone: '',
      whatsapp: '',
      website: '',
      hours: 'Seg a sáb · 8h às 18h',
      plan_id: i < 3 ? 'pro' : 'free',
      status: 'active',
      demo: 1,
    }) as Company,
)
const items = [
  ['corte', 'Corte masculino', 'beleza', 'service', 'Corte personalizado e acabamento.'],
  ['barba', 'Corte e barba', 'beleza', 'service', 'Corte e cuidado com a barba.'],
  ['tinta', 'Tinta emborrachada', 'casa', 'product', 'Pintura e proteção de paredes externas.'],
  ['massa', 'Massa corrida', 'casa', 'product', 'Preparação e acabamento de paredes.'],
  ['celular', 'Celular Samsung', 'tecnologia', 'product', 'Consulte os modelos disponíveis.'],
  [
    'reparo',
    'Manutenção de notebook',
    'tecnologia',
    'service',
    'Diagnóstico, limpeza e manutenção de computadores.',
  ],
  [
    'revisao',
    'Revisão automotiva',
    'automotivo',
    'service',
    'Avaliação preventiva dos componentes.',
  ],
  ['marmita', 'Marmita caseira', 'alimentacao', 'product', 'Refeição preparada para o almoço.'],
  [
    'eletricista',
    'Eletricista residencial',
    'servicos',
    'service',
    'Instalações e pequenos reparos elétricos.',
  ],
  ['encanador', 'Encanador', 'servicos', 'service', 'Reparos hidráulicos residenciais.'],
].map((a) => ({
  id: a[0],
  name: a[1],
  category_id: a[2],
  type: a[3] as 'product' | 'service',
  description: a[4],
}))
const sourceDemo = {
  source: 'demonstration',
  categories: [
    { id: 'beleza', name: 'Beleza e cuidados', icon: 'Scissors' },
    { id: 'casa', name: 'Casa e construção', icon: 'House' },
    { id: 'tecnologia', name: 'Tecnologia', icon: 'Laptop' },
    { id: 'automotivo', name: 'Automotivo', icon: 'Car' },
    { id: 'alimentacao', name: 'Alimentação', icon: 'Utensils' },
    { id: 'servicos', name: 'Serviços gerais', icon: 'Wrench' },
  ],
  plans: [
    { id: 'free', name: 'FREE', max_items: 5, max_media: 3, featured: 0 },
    { id: 'pro', name: 'PRO', max_items: 30, max_media: 12, featured: 1 },
  ],
  companies,
  items,
  offerings: items.map((i, n) => ({
    id: 'demo-offer-' + String(n),
    company_id:
      companies[n < 2 ? 0 : n < 4 ? 1 : n < 6 ? 2 : n === 6 ? 3 : n === 7 ? 4 : 5]?.id ?? '',
    product_id: i.type === 'product' ? i.id : null,
    service_id: i.type === 'service' ? i.id : null,
    price: n === 0 ? 45 : n === 1 ? 70 : n === 7 ? 25 : null,
    available: 1,
  })),
  reviews: [],
}

import { searchResultSchema } from './types'
export const previewCatalog = searchResultSchema.parse({
  ...sourceDemo,
  companies: sourceDemo.companies.map((c) => ({
    ...c,
    slug: c.id,
    city_slug: 'cacoal-ro',
    city_id: 0,
    neighborhood_id: null,
    street: '',
    address_number: '',
    postal_code: '',
    image: c.image.replace('/catalog/', '/guide/catalog/'),
  })),
  items: sourceDemo.items.map((i) => ({
    ...i,
    company_id:
      sourceDemo.offerings.find((o) => (o.product_id || o.service_id) === i.id)?.company_id || '',
  })),
  media: [],
  rating_summary: {},
  pagination: { page: 1, pageSize: 12, total: sourceDemo.companies.length, pages: 1 },
  neighborhoods: [...new Set(sourceDemo.companies.map((c) => c.neighborhood))],
  containsExamples: true,
})
