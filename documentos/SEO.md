# SEO — SERVICE

O SERVICE precisa ser encontrado no Google (spec §21). Nunca uma SPA invisível:
TanStack Start entrega SSR/SSG indexável por construção.

## Estratégia (spec §21, §22, §23, §56)

- **Páginas públicas indexáveis** somente com **conteúdo real**:
  - `/diaristas/guaruja`, `/chaveiro/santos`, `/pintor/guaruja` (categoria × cidade)
  - `/profissionais/guaruja/maria-silva` (perfil público, URL amigável)
  - Guias orgânicos (`/guias/como-escolher-diarista`) quando existirem
- **Nunca** gerar milhares de páginas vazias para manipular busca (spec §21).
- Cidades com código IBGE e categorias canônicas → URL canônica única,
  sem duplicidade (ADR-014).

## Técnico por página

- `<title>` e `meta description` únicos e descritivos
- `canonical` (sem parâmetros de sessão/filtros duplicando URLs)
- Open Graph + Twitter Card
- Structured data (schema.org) quando aplicável: `LocalBusiness`, `Service`,
  `BreadcrumbList`, `WebSite`, `Organization` — **nunca inventar avaliações ou
  dados estruturados** (spec §23)
- `hreflang` não se aplica (produto único pt-BR)

## Perfil do profissional (spec §22)

title · meta description · canonical · Open Graph · structured data ·
endereço aproximado (cidade/bairro) · categoria · avaliações agregadas ·
serviços · disponibilidade quando apropriado.
**Nunca** expor dados pessoais sensíveis (telefone, endereço completo,
documentos) — contrato público reduzido (ADR-016).

## Base técnica

- HTML rápido, JS mínimo, code splitting, lazy loading (spec §24)
- Core Web Vitals excelentes: LCP, CLS, INP
- Imagens WebP/AVIF + thumbnails via R2/CDN
- `sitemap.xml` e `robots.txt` gerados a partir das páginas reais
- 404 com status correto e navegação de volta

## Como é implementado no código

- `head()` por rota (TanStack Router) com `seo()` helper (`src/utils/seo.ts`)
- Páginas públicas SSR (`ssr: true`) para indexação total
- Rotas com `createServerFn` buscando dados reais no banco (Gold views)
