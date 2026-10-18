import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// As credenciais locais de administração não são bindings do Worker.
process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'false'

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    if (
      env.VITE_SUPABASE_URL !== 'https://taabjnmsaaltsiehywbw.supabase.co' ||
      !env.VITE_SUPABASE_ANON_KEY ||
      !/^0x[A-Za-z0-9_-]+$/.test(env.VITE_TURNSTILE_SITE_KEY ?? '')
    ) {
      throw new Error(
        'Build de produção exige o backend do Service Guide e a site key real do Turnstile.',
      )
    }
  }
  return {
    server: {
      port: 3000,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tanstackStart(),
      viteReact(),
    ],
  }
})
