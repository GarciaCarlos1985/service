# Service Guide para Android

Projeto TWA gerado com Bubblewrap 1.27.0, usando Android Browser Helper 2.7.4.
O aplicativo abre o mesmo site HTTPS e mantém seu backend, Auth, CAPTCHA e RLS.
O navegador faz a conexão; o APK não contém credenciais administrativas.

- Identificador: `dev.serviceguide.cacoal`.
- Versão inicial de homologação: `0.1.0`, código `1`.
- Android mínimo: API 24 (Android 7); compilação e target: API 36.
- Sem cobrança, notificações, localização, câmera ou microfone nativos.
- A associação do certificado ao site está em `public/.well-known/assetlinks.json`.
- Sem associação online válida, a abertura usa Custom Tab com a barra de endereço.
  Não se desativa a validação de domínio para esconder essa barra.

## Compilar no Windows

Com Android Studio, JDK e SDK instalados, execute na raiz:

```powershell
pwsh -File scripts/build-android.ps1
```

O script usa o JDK do Android Studio, compila APK/AAB release, executa lint e
verifica a assinatura do APK. Os resultados ficam em `artifacts/mobile/`, com
um recibo SHA-256. Não publica no Cloudflare nem na Google Play.

A chave privada fica em `.wrangler/mobile-signing/service-guide.jks`. A senha
fica criptografada pelo Windows em `password.dpapi.xml`, vinculada ao usuário
Windows atual. Preserve os dois arquivos e o perfil capaz de abri-los; antes
de publicar comercialmente ou migrar de computador, prepare um backup seguro
e recuperável da assinatura. Nunca envie esses arquivos ao GitHub ou pelo chat.
O certificado público e sua impressão digital podem ser versionados.

Uma chave gerada em outro computador não substitui automaticamente os
certificados aprovados no site. O script avisa sobre a diferença e preserva
`assetlinks.json`; mudanças nessa associação exigem revisão.

## Compilar sem assinatura de distribuição

Com `JAVA_HOME` e `ANDROID_HOME` configurados, execute neste diretório:

```bash
bash gradlew --no-daemon :app:assembleDebug :app:bundleRelease :app:lintRelease
```

O workflow Android repete esse laboratório em runners públicos gratuitos do
GitHub. Seu APK debug e seu AAB sem assinatura de distribuição são artefatos
de CI, diferentes dos pacotes release assinados localmente.

Não é necessário instalar Bubblewrap para recompilar este projeto. A geração
inicial foi feita com os ícones locais aprovados e o domínio de produção,
sem incorporar localhost no aplicativo. Arquivos do gerador preservam a
licença Apache 2.0; a marca é a imagem fornecida pelo responsável do Service Guide.

## Antes da loja

Teste em Android real: instalação, abertura, navegação, voltar, login com
CAPTCHA, links externos, seleção de fotos, perda de rede e retorno. Nenhum
aparelho estava conectado na geração desta versão.

Google Play exige conta do publicador, formulários e adequação de privacidade,
exclusão de conta e eventuais testes obrigatórios. O AAB compilar e ser válido
não equivale a aprovação da loja. Com Play App Signing, acrescente ao site o
certificado de **assinatura do app** fornecido pela Play, após revisão; a chave
de upload pode ser diferente.

Referência: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
