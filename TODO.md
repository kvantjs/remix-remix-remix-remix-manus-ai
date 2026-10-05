
## [x] Pesquisa web real no Google em streaming

- `web_search` não usa Wikipedia, Wikimedia, Stack Exchange, OpenAlex ou APIs federadas para pesquisar.
- Pesquisas são abertas no Google por uma sessão Playwright Chromium real; a consulta normaliza frases como “pesquise sobre X” para `X`.
- O plano determinístico trabalha em etapas observáveis: pesquisa Google, inspeção do DOM, rolagem, nova inspeção, abertura do primeiro resultado orgânico, nova rolagem e inspeção final.
- O endpoint SSE transmite `status`, `tool_start`, `step`, `tool_finish`, `approval_required` e `complete` ao vivo; o cliente atualiza o estado do agente a cada evento.
- O Google `/sorry` e outros challenges anti-bot interrompem a sequência, não geram resultados fictícios e solicitam handoff humano autorizado.
- O componente visual e o endpoint `/api/computer/browser/search` também apontam para o Google e não para Wikipedia.
