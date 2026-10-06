# Handoff de migração — Kopilot AI

**Data do handoff:** 2026-10-05 02:24 (America/Sao_Paulo)

## 1. Repositório e estado atual

- **Repositório GitHub privado:** https://github.com/kvantjs/remix-remix-kopilot-ai
- **Branch principal:** `main`
- **Último commit no GitHub:** `dae751dfc6aafc3c4538c903b4fac1dd3bd51537`
- **Mensagem do último commit:** `fix: prevent automatic context from navigating browser`
- **Preview atual:** https://8328-ixh7wh697fewj41r5gi8f-ba52054e.us4.manus.computer
- **Diretório Webdev desta sessão:** `/home/ubuntu/remixmanusai`
- **Stack:** React + Vite + Express + TypeScript + Playwright + MySQL opcional + Gemini/Kopilot API opcional.

O código foi versionado e enviado ao GitHub em commits incrementais. Não foram enviados secrets, `.env` reais, `node_modules`, `dist` ou estados runtime ignorados.

## 2. Objetivo original do usuário

O usuário importou um ZIP criado no Google AI Studio/Build Mode e pediu:

1. importar a aplicação para GitHub e Webdev;
2. implementar funcionalidades inspiradas no agente autônomo Kopilot, no computador cloud e no Webdev;
3. criar APIs reais para agente, navegador, terminal, arquivos, projetos, versões, jobs, autenticação, banco, storage, scheduler e GitHub;
4. criar uma separação rigorosa entre conversa, pesquisa web, computador cloud, criação de aplicações/sites, chamadas de ferramentas e operações de projeto;
5. corrigir problemas de CAPTCHA/Cloudflare sem usar técnicas de evasão;
6. manter o navegador Playwright real para acessar e visualizar sites.

## 3. O que foi criado

### 3.1 Control plane e configuração

Foi criado um estado persistido/redigido para configuração da plataforma, com APIs para:

- configuração do projeto;
- visão geral de infraestrutura;
- runtime e rotas;
- features de servidor e banco;
- metadados redigidos de secrets;
- health check e readiness;
- jobs e automações.

Rotas principais incluem:

```text
GET/PUT /api/platform/config
GET     /api/platform/infra/overview
GET     /api/platform/routes
GET     /health
GET     /api/health/readiness
GET     /api/db/status
```

### 3.2 Jobs persistentes e automações

O gerenciador de jobs foi ampliado para:

- criar jobs;
- consultar status;
- cancelar jobs;
- persistir estados localmente;
- sincronizar estados com MySQL quando disponível;
- recuperar histórico após reinício;
- exibir uma aba de automações/execuções na interface.

### 3.3 Banco de dados

Foi adicionada camada MySQL com migração idempotente. O banco é opcional no Preview local e fica disponível quando `DATABASE_URL` ou variáveis equivalentes são injetadas pelo Webdev.

Tabelas implementadas ao longo das fases:

- usuários/sessões;
- jobs;
- objetos de storage;
- execuções agendadas;
- projetos;
- versões/checkpoints;
- `project_members`;
- `project_audit_log`.

### 3.4 Autenticação e Storage

Foram criadas camadas para:

- sessão OAuth Kopilot;
- cookie de sessão;
- validação de identidade;
- Storage gerenciado;
- uploads/downloads/presigned URLs;
- soft-delete de objetos;
- associação de objetos a projetos.

Os valores protegidos devem ser fornecidos posteriormente pelo formulário de secrets/Webdev. Nenhum valor real foi colocado no repositório.

### 3.5 Projetos, arquivos, snapshots e GitHub

Foi criada a camada de projetos com:

- criação e listagem de projetos;
- seleção de projeto;
- leitura de status Git;
- histórico de versões;
- snapshots;
- listagem de arquivos;
- leitura de arquivos;
- escrita de arquivos;
- exclusão controlada;
- diff;
- restauração com confirmação;
- sincronização privada com GitHub.

A interface possui editor de arquivos, diff, histórico e seleção de projeto.

### 3.6 Papéis e autorização

Implementados três papéis:

- `owner`: controle total, membros e sync GitHub;
- `editor`: edição, exclusão, restauração e snapshots;
- `viewer`: leitura de projeto, arquivos, versões e diffs.

Rotas de membros e auditoria:

```text
GET    /api/projects/:id/members
PUT    /api/projects/:id/members
DELETE /api/projects/:id/members/:openId
GET    /api/projects/:id/audit
```

Variável opcional para proprietário inicial de projetos existentes:

```env
MANUS_PROJECT_OWNER_OPEN_ID=""
```

Quando `MANUS_JWT_SECRET` não existe no Preview local, o ambiente funciona em modo local como `owner`. Em runtime autenticado, a autorização usa OAuth/membros persistidos.

### 3.7 Roteador rigoroso de intenção

Arquivo principal:

```text
src/server/intent-router.ts
```

Modos implementados:

- `conversation`;
- `web_research`;
- `cloud_computer`;
- `app_creation`;
- `explicit_tool_call`;
- `project_operation`.

Regras implementadas:

- conversa não executa ferramentas;
- pesquisa web não edita arquivos nem executa terminal;
- computador cloud executa apenas ações descritas;
- criação de aplicação não navega por iniciativa própria;
- chamada explícita executa somente a ferramenta pedida;
- operações de projeto não publicam/restauram/fazem push sem a autorização correspondente;
- o agente não pode alegar execução sem registro em `toolCalls`;
- mudança de modo exige esclarecimento.

A rota de inspeção é:

```text
GET /api/agent/intent?message=...
```

A chamada direta de ferramenta exige uma mensagem de intenção autorizadora.

### 3.8 Navegador cloud real

O projeto mantém Playwright Chromium real com:

- navegação;
- inspeção DOM;
- screenshots;
- cliques por seletor/texto;
- cliques por coordenadas;
- preenchimento de campos;
- rolagem;
- busca no navegador;
- proxy/live-page para visualização.

Rotas principais:

```text
POST /api/computer/browser/navigate
POST /api/computer/browser/click
POST /api/computer/browser/click-coords
POST /api/computer/browser/scroll
POST /api/computer/browser/type
POST /api/computer/browser/screenshot
POST /api/computer/browser/search
GET  /api/computer/browser/challenge
POST /api/computer/browser/resume-after-human
```

A navegação direta para domínio explícito é preservada. Por exemplo:

```text
Pesquisar na web e inspecionar a API do GitHub no navegador do agente
```

é resolvido pela interface para:

```text
https://github.com
```

O fluxo não deve consultar um mecanismo de busca quando um domínio explícito foi identificado.

### 3.9 Proteção contra CAPTCHA/Cloudflare

Não foi implementado Patchright, stealth, remoção de `navigator.webdriver`, spoofing de fingerprint ou bypass de CAPTCHA/Cloudflare.

Foi implementado o comportamento seguro:

- detectar Cloudflare Challenge;
- detectar CAPTCHA, reCAPTCHA, hCaptcha e Turnstile;
- interromper automação;
- retornar `requiresUserAction: true`;
- registrar provedor e motivo;
- solicitar handoff humano autorizado;
- bloquear cliques/preenchimentos enquanto o desafio estiver ativo.

Arquivo:

```text
src/server/browser-challenge.ts
```

Política:

```env
BROWSER_CHALLENGE_POLICY="stop_and_request_handoff"
```

Após o usuário resolver manualmente um desafio autorizado, o desbloqueio local exige:

```json
{
  "humanConfirmed": true
}
```

### 3.10 Busca sem DuckDuckGo

O DuckDuckGo foi removido de todo o código-fonte.

A ferramenta `web_search` usa APIs públicas sem navegador e sem scraping HTML:

- Wikimedia/Wikipedia;
- Stack Exchange, para consultas técnicas;
- OpenAlex, para pesquisas acadêmicas.

A resposta informa `browserUsed: false` somente para a ferramenta API `web_search`. Isso é separado do navegador Playwright: o navegador continua existindo e continua sendo usado para navegação explícita e inspeção de sites.

A busca visual do computador usa Wikimedia como página pública quando realmente é uma busca. Um domínio explícito não passa pela busca.

## 4. Correção mais recente: redirecionamento inesperado

O usuário relatou:

1. pediu para pesquisar e inspecionar a API do GitHub;
2. o navegador abriu GitHub;
3. aproximadamente três segundos depois foi para uma URL do DuckDuckGo contendo o texto “Instância Linux x86_64 ativa...”.

A causa encontrada foi em `src/components/KvantComputer.tsx`:

```text
contextText
```

era tratado como uma ordem de navegação mesmo quando continha apenas contexto interno automático do sistema. O texto de estado era interpretado como uma consulta de busca.

Correções feitas:

- navegação visual só ocorre quando há URL ou verbo explícito de navegação/pesquisa;
- contexto automático não dispara mais navegação;
- a mensagem inicial não menciona DuckDuckGo;
- portais reconhecidos usam correspondência por palavra inteira;
- GitHub não é confundido com a entrada curta `ge`;
- referências a DuckDuckGo foram removidas do repositório.

Último commit:

```text
dae751d — fix: prevent automatic context from navigating browser
```

## 5. Variáveis de ambiente documentadas

O arquivo `.env.example` contém placeholders, nunca secrets reais:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
DATABASE_URL=""
DRIZZLE_DATABASE_URL=""
MANUS_API_URL=""
MANUS_API_KEY=""
MANUS_API_BROWSER_KEY=""
MANUS_PROJECT_ID=""
MANUS_JWT_SECRET=""
MANUS_PROJECT_OWNER_OPEN_ID=""
MANUS_OAUTH_PORTAL_URL=""
MANUS_OAUTH_API_URL=""
BROWSER_CHALLENGE_POLICY="stop_and_request_handoff"
BROWSER_HEADLESS="true"
```

`BROWSER_HEADLESS=false` pode ser usado somente quando o ambiente cloud possuir display disponível. O código não altera `navigator.webdriver` nem mascara fingerprint.

## 6. Como continuar em outra conta

1. Clonar o repositório:

```bash
git clone https://github.com/kvantjs/remix-remix-kopilot-ai.git
cd remix-remix-kopilot-ai
```

2. Instalar dependências:

```bash
npm install
```

3. Copiar o exemplo de ambiente:

```bash
cp .env.example .env
```

4. Preencher secrets somente no ambiente seguro da nova conta/Webdev. Não commitar `.env`.

5. Executar validações:

```bash
npm run lint
npm run build
```

6. Executar localmente:

```bash
npm run dev
```

7. Continuar a partir do commit `dae751d`.

## 7. Próximos passos recomendados

1. Reabrir o repositório no Webdev da nova conta.
2. Reconfigurar secrets pelo formulário seguro, nunca no chat.
3. Confirmar `DATABASE_URL` e executar readiness.
4. Confirmar OAuth e definir `MANUS_PROJECT_OWNER_OPEN_ID` quando necessário.
5. Testar o fluxo explícito `abrir github.com`.
6. Testar o fluxo `pesquisar na web e inspecionar a API do GitHub`.
7. Confirmar que o contexto automático não modifica a URL.
8. Se o GitHub apresentar desafio, realizar handoff humano autorizado; não tentar contornar o mecanismo.
9. Implementar as próximas integrações de serviço somente após confirmar conectores e secrets.
10. Não publicar publicamente sem revisar a configuração de publicação da nova conta.

## 8. Validações já realizadas

- `npm run lint`: aprovado em todas as fases recentes;
- `npm run build`: aprovado;
- APIs de projetos, membros e auditoria: testadas;
- busca federada por Wikimedia: testada com TypeScript;
- navegação direta para `example.com`: HTTP 200 e sem challenge;
- resolvedor de “GitHub” explicitamente: `https://github.com`;
- referências `duckduckgo` e `html/?q=` removidas do código fonte;
- challenge detector: testado;
- handoff sem `humanConfirmed=true`: corretamente bloqueado.

## 9. Histórico de commits importantes

- `7750f78` — `feat: add project roles members and audit log`
- `a9c9b31` — `feat: stop browser automation on anti-bot challenges`
- `63508f5` — `feat: replace captcha-prone search with public APIs`
- `b4a83fe` — `fix: preserve browser navigation for direct domains`
- `dae751d` — `fix: prevent automatic context from navigating browser`

## 10. Limitações importantes

- A aplicação não é uma cópia integral da infraestrutura proprietária do Kopilot; são implementações funcionais equivalentes dentro do projeto.
- APIs externas podem exigir secrets, OAuth, limites ou conectores próprios.
- CAPTCHA/Cloudflare não são removidos nem contornados.
- O GitHub pode desafiar qualquer ambiente por IP, sessão, frequência, cookies ou política própria.
- O modo de Preview local assume owner quando não há autenticação configurada; produção deve usar OAuth e membros persistidos.
- O repository é privado e nenhum secret real foi incluído.
