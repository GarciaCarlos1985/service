import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

export const ssrNonce = createIsomorphicFn()
  .server(() => {
    return getRequestHeader('x-service-guide-csp-nonce')
  })
  .client(() => undefined)
