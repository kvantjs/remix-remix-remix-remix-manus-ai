<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d09bb963-864f-4210-8840-7719cbd50c38

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Runtime OpenManus integrado

A interface React/Kvant permanece inalterada. O endpoint `POST /api/agent/chat/stream` agora usa, por padrão, o agente `Manus` do projeto open source [FoundationAgents/OpenManus](https://github.com/FoundationAgents/OpenManus), executado em `openmanus/` por um bridge JSONL. Os eventos do ciclo ReAct são convertidos para o contrato SSE já consumido pelo `ChatArea` (`status`, `tool_start`, `tool_finish`, `complete` e `error`).

### Configuração

- `OPENMANUS_ENABLED=true` ativa o runtime OpenManus; defina `false` somente para recuperação local pelo handler legado.
- `OPENMANUS_API_KEY`, `OPENMANUS_BASE_URL` e `OPENMANUS_MODEL` configuram qualquer endpoint compatível com OpenAI. O modelo padrão é `gemini-3-flash-preview`; na ausência de uma chave OpenManus, o bridge tenta usar credenciais já presentes em `OPENAI_API_KEY`/`GEMINI_API_KEY`.
- `OPENMANUS_PYTHON` permite apontar para um interpretador específico; por padrão é usado `.openmanus-venv/bin/python`.
- `OPENMANUS_WORKSPACE_ROOT` define o diretório que as ferramentas do OpenManus podem operar. Por padrão é a raiz do projeto.
- `DATABASE_URL` deve ser a URL PostgreSQL oficial do provedor (TLS verificado, como `sslmode=verify-full` quando aplicável), guardada no gerenciador de secrets do deploy — nunca em commit ou mensagem. O servidor cria/aplica as tabelas e índices versionados em `src/server/migrations/` ao iniciar; readiness fica indisponível até a conexão e a migração funcionarem.

### Execução local

```bash
uv venv --python 3.12 .openmanus-venv
uv pip install --python .openmanus-venv/bin/python -r openmanus/requirements-runtime.txt
npm install
npm run dev
```

O `Dockerfile` também instala o ambiente virtual Python enxuto e o Chromium exigidos pelo runtime. A lista `openmanus/requirements-runtime.txt` exclui dependências de benchmark que puxavam Torch/CUDA, sem alterar as dependências completas usadas no desenvolvimento upstream do OpenManus.
