import { createFileRoute } from '@tanstack/react-router'
import Directory from '~/modules/guide/screens/Directory'
import { GuideShell } from '~/modules/guide/GuideShell'
export const Route = createFileRoute('/favoritos')({
  head: () => ({
    meta: [
      { title: 'Meus favoritos | Service Guide' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: () => (
    <GuideShell>
      <Directory favoritesOnly />
    </GuideShell>
  ),
})
