import fs from 'fs/promises';
import path from 'path';
import { executeSandboxCommand } from './sandbox-executor.js';
import { redactSecrets, SANDBOX_WORKSPACE_ROOT, resolveSafeSandboxPath } from './security.js';
import { subagentOrchestrator } from './subagent-orchestrator.js';

export type ExecutableSkillId =
  | 'autonomous-architecture-design'
  | 'design-to-code-mastery'
  | 'recursive-debugging'
  | 'context-synthesis'
  | 'real-time-collaboration'
  | 'performance-optimization'
  | 'security-hardening'
  | 'multi-agent-coordination'
  | 'environment-management'
  | 'heuristic-ux-audit';

type SkillContext = {
  request?: string;
  answers?: Record<string, unknown>;
  files?: Record<string, string>;
  options?: Record<string, unknown>;
};

type Evidence = {
  check: string;
  status: 'passed' | 'warning' | 'failed' | 'not_run';
  detail: string;
  data?: unknown;
};

export type SkillExecution = {
  skillId: ExecutableSkillId;
  name: string;
  status: 'succeeded' | 'partial' | 'failed' | 'dispatched';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: string;
  findings: string[];
  evidence: Evidence[];
  artifacts: Array<{ name: string; path: string; content: string }>;
  nextActions: string[];
  jobId?: string;
};

type SkillDefinition = {
  id: ExecutableSkillId;
  name: string;
  version: string;
  purpose: string;
  inputContract: string[];
  execute: (ctx: SkillContext) => Promise<SkillExecution>;
};

const SKILLS: Array<Omit<SkillDefinition, 'execute'>> = [
  { id: 'autonomous-architecture-design', name: 'Autonomous Architecture Design', version: '1.0.0', purpose: 'Mapeia o projeto, dependências, limites e critérios de uma arquitetura SaaS/Fintech de produção.', inputContract: ['request opcional', 'files opcionais', 'options.targetStack opcional'] },
  { id: 'design-to-code-mastery', name: 'Design-to-Code Mastery', version: '1.0.0', purpose: 'Audita a tradução de requisitos visuais para componentes React responsivos e funcionais.', inputContract: ['request opcional', 'files opcionais', 'options.reference opcional'] },
  { id: 'recursive-debugging', name: 'Recursive Debugging', version: '1.0.0', purpose: 'Executa validações, localiza falhas e repete diagnósticos com limite explícito.', inputContract: ['request opcional', 'options.command opcional', 'options.maxAttempts opcional'] },
  { id: 'context-synthesis', name: 'Context Synthesis', version: '1.0.0', purpose: 'Transforma respostas de questionário em requisitos, decisões, lacunas e critérios de aceite.', inputContract: ['request opcional', 'answers opcional'] },
  { id: 'real-time-collaboration', name: 'Real-Time Collaboration', version: '1.0.0', purpose: 'Mantém estado de sessão, sequência de eventos e reconciliação sem sobrescrita silenciosa.', inputContract: ['options.sessionId opcional', 'options.events opcional'] },
  { id: 'performance-optimization', name: 'Performance Optimization', version: '1.0.0', purpose: 'Mede orçamento de bundle, sinais de renderização e gargalos de build sem inventar métricas.', inputContract: ['request opcional', 'files opcionais', 'options.buildCommand opcional'] },
  { id: 'security-hardening', name: 'Security Hardening', version: '1.0.0', purpose: 'Procura segredos expostos, XSS óbvio, SSRF, permissões frágeis e vazamento de ambiente.', inputContract: ['request opcional', 'files opcionais'] },
  { id: 'multi-agent-coordination', name: 'Multi-Agent Coordination', version: '1.0.0', purpose: 'Decompõe trabalho independente, despacha subagentes e retorna um job rastreável.', inputContract: ['request obrigatório', 'options.tasks opcional', 'options.maxConcurrency opcional'] },
  { id: 'environment-management', name: 'Environment Management', version: '1.0.0', purpose: 'Relata backend, workspace, variáveis permitidas e saúde do runtime isolado.', inputContract: ['request opcional'] },
  { id: 'heuristic-ux-audit', name: 'Heuristic UX Audit', version: '1.0.0', purpose: 'Avalia fluxos, estados, acessibilidade, feedback e consistência contra heurísticas práticas.', inputContract: ['request opcional', 'files opcionais'] }
];

const started = () => new Date().toISOString();
function finish(startAt: string, base: Omit<SkillExecution, 'startedAt' | 'finishedAt' | 'durationMs'>): SkillExecution {
  const finishedAt = new Date().toISOString();
  return { ...base, startedAt: startAt, finishedAt, durationMs: Math.max(0, Date.parse(finishedAt) - Date.parse(startAt)) };
}
function fileMap(ctx: SkillContext): Record<string, string> {
  return Object.fromEntries(Object.entries(ctx.files || {}).map(([name, content]) => [name.replaceAll('\\', '/'), String(content).slice(0, 200000)]));
}
function evidence(check: string, status: Evidence['status'], detail: string, data?: unknown): Evidence { return { check, status, detail, data }; }
function artifact(name: string, content: string): { name: string; path: string; content: string } { return { name, path: `artifacts/skills/${name}`, content }; }
function result(id: ExecutableSkillId, name: string, startAt: string, status: SkillExecution['status'], summary: string, findings: string[], evidenceList: Evidence[], nextActions: string[] = [], artifacts: SkillExecution['artifacts'] = [], jobId?: string): SkillExecution {
  return finish(startAt, { skillId: id, name, status, summary, findings, evidence: evidenceList, artifacts, nextActions, ...(jobId ? { jobId } : {}) });
}

function architectureSkill(ctx: SkillContext, startAt: string) {
  return (async () => {
    const files = fileMap(ctx);
    const packageJson = files['package.json'] ? JSON.parse(files['package.json']) : null;
    const sourceFiles = Object.keys(files).filter(name => /\.(ts|tsx|js|jsx|py|go|rb)$/.test(name));
    const layers = {
      presentation: sourceFiles.filter(name => /components|pages|app|client|frontend/i.test(name)),
      server: sourceFiles.filter(name => /server|api|route|controller/i.test(name)),
      data: sourceFiles.filter(name => /database|schema|model|migration|storage/i.test(name)),
      infrastructure: sourceFiles.filter(name => /infra|docker|terraform|yaml|yml/i.test(name))
    };
    const missing = Object.entries(layers).filter(([, list]) => list.length === 0).map(([name]) => name);
    const report = { target: ctx.options?.targetStack || 'detected', package: packageJson?.name || null, sourceFileCount: sourceFiles.length, layers, missingLayers: missing, constraints: ['segredos somente no backend', 'boundary de segurança no runtime', 'critério de aceite por camada'] };
    return result('autonomous-architecture-design', 'Autonomous Architecture Design', startAt, missing.length ? 'partial' : 'succeeded', `Mapa arquitetural produzido com ${sourceFiles.length} arquivos de código.`, missing.length ? [`Camadas sem evidência no conjunto fornecido: ${missing.join(', ')}.`] : ['Camadas de apresentação, servidor, dados e infraestrutura identificadas.'], [evidence('manifesto do projeto', packageJson ? 'passed' : 'warning', packageJson ? 'package.json analisado.' : 'package.json não foi fornecido.', report)], ['Revisar as camadas ausentes antes de publicar.'], [artifact('architecture-report.json', JSON.stringify(report, null, 2))]);
  })();
}

function designSkill(ctx: SkillContext, startAt: string) {
  return (async () => {
    const files = fileMap(ctx);
    const uiFiles = Object.entries(files).filter(([name]) => /\.(tsx|jsx|css|scss)$/.test(name));
    const source = uiFiles.map(([name, content]) => `${name}\n${content}`).join('\n');
    const checks = [
      evidence('componentes de interface', uiFiles.length ? 'passed' : 'warning', `${uiFiles.length} arquivos UI recebidos.`),
      evidence('responsividade', /sm:|md:|lg:|media|grid|flex/i.test(source) ? 'passed' : 'warning', 'Busca por breakpoints e layout fluido.'),
      evidence('interações', /onClick|onSubmit|onChange|useState|useReducer/i.test(source) ? 'passed' : 'warning', 'Busca por eventos e estado reativo.'),
      evidence('fundo e identidade visual', /bg-|background|gradient|color|--[a-z-]+/i.test(source) ? 'passed' : 'warning', 'Busca por tokens e fundo próprio.'),
      evidence('ícones resolvíveis', !/TrendingUp(?![A-Za-z])/g.test(source) || /import[\s\S]{0,300}TrendingUp/.test(source) ? 'passed' : 'failed', 'Verificação de uso/import de TrendingUp.')
    ];
    const warnings = checks.filter(item => item.status !== 'passed').map(item => item.detail);
    return result('design-to-code-mastery', 'Design-to-Code Mastery', startAt, checks.some(item => item.status === 'failed') ? 'partial' : 'succeeded', `Auditoria visual executada em ${uiFiles.length} arquivos de interface.`, warnings.length ? warnings : ['Estrutura visual e interativa apresentou evidência mínima esperada.'], checks, ['Comparar com a referência visual em 375px, 768px e desktop.']);
  })();
}

async function debuggingSkill(ctx: SkillContext, startAt: string) {
  const command = String(ctx.options?.command || 'npm run lint').trim();
  const maxAttempts = Math.min(3, Math.max(1, Number(ctx.options?.maxAttempts) || 2));
  const attempts: Array<{ attempt: number; exitCode: number; stdout: string; stderr: string }> = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const execution = await executeSandboxCommand(command, 30000);
    attempts.push({ attempt, exitCode: execution.exitCode, stdout: execution.stdout, stderr: execution.stderr });
    if (execution.exitCode === 0) break;
  }
  const last = attempts[attempts.length - 1];
  const passed = last?.exitCode === 0;
  const report = { command, maxAttempts, attempts };
  return result('recursive-debugging', 'Recursive Debugging', startAt, passed ? 'succeeded' : 'partial', passed ? `Validação concluída na tentativa ${last.attempt}.` : `A validação falhou após ${attempts.length} tentativa(s); nenhum reparo automático foi inventado.`, passed ? ['Comando de validação retornou exitCode 0.'] : ['Falha reproduzível registrada para correção pontual.', `stderr: ${redactSecrets(last?.stderr || 'sem stderr').slice(0, 500)}`], [evidence('execução de validação', passed ? 'passed' : 'failed', `exitCode=${last?.exitCode}`, report)], ['Corrigir a causa indicada e executar novamente com o mesmo comando.'], [artifact('debug-report.json', JSON.stringify(report, null, 2))]);
}

function contextSkill(ctx: SkillContext, startAt: string) {
  const answers = ctx.answers || {};
  const entries = Object.entries(answers).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  const missing = ['objetivo', 'publico', 'restricoes'].filter(key => !(key in answers));
  const requirements = entries.map(([key, value]) => ({ key, value: Array.isArray(value) ? value : String(value) }));
  const report = { request: ctx.request || '', requirements, assumptions: missing.map(key => `A resposta '${key}' ainda não foi fornecida.`), acceptanceCriteria: ['objetivo compreensível', 'fluxo principal testável', 'restrições registradas'] };
  return Promise.resolve(result('context-synthesis', 'Context Synthesis', startAt, missing.length ? 'partial' : 'succeeded', `${entries.length} respostas convertidas em requisitos estruturados.`, missing.length ? [`Lacunas de contexto: ${missing.join(', ')}.`] : ['Objetivo, público e restrições foram sintetizados.'], [evidence('respostas estruturadas', entries.length ? 'passed' : 'warning', `${entries.length} respostas válidas.`, report)], ['Solicitar somente as lacunas listadas antes de congelar a arquitetura.'], [artifact('context-synthesis.json', JSON.stringify(report, null, 2))]));
}

function collaborationSkill(ctx: SkillContext, startAt: string) {
  const sessionId = String(ctx.options?.sessionId || 'default');
  const events = Array.isArray(ctx.options?.events) ? ctx.options?.events : [];
  const normalized = (events as any[]).slice(0, 100).map((event, index) => ({ sequence: Number(event?.sequence) || index + 1, type: String(event?.type || 'state.update'), actor: String(event?.actor || 'agent'), payload: event?.payload ?? null, receivedAt: new Date().toISOString() }));
  const conflicts = normalized.filter((event, index) => index > 0 && event.sequence <= normalized[index - 1].sequence);
  const state = { sessionId, eventCount: normalized.length, lastSequence: normalized.at(-1)?.sequence || 0, conflicts, policy: 'last-write-wins somente com sequência explícita; conflito é reportado, não descartado' };
  return Promise.resolve(result('real-time-collaboration', 'Real-Time Collaboration', startAt, conflicts.length ? 'partial' : 'succeeded', `Sessão ${sessionId} reconciliou ${normalized.length} evento(s).`, conflicts.length ? [`${conflicts.length} conflito(s) de ordenação detectado(s).`] : ['Eventos ordenados e prontos para atualização incremental.'], [evidence('sequência de eventos', conflicts.length ? 'warning' : 'passed', `lastSequence=${state.lastSequence}`, state)], ['Persistir o cursor de sequência no cliente e no servidor.'], [artifact('collaboration-state.json', JSON.stringify(state, null, 2))]));
}

async function performanceSkill(ctx: SkillContext, startAt: string) {
  const files = fileMap(ctx);
  const source = Object.entries(files).map(([name, content]) => `${name}\n${content}`).join('\n');
  const jsBytes = Object.entries(files).filter(([name]) => /\.(js|jsx|ts|tsx)$/.test(name)).reduce((sum, [, content]) => sum + Buffer.byteLength(content), 0);
  const buildCommand = ctx.options?.buildCommand ? String(ctx.options.buildCommand) : '';
  let buildEvidence: Evidence = evidence('build', 'not_run', 'Nenhum build foi solicitado.');
  if (buildCommand) {
    const run = await executeSandboxCommand(buildCommand, 60000);
    buildEvidence = evidence('build', run.exitCode === 0 ? 'passed' : 'failed', `exitCode=${run.exitCode}`, { stdout: run.stdout.slice(0, 2000), stderr: run.stderr.slice(0, 2000) });
  }
  const findings = [jsBytes > 500000 ? 'O conjunto de JavaScript/TypeScript excede 500 KB antes da minificação.' : 'O conjunto fornecido está abaixo de 500 KB antes da minificação.', /map\(|filter\(|reduce\(/g.test(source) ? 'Há operações de coleção; revisar memoização em listas grandes.' : 'Nenhum padrão de coleção relevante foi detectado.'];
  const report = { sourceBytes: jsBytes, thresholds: { warningBytes: 500000 }, buildCommand: buildCommand || null, recommendations: ['code splitting', 'lazy loading', 'memoização de listas grandes'] };
  return result('performance-optimization', 'Performance Optimization', startAt, buildEvidence.status === 'failed' ? 'partial' : 'succeeded', `Orçamento preliminar calculado: ${jsBytes} bytes de código JS/TS.`, findings, [evidence('tamanho de fonte', jsBytes <= 500000 ? 'passed' : 'warning', `${jsBytes} bytes`, report), buildEvidence], ['Executar Lighthouse e profiling no preview publicado para métricas de navegador reais.'], [artifact('performance-report.json', JSON.stringify(report, null, 2))]);
}

function securitySkill(ctx: SkillContext, startAt: string) {
  const files = fileMap(ctx);
  const findings: string[] = [];
  const checks: Evidence[] = [];
  for (const [name, content] of Object.entries(files)) {
    const secret = /(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|password\s*[:=]\s*["'][^"']+["'])/i.test(content);
    const clientSecret = /(?:VITE_|NEXT_PUBLIC_|PUBLIC_)[A-Z0-9_]*(?:KEY|TOKEN|SECRET)/i.test(content);
    const unsafeHtml = /dangerouslySetInnerHTML|innerHTML\s*=/.test(content);
    if (secret) findings.push(`Possível segredo literal em ${name}.`);
    if (clientSecret) findings.push(`Variável potencialmente sensível exposta no cliente em ${name}.`);
    if (unsafeHtml) findings.push(`HTML dinâmico requer sanitização explícita em ${name}.`);
    checks.push(evidence(`segurança: ${name}`, secret || clientSecret || unsafeHtml ? 'warning' : 'passed', secret || clientSecret || unsafeHtml ? 'Padrão de risco encontrado; revisão necessária.' : 'Nenhum padrão de risco básico encontrado.'));
  }
  const report = { filesScanned: Object.keys(files).length, findings, policy: ['segredos no backend', 'redação de logs', 'URLs HTTP/HTTPS validadas', 'paths confinados ao workspace'] };
  return Promise.resolve(result('security-hardening', 'Security Hardening', startAt, findings.length ? 'partial' : 'succeeded', `Varredura de segurança concluída em ${Object.keys(files).length} arquivo(s).`, findings.length ? findings : ['Nenhum padrão de risco básico encontrado no conjunto fornecido.'], checks, ['Corrigir achados e repetir a varredura antes de publicar.'], [artifact('security-report.json', JSON.stringify(report, null, 2))]));
}

async function coordinationSkill(ctx: SkillContext, startAt: string) {
  if (!ctx.request && !Array.isArray(ctx.options?.tasks)) throw new Error('multi-agent-coordination exige request ou options.tasks.');
  const tasks = Array.isArray(ctx.options?.tasks) ? ctx.options?.tasks : [{ id: 'analysis', title: 'Análise especializada', prompt: String(ctx.request) }];
  const dispatched = subagentOrchestrator.createRun({ objective: ctx.request || 'Executar tarefas especializadas', tasks, maxConcurrency: ctx.options?.maxConcurrency || 3 });
  return result('multi-agent-coordination', 'Multi-Agent Coordination', startAt, 'dispatched', `Job ${dispatched.jobId} despachado com ${dispatched.taskCount} subtarefa(s).`, ['As tarefas foram validadas e encaminhadas ao orquestrador existente.'], [evidence('job rastreável', 'passed', `jobId=${dispatched.jobId}`, dispatched)], ['Consultar o job até todos os subagentes concluírem.'], [], dispatched.jobId);
}

function environmentSkill(_ctx: SkillContext, startAt: string) {
  const envKeys = Object.keys(process.env).filter(key => /^(NODE_ENV|PORT|AWS_REGION|AWS_SANDBOX_MODE|RUNTIME_DISTRIBUTION|CLOUD_PROVIDER|BROWSER_HEADLESS)$/.test(key));
  const report = { backend: process.env.AWS_SANDBOX_MODE === 'ssm' ? 'aws-ssm' : 'local-isolated', workspace: SANDBOX_WORKSPACE_ROOT, node: process.version, platform: process.platform, envKeys, secretsNeverReturned: true };
  return Promise.resolve(result('environment-management', 'Environment Management', startAt, 'succeeded', `Runtime ${report.backend} ativo em ${report.workspace}.`, ['Somente chaves não sensíveis foram reportadas.', 'Valores de segredos não são retornados.'], [evidence('isolamento do workspace', 'passed', 'Operações de arquivo usam resolveSafeSandboxPath.'), evidence('configuração de backend', 'passed', report.backend, report)], ['Configurar AWS_SSM_INSTANCE_ID somente no secret manager se o backend remoto for necessário.'], [artifact('environment-report.json', JSON.stringify(report, null, 2))]));
}

function uxSkill(ctx: SkillContext, startAt: string) {
  const files = fileMap(ctx);
  const source = Object.entries(files).map(([name, content]) => `${name}\n${content}`).join('\n');
  const checks = [
    evidence('estados de carregamento', /loading|skeleton|isLoading|pending/i.test(source) ? 'passed' : 'warning', 'Busca por loading/pending.'),
    evidence('estados de erro', /error|alert|destructive|catch/i.test(source) ? 'passed' : 'warning', 'Busca por erro e recuperação.'),
    evidence('estados vazios', /empty|no results|nenhum|sem dados/i.test(source) ? 'passed' : 'warning', 'Busca por estado vazio.'),
    evidence('acessibilidade', /aria-|label=|role=|alt=|<button/i.test(source) ? 'passed' : 'warning', 'Busca por nomes semânticos e ARIA.'),
    evidence('feedback de interação', /toast|success|disabled|aria-busy|onSubmit/i.test(source) ? 'passed' : 'warning', 'Busca por feedback, bloqueio e submissão.')
  ];
  const warnings = checks.filter(item => item.status === 'warning').map(item => item.detail);
  return Promise.resolve(result('heuristic-ux-audit', 'Heuristic UX Audit', startAt, warnings.length ? 'partial' : 'succeeded', `Auditoria heurística executada em ${Object.keys(files).length} arquivo(s).`, warnings.length ? warnings : ['Estados e feedback básicos foram encontrados.'], checks, ['Validar o fluxo principal manualmente com teclado e viewport mobile.'], [artifact('ux-audit.json', JSON.stringify({ checks }, null, 2))]));
}

const EXECUTORS: Record<ExecutableSkillId, (ctx: SkillContext, startAt: string) => Promise<SkillExecution>> = {
  'autonomous-architecture-design': architectureSkill,
  'design-to-code-mastery': designSkill,
  'recursive-debugging': debuggingSkill,
  'context-synthesis': contextSkill,
  'real-time-collaboration': collaborationSkill,
  'performance-optimization': performanceSkill,
  'security-hardening': securitySkill,
  'multi-agent-coordination': coordinationSkill,
  'environment-management': environmentSkill,
  'heuristic-ux-audit': uxSkill
};

export function listExecutableSkills() { return SKILLS.map(skill => ({ ...skill, executionEndpoint: '/api/agent/skills/execute' })); }
export function buildExecutableSkillsInstruction() {
  return `\n\n--- RUNTIME EXECUTÁVEL DE SKILLS AVANÇADAS ---\n${SKILLS.map(skill => `- ${skill.id}: ${skill.name}. ${skill.purpose} Use skill_execute e aguarde o resultado com status, evidências e artefatos; nunca alegue sucesso sem o retorno real.`).join('\n')}`;
}
export function isExecutableSkillId(value: unknown): value is ExecutableSkillId { return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EXECUTORS, value); }
export async function executeSkill(skillId: string, context: SkillContext = {}): Promise<SkillExecution> {
  if (!isExecutableSkillId(skillId)) throw new Error(`Skill executável desconhecida: ${skillId}`);
  const definition = SKILLS.find(skill => skill.id === skillId)!;
  const startAt = started();
  try {
    const execution = await EXECUTORS[skillId](context, startAt);
    return execution;
  } catch (error: any) {
    return result(skillId, definition.name, startAt, 'failed', 'A Skill falhou antes de produzir uma conclusão.', [redactSecrets(error?.message || String(error))], [evidence('execução do handler', 'failed', 'Exceção capturada e redigida.')], ['Corrigir a entrada ou a dependência indicada e executar novamente.']);
  }
}

export async function materializeSkillArtifacts(execution: SkillExecution): Promise<SkillExecution> {
  if (!execution.artifacts.length) return execution;
  const written = [] as SkillExecution['artifacts'];
  for (const item of execution.artifacts) {
    const safe = resolveSafeSandboxPath(item.path);
    if (!safe.safePath) continue;
    await fs.mkdir(path.dirname(safe.safePath), { recursive: true });
    await fs.writeFile(safe.safePath, item.content, 'utf8');
    written.push({ ...item, path: path.relative(SANDBOX_WORKSPACE_ROOT, safe.safePath) });
  }
  return { ...execution, artifacts: written };
}
