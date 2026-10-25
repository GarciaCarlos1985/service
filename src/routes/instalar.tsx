import { createFileRoute } from '@tanstack/react-router'
import InstallScreen from '~/modules/pwa/InstallScreen'
import installCss from '~/styles/guide-install.css?url'

export const Route = createFileRoute('/instalar')({
  head: () => ({
    meta: [{ title: 'Instalar no celular | Service Guide' }],
    links: [{ rel: 'stylesheet', href: installCss }],
  }),
  component: InstallScreen,
})
