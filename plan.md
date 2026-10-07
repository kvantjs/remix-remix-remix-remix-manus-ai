# Plano — Kvant Agent

## Objetivo
Publicar no Manus WebDev a aplicação existente do Kvant com execução observável e streaming real.

## Decisões de implementação
- Backend Express + Playwright permanece no servidor WebDev.
- SSE usa flush imediato, heartbeat e proxy sem buffering.
- O agente executa gates visíveis de raciocínio verificável sem expor cadeia de pensamento privada.
- O navegador lê cada página individualmente antes de avançar; há intervalo adicional entre navegações sucessivas.
- O Computador do Agente alterna internamente entre navegador, terminal Ubuntu e editor CodeMirror conforme a ferramenta ativa.
- A publicação usa o Dockerfile existente, com porta 3000 e health check em `/`.

## Estrutura
- `server.ts`: Express, SSE, ciclo do agente, Playwright e execução de ferramentas.
- `src/components/ChatArea.tsx`: parser SSE, notas, pensamento e traces ao vivo.
- `src/components/KvantComputer.tsx`: superfícies internas navegador/terminal/editor.
- `src/components/TerminalView.tsx`: terminal funcional e saída incremental.
- `src/server/`: ferramentas, subagentes, segurança e estado de plataforma.
- `public/manus-routes.json`: rotas declaradas do frontend.

## Design e voz
- Movimento: estação de engenharia operacional, densa e orientada a evidências.
- Princípios: estado sempre visível, transições causais, superfícies funcionais e feedback incremental.
- Paleta: grafite para operação, azul para raciocínio, verde para sucesso e âmbar para bloqueios.
- Layout: computador do agente como superfície principal; chat e workspace como painéis de contexto.
- Animação: cada ação inicia, progride, aguarda leitura, conclui e só então libera a próxima.
- Tipografia: sans legível para comunicação e monoespaçada para terminal/código.
- Voz: direta, factual e voltada ao usuário final. Exemplo: “Estou lendo esta página antes de avançar.” / “A evidência foi confirmada; iniciando a próxima etapa.”
- Essência: agente de engenharia observável, rigoroso e auditável.
