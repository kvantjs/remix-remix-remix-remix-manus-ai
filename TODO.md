
## [x] Timeline profissional de execução ao vivo no chat

- Durante cada execução, o chat mostra uma fase inicial, o estado Thinking animado, contador de tempo e cards finos para compreensão do pedido, raciocínio, etapas do plano, chamadas de ferramentas, autorizações e síntese final.
- Os eventos SSE `status`, `step`, `tool_start`, `tool_finish`, `approval_required` e `complete` atualizam a timeline sem esperar a resposta final.
- O estado de cada etapa usa sinais visuais distintos para em andamento, concluída e aguardando autorização, com microanimações sutis e suporte a `prefers-reduced-motion`.
- Após a conclusão, a timeline permanece registrada dentro da mensagem do agente, junto do resumo e das chamadas MCP; o computador da nuvem continua recebendo o estado ao vivo existente.
- A experiência foi validada no Preview público com uma pesquisa Google real: a UI exibiu Thinking, `browser.search`, a etapa de anti-bot e a síntese final enquanto o painel do computador mostrava a navegação.
