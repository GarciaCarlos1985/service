import { createFileRoute } from '@tanstack/react-router'
import Admin from '~/modules/guide/screens/Admin'
import { GuideShell } from '~/modules/guide/GuideShell'
import { adminSearchSchema } from '~/modules/guide/admin'
import adminCss from '~/styles/guide-admin.css?url'
export const Route = createFileRoute('/admin')({
  validateSearch: (input) => adminSearchSchema.parse(input),
  head: () => ({
    links: [{ rel: 'stylesheet', href: adminCss }],
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
