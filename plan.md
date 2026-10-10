# Plano de execução — interface Manus AI

## Direção confirmada
A referência visual e de interação é **Manus AI** em modo escuro. O backend, o runtime, as rotas, o banco e as integrações existentes permanecem intactos; esta etapa altera apenas a camada de frontend. A identidade visual Manus foi aplicada à interface conforme solicitado, sem declarar que o serviço de execução é o Manus oficial.

O usuário enviará capturas de tela e uma gravação. As páginas públicas consultadas não mostram todas as telas autenticadas nem suas animações, então a calibração fina — e qualquer comparação pixel a pixel — depende dessas referências reais.

## Implementado
- Tela inicial escura e ociosa, com composer centralizado; sugestões de início enviam solicitações reais.
- Workspace carregado sob demanda. No desktop, chat e computador aparecem lado a lado quando apropriado.
- Em telas menores, chat ou workspace ocupa a tela, sem empilhar painéis comprimidos. Iniciar uma tarefa no celular mantém o chat acessível.
- Sidebar navegável e drawer mobile ligados às superfícies existentes.
- Composer com envio, cancelamento, anexos de texto/código e ditado nativo; opções de modelo e conectores demonstrativos foram removidos.
- Progresso derivado de eventos observáveis. Cancelamento, erro, aprovação, espera e conclusão têm estados diferentes.
- Removidos passos, ferramentas, sugestões e horários sintéticos que apareciam sem dados correspondentes.
- Símbolo e ilustrações de estados vazios servidos localmente.

## Validação
`npm test`, `npm run lint`, `npm run build` e `git diff --check` passaram. Testes locais no navegador, com respostas SSE simuladas, cobriram sucesso, falha e cancelamento; a falha não mostra chip ou contagem de ferramenta inventados. O teste mobile a 390 px cobriu drawer, computador em tela cheia, ausência de overflow horizontal e permanência no chat quando uma tarefa é iniciada.

Os testes com stream simulado não substituem uma chamada ao provedor real. O backend existente foi preservado sem alterações nesta etapa.

## Próxima calibração
Quando chegarem as capturas/gravação do Manus AI real, comparar tela a tela e ajustar espaçamentos, tipografia, ícones, animações e estados do computador.
