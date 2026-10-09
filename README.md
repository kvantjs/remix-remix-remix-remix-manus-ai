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
- `OPENMANUS_API_KEY`, `OPENMANUS_BASE_URL` e `OPENMANUS_MODEL` configuram qualquer endpoint compatível com OpenAI. Na ausência dos três primeiros, o bridge tenta usar as credenciais já presentes em `OPENAI_API_KEY`/`GEMINI_API_KEY`.
- `OPENMANUS_PYTHON` permite apontar para um interpretador específico; por padrão é usado `.openmanus-venv/bin/python`.
- `OPENMANUS_WORKSPACE_ROOT` define o diretório que as ferramentas do OpenManus podem operar. Por padrão é a raiz do projeto.

### Execução local

```bash
uv venv --python 3.12 .openmanus-venv
uv pip install --python .openmanus-venv/bin/python -r openmanus/requirements.txt
npm install
npm run dev
```

O backend continua expondo `/health`, e a UI não precisa de alteração para receber o runtime substituído.
