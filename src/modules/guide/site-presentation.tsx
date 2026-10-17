import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { guideRpc } from './api'
import { defaultPresentation, publicPresentationSchema, themeVariables } from './presentation'
import type { Presentation } from './presentation'
import { SitePresentationContext } from './site-presentation-context'
export function SitePresentation({
  children,
  initial,
}: {
  children: ReactNode
  initial?: Presentation
}) {
  const query = useQuery({
    queryKey: ['guide-presentation'],
    queryFn: async () => publicPresentationSchema.parse(await guideRpc('guide_presentation')),
    initialData: initial,
    retry: false,
    staleTime: 60_000,
  })
  const value = query.data ?? defaultPresentation
  return (
    <SitePresentationContext.Provider value={value}>
      <div className="guide-root" data-site-theme style={themeVariables(value.theme)}>
        {children}
      </div>
    </SitePresentationContext.Provider>
  )
}
