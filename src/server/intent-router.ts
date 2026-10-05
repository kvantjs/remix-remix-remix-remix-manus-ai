export type AgentIntentMode =
  | 'conversation'
  | 'web_research'
  | 'cloud_computer'
  | 'app_creation'
  | 'explicit_tool_call'
  | 'project_operation';

export type AgentIntent = {
  mode: AgentIntentMode;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  allowedTools: string[];
  requiresUserAction?: boolean;
};

const TOOL_ALIASES: Record<string, string> = {
  web_search: 'web_search',
  websearch: 'web_search',
  web_fetch: 'web_fetch',
  webfetch: 'web_fetch',
  bash_exec: 'bash_exec',
  bash: 'bash_exec',
  terminal: 'bash_exec',
  python_exec: 'python_exec',
  python: 'python_exec',
  file_list: 'file_list',
  file_read: 'file_read',
  file_write: 'file_write',
  file_delete: 'file_delete',
  browser_navigate: 'browser_navigate',
  browser_inspect: 'browser_inspect',
  browser_click: 'browser_click',
  browser_type: 'browser_type',
  browser_scroll: 'browser_scroll',
  browser_open_result: 'browser_open_result',
  job_create: 'job_create',
  job_status: 'job_status',
  job_cancel: 'job_cancel'
};

const ALL_TOOLS = Object.values(TOOL_ALIASES).filter((name, index, list) => list.indexOf(name) === index);
const WEB_TOOLS = ['web_search', 'web_fetch', 'browser_navigate', 'browser_inspect', 'browser_click', 'browser_scroll', 'browser_open_result'];
const COMPUTER_TOOLS = [...WEB_TOOLS, 'browser_click', 'browser_type', 'bash_exec', 'python_exec', 'file_list', 'file_read', 'file_write', 'file_delete', 'job_create', 'job_status', 'job_cancel'];
const APP_TOOLS = ['file_list', 'file_read', 'file_write', 'bash_exec', 'python_exec', 'job_create', 'job_status', 'job_cancel'];
const PROJECT_TOOLS = ['file_list', 'file_read', 'file_write', 'file_delete', 'bash_exec', 'job_create', 'job_status', 'job_cancel'];

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function extractExplicitTools(text: string) {
  const found = new Set<string>();
  for (const [alias, canonical] of Object.entries(TOOL_ALIASES)) {
    const expression = new RegExp(`(?:^|[^a-z0-9_])${alias.replace('_', '[_. -]?')}[^a-z0-9_]?`, 'i');
    if (expression.test(text)) found.add(canonical);
  }
  return [...found];
}

export function classifyAgentIntent(message: string): AgentIntent {
  const text = String(message || '').trim();
  const lower = text.toLocaleLowerCase('pt-BR');
  const explicitTools = extractExplicitTools(lower);

  if (!text) {
    return { mode: 'conversation', confidence: 'high', reason: 'Mensagem vazia não autoriza execução.', allowedTools: [] };
  }

  const appCreation = hasAny(lower, [
    'crie um app', 'criar um app', 'crie uma aplicação', 'criar uma aplicação', 'desenvolva um app',
    'desenvolver uma aplicação', 'faça um site', 'fazer um site', 'crie um site', 'construa um site',
    'construir uma aplicação', 'programe', 'programar', 'implemente', 'implementar', 'escreva o código',
    'edite o código', 'modifique o arquivo', 'corrija o código', 'dashboard', 'landing page', 'react', 'typescript',
    '[contexto', 'contexto definido', 'contexto selecionado'
  ]);
  if (appCreation) {
    return { mode: 'app_creation', confidence: 'high', reason: 'Pedido contém intenção explícita de criar ou modificar software.', allowedTools: APP_TOOLS };
  }

  const projectOperation = hasAny(lower, [
    'snapshot', 'commit', 'checkpoint', 'versão do projeto', 'histórico do projeto', 'arquivo do projeto',
    'diff do arquivo', 'restaure o arquivo', 'sincronize com o github', 'push para o github'
  ]);
  if (projectOperation) {
    return { mode: 'project_operation', confidence: 'high', reason: 'Pedido trata do ciclo de vida de projeto, arquivo ou versão.', allowedTools: PROJECT_TOOLS, requiresUserAction: hasAny(lower, ['restaure', 'apague', 'delete', 'push', 'sincronize']) };
  }

  const cloudComputer = hasAny(lower, [
    'computador na nuvem', 'computador do agente', 'máquina virtual', 'terminal bash', 'execute no terminal',
    'rode no terminal', 'comando shell', 'shell linux', 'navegador do agente', 'browser do agente',
    'clique em', 'preencha o formulário', 'digite no site', 'abra no navegador', 'acesse o site',
    'leia o arquivo', 'liste os arquivos', 'grave o arquivo', 'escreva no arquivo', 'sistema de arquivos',
    'npx', 'playwright install', 'playwright', 'bash', 'terminal', 'instalar'
  ]);
  if (cloudComputer) {
    return { mode: 'cloud_computer', confidence: 'high', reason: 'Pedido autoriza uma operação no computador ou navegador da nuvem.', allowedTools: COMPUTER_TOOLS };
  }

  if (explicitTools.length > 0 && hasAny(lower, ['ferramenta', 'tool', 'mcp', 'chame', 'execute', 'rode', 'use'])) {
    return { mode: 'explicit_tool_call', confidence: 'high', reason: 'Usuário nomeou explicitamente uma ferramenta e solicitou sua chamada.', allowedTools: explicitTools };
  }

  const research = hasAny(lower, [
    'pesquise', 'pesquisar', 'busque', 'buscar', 'procure', 'pesquisa na web', 'informação atual',
    'notícias', 'noticias', 'preço atual', 'cotação', 'fonte', 'fontes', 'o que aconteceu hoje',
    'consulte a internet', 'verifique na web', 'compare dados atuais'
  ]);
  if (research) {
    return { mode: 'web_research', confidence: 'high', reason: 'Pedido solicita informação externa, atual ou verificável na web.', allowedTools: WEB_TOOLS };
  }

  return {
    mode: 'conversation',
    confidence: 'medium',
    reason: 'Nenhum verbo de ação operacional foi detectado; responder sem executar ferramentas.',
    allowedTools: []
  };
}

export function isToolAllowed(intent: AgentIntent, toolName: string) {
  const canonical = TOOL_ALIASES[toolName] || toolName;
  return intent.allowedTools.includes(canonical);
}

export function filterToolDeclarations(intent: AgentIntent, declarations: any[]) {
  if (intent.mode === 'conversation') return [];
  return declarations.filter((declaration) => isToolAllowed(intent, declaration.name));
}

export function buildIntentInstruction(intent: AgentIntent) {
  const tools = intent.allowedTools.length ? intent.allowedTools.join(', ') : 'nenhuma';
  return `\n\nROTEADOR RIGOROSO DE INTENÇÃO — MODO ATIVO: ${intent.mode.toUpperCase()}\nMotivo: ${intent.reason}\nFerramentas autorizadas neste turno: ${tools}.\nREGRAS INVIOLÁVEIS:\n1. Não confunda conversa com autorização operacional. Em CONVERSATION, responda em linguagem natural e não chame ferramentas, navegador, terminal ou filesystem.\n2. Em WEB_RESEARCH, utilize web_search ou browser_search para obter resultados, LEIA o conteúdo da página acessada, PENSE e ANALISE criticamente as informações coletadas e elabore uma resposta rica, completa e sintetizada. Se necessário, acesse links adicionais com web_fetch ou browser_navigate para aprofundar seu conhecimento antes de concluir.\n3. Em CLOUD_COMPUTER, execute somente ações no computador/navegador descritas pelo usuário; não transforme uma pergunta em criação de software.\n4. Em APP_CREATION, trate a mensagem como engenharia de software; leia arquivos atuais antes de editar, escreva código apenas nos arquivos necessários e valide o resultado. Não navegue na web por iniciativa própria.\n5. Em EXPLICIT_TOOL_CALL, chame somente a ferramenta nomeada; se o pedido estiver incompleto, peça esclarecimento em vez de escolher outra ferramenta.\n6. Em PROJECT_OPERATION, trate arquivos, snapshots, diffs e versões como operações de projeto; não publique, restaure ou faça push sem confirmação explícita do usuário.\n7. Nunca alegue que uma ferramenta foi executada se ela não aparecer em toolCalls com resultado real.\n8. Se a intenção mudar no meio da tarefa, pare e peça confirmação antes de trocar de modo.\n`;
}

export function conversationFallback(message = '', history: Array<{ role?: string; content?: string }> = []) {
  const clean = String(message || '').trim();
  const lower = clean.toLocaleLowerCase('pt-BR');
  const previousUserMessages = history.filter((item) => item?.role === 'user' && item.content).map((item) => String(item.content).trim());
  const previousAssistantMessages = history.filter((item) => item?.role === 'assistant' && item.content).map((item) => String(item.content).trim());
  const lastTopic = previousUserMessages.at(-1);

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hello)\b/i.test(clean)) {
    return 'Olá! Estou acompanhando o contexto desta conversa. Pode me dizer o que você quer entender ou resolver agora.';
  }
  if (/^(obrigad[oa]|valeu|thanks|perfeito|ótimo|otimo)\b/i.test(clean)) {
    return 'Por nada! Continuo com o contexto desta conversa e posso desenvolver o próximo ponto quando você quiser.';
  }
  if (/o que você pode fazer|o que voce pode fazer|que você faz|que voce faz|suas capacidades/i.test(lower)) {
    return 'Posso conversar, responder perguntas, pesquisar na web com o navegador real e executar tarefas autorizadas no computador ou no projeto.';
  }
  if (lower.includes('capital do brasil')) {
    return 'A capital do Brasil é **Brasília**.';
  }

  const isFollowUp = /\b(agora|então|entao|continue|continua|explique|explica|resuma|resumo|principais pontos|detalhe|detalhes|isso)\b/i.test(clean);
  const hasResearchContext = previousUserMessages.some((content) => /pesquis|busc|procur|fonte|web|internet|notícia|noticia/i.test(content));
  if (isFollowUp && hasResearchContext) {
    return `Continuando o contexto anterior: entendi que você quer desenvolver “${clean}”. Posso organizar a explicação em pontos, comparar argumentos e separar fatos de interpretações sem reiniciar a conversa.`;
  }

  if (lastTopic) {
    return `Entendi. Vou manter o contexto de “${lastTopic.slice(0, 160)}” enquanto respondo a esta nova mensagem: “${clean.slice(0, 240)}”.`;
  }
  return `Entendi sua mensagem: “${clean.slice(0, 300)}”. Vou responder diretamente dentro desta conversa, sem iniciar uma ação externa por conta própria.`;
}

export function allToolNames() {
  return ALL_TOOLS;
}
