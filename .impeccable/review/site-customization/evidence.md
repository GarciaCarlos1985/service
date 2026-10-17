# Revisão da personalização do site

Candidato local em `codex/painel-profissional`; nenhuma migração nova aplicada ou publicação de produção. Dados e contas descartáveis no laboratório local, identificados pela faixa amarela. Capturas desta pasta não representam o catálogo real.

Inspeção em duas rodadas da extensão: a primeira identificou a prévia longa antes dos controles no celular; foi convertida em prévia expansível. A confirmação encontrou pendências materiais, encaminhadas à revisão independente em vez de iniciar outra rodada de ajustes por conta própria.

## Evidências válidas

- `copy-desktop.jpg`, `colors-desktop.jpg`: viewport lógico 1440 × 1000.
- `spotlights-desktop.jpg`, `spotlight-fields-desktop.jpg`, `user-1280.jpg`: viewport lógico 1280 × 720, largura de uso informada pelo navegador.
- `mobile.jpg`, `colors-mobile.jpg`, `spotlights-mobile.jpg`, `preview-mobile.jpg`, `preview-second-mobile.jpg`: viewport lógico 390 × 844. A primeira mostra a posição inicial; as demais são posições de rolagem identificadas pelo conteúdo, não capturas de página inteira.
- `public-desktop.jpg`: viewport lógico 1440 × 1000; títulos e primeira vitrine salvos pelo painel local.
- `public-mobile.jpg`, `public-spotlight-mobile.jpg`: viewport lógico 390 × 844; busca e segunda vitrine com texto e imagem personalizados.

As capturas finais foram feitas no Chrome através do CUA. O navegador embutido e as capturas de página inteira apresentaram falhas de captura; as capturas inválidas não são referência de revisão. O Chrome produz JPEG com dimensões de bitmap ligeiramente diferentes do viewport lógico, sem edição ou montagem das imagens.

## Achados encaminhados à revisão

1. A aba Vitrines pode produzir largura de rolagem 418px em viewport de 390px. O foco em um campo pode rolar lateralmente e cortar os controles; conferir o seletor de modo e os elementos de largura intrínseca.
2. Na posição inicial móvel, o limite do formulário pode impedir que a barra aderente suba o suficiente, deixando parte do botão Salvar sobre a navegação inferior. Durante a edição com rolagem, a separação está visível em `colors-mobile.jpg`.
3. As opções de exibição continuam em coluna porque herdam `flex-direction: column`; a primeira correção mudou o display, mas não a direção. Avaliar o alinhamento conforme a tarefa operacional.

Detector executado uma vez nos alvos TSX/CSS modificados: `detector.json` = `[]`. Não substitui revisão visual, testes de fluxo ou avaliação de segurança.

## Lote final e veredito

A revisão independente retornou `fix` para cinco pontos: contenção móvel, seleção da vitrine na prévia, tinta em fundos customizáveis, altura das abas e alinhamento de checkbox. O lote corrigiu os cinco e acrescentou a reserva da barra fixa móvel. Após reconstruir uma vez, todas as capturas foram renovadas nas mesmas larguras. O verdict pass marcou os cinco pontos `resolved`, com disposição `ship` apenas no escopo dessas correções locais. Não houve segundo detector.

Medição final no foco do título da vitrine: viewport 390px, largura de rolagem 381px e deslocamento horizontal zero. Na prévia com fundo #ffffff, título e sugestões computaram `rgb(24, 51, 79)`. A seleção da chamada 2 exibiu sua imagem, título e descrição; a prévia não alterou a configuração pública. A paleta temporária foi desfeita depois da captura. `mobile.jpg` mostra Salvar/Desfazer integralmente acima da navegação inferior.

## Fluxos funcionais comprovados

Salvar texto e paleta; conferir prévia antes de salvar e persistência depois; restaurar cores; editar duas chamadas com HTTPS e descrição; reordenar por arraste, botão e teclado; ocultar e reexibir a vitrine global; manter os destaques em busca sem resultados; navegar entre as duas chamadas e abrir o perfil correto. Testes SQL reais com rollback cobrem rascunhos privados, elegibilidade, concorrência e rejeição de CSS/URLs inseguros. A API/Auth/Storage do laboratório de navegador são simulados; Supabase Auth real foi validado separadamente com conta descartável.
