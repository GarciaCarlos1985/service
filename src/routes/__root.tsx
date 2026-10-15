/// <reference types="vite/client" />
import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type * as React from 'react'
import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '~/queryClient'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { AuthProvider } from '~/modules/auth/auth-context'
import { ToastProvider } from '~/modules/ui'
import appCss from '~/styles/app.css?url'
import guideCss from '~/styles/guide.css?url'
import premiumCss from '~/styles/guide-premium.css?url'
import { seo } from '~/utils/seo'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      ...seo({
        title: 'Service Guide · Encontre em Cacoal',
        description:
          'Encontre empresas, produtos e serviços em Cacoal. Pesquise o que precisa e fale diretamente com os negócios locais.',
        keywords: 'Cacoal, empresas, produtos, serviços, comércio local',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'stylesheet', href: guideCss },
      { rel: 'stylesheet', href: premiumCss },
      { rel: 'icon', href: '/guide/favicon.svg' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
        {import.meta.env.DEV && pathname !== '/previa' && (
          <TanStackRouterDevtools position="bottom-right" />
        )}
        <Scripts />
      </body>
    </html>
  )
}
