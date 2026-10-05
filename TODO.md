
## [x] Timeline com foco em uma etapa por vez

- Durante a execução, somente a etapa ativa fica expandida; cada novo evento substitui o foco visual anterior em vez de abrir todos os cards simultaneamente.
- Depois da conclusão, a timeline fica compacta por padrão e oferece um controle discreto para expandir o histórico completo quando necessário.

## [x] Painel do navegador sem tela branca

- O painel prioriza a captura JPEG real retornada pelo Chromium/Playwright, com indicação visual de captura ao vivo.
- Enquanto a primeira captura ou o iframe proxy carregam, o painel mostra um estado profissional de navegador conectado, nunca uma área branca vazia.
- Ações de busca e inspeção atualizam URL, título e screenshot do navegador; falhas de carregamento da imagem retornam ao proxy sem quebrar o painel.
- Validação feita pela interface pública com pesquisa real: a captura do Chromium apareceu no painel e a timeline exibiu uma única etapa ativa.
