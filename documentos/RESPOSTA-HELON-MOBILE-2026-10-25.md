Helon, o Service Guide pode atender tanto quem usa Android quanto quem usa iPhone, aproveitando o site, os cadastros e o banco existentes. Em 25/10/2026, preparamos uma versão PWA e geramos os pacotes Android APK e AAB em laboratório. O código e os arquivos passaram pelos testes descritos no relatório técnico. Ainda faltam a conferência em aparelhos reais e a publicação dessa atualização. Não há aplicativo publicado nas lojas nem versão iOS nativa pronta.

Endereço atual do site: [https://service-guide.helon280.workers.dev/](https://service-guide.helon280.workers.dev/)

As regras e taxas abaixo foram conferidas em fontes oficiais em 25/10/2026. Os prazos de implementação são estimativas de engenharia, separadas dos períodos de teste e aprovação das lojas.

**Quem usa iPhone tem três caminhos de acesso.**

1. **Pelo link:** recebe o endereço por WhatsApp ou QR Code, abre no navegador e pesquisa as empresas, sem precisar instalar um aplicativo. O guia permite pesquisar sem criar conta.
2. **Pelo PWA:** depois de validarmos e publicarmos a atualização preparada, abre no Safari e usa Compartilhar → Adicionar à Tela de Início. Nas versões que mostram essa opção, ativa Abrir como App da Web. O Service Guide passa a ter um ícone próprio e abre como aplicativo.
3. **Pela App Store:** desenvolvemos a versão iOS, testamos, assinamos e enviamos para análise da Apple. Após aprovação, o cliente instala pela loja.

Esse segundo caminho é documentado pela própria Apple:
[https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios](https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios)

No Android também podemos oferecer acesso pelo link, instalação do PWA pelo Chrome e aplicativo pela Google Play. A instalação de aplicativos web é documentada pelo Google:
[https://support.google.com/chrome/answer/9658361?hl=pt-BR&co=GENIE.Platform%3DAndroid](https://support.google.com/chrome/answer/9658361?hl=pt-BR&co=GENIE.Platform%3DAndroid)

**Diferenças práticas entre os modelos:**

| Modelo | Vantagens | Limitações |
| --- | --- | --- |
| Site no navegador | Abre por link ou QR Code em Android e iPhone; acesso rápido sem instalação | O cliente precisa abrir o link ou salvar um atalho; não oferece presença nas lojas |
| PWA instalável | Ícone na tela inicial, janela de aplicativo e uma base web para os dois sistemas | No iPhone a instalação exige orientação pelo menu; não aparece automaticamente nas lojas; recursos variam por navegador e versão |
| Aplicativo Google Play | Instalação e atualizações pelo canal conhecido dos usuários Android; página própria na loja | Exige conta, assinatura do aplicativo, testes e aprovação; atende Android |
| Aplicativo App Store | Instalação e atualizações pela loja usada pelo público de iPhone; página própria na App Store | Exige conta anual, compilação em macOS, testes em iPhone e aprovação da Apple |

**O investimento deve separar taxas das lojas, ferramentas e operação:**

| Item | Custo de referência | Observação |
| --- | --- | --- |
| Publicação do PWA pelo nosso site | Sem taxa de loja | Existe trabalho de implementação e testes |
| Conta Google Play | US$ 25, pagamento único | Taxa padrão de inscrição da conta de desenvolvedor |
| Conta Apple Developer | US$ 99 por ano, ou preço local disponível | Necessária para o caminho padrão de publicação comercial na App Store |
| Ferramentas de desenvolvimento | Há opções gratuitas e de código aberto | Podemos usar a base atual, Android Studio/SDK e ferramentas como Bubblewrap ou Capacitor |
| Acesso a macOS para iOS | A verificar | Pode ser Mac disponível ou serviço de compilação compatível; não pressupõe comprar um Mac |
| Aparelhos para testes | A verificar | Podemos usar aparelhos Android e iPhone já disponíveis |
| Hospedagem, banco e armazenamento | Conforme planos e consumo | Aproveitamos a infraestrutura existente; suas cotas continuam valendo |

Com duas contas novas, a soma das taxas padrão das lojas é **US$ 124 no primeiro ano**. Nos anos seguintes, a anuidade Apple continua sendo US$ 99, pelos valores atuais. Isso não inclui câmbio, tributos aplicáveis, desenvolvimento, equipamentos ou consumo de infraestrutura. As taxas são do publicador; o aplicativo pode ser gratuito para os clientes.

Taxa oficial Google:
[https://support.google.com/googleplay/android-developer/answer/6112435?hl=pt-BR](https://support.google.com/googleplay/android-developer/answer/6112435?hl=pt-BR)

Taxa oficial Apple:
[https://developer.apple.com/programs/whats-included/](https://developer.apple.com/programs/whats-included/)

**Estimativa de implementação, mantendo as funções atuais e uma pessoa dedicada:**

| Entrega | Estimativa de trabalho | Tempo externo adicional |
| --- | --- | --- |
| PWA para Android e iPhone | 2–5 dias úteis | Disponibilidade dos aparelhos para validar instalação e funcionamento |
| APK Android para testes controlados | 5–10 dias úteis | Disponibilidade dos aparelhos/testadores |
| Android preparado para enviar à Google Play | 7–15 dias úteis | Verificação da conta, testes exigidos e análise do Google |
| iPhone preparado para enviar à App Store | 3–6 semanas | Acesso a macOS/iPhone, conta e análise da Apple |

São estimativas totais a partir do site atual, **não são parcelas para somar**. Contam implementação e testes técnicos básicos, com recursos disponíveis. Não são prazos oficiais nem promessa de aprovação. Novas funções e problemas encontrados nos protótipos podem alterar o cronograma.

Para contas pessoais novas, o Google exige pelo menos **12 testadores inscritos durante 14 dias consecutivos**, antes de pedir acesso à produção. Esse período e a análise precisam entrar no calendário:
[https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR](https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR)

**Como reaproveitaremos a tecnologia, em termos simples:**

- **No PWA:** acrescentamos a identificação do aplicativo — nome, ícone e modo de abertura — e o controle de cache/atualizações. O cadastro continua no mesmo banco.
- **No Android:** uma opção é PWA com Trusted Web Activity/Bubblewrap. Essa tecnologia abre o conteúdo web como aplicativo Android e associa o app ao site por uma comprovação de propriedade chamada Digital Asset Links. É uma opção documentada pelo Chrome:
  [https://developer.chrome.com/docs/android/trusted-web-activity/quick-start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- **No iPhone:** uma opção é criar o projeto iOS com Capacitor, adaptar a saída do nosso código web e compilar com Xcode em macOS. A escolha final depende de um protótipo funcionando. Requisitos oficiais:
  [https://capacitorjs.com/docs/getting-started/environment-setup](https://capacitorjs.com/docs/getting-started/environment-setup)

Exemplo: você altera o telefone e o horário de uma empresa no painel. A proposta é que site, PWA e aplicativos consultem o mesmo cadastro atualizado, depois da atualização/sincronização da tela. Não precisaríamos manter um banco diferente para cada tipo de celular.

Um detalhe de formato: **APK é Android e não instala no iPhone**. Para novas publicações na Google Play usamos AAB; o Google gera os APKs adequados aos aparelhos. O iPhone exige uma versão iOS própria:
[https://developer.android.com/guide/app-bundle](https://developer.android.com/guide/app-bundle)

**Os principais cuidados antes de liberar cada versão:**

Precisamos testar pesquisa, filtros, favoritos, login com CAPTCHA, recuperação por e-mail, fotos, links para WhatsApp, atualização e comportamento com conexão instável. Nas versões das lojas também precisamos adequar privacidade e o caminho de exclusão da conta. O site já tem um formulário de solicitações; o fluxo do aplicativo precisa ser validado para as exigências das lojas.

A Apple avalia a utilidade e a experiência do aplicativo e pode rejeitar um simples reempacotamento de site. Isso não significa que precisamos refazer todo o sistema, mas a aprovação é uma decisão da Apple:
[https://developer.apple.com/app-store/review/guidelines/](https://developer.apple.com/app-store/review/guidelines/)

Requisitos do Google para exclusão de conta e dados:
[https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR](https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR)

Notificações no PWA do iPhone também são possíveis em versões compatíveis: a Apple/WebKit documenta suporte desde o iOS 16.4 para aplicativos adicionados à tela inicial, com autorização do usuário. Esse recurso exige implementação própria; não surge apenas ao criar o ícone:
[https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

Busca atualizada e salvamento de dados usam internet em todas as versões. Uso offline parcial precisa ser projetado. Também não podemos garantir ausência total de falhas, compatibilidade com todos os celulares ou data de aprovação das lojas.

**Para uma região com muitos iPhones, a proposta é testar iPhone e Android desde o primeiro PWA.** Oferecemos acesso pelo link e uma instalação orientada na tela inicial. Depois, podemos priorizar a App Store se esse canal for importante para o público; a etapa Android não é um pré-requisito obrigatório para desenvolver iOS.

A PWA e os pacotes Android já foram implementados no candidato de revisão. Os testes em aparelhos reais e a publicação ainda estão pendentes. A versão iOS da App Store exige desenvolvimento próprio, compilação em macOS, assinatura e análise da Apple. O acesso gratuito pelo Safari e pela tela inicial não depende dessa publicação na loja.
