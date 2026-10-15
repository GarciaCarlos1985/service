import { createFileRoute } from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import Help from '~/modules/guide/screens/Help'
import { GuideShell } from '~/modules/guide/GuideShell'
export const Route = createFileRoute('/ajuda')({
  validateSearch: (input: SearchSchemaInput & { tipo?: unknown }) => ({
    tipo:
      typeof input.tipo === 'string' && ['help', 'business', 'privacy'].includes(input.tipo)
        ? input.tipo
        : 'help',
  }),
  head: () => ({ meta: [{ title: 'Ajuda e contato | Service Guide' }] }),
  component: HelpPage,
})
function HelpPage() {
  return (
    <GuideShell>
      <Help initialKind={Route.useSearch().tipo} />
    </GuideShell>
  )
}
