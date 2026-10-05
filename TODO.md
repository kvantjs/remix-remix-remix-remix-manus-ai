
## [x] Continuidade conversacional entre turnos

- O fallback sem Gemini não repete mais a mensagem fixa; ele usa a mensagem atual e o histórico para responder de forma contextual.
- O endpoint SSE e o endpoint padrão recebem o histórico no fallback conversacional.
- Mensagens iniciais, cumprimentos, agradecimentos, perguntas simples e follow-ups recebem respostas distintas; o contexto de pesquisa só é inferido a partir de mensagens anteriores do usuário, não da mensagem inicial de boas-vindas.
- O fluxo foi reproduzido via API e pela interface pública do navegador Manus com dois turnos consecutivos, sem a resposta repetitiva.
