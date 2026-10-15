import { createFileRoute } from '@tanstack/react-router'
import Admin from '~/modules/guide/screens/Admin'
import { GuideShell } from '~/modules/guide/GuideShell'
export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Administração | Service Guide' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: () => (
    <GuideShell>
      <Admin />
    </GuideShell>
  ),
})
