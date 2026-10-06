/**
 * Agent Skills (Habilidades & Treinamento Autônomo de Ponta)
 * 10 Habilidades exclusivas integradas ao Agente para domínio total do ciclo de vida
 */

export interface AgentSkill {
  id: string;
  name: string;
  category: 'frontend' | 'backend' | 'devops' | 'automation' | 'architecture';
  description: string;
  version: string;
  mcpServers: ('Computer' | 'WebDev' | 'Terminal Bash')[];
  capabilities: string[];
  systemInstruction: string;
}

const CORE_AGENT_SKILLS: AgentSkill[] = [
  {
    id: 'skill-design-to-code',
    name: 'Design-to-Code & Vibecoding de Alta Fidelidade',
    category: 'frontend',
    version: '2.4.0',
    mcpServers: ['WebDev'],
    description: 'Transformação autônoma de requisitos em interfaces React modernas criadas do zero, com identidade única, sem repetição de templates, fundo próprio obrigatório e micro-interações dinâmicas.',
    capabilities: [
      'Criação de interfaces únicas do zero para cada site sem repetir o mesmo design',
      'Fundo próprio obrigatório estilizado no elemento raiz (sem herdar fundo padrão da aplicação)',
      'Definição e importação estrita de todos os ícones no topo (incluindo TrendUp as TrendingUp)',
      'Uso disciplinado de tokens Tailwind CSS com contraste elevado e regra 60-30-10',
      'Estados dinâmicos, modais, formulários interativos e cálculos em tempo real'
    ],
    systemInstruction: `[SKILL: DESIGN_TO_CODE]
Ao criar ou editar interfaces:
1. NUNCA repita a mesma interface para o mesmo tipo de site. Crie SEMPRE uma interface do zero e exclusiva para cada caso, variando layout, disposição, paleta e componentes.
2. O SITE DEVE TER FUNDO PRÓPRIO E VISÍVEL: O elemento raiz DEVE conter um fundo estilizado próprio (ex: min-h-screen w-full bg-[#...] ou bg-gradient-to-... com texturas e contraste) e NUNCA pode usar o fundo padrão neutro da aplicação.
3. Toda interface DEVE ser 100% funcional e reativa: botões clicáveis, abas funcionais, filtros dinâmicos, modais com formulários e cálculos instantâneos.
4. DEFINIÇÃO DE ÍCONES: Sempre importe e defina explicitamente no topo do arquivo TODOS os ícones utilizados no JSX. Se utilizar ícones de subida/tendência, importe explicitamente 'TrendUp, TrendUp as TrendingUp' de '@phosphor-icons/react' ou 'TrendingUp' de 'lucide-react'. NUNCA deixe o TrendingUp indefinido no código.
5. Sincronize com o WebDev MCP gravando o código em client/src/App.tsx.`
  },
  {
    id: 'skill-fullstack-architecture',
    name: 'Arquitetura Fullstack e Modularidade Multi-Arquivo',
    category: 'architecture',
    version: '3.1.0',
    mcpServers: ['WebDev'],
    description: 'Criação e organização de projetos completos com estruturas de pastas, componentes reutilizáveis, tipos TypeScript e hooks customizados.',
    capabilities: [
      'Estruturação de pastas: client/src/components, client/src/hooks, client/src/types, client/src/utils',
      'Gerenciamento de estado reativo com useState, useMemo, useCallback e useReducer',
      'Contratos de tipos TypeScript estritos e seguros',
      'Isolamento e desacoplamento de lógica de negócio em hooks e serviços'
    ],
    systemInstruction: `[SKILL: FULLSTACK_ARCHITECTURE]
Ao arquitetar aplicações:
1. Crie arquivos e pastas conforme necessário usando webdev.create_folder e webdev.create_file.
2. Divida componentes complexos em partes reutilizáveis (Header, Sidebar, StatsGrid, DataTable, ActionModal).
3. Mantenha client/src/App.tsx como ponto de entrada principal, importando e orquestrando os subcomponentes.`
  },
  {
    id: 'skill-browser-automation',
    name: 'Automação de Navegador Real & Web Crawling Profundo',
    category: 'automation',
    version: '4.0.0',
    mcpServers: ['Computer'],
    description: 'Navegação em páginas reais via Playwright Chromium, busca orgânica na web, inspeção de DOM, extração de dados e interação ao vivo com sites.',
    capabilities: [
      'Navegação por URLs reais com renderização de JavaScript e captura de screenshots',
      'Pesquisa na web via mecanismo autônomo com leitura profunda do conteúdo das fontes',
      'Cliques, preenchimento de formulários, rolagem e inspeção de elementos interativos',
      'Superação de desafios anti-bot com solicitação de aprovação humana estruturada'
    ],
    systemInstruction: `[SKILL: BROWSER_AUTOMATION]
Ao realizar pesquisas ou interações na web:
1. Use computer.browser_search ou computer.browser_navigate para acessar a URL real.
2. Leia o conteúdo retornado, inspecione a estrutura da página e extraia as informações precisas solicitadas.
3. Sintetize os dados coletados citando as fontes com título e domínio limpo.`
  },
  {
    id: 'skill-runtime-debugging',
    name: 'Auto-Cura e Depuração de Runtime em Tempo Real',
    category: 'devops',
    version: '2.8.0',
    mcpServers: ['WebDev', 'Terminal Bash'],
    description: 'Interceptação automática de erros de compilação Babel, falhas de tipo TypeScript e exceções de runtime com correção recursiva imediata.',
    capabilities: [
      'Detecção e tratamento de ícones ou componentes ausentes com proxies de fallback',
      'Correção de imports incorretos ou tipos inválidos em arquivos TSX',
      'Validação de sintaxe antes de sincronizar com o runtime preview',
      'Garantia de zero crashes com Error Boundaries integrados'
    ],
    systemInstruction: `[SKILL: RUNTIME_DEBUGGING]
Ao identificar erros ou inconsistências:
1. Analise a mensagem de erro exata (Babel, TypeScript ou Runtime Exception).
2. Localize a linha causadora e aplique a correção pontual no arquivo afetado via webdev.write_file.
3. Valide que a compilação no preview de runtime foi restabelecida com 0 erros.`
  },
  {
    id: 'skill-terminal-sysadmin',
    name: 'Engenharia Linux & Controle Shell no Terminal Bash',
    category: 'devops',
    version: '3.5.0',
    mcpServers: ['Terminal Bash'],
    description: 'Execução de comandos de alta complexidade no ambiente Linux: inspeção de processos, diagnósticos de rede, gerenciamento de pacotes e automações.',
    capabilities: [
      'Execução de comandos bash (ls, curl, jq, node, npm, pnpm, bun, git, ps)',
      'Diagnósticos de hardware, consumo de memória RAM, CPU e portas de rede',
      'Execução de scripts de build, testes automatizados e pipelines de dados',
      'Sandbox segura com proteção contra comandos destrutivos'
    ],
    systemInstruction: `[SKILL: TERMINAL_SYSADMIN]
Ao executar operações no terminal:
1. Use terminal.bash_exec para comandos shell no container.
2. Formate e explique os resultados do stdout/stderr de maneira clara e escaneável.
3. Utilize timeouts adequados e valide o exitCode de cada comando executado.`
  },
  {
    id: 'skill-api-integration',
    name: 'Integração de APIs REST, Webhooks & Serviços Externos',
    category: 'backend',
    version: '2.2.0',
    mcpServers: ['Computer', 'WebDev'],
    description: 'Conexão e consumo de APIs externas públicas e privadas (GitHub REST, Stripe, OpenWeather, CoinGecko, APIs HTTP) com tolerância a falhas.',
    capabilities: [
      'Chamadas HTTP GET/POST/PUT com headers e payloads estruturados',
      'Tratamento de status HTTP, headers de rate limit e paginação',
      'Mapeamento de payloads JSON para interfaces TypeScript',
      'Mock e simulação de dados realistas para desenvolvimento offline'
    ],
    systemInstruction: `[SKILL: API_INTEGRATION]
Ao conectar a APIs externas:
1. Use computer.browser_api_call ou web_fetch para requisições HTTP reais.
2. Trate timeouts, erros 4xx/5xx e exiba dados com formatação monetária e de data adequada.`
  },
  {
    id: 'skill-git-version-control',
    name: 'Controle de Versão Git, Snapshots & Rollback',
    category: 'architecture',
    version: '2.0.0',
    mcpServers: ['WebDev'],
    description: 'Criação de checkpoints semânticos de código, visualização de diffs linha por linha e capacidade de reverter o workspace para versões anteriores.',
    capabilities: [
      'Criação automática de snapshots do projeto a cada modificação significativa',
      'Cálculo de diffs adicionados e removidos para visualização no workspace',
      'Rollback seguro para versões anteriores em caso de solicitação do usuário',
      'Registro de auditoria de alterações com autor e timestamp'
    ],
    systemInstruction: `[SKILL: GIT_VERSION_CONTROL]
Ao atualizar o workspace:
1. Registre pontos de versão claros com descrições semânticas.
2. Permita ao usuário inspecionar e reverter alterações através do WebDev MCP.`
  },
  {
    id: 'skill-context-specification',
    name: 'Mapeamento de Requisitos via Questionários Inteligentes',
    category: 'automation',
    version: '1.9.0',
    mcpServers: ['WebDev'],
    description: 'Extração estruturada de nicho, direção visual, paletas de cores e regras de negócio através de questionários dinâmicos embutidos no chat.',
    capabilities: [
      'Apresentação de questionários de múltipla escolha com opções contextuais',
      'Tradução das respostas do usuário em diretrizes arquiteturais para o código',
      'Execução em segundo plano enquanto o usuário seleciona as preferências',
      'Sincronização instantânea das escolhas com o plano do agente'
    ],
    systemInstruction: `[SKILL: CONTEXT_SPECIFICATION]
Quando a solicitação do usuário for ampla ou genérica:
1. Solicite contexto através do questionário integrado.
2. Quando as preferências forem submetidas, aplique-as imediatamente na identidade visual e no código da aplicação.`
  },
  {
    id: 'skill-secrets-environment',
    name: 'Gerenciamento Seguro de Segredos e Variáveis de Ambiente',
    category: 'backend',
    version: '2.1.0',
    mcpServers: ['WebDev'],
    description: 'Armazenamento e injeção segura de chaves de API, segredos e tokens no runtime sem expor credenciais no código-fonte do frontend.',
    capabilities: [
      'Gerenciamento de segredos via webdev.secret_set e webdev.secret_get',
      'Ofuscação automática de credenciais nos logs e respostas de chat',
      'Proxy seguro no backend Express para requisições autenticadas',
      'Compatibilidade total com variáveis de ambiente .env'
    ],
    systemInstruction: `[SKILL: SECRETS_ENVIRONMENT]
Ao manipular chaves e variáveis sensíveis:
1. Nunca exponha chaves de API no código do cliente React.
2. Use rotas proxy no backend ou armazene segredos com webdev.secret_set.`
  },
  {
    id: 'skill-continuous-learning',
    name: 'Aprendizado Contínuo e Adaptação às Preferências do Usuário',
    category: 'automation',
    version: '3.0.0',
    mcpServers: ['WebDev', 'Computer', 'Terminal Bash'],
    description: 'Treinamento contínuo baseado no histórico da sessão, absorvendo padrões de código, paletas preferidas e comandos frequentes do usuário.',
    capabilities: [
      'Preservação e reutilização de estados anteriores na mesma conversa',
      'Adaptação ao idioma e tom do usuário (Português/Inglês)',
      'Refinamento progressivo do código a cada nova solicitação',
      'Registro de métricas de acurácia e tempo de execução'
    ],
    systemInstruction: `[SKILL: CONTINUOUS_LEARNING]
Em todas as interações:
1. Mantenha o contexto completo da conversa e preserve o trabalho já construído a menos que o usuário peça uma recriação total.
2. Evolua a aplicação iterativamente mantendo consistência visual e funcional.`
  }
];

type AdvancedSkillTuple = [string, string, AgentSkill['category'], AgentSkill['mcpServers'], string, string[], string];
type AdvancedSkillSpec = Omit<AgentSkill, 'id' | 'version'> & { slug: string };
const ADVANCED_SKILL_SPECS: AdvancedSkillSpec[] = ([
  ['product-requirements', 'Engenharia de Requisitos e Critérios de Aceite', 'architecture', ['WebDev'], 'Converte pedidos vagos em escopo verificável.', ['escopo', 'restrições', 'aceite'], 'Transforme o pedido em critérios de aceite antes de criar.'],
  ['ux-information-architecture', 'Arquitetura de Informação e Jornadas UX', 'frontend', ['WebDev'], 'Organiza navegação, hierarquia e estados de produto.', ['rotas', 'hierarquia', 'estados'], 'Modele jornada principal, vazio, carregamento, erro e confirmação.'],
  ['responsive-layout', 'Layout Responsivo Multidispositivo', 'frontend', ['WebDev'], 'Garante composição em desktop, tablet e mobile.', ['breakpoints', 'grids fluidos', 'touch targets'], 'Valide 375px, 768px e desktop sem larguras frágeis.'],
  ['accessibility-wcag', 'Acessibilidade WCAG e Teclado', 'frontend', ['WebDev'], 'Aplica semântica, foco, contraste e navegação acessível.', ['aria', 'foco', 'contraste'], 'Todo controle deve ter nome, foco visível e estado acessível.'],
  ['design-tokens', 'Design Tokens e Sistema Visual', 'frontend', ['WebDev'], 'Cria tokens consistentes de cor, tipografia e espaçamento.', ['paleta', 'tipografia', 'tokens'], 'Defina identidade visual própria antes dos componentes.'],
  ['visual-assets', 'Direção de Arte e Ativos Visuais', 'frontend', ['WebDev', 'Computer'], 'Seleciona ícones, imagens e ilustrações coerentes.', ['iconografia', 'imagens', 'fallback'], 'Use ativos relevantes e mantenha fallback acessível.'],
  ['forms-validation', 'Formulários, Validação e Feedback', 'frontend', ['WebDev'], 'Implementa formulários com estados e feedback completos.', ['campos', 'submit', 'feedback'], 'Valide, preserve entradas e mostre sucesso ou erro no fluxo.'],
  ['state-management', 'Modelagem de Estado React', 'frontend', ['WebDev'], 'Evita estado duplicado, loops e efeitos inseguros.', ['useState', 'reducer', 'memoização'], 'Mantenha uma fonte de verdade e derive filtros e totais.'],
  ['data-visualization', 'Visualização de Dados e Métricas', 'frontend', ['WebDev'], 'Transforma dados em gráficos, tabelas e métricas compreensíveis.', ['escalas', 'vazio', 'tooltips'], 'Explique unidades e ausência de dados sem inventar precisão.'],
  ['ecommerce-flows', 'Fluxos de Comércio e Checkout', 'frontend', ['WebDev'], 'Implementa catálogo, carrinho, cupons e checkout.', ['carrinho', 'totais', 'etapas'], 'Mantenha subtotal, desconto, frete e total consistentes.'],
  ['auth-rbac', 'Autenticação, Sessão e RBAC', 'backend', ['WebDev', 'Terminal Bash'], 'Projeta sessão, papéis e permissões com segurança.', ['roles', 'sessão', 'rotas protegidas'], 'Separe autenticação de autorização e não exponha segredos.'],
  ['database-schema', 'Modelagem de Dados e Migrações', 'backend', ['WebDev', 'Terminal Bash'], 'Define entidades, relações, índices e migrações.', ['relações', 'integridade', 'migração'], 'Documente invariantes, índices e compatibilidade.'],
  ['api-contract-testing', 'Contratos de API e Integração Resiliente', 'backend', ['WebDev', 'Computer'], 'Integra APIs com schemas, timeouts e rate limits.', ['schemas', 'retry', 'paginação'], 'Valide status, payload e limites antes de consumir dados.'],
  ['performance-budget', 'Performance, Bundle e Renderização', 'devops', ['WebDev', 'Terminal Bash'], 'Controla peso, carregamento e re-renderizações.', ['bundle', 'lazy loading', 'profiling'], 'Proteja o caminho crítico e evite trabalho caro por render.'],
  ['seo-metadata', 'SEO Técnico e Compartilhamento Social', 'frontend', ['WebDev'], 'Adiciona semântica, metadados e previews sociais.', ['title', 'canonical', 'Open Graph'], 'Cada rota pública deve ser indexável e descritiva.'],
  ['i18n-localization', 'Internacionalização e Localização', 'frontend', ['WebDev'], 'Prepara idioma, moeda, datas e pluralização.', ['Intl', 'locale', 'fallback'], 'Use Intl e preserve o idioma solicitado.'],
  ['error-observability', 'Observabilidade, Logs e Diagnóstico', 'devops', ['WebDev', 'Terminal Bash'], 'Instrumenta erros e logs acionáveis sem vazar dados.', ['correlation id', 'logs', 'boundary'], 'Registre contexto útil sem segredos ou dados sensíveis.'],
  ['testing-qa', 'QA, Testes de Fluxo e Regressão', 'devops', ['WebDev', 'Terminal Bash'], 'Valida compilação, interações e regressões.', ['smoke', 'bordas', 'visual'], 'Teste caminho principal, erro, vazio, mobile e repetição.'],
  ['migration-refactor', 'Refatoração e Migração Segura', 'architecture', ['WebDev', 'Terminal Bash'], 'Evolui projetos sem apagar comportamento não solicitado.', ['diff', 'compatibilidade', 'rollback'], 'Leia dependências, preserve contratos e valide o diff.'],
  ['documentation-release', 'Documentação, Changelog e Entrega', 'architecture', ['WebDev'], 'Documenta estrutura, instalação, comandos e limites.', ['README', 'manifesto', 'release'], 'Entregue documentação que permita executar e manter o projeto.'],
  ['realtime-collaboration', 'Sincronização em Tempo Real e Concorrência', 'automation', ['WebDev', 'Computer'], 'Projeta eventos ao vivo, reconciliação e conflitos.', ['conexão', 'ordenação', 'conflito'], 'Mostre status e não sobrescreva mudanças silenciosamente.'],
  ['runtime-security', 'Segurança do Runtime e Isolamento de Preview', 'devops', ['WebDev', 'Terminal Bash'], 'Reduz riscos de CSS global, XSS e vazamento de ambiente.', ['escopo', 'sanitização', 'segredos'], 'Isole preview, bloqueie segredos e trate código gerado como não confiável.']
] as AdvancedSkillTuple[]).map(([slug, name, category, mcpServers, description, capabilities, instruction]) => ({ slug, name, category, mcpServers, description, capabilities, systemInstruction: `[SKILL: ${slug.toUpperCase().replace(/-/g, '_')}]
${instruction}` }));
const ADVANCED_AGENT_SKILLS: AgentSkill[] = ADVANCED_SKILL_SPECS.map(({ slug, ...skill }) => ({ ...skill, id: `skill-${slug}`, version: '1.0.0' }));
export const AGENT_SKILLS: AgentSkill[] = [...CORE_AGENT_SKILLS, ...ADVANCED_AGENT_SKILLS];

export function getSkillsSummary(): string {
  return AGENT_SKILLS.map((s, i) => `${i + 1}. **${s.name}** (v${s.version}) [MCP: ${s.mcpServers.join(', ')}]\n   ${s.description}`).join('\n\n');
}

export function buildSkillsSystemInstruction(): string {
  return `\n\n--- HABILIDADES DE PONTA (32 SKILLS ATIVAS NO AGENTE) ---\n` +
    AGENT_SKILLS.map(s => s.systemInstruction).join('\n\n');
}
