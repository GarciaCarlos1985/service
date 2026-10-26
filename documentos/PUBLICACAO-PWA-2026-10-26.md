# Publicação da PWA — 26/10/2026

O responsável autorizou a publicação do candidato instalável. O PR #5 foi
mesclado na `main`, e a PWA está online:
https://service-guide.helon280.workers.dev/instalar.

## Versão publicada

| Item | Evidência |
| --- | --- |
| Repositório | https://github.com/GarciaCarlos1985/service |
| PR aprovado e mesclado | https://github.com/GarciaCarlos1985/service/pull/5 |
| Fonte | `0d73e69366cdfe236a2064c228e3f5408964f9cb` |
| Merge | 26/10/2026, 00:13:44 (America/Sao_Paulo) |
| Publicação | 26/10/2026, 00:23:14 (America/Sao_Paulo) |
| Worker | `ee01187a-ef9b-4a46-989a-0d1779f9b0ce` |
| Deployment | `4002a904-552a-44b4-8380-e2b61122ab6e` |
| Tráfego | 100% para a versão publicada, conferido após deploy |
| Revisão do service worker | `a131520e1c2ab76a` |

## Validação

- Gate do candidato aprovado: typecheck, lint (zero erros, 37 avisos), formato,
  125 testes em 19 arquivos, build e seis suítes SQL reais com TLS/rollback.
  Recibo histórico: `evidencias/instalaveis-2026-10-25.json`.
- CI da fonte aprovada: https://github.com/GarciaCarlos1985/service/actions/runs/40218958390.
  Compilação Android: https://github.com/GarciaCarlos1985/service/actions/runs/40218958408.
  CI do merge na main: https://github.com/GarciaCarlos1985/service/actions/runs/40263026359.
- Build da main e dry-run final aprovados em sequência. Varredura de 263
  arquivos do build por streaming sem valores privados do ambiente. Uma
  referência original ao laboratório permanece em source map; nenhuma no
  código executável. Isso não configura outro backend em produção.
- `node scripts/verify-installable.mjs https://service-guide.helon280.workers.dev`
  aprovado: onze respostas, incluindo SSR/CSP, manifesto, dimensões/MIME dos
  ícones, worker versionado, fallback, certificado Android e `no-store` privado.
- Smoke adicional: início, entrar e instalar HTTP 200; `/previa` e
  `/.env.local` HTTP 404. Worker online idêntico ao arquivo do build.
  `/.git/config` responde HTML genérico pela rota legada de dois segmentos,
  HTTP 200 (soft 404); não entrega arquivo Git nem configuração privada.
  O status dessa rota legada fica registrado como pendência separada.
- Revisão visual online em desktop e viewport de 390 × 844, sem erros ou
  avisos no console observado. Capturas em `evidencias/pwa-2026-10-26/`.
- O usuário enviou captura do Chrome no próprio Android com a oferta
  “Instalar e criar atalho”. Isso confirma a oferta de instalação, sem provar
  que a instalação ou os fluxos no aparelho foram concluídos.
- Consulta de Auth, sem aplicar alterações, confirmou Turnstile, confirmação
  obrigatória de e-mail e SMTP configurado. Nenhum e-mail enviado, senha
  alterada, migration aplicada ou plano contratado nesta publicação.

## Uma plataforma, três formas de distribuição

| Forma | Situação e limite |
| --- | --- |
| PWA Android/iPhone | Publicada. Instalação pelo navegador; não é publicação nas lojas. No Android, a opção “Instalar” apresentada na captura é a PWA. |
| Pacote Android | APK/AAB 0.1.0 compilados, assinados e verificados; teste real completo e requisitos da Play ainda pendentes. Fonte TWA/Bubblewrap em `mobile/android`. |
| Aplicativo iOS/App Store | Ainda não implementado; nenhum IPA gerado ou enviado à Apple. Exige desenvolvimento, assinatura, testes e revisão. |

As contas, empresas e administração continuam no mesmo backend Supabase.
As versões móveis podem reutilizar essa plataforma; não se promete código
idêntico ou aprovação automática das lojas. A PWA já pode ser usada no iPhone
sem inscrição no Apple Developer Program. O site continua acessível pelo link.

Permanecem pendentes instalação concluída e abertura pelo ícone em Android e
iPhone reais, login com CAPTCHA, navegação, favoritos, uploads, links externos,
fechar/reabrir e perda/retorno da rede. Os testes de código e HTTP não substituem
essas validações. Não há catálogo nem administração offline nesta entrega.

## Retorno à versão anterior

A versão anterior foi registrada antes da publicação:
`417acf48-d450-4548-848e-992a27c7592b` (fonte `45519de`, deployment
`058be96c-9de5-458f-b95f-b2c4cf1aaf53`). Ela não foi restaurada. Uma eventual
reversão em produção segue a exigência de validação humana do projeto.

Recibo público: `evidencias/publicacao-pwa-2026-10-26.json`.
Logs locais ignorados: `.wrangler/pwa-release-2026-10-26/`.

Referências oficiais:

- iPhone/Safari: https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios.
- Android/TWA: https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs/.
- App Store, funcionalidade mínima: https://developer.apple.com/app-store/review/guidelines/#minimum-functionality.
