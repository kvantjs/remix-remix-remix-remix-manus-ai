# Entregas da configuração Webdev

## Runtime Webdev configurado

- O projeto Webdev gerenciado `Remix Manus AI` usa a porta `3000`.
- O recurso de servidor está habilitado para Express, autenticação, APIs, webhooks e trabalho agendado.
- O recurso de banco gerenciado está habilitado.
- A publicação automática permanece desativada; esta migração não publica o site.

## Código existente migrado sem secrets

- O código versionado do repositório `kvantjs/remix-remix-remix-remix-manus-ai`, no commit atual `dc82c1e`, é a fonte da aplicação no workspace Webdev.
- A stack React + Vite + Express + TypeScript + Playwright + MySQL opcional é preservada sem aplicar starter ou reescrever a arquitetura.
- `.env.example` é preservado como documentação de placeholders.
- Nenhum `.env` real, `node_modules`, `dist` ou estado runtime é copiado para o workspace.

## Contratos da aplicação preservados

- As rotas de health/readiness, plataforma, jobs, autenticação, storage, projetos, membros/auditoria, agente e navegador cloud permanecem disponíveis.
- `GET /manus-routes.json` serve JSON estático válido contendo as rotas de página da interface, sem APIs, assets ou endpoints de sistema.
- CAPTCHA, Cloudflare, reCAPTCHA, hCaptcha e Turnstile interrompem a automação e exigem handoff humano autorizado; não há stealth, spoofing de fingerprint, remoção de `navigator.webdriver` ou bypass.
- Contexto automático não causa navegação; domínios explícitos continuam sendo abertos diretamente.
- Cookies de sessão usados no Preview HTTPS são compatíveis com `SameSite=None; Secure`.

## Diagnósticos, dependências e Preview validados

- O diagnóstico TypeScript é registrado pelo endpoint `runtime/post-edit`, sem iniciar um segundo LSP no Sandbox.
- As dependências são instaladas a partir de `package-lock.json`.
- `npm run lint` e `npm run build` passam no workspace Webdev.
- O servidor escuta em `0.0.0.0:3000` e o Preview deixa de exibir o placeholder.
- `/health` responde HTTP 200.
- `/api/health/readiness` responde com estado coerente quando o banco ainda não foi injetado ou quando está conectado.
- `/manus-routes.json` responde HTTP 200 com JSON, e não com fallback HTML.

## Checkpoint de migração

- As alterações da migração são commitadas no `main` do repositório canônico do Webdev sem force-push e sem apagar mudanças concorrentes.
- O SHA/checkpoint retornado pelo Webdev é confirmado.
- A URL entregue é identificada como Preview; publicação somente ocorre após pedido explícito posterior.
