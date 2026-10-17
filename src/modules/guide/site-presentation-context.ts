import { createContext, useContext } from 'react'
import { defaultPresentation } from './presentation'
import type { Presentation } from './presentation'
export const SitePresentationContext = createContext<Presentation>(defaultPresentation)
export function useSitePresentation() {
  return useContext(SitePresentationContext)
}
