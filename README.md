# Kvant — agente local de engenharia

Aplicação full-stack React/Vite com backend Express. O servidor hospeda a interface, rotas de agente, workspace, terminal isolado e navegador Playwright no mesmo processo.

## Executar localmente

**Pré-requisitos:** Node.js 20+, npm e, para IA local, Ollama.

```bash
npm install
cp .env.example .env
ollama pull qwen3:4b
npm run dev
```

A interface abre em `http://localhost:3000` e a verificação básica de serviço fica em `/health`.

## Configuração

- `OLLAMA_MODEL=qwen3:4b`: usa Qwen3 local pelo Ollama, sem chave ou custo por chamada. Instale Ollama e execute `ollama pull qwen3:4b`; o backend chama `http://127.0.0.1:11434` por padrão. Defina `OLLAMA_NUM_CTX`, `OLLAMA_NUM_PREDICT` ou `OLLAMA_TIMEOUT_MS` para ajustar contexto, saída e timeout. Quando configurado, o Ollama local tem prioridade e prompts não são enviados ao Gemini.
- Referências oficiais: [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling), [Ollama Chat API](https://docs.ollama.com/api/chat) e [catálogo Qwen3](https://ollama.com/library/qwen3).
- `GEMINI_API_KEY` ou `GOOGLE_API_KEY`: provedor externo opcional quando `OLLAMA_MODEL` não está definido.
- `KOPILOT_LOCAL_ACCESS_TOKEN`: configure um valor aleatório forte quando expuser o servidor por uma URL compartilhada. Com essa variável, as rotas `/api/*` exigem o cookie HttpOnly emitido por `/_local/access?token=...`; `/health` continua público para health checks.
- Banco gerenciado: não é obrigatório para iniciar, mas funções persistentes/de prontidão podem ficar indisponíveis sem a conexão de banco.
- `AWS_SANDBOX_MODE=ssm` e variáveis AWS: opcionais; sem elas, comandos do agente usam o workspace local isolado.

Não faça commit de `.env` ou de tokens. Para validar a compilação e os tipos:

```bash
npm run lint
npm run build
```

## Limitações do modo local

Uma instalação local não é automaticamente conectada ao WebDev, a um banco gerenciado, a credenciais externas nem aos MCPs de produção. Configure os serviços necessários antes de depender dessas integrações. A rota `/api/health/readiness` informa dependências de prontidão separadamente da rota `/health`.
