import { createFileRoute } from '@tanstack/react-router'
import Directory from '~/modules/guide/screens/Directory'
import { GuideShell } from '~/modules/guide/GuideShell'
export const Route = createFileRoute('/conta')({
  head: () => ({
    meta: [
      { title: 'Minha conta | Service Guide' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: () => (
    <GuideShell>
      <Directory account />
    </GuideShell>
  ),
})
