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
  taskMode?: 'new_project' | 'edit_existing' | 'computer_action' | 'research' | 'conversation';
};

const TOOL_ALIASES: Record<string, string> = {
  web_search: 'web_search',
  websearch: 'web_search',
  'computer.browser_search': 'web_search',
  'computer.search': 'web_search',
  web_fetch: 'web_fetch',
  webfetch: 'web_fetch',
  'computer.browser_api_call': 'web_fetch',
  'computer.api_call': 'web_fetch',
  bash_exec: 'bash_exec',
  bash: 'bash_exec',
  terminal: 'bash_exec',
  'terminal.bash_exec': 'bash_exec',
  'terminal.exec': 'bash_exec',
  python_exec: 'python_exec',
  python: 'python_exec',
  file_list: 'file_list',
  'webdev.list_files': 'file_list',
  'webdev.list': 'file_list',
  file_read: 'file_read',
  'webdev.read_file': 'file_read',
  file_write: 'file_write',
  'webdev.write_file': 'file_write',
  'webdev.create_file': 'file_write',
  file_create_directory: 'file_create_directory',
  'webdev.create_folder': 'file_create_directory',
  'webdev.mkdir': 'file_create_directory',
  mkdir: 'file_create_directory',
  file_delete: 'file_delete',
  'webdev.delete_file': 'file_delete',
  webdev_secret_set: 'webdev_secret_set',
  'webdev.secret_set': 'webdev_secret_set',
  webdev_secret_get: 'webdev_secret_get',
  'webdev.secret_get': 'webdev_secret_get',
  webdev_snapshot: 'webdev_snapshot',
  'webdev.snapshot': 'webdev_snapshot',
  'webdev.version_snapshot': 'webdev_snapshot',
  webdev_rollback: 'webdev_rollback',
  'webdev.rollback': 'webdev_rollback',
  'webdev.version_rollback': 'webdev_rollback',
  browser_navigate: 'browser_navigate',
  'computer.browser_navigate': 'browser_navigate',
  'computer.navigate': 'browser_navigate',
  browser_inspect: 'browser_inspect',
  'computer.browser_inspect': 'browser_inspect',
  browser_click: 'browser_click',
  'computer.browser_click': 'browser_click',
  'computer.click': 'browser_click',
  browser_type: 'browser_type',
  'computer.browser_type': 'browser_type',
  'computer.type': 'browser_type',
  browser_scroll: 'browser_scroll',
  'computer.browser_scroll': 'browser_scroll',
  'computer.scroll': 'browser_scroll',
  browser_open_result: 'browser_open_result',
  'computer.browser_open_result': 'browser_open_result',
  job_create: 'job_create',
  job_status: 'job_status',
  job_cancel: 'job_cancel',
  subagent_parallel: 'subagent_parallel',
  skill_execute: 'skill_execute',
  'agent.skill_execute': 'skill_execute',
  'skill.execute': 'skill_execute'
};

const ALL_TOOLS = Object.values(TOOL_ALIASES).filter((name, index, list) => list.indexOf(name) === index);
const SKILL_TOOLS = ['skill_execute'];
const WEB_TOOLS = ['web_search', 'web_fetch', 'browser_navigate', 'browser_inspect', 'browser_click', 'browser_scroll', 'browser_open_result', ...SKILL_TOOLS];
const COMPUTER_TOOLS = [...WEB_TOOLS, 'browser_type', 'bash_exec', 'python_exec', 'job_create', 'job_status', 'job_cancel', 'subagent_parallel'];
const APP_TOOLS = ['file_list', 'file_read', 'file_write', 'file_create_directory', 'webdev_secret_set', 'webdev_secret_get', 'webdev_snapshot', 'webdev_rollback', 'bash_exec', 'python_exec', 'job_create', 'job_status', 'job_cancel', 'subagent_parallel', ...SKILL_TOOLS];
const PROJECT_TOOLS = ['file_list', 'file_read', 'file_write', 'file_create_directory', 'file_delete', 'webdev_secret_set', 'webdev_secret_get', 'webdev_snapshot', 'webdev_rollback', 'bash_exec', 'job_create', 'job_status', 'job_cancel', 'subagent_parallel', ...SKILL_TOOLS];

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => {
    const normalized = term.toLocaleLowerCase('pt-BR').trim();
    // Short tokens such as "ui", "ux" and "app" must not match inside
    // unrelated words (e.g. "inteligência" contains the letters "ui").
    if (normalized.length <= 3) {
      const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[^\p{L}\p{N}_])${escaped}(?:$|[^\p{L}\p{N}_])`, 'iu').test(text);
    }
    return text.includes(normalized);
  });
}

function extractExplicitTools(text: string) {
  const found = new Set<string>();
  for (const [alias, canonical] of Object.entries(TOOL_ALIASES)) {
    const expression = new RegExp(`(?:^|[^a-z0-9_])${alias.replace('_', '[_. -]?')}[^a-z0-9_]?`, 'i');
    if (expression.test(text)) found.add(canonical);
  }
  return [...found];
}

export function classifyAgentIntent(message: string, history: Array<{ role?: string; content?: string }> = []): AgentIntent {
  const text = String(message || '').trim();
  const lower = text.toLocaleLowerCase('pt-BR');
  const explicitTools = extractExplicitTools(lower);

  if (!text) {
    return { mode: 'conversation', confidence: 'high', reason: 'Mensagem vazia não autoriza execução.', allowedTools: [], taskMode: 'conversation' };
  }

  // 1. High Priority: Software, WebDev, UI and Website Creation/Modification
  const appCreationTerms = [
    'crie', 'criar', 'cria', 'faça', 'fazer', 'faz', 'monte', 'montar', 'desenvolva', 'desenvolver',
    'construa', 'construir', 'gere', 'gerar', 'programe', 'programar', 'implemente', 'implementar',
    'escreva o código', 'escreva código', 'edite o código', 'modifique o arquivo', 'corrija o código',
    'código', 'codigo', 'webdev', 'frontend', 'front-end', 'interface', 'ui', 'ux',
    'site', 'landing page', 'dashboard', 'ecommerce', 'e-commerce', 'loja', 'fintech', 'saas',
    'aplicação', 'aplicacao', 'aplicativo', 'app', 'react', 'typescript', 'página', 'pagina',
    'tela', 'portal', 'plataforma', 'componente', 'sistema', 'portfolio', 'portfólio',
    '[contexto', 'contexto definido', 'contexto selecionado'
  ];

  const hasAppCreation = hasAny(lower, appCreationTerms);
  const editTerms = ['edite', 'editar', 'edit', 'modifique', 'modificar', 'altere', 'alterar', 'corrija', 'corrigir', 'melhore', 'melhorar', 'ajuste', 'ajustar', 'remova', 'remover', 'adicione', 'adicionar', 'no site atual', 'na aplicação atual', 'no projeto atual', 'já existente'];
  const isExistingProjectEdit = hasAny(lower, editTerms) && (hasAppCreation || history.some(item => /site|aplicação|aplicacao|app|projeto|código|codigo/i.test(String(item.content || ''))));
  const hasSequentialCreationThenComputer = hasAppCreation && /(?:depois|após|apos|quando terminar|em seguida).*(?:computador|navegador|terminal)/i.test(lower);
  const isExplicitWebResearchOnly = (lower.includes('pesquise na web') || lower.includes('pesquisar na web') || lower.includes('busque na internet') || lower.includes('procure na web')) && !hasAppCreation;
  const isExplicitNewAppRequest = /(?:crie|criar|cria|faça|fazer|desenvolva|desenvolver|construa|construir|implemente|implementar|programe|programar)\s+(?:um|uma|o|a)?\s*(?:site|aplica(?:ção|cao)|app|aplicativo|dashboard|interface|sistema|plataforma|componente|landing|loja)/i.test(lower);
  const hasExplicitUrl = /(?:https?:\/\/|www\.)[^\s"'<>]+|\b[a-z0-9-]+\.(?:com|org|net|io|ai|dev|app|br|co|tv)(?:\.[a-z]{2,3})?(?:\/[^\s"'<>]*)?/i.test(lower);
  const isDirectNavigationRequest = hasExplicitUrl && hasAny(lower, [
    'acesse', 'acessar', 'abra', 'abrir', 'navegue', 'navegar', 'visite', 'visitar',
    'leia a página', 'leia a pagina', 'consulte a página', 'consulte a pagina', 'entre no site'
  ]);

  const research = hasAny(lower, [
    'pesquise', 'pesquisar', 'busque', 'buscar', 'procure', 'pesquisa na web', 'informação atual',
    'notícias', 'noticias', 'preço atual', 'cotação', 'fonte', 'fontes', 'o que aconteceu hoje',
    'consulte a internet', 'verifique na web', 'compare dados atuais', 'site oficial', 'documentação'
  ]);

  const cloudComputer = hasAny(lower, [
    'computador na nuvem', 'computador do agente', 'máquina virtual', 'terminal bash', 'execute no terminal',
    'rode no terminal', 'comando shell', 'shell linux', 'navegador do agente', 'browser do agente',
    'clique em', 'preencha o formulário', 'digite no site', 'abra no navegador', 'acesse o site',
    'leia o arquivo', 'liste os arquivos', 'grave o arquivo', 'escreva no arquivo', 'sistema de arquivos',
    'npx', 'playwright install', 'playwright', 'bash', 'terminal', 'computador'
  ]);

  // Uma URL explícita com verbo operacional é navegação real, mesmo que a frase
  // também contenha termos amplos como "site", "página" ou "portal".
  if (isDirectNavigationRequest && !isExplicitNewAppRequest) {
    return { mode: 'cloud_computer', confidence: 'high', reason: 'URL explícita e ação de navegação autorizam acesso real pelo Playwright.', allowedTools: COMPUTER_TOOLS, taskMode: 'computer_action' };
  }

  // STRICTOR RULE: If user explicitly mentions "computador" or "pesquisa/busca", PRIORITIZE these over app_creation
  // This prevents "Faça uma pesquisa" from being classified as app_creation just because of "Faça".
  // RIGOROUS REDIRECT: When mentions search or computer, DO NOT allow webdev creation.
  if (research || cloudComputer) {
    if (cloudComputer && !hasSequentialCreationThenComputer) {
      return { mode: 'cloud_computer', confidence: 'high', reason: 'Pedido autoriza uma operação no computador ou navegador da nuvem; criação e edição permanecem separadas deste turno.', allowedTools: COMPUTER_TOOLS, taskMode: 'computer_action' };
    }
    if (research && !isExplicitNewAppRequest) {
      return { mode: 'web_research', confidence: 'high', reason: 'Pedido solicita informação externa, atual ou verificável na web (Prioridade Total - Proibido WebDev).', allowedTools: WEB_TOOLS, taskMode: 'research' };
    }
  }

  if (hasAppCreation && !isExplicitWebResearchOnly) {
    return { 
      mode: 'app_creation', 
      confidence: 'high', 
      reason: isExistingProjectEdit ? 'Edição explícita de projeto existente; preservar arquivos e alterar somente o escopo solicitado.' : hasSequentialCreationThenComputer ? 'Duas fases detectadas: criar primeiro; Computer MCP somente em uma mensagem operacional posterior.' : 'Criação de um projeto novo com identidade visual e arquivos próprios.',
      allowedTools: APP_TOOLS,
      taskMode: isExistingProjectEdit ? 'edit_existing' : 'new_project'
    };
  }

  const projectOperation = hasAny(lower, [
    'snapshot', 'commit', 'checkpoint', 'versão do projeto', 'histórico do projeto', 'arquivo do projeto',
    'diff do arquivo', 'restaure o arquivo', 'sincronize com o github', 'push para o github'
  ]);
  if (projectOperation) {
    return { mode: 'project_operation', confidence: 'high', reason: 'Pedido trata do ciclo de vida de projeto, arquivo ou versão.', allowedTools: PROJECT_TOOLS, requiresUserAction: hasAny(lower, ['restaure', 'apague', 'delete', 'push', 'sincronize']) };
  }

  if (explicitTools.length > 0 && hasAny(lower, ['ferramenta', 'tool', 'mcp', 'chame', 'execute', 'rode', 'use'])) {
    return { mode: 'explicit_tool_call', confidence: 'high', reason: 'Usuário nomeou explicitamente uma ferramenta e solicitou sua chamada.', allowedTools: explicitTools };
  }

  return {
    mode: 'conversation',
    confidence: 'medium',
    reason: 'Nenhum verbo de ação operacional foi detectado; responder sem executar ferramentas.',
    allowedTools: [],
    taskMode: 'conversation'
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
  return `\n\nROTEADOR RIGOROSO DE INTENÇÃO — MODO ATIVO: ${intent.mode.toUpperCase()}\nMotivo: ${intent.reason}\nFerramentas autorizadas neste turno: ${tools}.\nREGRAS INVIOLÁVEIS:\n1. Não confunda conversa com autorização operacional. Em CONVERSATION, responda em linguagem natural e não chame ferramentas, navegador, terminal ou filesystem.\n2. Em WEB_RESEARCH, utilize web_search ou browser_search para obter resultados, LEIA o conteúdo da página acessada, PENSE e ANALISE criticamente as informações coletadas e elabore uma resposta rica, completa e sintetizada. Se necessário, acesse links adicionais com web_fetch ou browser_navigate para aprofundar seu conhecimento antes de concluir.\n3. Em CLOUD_COMPUTER, execute somente ações no computador/navegador descritas pelo usuário; não transforme uma pergunta em criação de software.\n4. Em APP_CREATION, crie aplicações e sites React+Vite ULTRA COMPLETOS DO ZERO para cada solicitação, sem repetir interfaces. O site DEVE ter fundo próprio e visível (nunca o padrão da aplicação). Escreva o código completo, rico em recursos e de verdade (sem simulações vazias ou parciais). Crie múltiplos arquivos e pastas estruturados se necessário (README.md completo e detalhado, .md de documentação, tipos .ts, metadata.json, etc.), defina e importe no topo todos os ícones utilizados no JSX (incluindo TrendUp as TrendingUp). Não navegue na web por iniciativa própria.\n5. Em EXPLICIT_TOOL_CALL, chame somente a ferramenta nomeada; se o pedido estiver incompleto, peça esclarecimento em vez de escolher outra ferramenta.\n6. Em PROJECT_OPERATION, trate arquivos, snapshots, diffs e versões como operações de projeto; não publique, restaure ou faça push sem confirmação explícita do usuário.\n7. Nunca alegue que uma ferramenta foi executada se ela não aparecer em toolCalls com resultado real.\n8. Se a intenção mudar no meio da tarefa, pare e peça confirmação antes de trocar de modo.\n9. taskMode=new_project significa composição nova mesmo quando o prompt se repete; não copie o projeto atual.\n10. taskMode=edit_existing exige leitura, diff mínimo e preservação do que não foi pedido.\n11. Em criação seguida de computador, conclua WebDev primeiro e aguarde nova mensagem para Computer MCP.\n12. Antes de finalizar, valide manifesto, fundo próprio, imports, interações e compilação do preview.\n`;
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
