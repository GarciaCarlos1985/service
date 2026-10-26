# Service Guide instalável — candidato de revisão

## Entrega e limites

Implementação na branch `codex/instalaveis-mobile`, a partir da main `8374b1c`.
Esta atualização ainda não foi mesclada nem publicada no Cloudflare.
O responsável pediu o desenvolvimento das versões instaláveis e informou que
não dispõe de Mac ou iPhone; o Helon deve receber uma instalação orientada,
sem programar ou executar comandos.

| Entrega | Estado comprovado | Próxima validação |
| --- | --- | --- |
| PWA para Android e iPhone | Manifesto, marca, orientação `/instalar`, registro do worker e fallback de rede implementados; testes de código e HTTP aprovados | Instalar pelo navegador e testar em aparelhos reais; publicar após revisão |
| Android APK 0.1.0 | Release compilado, assinado e verificado pelo apksigner | Instalação, navegação e login em Android real |
| Android AAB 0.1.0 | Release compilado, assinado; formato aprovado pelo bundletool oficial 1.18.3 | Adequação e testes exigidos pela Play; conta do publicador e revisão da loja |
| iPhone pela App Store | Não implementado; nenhum IPA gerado | Desenvolvimento iOS, acesso a macOS/Xcode, assinatura e aprovação Apple |

Artefatos locais: `artifacts/mobile/service-guide-0.1.0.apk`,
`artifacts/mobile/service-guide-0.1.0.aab` e `build-receipt.json`.
Eles são ignorados pelo Git. Código Android e certificado público estão no
repositório; chave privada e senha não estão.
Prévia de revisão: http://127.0.0.1:3011/instalar.
O servidor DEV habitual não foi substituído.

## Impacto e escolha técnica

O SSR TanStack Start foi mantido. A PWA acrescenta o manifesto, ícones derivados
da logo fornecida, página de instalação e service worker; não exige uma SPA
estática nem troca de banco. O rodapé oferece “Instalar no celular”. O cabeçalho
preserva a identidade e considera a área segura no modo instalado.

No Android, TWA/Bubblewrap preserva o navegador, o domínio HTTPS, o SSR e o
Turnstile existentes. O identificador é `dev.serviceguide.cacoal`; mínimo API 24,
target API 36. A abertura em tela cheia depende da associação online do domínio
ao certificado em `/.well-known/assetlinks.json`. Antes dessa publicação, o
navegador pode mostrar sua barra em uma Custom Tab. Nenhuma validação de domínio
foi desativada para forçar tela cheia.

Sem nova migration, alteração de RLS, conta de usuário, senha ou provedor.
Sem pagamento, push, coleta nativa de localização, câmera ou microfone.
Não foi acrescentada dependência ao runtime do site. O gerador Bubblewrap foi
instalado apenas no diretório local ignorado de ferramentas.

## Cache, sessão e atualização

- HTML e navegações consultam o servidor. Conta, painel, RPC, Auth, requisições
  com query e terceiros ficam fora do cache de conteúdo do worker.
- Somente arquivos estáticos identificados, com MIME permitido, status 200 e
  resposta sem redirecionamento entram no cache; `private`/`no-store` é respeitado.
- Limite de 64 entradas por versão. A ativação remove somente caches antigos
  com o prefixo deste aplicativo.
- Sem rede, a navegação recebe orientação pública e um botão para tentar de
  novo. Não há catálogo offline, escrita enfileirada ou tela privada salva.
- O namespace do cache muda com o build. Não há `skipWaiting`, recarga forçada
  ou interrupção automática de formulários. Uma versão esperando assume após
  fechar as janelas que utilizam a versão anterior.
- A sessão continua sob o mecanismo atual do Supabase e o armazenamento do
  navegador. O primeiro acesso pelo ícone pode solicitar novo login. A PWA não
  elimina o armazenamento de sessão nem fornece acesso administrativo offline.
- CSP permite manifesto e worker da própria origem; as proteções de nonce,
  `no-store` privado e CAPTCHA permanecem. `_headers` também protege os arquivos
  servidos diretamente pelo sistema de assets do Cloudflare.

## Validação reproduzível

Gate aprovado: typecheck, lint (zero erros; 37 avisos), format check,
**125 unitários em 19 arquivos** e build. Os testes novos executam
o código real do worker em Cache API isolada e o estado de instalação: cache
privado/terceiro/HTML/JSON/redirect/erro recusado, fallback, limite, atualização,
cancelamento e confirmação do navegador. Não substituem o motor de um celular.

`node scripts/verify-installable.mjs http://127.0.0.1:3011` conferiu 11 respostas
do Worker: página SSR, manifesto, tamanhos reais dos PNGs, MIME, revalidação,
worker versionado, certificado Android e `no-store` administrativo.
`pwsh -File scripts/build-android.ps1` recompila, executa lint Android e verifica
assinatura, preservando o certificado aprovado no site. Detalhes em
`mobile/android/README.md`. O workflow Android compila artefatos de laboratório
sem segredos de distribuição no GitHub; não publica em loja.

As seis suítes SQL atuais passaram contra o Supabase real, com TLS validado e
rollback individual: permissões internas, fronteira da API, comercial, painel,
aparência e identidade/horários. Nenhuma migration foi aplicada nesta entrega.

O detector estático Impeccable não apontou problemas na nova tela/CSS. A leitura
do contexto de design também sinalizou `config-build-path-unset`; esse ajuste
de configuração ficou fora do escopo, sem alteração automática. O
controle do navegador respondeu “Local browser use is disabled in Work settings”.
A conferência visual e a instalação por essa interface estão pendentes; foi
solicitada a habilitação, sem alterar a configuração do usuário. Não havia
aparelho Android conectado nem AVD configurado; Mac/iPhone indisponíveis.
Não se declara teste em aparelho ou aprovação de loja com base em build.

## Retomada do serviço existente

Durante a regressão, a conexão falhou com `ENOTFOUND`. A Management API do
projeto `taabjnmsaaltsiehywbw` confirmou `INACTIVE`. O mesmo projeto foi retomado
pelo endpoint oficial `/restore`, sem criação de serviço, migração, mudança de
plano ou recuperação de dados antigos sobre dados atuais. Após a retomada:
`ACTIVE_HEALTHY`, Auth HTTP 200 e seis suítes SQL aprovadas.

Consulta de Auth confirmou CAPTCHA Turnstile, confirmação obrigatória de e-mail
e SMTP próprio ativos. Nenhum e-mail foi enviado e nenhuma senha foi alterada.
A causa da pausa não foi demonstrada. O plano gratuito pode pausar projetos
com baixa atividade; esta entrega não promete disponibilidade contínua nem
contratou plano para remover essa limitação.

## Publicação e testes restantes

Após revisão humana: mesclar o candidato, publicar os assets e o Worker e
repetir o verificador HTTP no domínio oficial. Conferir instalação no Chrome
e Safari, abrir pelo ícone, voltar/avançar, fechar/reabrir, login com CAPTCHA,
favoritos, upload de logo, links de WhatsApp/telefone/mapa, perda de rede e retorno.
Não ampliar domínios do Turnstile nem desligar a prova para facilitar teste local.

Para o Helon, a página `/instalar` explica o processo. No iPhone: abrir no Safari,
Compartilhar, Adicionar à Tela de Início, confirmar. Não exige Xcode nem conta
Apple Developer para esse acesso. Isso não instala um aplicativo da App Store.

Play/App Store exigem avaliação dos fluxos de exclusão de conta/privacidade e
requisitos atuais da loja. O formulário de solicitação existente não foi
declarado automaticamente suficiente. Não foram criadas contas ou aceitos
contratos. Não há promessa de aprovação de um simples invólucro do site na Apple.
Um Mac remoto pode permitir compilação futura, mas não foi contratado/utilizado.

## Fontes oficiais

- PWA: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- iPhone: https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios
- TWA e Digital Asset Links: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- Bundletool: https://github.com/google/bundletool/releases/tag/1.18.3
- Assets e cabeçalhos: https://developers.cloudflare.com/workers/static-assets/headers/
- Disponibilidade gratuita: https://supabase.com/docs/guides/deployment/going-into-prod#availability
- Retomar projeto: https://supabase.com/docs/reference/api/v1-restore-a-project
- Critério App Store 4.2: https://developer.apple.com/app-store/review/guidelines/#minimum-functionality

Recibos e hashes públicos: `evidencias/instalaveis-2026-10-25.json`.
