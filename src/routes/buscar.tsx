import { createFileRoute, redirect } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { searchSchema } from '~/modules/guide/types'

export const Route = createFileRoute('/buscar')({
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) =>
    searchSchema.parse({
      ...search,
      maxPrice: search.maxPrice ?? null,
      available: search.available === '1' || search.available === true,
      featured: search.featured === '1' || search.featured === true,
    }),
  beforeLoad: ({ search }) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses structured navigation signals.
    throw redirect({ to: '/', search, replace: true })
  },
})
