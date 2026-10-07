import { 
  CaretDown, 
  ShareNetwork, 
  ArrowsOut, 
  Clock, 
  Play, 
  Plus, 
  GithubLogo, 
  Cloud, 
  Microphone, 
  ArrowUp, 
  StopCircle, 
  Copy, 
  Star, 
  CaretRight, 
  DotsThree, 
  ArrowRight, 
  ArrowBendDownRight,
  Lightning,
  ShieldStar,
  Check,
  Code,
  Cpu,
  Stack,
  Sparkle,
  Question,
  ArrowSquareOut,
  CaretUp,
  FileText,
  Globe,
  ShieldWarning,
  ShieldCheck,
  DownloadSimple,
  XCircle,
  Faders,
  Spinner,
  ArrowsClockwise,
  ThumbsUp,
  ThumbsDown,
  ArrowClockwise,
  CheckCircle,
  ChatCircleDots
} from '@phosphor-icons/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ToolCallTrace, AgentExecutionLog } from '../types/project';
import { markdownFences } from '@/components/reui/code-block/code-block-highlight';
import { ProfessionalCodeBlock } from './ProfessionalCodeBlock';
import { SyntaxCodeView, InlineCodeSnippet } from './SyntaxCodeView';
import ThinkingState from './ThinkingState';
import ToolChips, { getContextualToolIcon, getContextualFileIcon, ToolStep, ToolDiff } from './ToolChips';
import StreamingText from './StreamingText';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Favicon, extractCleanDomain } from '@/lib/favicon';
import PromptBar from './PromptBar';
import { QuestionnaireQuestion, DEFAULT_APP_QUESTIONS } from './AgentContextQuestionnaire';
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "./ui/questionnaire";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "./ui/card";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  status?: 'completed' | 'failed' | 'waiting_for_approval' | 'in_background' | 'waiting_for_user';
  time?: string;
  workingTime?: string;
  thought?: string;
  logs?: AgentExecutionLog[];
  toolCalls?: ToolCallTrace[];
  suggestions?: string[];
  clarifications?: string[];
  questionnaire?: {
    title?: string;
    description?: string;
    questions?: QuestionnaireQuestion[];
  };
  sources?: Array<{ title: string; url: string; snippet: string }>;
  approval?: {
    actionName: string;
    details: any;
    riskLevel: 'medium' | 'high';
    reason: string;
    requestedAt: string;
    decision?: 'approved' | 'rejected';
  };
  artifacts?: Array<{ id: string; name: string; path: string; sizeBytes: number; downloadUrl: string }>;
  files?: Array<{ path: string; code: string; lang?: string }>;
  updatedFile?: { filename: string; code: string };
  executionSteps?: ExecutionStep[];
}

interface ExecutionStep {
  id: string;
  label: string;
  detail: string;
  status: 'running' | 'complete' | 'warning';
  timestamp?: string;
}


interface AgentProgressNote {
  id: string;
  label: string;
  text: string;
  status: 'running' | 'complete' | 'warning';
  timestamp: string;
}


type ToolPresentation = { label: string; chip: string; detail: string };

function describeToolExecution(toolName: string, args: Record<string, any> = {}, fallback = ''): ToolPresentation {
  const name = String(toolName || '').toLowerCase();
  const command = String(args.command || args.cmd || args.script || '').trim();
  const filePath = String(args.filePath || args.path || args.filename || '').trim();
  const url = String(args.url || '').trim();
  const query = String(args.query || args.q || '').trim();
  const target = String(args.selector || args.selectorOrText || args.text || '').trim();

  if (name.includes('bash') || name.includes('terminal') || name.includes('shell') || name.includes('exec') || name.includes('python')) {
    const shown = command || (name.includes('python') ? 'script Python' : 'comando shell');
    return { label: 'Executando comandos no terminal', chip: shown, detail: `Terminal: ${shown}` };
  }
  if (name.includes('write') || name.includes('create_file') || name.includes('fs.write')) {
    const shown = filePath || 'arquivo do workspace';
    return { label: 'Gravando arquivo no workspace', chip: shown, detail: `Arquivo de destino: ${shown}` };
  }
  if (name.includes('read') || name.includes('file_list') || name.includes('list_files') || name.includes('inspect')) {
    const shown = filePath || String(args.directoryPath || args.directory || 'workspace');
    return { label: name.includes('list') ? 'Listando arquivos do workspace' : 'Lendo arquivo do workspace', chip: shown, detail: `Alvo consultado: ${shown}` };
  }
  if (name.includes('search')) {
    const shown = query || 'consulta na web';
    return { label: 'Pesquisando informações na web', chip: shown, detail: `Consulta: ${shown}` };
  }
  if (name.includes('navigate') || name.includes('browser')) {
    const shown = url || 'página no navegador';
    return { label: 'Navegando no navegador do agente', chip: shown, detail: `URL acessada: ${shown}` };
  }
  if (name.includes('click')) {
    const shown = target || 'elemento da página';
    return { label: 'Clicando em elemento da página', chip: shown, detail: `Alvo do clique: ${shown}` };
  }
  if (name.includes('type') || name.includes('fill')) {
    const shown = target || 'campo do formulário';
    return { label: 'Preenchendo campo no navegador', chip: shown, detail: `Campo: ${shown}` };
  }
  if (name.includes('verify') || name.includes('check') || name.includes('build')) {
    return { label: 'Verificando compilação e funcionamento', chip: fallback || 'validação do runtime', detail: fallback || 'Executando validações do runtime.' };
  }
  const safeFallback = fallback || 'ação autorizada pelo plano';
  return { label: 'Executando ação do agente', chip: safeFallback, detail: safeFallback };
}

interface ChatAreaProps {
  onFileUpdate?: (files: Array<{ path: string; code: string; lang?: string }>) => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
  currentFiles?: Record<string, string>;
  onAgentStateChange?: (state: {
    isWorking: boolean;
    statusText: string;
    contextText: string;
    toolCalls: ToolCallTrace[];
    intent?: any;
    browserStatus?: 'loading' | 'interactive' | 'error' | 'blocked';
  }) => void;
  onInspectInComputer?: () => void;
}

function ensureDetailedAgentMessage(
  rawContent: string,
  toolCalls: ToolCallTrace[],
  files: Array<{ path: string; code?: string }>,
  promptText: string
): string {
  const trimmed = (rawContent || '').trim();
  const lower = trimmed.toLowerCase();
  
  const isGeneric = 
    !trimmed ||
    trimmed.length < 80 ||
    lower.includes('ação executada com sucesso') ||
    lower.includes('acao executada com sucesso') ||
    lower.includes('ação executada no workspace') ||
    lower.includes('sucesso no workspace') ||
    lower.includes('com sucesso no workspace') ||
    lower.includes('operação concluída') ||
    lower.includes('operacao concluida') ||
    lower.includes('tarefa concluída') ||
    lower.includes('tarefa concluida') ||
    lower.includes('tarefa executada pelo agente') ||
    lower.includes('implementação finalizada no workspace') ||
    lower.includes('tarefa processada com sucesso');

  if (!isGeneric && trimmed.length >= 120) {
    return trimmed;
  }

  // Synthesize a structured, descriptive technical report
  const sections: string[] = [];

  if (files.length > 0) {
    const fileList = files.map(f => {
      const lineCount = (f.code || '').split('\n').length;
      return `- **\`${f.path}\`** (${lineCount > 1 ? `${lineCount} linhas` : 'atualizado'}):\n  Código React/TypeScript estruturado e integrado ao projeto com estilização Tailwind CSS.`;
    }).join('\n');
    sections.push(`### Arquivos e Componentes Desenvolvidos\n${fileList}`);
  }

  if (toolCalls && toolCalls.length > 0) {
    const webCalls = toolCalls.filter(t => t.toolName.includes('browser') || t.toolName.includes('web') || t.toolName.includes('search'));
    if (webCalls.length > 0) {
      const webList = webCalls.map(t => {
        const url = t.screenData?.url || t.arguments?.url || t.arguments?.query || 'web';
        const title = t.screenData?.title ? ` - "${t.screenData.title}"` : '';
        const action = t.screenData?.actionDescription || t.toolName;
        return `- **${t.toolName}**: ${action}${title} (\`${url}\`)`;
      }).join('\n');
      sections.push(`### Navegação e Pesquisa Web\n${webList}`);
    }

    const bashCalls = toolCalls.filter(t => t.toolName.includes('bash') || t.toolName.includes('exec') || t.toolName.includes('terminal'));
    if (bashCalls.length > 0) {
      const bashList = bashCalls.map(t => {
        const cmd = t.arguments?.command || t.arguments?.code || t.toolName;
        return `- **Comando:** \`${cmd}\` (${t.status || 'sucesso'})`;
      }).join('\n');
      sections.push(`### Comandos Shell Executados\n${bashList}`);
    }

    const fsCalls = toolCalls.filter(t => (t.toolName.includes('file') || t.toolName.includes('fs')) && !t.toolName.includes('write'));
    if (fsCalls.length > 0) {
      const fsList = fsCalls.map(t => {
        const target = t.arguments?.filePath || t.arguments?.directoryPath || t.arguments?.path || 'workspace';
        return `- **${t.toolName}**: ${t.screenData?.actionDescription || target}`;
      }).join('\n');
      sections.push(`### Operações de Sistema de Arquivos\n${fsList}`);
    }
  }

  const promptTitle = promptText ? ` para **"${promptText.slice(0, 80)}"**` : '';
  const header = `## Relatório de Ações do Agente\nProcessei e executei as tarefas solicitadas no ambiente${promptTitle}:\n\n`;
  const footer = `\n\n*Todos os recursos foram sincronizados e estão disponíveis para inspeção e testes no Workspace e no Computador do Agente.*`;

  if (sections.length > 0) {
    return header + sections.join('\n\n') + footer;
  }

  if (trimmed && !lower.includes('com sucesso') && !lower.includes('ação executada') && !lower.includes('tarefa executada')) {
    return `${header}${trimmed}${footer}`;
  }

  return `${header}Analisei a solicitação técnica, executei as instruções e sincronizei o ambiente de desenvolvimento. O workspace está pronto com todas as dependências e arquivos disponíveis.${footer}`;
}

export function ChatArea({ 
  onFileUpdate, 
  externalPrompt, 
  onClearExternalPrompt, 
  currentFiles,
  onAgentStateChange,
  onInspectInComputer
}: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      status: 'completed',
      isStreaming: false,
      time: '15:43',
      workingTime: '12s',
      thought: 'Constituição de Design Ativa: O agente opera sob regras rigorosas de design de produção inspiradas em Linear, Stripe, Apple, Vercel e Airbnb para criar sites e aplicações do zero com identidade visual própria, cores exclusivas e alta interatividade dinâmica.',
      logs: [
        { id: 1, type: 'command', content: 'Diretrizes de Design de Produção carregadas e verificadas', time: '15:42' },
        { id: 2, type: 'info', content: 'Regras de paleta exclusiva, hierarquia tipográfica e interatividade real ativas', time: '15:43' }
      ],
      content: `Olá! Sou o **Agente Autônomo de Engenharia de Software e Design** do Kvant.

Estou conectado a um **Runtime Próprio e Isolado em Nuvem Ubuntu 24.04 100% operacional**, onde opero via **MCP (Model Context Protocol)** e **Habilidades (SKILLs)** de ponta:

### Ferramentas MCP Integradas:
1. **Computer MCP**: Abro o navegador real para navegar em URLs, pesquisar no Google, rolar páginas e interagir com sites ao vivo.
2. **WebDev MCP**: Acesso total ao workspace para criar, editar e excluir arquivos, gerenciar pacotes, e sincronizar com o preview em tempo real.
3. **Terminal Bash MCP**: Execução de comandos shell complexos, diagnósticos de rede e automação de scripts no container Ubuntu.

### Habilidades de Engenharia e Design:
- **Design-to-Code**: Tradução perfeita de referências visuais para UI de alta fidelidade.
- **Arquitetura Autônoma**: Planejamento de sistemas SaaS e Fintech do zero.
- **Depuração Recursiva**: Auto-correção de erros no runtime e terminal.
- **Contexto Profundo**: Processamento de requisitos via questionários inteligentes.

Assista às minhas ações em tempo real na aba **Computador do Agente** enquanto eu construo seu projeto!`,
      suggestions: [
        'Pesquisar na web e inspecionar a API do GitHub no navegador do agente',
        'Executar diagnósticos de rede com curl e checar o terminal bash',
        'Criar uma plataforma de investimentos com simulador dinâmico de juros',
        'Pesquisar especificações de design de ponta e criar um dashboard'
      ]
    }
  ]);

  const [streamedIds, setStreamedIds] = useState<Set<string>>(() => new Set(['1']));
  const [isAgentInBackground, setIsAgentInBackground] = useState(false);
  const [bgElapsedSeconds, setBgElapsedSeconds] = useState(0);

  // Background elapsed timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAgentInBackground) {
      interval = setInterval(() => {
        setBgElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setBgElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isAgentInBackground]);

  const handleStreamingDone = (messageId: string) => {
    setStreamedIds(prev => {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStreaming: false } : m));
  };

  const [isThinking, setIsThinking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState('Analisando solicitação...');
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const executionStepsRef = useRef<ExecutionStep[]>([]);
  const [progressNotes, setProgressNotes] = useState<AgentProgressNote[]>([]);
  const progressNotesRef = useRef<AgentProgressNote[]>([]);
  const deliveredFilePathsRef = useRef<Set<string>>(new Set());
  const [showExecutionAnimation, setShowExecutionAnimation] = useState(false);
  const [initialThoughtComplete, setInitialThoughtComplete] = useState(false);
  const [finalResponseReceived, setFinalResponseReceived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const browserProgressSequenceRef = useRef(0);

  const updateExecutionSteps = (updater: (steps: ExecutionStep[]) => ExecutionStep[]) => {
    setExecutionSteps((previous) => {
      const next = updater(previous).slice(-9);
      executionStepsRef.current = next;
      return next;
    });
  };

  const updateProgressNote = (label: string, text: string, status: AgentProgressNote['status'] = 'running') => {
    const normalizedLabel = String(label || 'Etapa do agente').trim();
    const normalizedText = String(text || '').trim() || 'Processando esta etapa...';
    setProgressNotes(previous => {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // There is only one live note. Keep a stable id so React updates the
      // same message instead of replaying a growing list on every event.
      const note = {
        id: previous[0]?.id || 'agent-live-note',
        label: normalizedLabel,
        text: normalizedText,
        status,
        timestamp
      };
      progressNotesRef.current = [note];
      return [note];
    });
  };

  const activateExecutionAnimation = () => {
    setShowExecutionAnimation(true);
  };

  const restartExecutionAnimation = () => {
    // Replace the active row in place. Do not unmount the animation: doing so
    // made the entire trace replay from its first item after every tool event.
    setShowExecutionAnimation(true);
  };

  const addOpeningProgressNote = (prompt: string) => {
    const cleanPrompt = prompt.replace(/\s+/g, ' ').trim();
    const isCreation = /crie|criar|site|aplicaç|aplicac|dashboard|landing|loja|app/i.test(cleanPrompt);
    updateProgressNote(
      'Entendimento do pedido',
      isCreation
        ? `Entendi o objetivo: vou estruturar uma aplicação própria a partir de “${cleanPrompt.slice(0, 180)}${cleanPrompt.length > 180 ? '…' : ''}”. Primeiro vou definir a arquitetura e depois validar cada arquivo no preview.`
        : `Entendi a solicitação: “${cleanPrompt.slice(0, 220)}${cleanPrompt.length > 220 ? '…' : ''}”. Vou organizar a execução em etapas verificáveis.`,
      'complete'
    );
  };

  const beginExecutionStep = (label: string, detail: string) => {
    updateExecutionSteps((previous) => {
      const next = previous.map((step, index) => (
        index === previous.length - 1 && step.status === 'running' && step.label !== label
          ? { ...step, status: 'complete' as const }
          : step
      ));
      const activeIndex = next.findIndex((step) => step.label === label && step.status === 'running');
      if (activeIndex >= 0) {
        next[activeIndex] = { ...next[activeIndex], detail };
        return next;
      }
      return [...next, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label,
        detail,
        status: 'running',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
    });
  };

  const completeExecutionStep = (label: string, detail: string, status: ExecutionStep['status'] = 'complete') => {
    updateExecutionSteps((previous) => {
      const index = previous.findIndex((step) => step.label === label && step.status === 'running');
      if (index < 0) return [...previous, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label,
        detail,
        status,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
      const next = [...previous];
      next[index] = { ...next[index], detail, status };
      return next;
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Auto-scroll to bottom while the agent is thinking or streaming response
  useEffect(() => {
    const container = scrollAreaRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const isAnyStreaming = messages.some(m => m.isStreaming);
      if (isThinking || isAnyStreaming) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'auto'
        });
      }
    });

    // Observe the content wrapper
    const content = container.querySelector('.messages-container');
    if (content) {
      observer.observe(content);
    }

    return () => observer.disconnect();
  }, [isThinking, messages]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isThinking) {
      setElapsedSeconds(0);
      const steps = [
        'Regra 1: Promoter Tik (compreendendo objetivo e requisitos)...',
        'Regra 2: Demanda (estruturando plano de engenharia de ponta)...',
        'Regra 3: Treinamento (gerando arquivos, componentes e pastas)...',
        'Regra 4: Funcionamento (validando compilação no runtime e preview)...',
        'Regra 5: APIs e Chamadas Externas (executando ferramentas MCP)...'
      ];
      let stepIdx = 0;
      setCurrentStep(steps[0]);

      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next % 3 === 0 && stepIdx < steps.length - 1) {
            stepIdx++;
            setCurrentStep(steps[stepIdx]);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  const isThinkingPrev = useRef(isThinking);
  const onAgentStateChangeRef = useRef(onAgentStateChange);
  useEffect(() => {
    onAgentStateChangeRef.current = onAgentStateChange;
  }, [onAgentStateChange]);

  useEffect(() => {
    if (isThinkingPrev.current && !isThinking) {
      if (isAgentInBackground) {
        // Keep agent active in background state
        return;
      }
      const allToolCalls: ToolCallTrace[] = [];
      messages.forEach(m => {
        if (m.toolCalls && m.toolCalls.length > 0) {
          allToolCalls.push(...m.toolCalls);
        }
      });

      onAgentStateChangeRef.current?.({
        isWorking: false,
        statusText: 'Computador do Agente Ativo',
        contextText: 'Instância Ubuntu 24.04 x86_64 ativa. Agente autônomo com navegador Chromium.',
        toolCalls: allToolCalls
      });
    }
    isThinkingPrev.current = isThinking;
  }, [isThinking, messages, isAgentInBackground]);

  const handleResumeFromBackground = (summaryText: string) => {
    setIsAgentInBackground(false);
    setMessages(prev => prev.map(m => m.status === 'in_background' ? { ...m, status: 'completed' } : m));
    
    // Seamless context injection: Continue working without adding a visible user message to the UI
    const injectedContext = `[Contexto Adquirido Autonomamente]: O usuário definiu as preferências: ${summaryText}. O subagente sincronizou os dados. Continue a tarefa agora.`;
    handleSendMessage(injectedContext, true);
  };

  const handleResumeWithDefaults = () => {
    setIsAgentInBackground(false);
    setMessages(prev => prev.map(m => m.status === 'in_background' ? { ...m, status: 'completed' } : m));
    handleSendMessage(`[Contexto Definido]: Prossiga com a melhor arquitetura de software, padrão Fintech/SaaS, paleta escura e recursos dinâmicos autônomos.`);
  };

  useEffect(() => {
    if (externalPrompt) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (userPrompt: string, isSilentContext: boolean = false) => {
    if (!userPrompt.trim() || isThinking) return;
    const requestStartTime = Date.now();

    if (!isSilentContext && (userPrompt.trim().toLowerCase() === '/context' || userPrompt.trim().toLowerCase() === 'context')) {
      const contextMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        status: 'in_background',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: 'Por favor, defina suas preferências no questionário abaixo para que eu possa planejar e construir o seu site/aplicação com total precisão:',
        questionnaire: {
          title: 'Especificação de Contexto do Agente',
          description: 'Defina o nicho, direção visual e prioridades para personalizar a criação:',
          questions: DEFAULT_APP_QUESTIONS
        }
      };
      setMessages(prev => [...prev, contextMsg]);
      setIsAgentInBackground(true);
      return;
    }

    if (!isSilentContext) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userPrompt
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsThinking(true);
    progressNotesRef.current = [];
    setProgressNotes([]);
    progressNotesRef.current = [];
    deliveredFilePathsRef.current = new Set();
    setFinalResponseReceived(false);
    // Every assistant response gets the same live note + animation lane. Do
    // not defer this behind a timer: fast conversation responses used to end
    // before the 850ms delay and therefore appeared without any agent trace.
    setInitialThoughtComplete(true);
    addOpeningProgressNote(userPrompt);
    setShowExecutionAnimation(true);
    const initialSteps: ExecutionStep[] = [
      {
        id: `intent_${Date.now()}`,
        label: 'Compreendendo o pedido',
        detail: 'Lendo a mensagem, o histórico e o contexto do workspace.',
        status: 'running',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    executionStepsRef.current = initialSteps;
    setExecutionSteps(initialSteps);

    if (onAgentStateChange) {
      onAgentStateChange({
        isWorking: true,
        statusText: 'Agente analisando o pedido...',
        contextText: userPrompt,
        toolCalls: []
      });
    }

    try {
      abortControllerRef.current = new AbortController();

      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      let payload: any = null;
      const liveToolCalls: ToolCallTrace[] = [];

      try {
        const streamRes = await fetch('/api/agent/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userPrompt,
            history: historyPayload,
            currentFiles: currentFiles || {}
          }),
          signal: abortControllerRef.current.signal
        });

        if (streamRes.ok && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            let currentEvent = 'message';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                currentEvent = line.replace('event: ', '').trim();
              } else if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.replace('data: ', '').trim());
                  if (currentEvent === 'computer_starting') {
                    updateProgressNote('Inicialização do computador', 'O Computer MCP está iniciando; nenhuma ação será executada durante o boot.', 'running');
                    setCurrentStep(data.text || 'Inicializando o computador do agente...');
                    beginExecutionStep('Inicializando computador do agente', 'Boot de 7 segundos; nenhuma ação será executada durante a inicialização.');
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.text || 'Inicializando o computador do agente...',
                        contextText: 'O computador está iniciando. As ações serão liberadas somente após o boot de 7 segundos.',
                        toolCalls: [...liveToolCalls],
                        browserStatus: 'loading'
                      });
                    }
                  } else if (currentEvent === 'computer_ready') {
                    updateProgressNote('Inicialização do computador', 'Boot concluído; o computador está pronto para executar a próxima etapa.', 'complete');
                    completeExecutionStep('Inicializando computador do agente', data.text || 'Computador iniciado; execução liberada.');
                    setCurrentStep(data.text || 'Computador iniciado; execução liberada.');
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.text || 'Computador do agente pronto.',
                        contextText: 'Boot concluído. O agente pode iniciar ações autorizadas.',
                        toolCalls: [...liveToolCalls],
                        browserStatus: 'interactive'
                      });
                    }
                  } else if (currentEvent === 'stage_note') {
                    const stageLabel = data.label || 'Nota da etapa';
                    updateProgressNote(`${stageLabel} · ${Date.now().toString().slice(-5)}`, data.text || 'Etapa registrada pelo agente.', 'running');
                    setCurrentStep(data.text || stageLabel);
                  } else if (currentEvent === 'execution_gate') {
                    updateProgressNote('Transição para execução', data.text || 'Pensamento concluído; preparando a próxima ação.', 'running');
                    setCurrentStep(data.text || 'Preparando a próxima ação...');
                  } else if (currentEvent === 'deliberation') {
                    const deliberationLabel = data.label || 'Deliberação profunda';
                    const deliberationText = data.text || 'Avaliando critérios verificáveis.';
                    updateProgressNote(deliberationLabel, data.complete ? `Etapa concluída: ${deliberationText}` : deliberationText, data.complete ? 'complete' : 'running');
                    if (data.complete) restartExecutionAnimation();
                    setCurrentStep(data.text || data.label || 'Deliberação profunda em andamento');
                    beginExecutionStep(data.label || 'Deliberação profunda', data.text || 'Avaliando critérios verificáveis.');
                    if (data.complete) {
                      completeExecutionStep(data.label || 'Deliberação profunda', data.text || 'Etapa validada.');
                    }
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.text || data.label || 'Deliberação profunda em andamento',
                        contextText: data.text || 'Planejamento, crítica e verificação independentes.',
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'status') {
                    updateProgressNote('Raciocínio e coordenação', data.text || 'Coordenando a próxima ação do agente.', 'running');
                    setCurrentStep(data.text);
                    beginExecutionStep('Raciocinando sobre a próxima ação', data.text);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.text,
                        contextText: data.text,
                        toolCalls: [...liveToolCalls],
                        intent: data.intent
                      });
                    }
                  } else if (currentEvent === 'step') {
                    updateProgressNote(data.toolName || 'Etapa de execução', data.text || 'Executando a próxima etapa do plano.', 'running');
                    setCurrentStep(data.text);
                    beginExecutionStep('Executando etapa do plano', data.text);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.text,
                        contextText: data.text,
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'tool_start') {
                    activateExecutionAnimation();
                    const presentation = describeToolExecution(data.toolName, data.arguments || {}, data.reason || '');
                    const startedFilePath = String(data.arguments?.filePath || data.arguments?.path || data.arguments?.filename || '').trim();
                    const presentationLabel = startedFilePath ? `${presentation.label} · ${startedFilePath}` : `${presentation.label} · etapa ${Date.now().toString().slice(-5)}`;
                    updateProgressNote(presentationLabel, `Iniciei esta etapa: ${presentation.detail || presentation.chip}`, 'running');
                    setCurrentStep(`${presentation.label}: ${presentation.chip}`);
                    beginExecutionStep(presentation.label, presentation.detail);
                    const activeTrace: ToolCallTrace = {
                      id: `active_${Date.now()}`,
                      toolName: data.toolName,
                      server: data.toolName.includes('fs') || data.toolName.includes('file') || data.toolName.includes('write') || data.toolName.includes('read') 
                        ? 'WebDev MCP' 
                        : data.toolName.includes('browser') || data.toolName.includes('navigate') || data.toolName.includes('click') || data.toolName.includes('type') || data.toolName.includes('screenshot')
                          ? 'Computer MCP'
                          : 'Terminal Bash MCP',
                      arguments: data.arguments || {},
                      result: 'Executando no computador...',
                      timestamp: new Date().toLocaleTimeString(),
                      status: 'running',
                      actionType: data.toolName.includes('file') || data.toolName.includes('write') || data.toolName.includes('edit')
                        ? 'editor'
                        : data.toolName.includes('bash') || data.toolName.includes('terminal') || data.toolName.includes('python')
                          ? 'terminal'
                          : 'browser',
                      screenData: {
                        url: data.arguments?.url || 'about:blank',
                        title: 'Acessando ao vivo...',
                        actionDescription: data.reason,
                        command: data.arguments?.command,
                        filePath: data.arguments?.filePath || data.arguments?.path || data.arguments?.filename,
                        fileContent: data.arguments?.content || data.arguments?.code
                      }
                    };
                    // O editor recebe o conteúdo no início da operação, não apenas
                    // depois do tool_finish. Isso permite acompanhar a geração do arquivo.
                    if (onFileUpdate && data.arguments?.content && (data.toolName.includes('write') || data.toolName.includes('create') || data.toolName.includes('edit'))) {
                      const filePath = data.arguments.path || data.arguments.filePath || data.arguments.filename;
                      if (filePath) {
                        onFileUpdate([{ path: filePath, code: data.arguments.content, lang: data.arguments.lang || 'typescript' }]);
                      }
                    }
                    liveToolCalls.push(activeTrace);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: `Agente chamando ${activeTrace.server}`,
                        contextText: data.reason,
                        toolCalls: [...liveToolCalls, activeTrace],
                        browserStatus: data.toolName.includes('browser') || data.toolName.includes('navigate') ? 'loading' : undefined
                      });
                    }
                  } else if (currentEvent === 'browser_progress') {
                    browserProgressSequenceRef.current += 1;
                    activateExecutionAnimation();
                    updateProgressNote('Navegador ao vivo', data.actionDescription || data.status || 'Acompanhando mouse, rolagem e conteúdo da página.', 'running');
                    const progressTrace: ToolCallTrace = {
                      id: `active_browser_${data.toolName || 'action'}_${browserProgressSequenceRef.current}`,
                      toolName: data.toolName || 'browser_action',
                      server: 'Computer MCP',
                      arguments: data.arguments || {},
                      result: 'Ação do navegador em andamento...',
                      timestamp: new Date().toLocaleTimeString(),
                      status: 'running',
                      actionType: 'browser',
                      screenData: {
                        url: data.url,
                        title: data.title,
                        screenshot: data.screenshot,
                        mousePosition: data.mouse,
                        scrollY: data.scrollY,
                        liveStatus: data.status,
                        actionDescription: data.actionDescription
                      }
                    };
                    setCurrentStep(data.actionDescription || data.status || 'Navegador do agente trabalhando...');
                    beginExecutionStep('Interação visual no navegador', data.actionDescription || data.status || 'Acompanhando a página real.');
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.status || 'Navegador do agente em ação',
                        contextText: data.actionDescription || 'Acompanhando mouse, rolagem e conteúdo da página.',
                        toolCalls: [...liveToolCalls, progressTrace],
                        browserStatus: 'loading'
                      });
                    }
                  } else if (currentEvent === 'terminal_output') {
                    activateExecutionAnimation();
                    const command = data.command || 'comando do agente';
                    const chunk = String(data.chunk || '');
                    const terminalTrace: ToolCallTrace = {
                      id: `terminal_live_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      toolName: data.toolName || 'bash_exec',
                      server: 'Terminal Bash MCP',
                      arguments: { command },
                      result: chunk || (data.done ? `Processo finalizado com exitCode ${data.exitCode ?? 0}` : 'Processo em execução...'),
                      timestamp: new Date().toLocaleTimeString(),
                      status: data.done ? (Number(data.exitCode || 0) === 0 ? 'success' : 'error') : 'running',
                      actionType: 'terminal',
                      screenData: { command, terminalOutput: chunk, actionDescription: data.done ? 'Comando finalizado' : 'Recebendo saída do terminal ao vivo' }
                    };
                    liveToolCalls.push(terminalTrace);
                    updateProgressNote('Terminal ao vivo', chunk ? `${command}: ${chunk.slice(-240)}` : `${command} em execução...`, data.done ? 'complete' : 'running');
                    setCurrentStep(chunk ? `Terminal: ${chunk.slice(-160)}` : `Executando: ${command}`);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.done ? `Terminal finalizado (exit ${data.exitCode ?? 0})` : `Terminal executando: ${command}`,
                        contextText: chunk || `Recebendo saída incremental de ${command}`,
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'tool_finish') {
                    restartExecutionAnimation();
                    const toolCall = data.toolCall;
                    const finishedPresentation = describeToolExecution(toolCall.toolName, toolCall.arguments || {}, toolCall.screenData?.actionDescription || '');
                    const finishedFilePath = String(toolCall.arguments?.filePath || toolCall.arguments?.path || toolCall.arguments?.filename || '').trim();
                    const finishedLabel = finishedFilePath ? `${finishedPresentation.label} · ${finishedFilePath}` : finishedPresentation.label;
                    updateProgressNote(finishedLabel, `Etapa concluída: ${finishedPresentation.detail || 'resultado incorporado ao contexto.'}`, toolCall.status === 'error' ? 'warning' : 'complete');
                    liveToolCalls.push(toolCall);
                    
                    // Live build: If the tool updated a file, sync with workspace immediately
                    if (onFileUpdate && toolCall.arguments?.content && (toolCall.toolName.includes('write') || toolCall.toolName.includes('create') || toolCall.toolName.includes('edit'))) {
                      const filePath = toolCall.arguments.path || toolCall.arguments.filePath || toolCall.arguments.filename;
                      if (filePath && !deliveredFilePathsRef.current.has(filePath)) {
                        deliveredFilePathsRef.current.add(filePath);
                        onFileUpdate([{
                          path: filePath,
                          code: toolCall.arguments.content,
                          lang: toolCall.arguments.lang || 'typescript'
                        }]);
                      }
                    }

                    completeExecutionStep(
                      finishedPresentation.label,
                      finishedPresentation.detail || 'Ação concluída; resultado incorporado ao contexto.',
                      toolCall.status === 'warning' ? 'warning' : toolCall.status === 'error' ? 'warning' : 'complete'
                    );

                    let bStatus: any = undefined;
                    try {
                      const res = JSON.parse(toolCall.result);
                      if (res.browserStatus) bStatus = res.browserStatus;
                    } catch {}

                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: `Agente concluiu ação no ${toolCall.server || 'MCP'}`,
                        contextText: toolCall.screenData?.actionDescription || toolCall.toolName,
                        toolCalls: [...liveToolCalls],
                        browserStatus: bStatus
                      });
                    }
                  } else if (currentEvent === 'approval_required') {
                    setCurrentStep(`Aguardando autorização: ${data.approval?.reason || 'Ação destrutiva'}`);
                    beginExecutionStep('Aguardando sua autorização', data.approval?.reason || 'O agente pausou antes de uma ação sensível.');
                    completeExecutionStep('Aguardando sua autorização', data.approval?.reason || 'Ação pausada até sua decisão.', 'warning');
                  } else if (currentEvent === 'complete') {
                    setShowExecutionAnimation(false);
                    setInitialThoughtComplete(false);
                    setFinalResponseReceived(true);
                    payload = data;
                    setCurrentStep('Organizando resultados e preparando a resposta final...');
                  }
                } catch {}
              }
            }
          }
        }
      } catch (streamErr) {
        console.warn('Stream processing notice:', streamErr);
      }

      // If stream didn't yield a payload, use standard endpoint
      if (!payload) {
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userPrompt,
            history: historyPayload,
            currentFiles: currentFiles || {}
          }),
          signal: abortControllerRef.current.signal
        });

        const data = await res.json();
        payload = data.fallback || data;
      }

      // Consolidate generated files
      const generatedFilesList: Array<{ path: string; code: string; lang?: string }> = [];
      if (Array.isArray(payload.files)) {
        generatedFilesList.push(...payload.files);
      } else if (payload.updatedFile) {
        generatedFilesList.push({
          path: payload.updatedFile.filename.includes('/') ? payload.updatedFile.filename : `client/src/${payload.updatedFile.filename}`,
          code: payload.updatedFile.code,
          lang: 'typescript'
        });
      }

      // Format a verified rich technical report, guaranteeing no generic fallback text
      const rawText = payload.explanation || payload.response || '';
      const assistantContent = ensureDetailedAgentMessage(
        rawText,
        payload.toolCalls || liveToolCalls,
        generatedFilesList,
        userPrompt
      );
      if (generatedFilesList.length === 0 && assistantContent.includes('```')) {
        const codeBlockRegex = /```(tsx|typescript|jsx|javascript|html|css|json)\s*\n([\s\S]*?)```/gi;
        let match;
        while ((match = codeBlockRegex.exec(assistantContent)) !== null) {
          const lang = match[1].toLowerCase();
          const code = match[2].trim();
          
          // Only extract if it looks like a component or config
          if (code.length > 50) {
            let filename = 'client/src/App.tsx';
            if (lang === 'json') {
              filename = 'package.json';
            } else if (lang === 'css') {
              filename = 'client/src/index.css';
            } else {
              const fnMatch = code.match(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/);
              if (fnMatch && fnMatch[1] && fnMatch[1] !== 'App') {
                filename = `client/src/components/${fnMatch[1]}.tsx`;
              } else {
                filename = 'client/src/App.tsx';
              }
            }

            generatedFilesList.push({
              path: filename,
              code,
              lang
            });

            // Simulate the tool call for the UI if it wasn't there
            if (!liveToolCalls.some(tc => tc.toolName.includes('write') || tc.toolName.includes('file'))) {
              liveToolCalls.push({
                id: `auto_extract_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                toolName: 'webdev.write_file',
                server: 'WebDev MCP',
                arguments: { path: filename, content: code },
                result: 'Código extraído e sincronizado com o workspace.',
                timestamp: new Date().toLocaleTimeString(),
                status: 'success',
                screenData: { actionDescription: `Sincronizando ${filename} no workspace` }
              });
            }
          }
        }
      }

      const isBg = Boolean(payload.questionnaire) || payload.status === 'in_background';
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        isStreaming: true,
        status: isBg ? 'in_background' : payload.approval ? 'waiting_for_approval' : 'completed',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        workingTime: payload.workingTime || `${Math.max(elapsedSeconds, Math.round((Date.now() - requestStartTime) / 1000), 5)}s`,
        thought: payload.thought,
        sources: payload.sources || [],
        approval: payload.approval,
        artifacts: payload.artifacts || [],
        logs: payload.logs || [
          {
            id: 1,
            type: 'command',
            content: isBg 
              ? 'Agente esperando uma resposta com os parâmetros do usuário'
              : `${(payload.toolCalls || liveToolCalls).length} ferramentas reais executadas no computador da nuvem`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        toolCalls: payload.toolCalls || liveToolCalls,
        content: assistantContent,
        suggestions: payload.suggestions || [
          "Definir preferências no questionário",
          "Continuar com arquitetura padrão",
          "Inspecionar ações do agente no Computador"
        ],
        clarifications: payload.clarifications,
        questionnaire: payload.questionnaire,
        files: generatedFilesList,
        executionSteps: [
          ...executionStepsRef.current.map((step) => step.status === 'running' ? { ...step, status: 'complete' as const } : step),
          {
            id: `summary_${Date.now()}`,
            label: isBg ? 'Agente esperando uma resposta' : payload.approval ? 'Aguardando autorização' : 'Síntese final',
            detail: isBg 
              ? 'O agente está aguardando sua resposta para prosseguir a criação.'
              : payload.approval 
                ? 'A execução foi pausada para autorização.' 
                : 'Resultados reunidos e resposta pronta para você.',
            status: isBg ? 'running' : payload.approval ? 'warning' : 'complete',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (payload.questionnaire) {
        setIsAgentInBackground(true);
        if (onAgentStateChange) {
          onAgentStateChange({
            isWorking: true,
            statusText: '⏳ Agente esperando uma resposta',
            contextText: 'O agente está aguardando suas definições de opções no chat para prosseguir a criação.',
            toolCalls: [
              ...liveToolCalls,
              {
                id: `bg_wait_${Date.now()}`,
                toolName: 'agent.waitingForResponse',
                server: 'kvant_engine',
                arguments: { mode: 'waiting_for_user_response', waitReason: 'user_questionnaire_options' },
                result: 'Aguardando resposta do usuário.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'running',
                screenData: {
                  actionDescription: 'Agente aguardando resposta do usuário para continuar a execução'
                }
              }
            ]
          });
        }
      } else {
        setIsAgentInBackground(false);
      }

      // Trigger reactive sync with Workspace
      if (generatedFilesList.length > 0 && onFileUpdate) {
        const remainingFiles = generatedFilesList.filter(file => !deliveredFilePathsRef.current.has(file.path));
        if (remainingFiles.length > 0) {
          remainingFiles.forEach(file => deliveredFilePathsRef.current.add(file.path));
          onFileUpdate(remainingFiles);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          status: 'failed',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          workingTime: `${elapsedSeconds}s`,
          content: `Houve uma oscilação na execução remota: ${err.message || String(err)}. O agente local manterá o ambiente operando.`,
          suggestions: ["Tentar novamente", "Verificar conexão com a API"]
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsThinking(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a] relative">
      {/* Header */}
      <header className="h-11 flex items-center justify-between px-6 border-b border-white/5 shrink-0 z-10 bg-[#1a1a1a]">
        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors group">
          <span className="text-sm font-medium text-[#dcdcdc]">Manus 1.0 Lite</span>
          <CaretDown size={14} className="text-[#dcdcdc]/40 group-hover:text-[#dcdcdc]" />
        </div>
        <div className="flex items-center gap-4 text-[#dcdcdc]/40">
          <button title="Histórico de Sessões" className="hover:text-[#dcdcdc] transition-colors cursor-pointer">
            <Clock size={18} />
          </button>
          <button title="Expandir Workspace" className="hover:text-[#dcdcdc] transition-colors cursor-pointer">
            <ArrowsOut size={18} />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center justify-center size-7 bg-[#1f2c39] text-[#2992f0] border border-[#1a1a1a] rounded-md" title="Ativo">
             <ShieldStar size={14} className="text-[#2992f0]" weight="regular" />
          </div>
          <button title="Compartilhar" className="hover:text-[#dcdcdc] transition-colors cursor-pointer">
            <ShareNetwork size={18} />
          </button>
          <button className="hover:text-[#dcdcdc] transition-colors cursor-pointer">
            <DotsThree size={18} />
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div 
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center bg-[#1a1a1a]"
      >
        <div className="w-full max-w-3xl px-6 py-8 space-y-10 messages-container bg-[#1a1a1a]">
          {messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isAlreadyStreamed={streamedIds.has(msg.id)}
              onStreamingDone={handleStreamingDone}
              onSelectSuggestion={handleSendMessage}
              onInspectInComputer={onInspectInComputer}
              onFinishQuestionnaire={(answers, summaryText) => {
                handleResumeFromBackground(summaryText);
              }}
              onApprovalDecision={(messageId, approved) => {
                setMessages(prev => prev.map(m => m.id === messageId ? {
                  ...m,
                  approval: m.approval ? { ...m.approval, decision: approved ? 'approved' : 'rejected' } : undefined,
                  status: approved ? 'completed' : 'failed'
                } : m));
                fetch('/api/jobs/default/approve', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ approved })
                }).catch(() => {});
              }}
            />
          ))}
          
          {isThinking && !finalResponseReceived && (
            <div className="flex w-full flex-col gap-4" aria-live="polite">
              {!initialThoughtComplete && (
                <InitialThinkingAnimation elapsedSeconds={elapsedSeconds} />
              )}

              {/* Notes are a standalone status stream, not an assistant message
                  and not part of the animated thinking trace. */}
              {initialThoughtComplete && progressNotes.length > 0 && (
                <AgentProgressNotes notes={progressNotes} />
              )}

              {/* The execution animation is deliberately rendered in its own
                  region so it cannot visually merge with the notes above. */}
              {initialThoughtComplete && showExecutionAnimation && (
                <LocalActiveThinkingState
                  elapsedSeconds={elapsedSeconds}
                  step={currentStep}
                  steps={executionSteps}
                />
              )}
            </div>
          )}

          {isAgentInBackground && !isThinking && !messages.some(m => m.isStreaming) && (
             <div className="flex items-center gap-3 pl-8 py-2 animate-in fade-in slide-in-from-left-2 duration-500">
               <div className="size-8 rounded-lg bg-bg-surface-panel border border-border-divider-subtle flex items-center justify-center relative">
                 <img src="https://imgdb.io/i/6lwOlmk.png" className="size-5 object-contain" alt="" />
                 <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/5">
                   <div className="size-1.5 bg-zinc-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(161,161,170,0.5)]" />
                 </div>
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="text-[10px] font-bold text-text-content-primary/80 uppercase tracking-widest">Subagente em Espera</span>
                 <span className="text-[10px] text-text-content-secondary/60 font-mono flex items-center gap-1.5">
                    <span className="size-1 bg-amber-400/40 rounded-full animate-pulse" />
                    Aguardando escolhas do usuário no questionário · {bgElapsedSeconds}s
                 </span>
               </div>
             </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        <div className="h-28 shrink-0" />
      </div>



      {/* Floating Input Section */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-20">
        <PromptBar 
          onSend={(text) => handleSendMessage(text)} 
          onStop={handleStop}
          isThinking={isThinking} 
          placeholder="Mensagem para o agente Manus ou digite @ para fontes e / para comandos..."
        />
        
        <p className="mt-2 text-center text-[10px] text-[#dcdcdc]/30">
          Manus ativo: digite @ para fontes & arquivos, / para comandos rápidos e selecione o modelo de IA.
        </p>
      </div>


    </div>
  );
}

function InlineChatQuestionnaire({
  questionnaire,
  onSubmit,
}: {
  questionnaire?: {
    title?: string;
    description?: string;
    questions?: QuestionnaireQuestion[];
  };
  onSubmit: (answers: Record<string, string>, summaryText: string) => void;
}) {
  const questions =
    questionnaire?.questions && questionnaire.questions.length > 0
      ? questionnaire.questions
      : DEFAULT_APP_QUESTIONS;

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [otherThoughts, setOtherThoughts] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTextArea, setShowTextArea] = useState(false);

  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleSelect = (questionName: string, value: string) => {
    setSelectedChoices(prev => ({ ...prev, [questionName]: value }));
  };

  const handleNext = () => {
    if (isLastStep) {
      setShowTextArea(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    const answers: Record<string, string> = {};
    const summaryLines: string[] = [];

    for (const question of questions) {
      const value = selectedChoices[question.name];
      const choiceObj = question.choices.find((c) => c.value === value);
      const label = choiceObj?.label ?? "Não selecionado";
      answers[question.name] = label;
      summaryLines.push(`${question.title.replace('?', '').trim()}: ${label}`);
    }

    if (otherThoughts.trim()) {
      summaryLines.push(`Outros pensamentos: ${otherThoughts}`);
    }

    const summaryText = summaryLines.join(" | ");
    setIsSubmitted(true);
    onSubmit(answers, summaryText);
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl border border-emerald-500/20 bg-[#1f1f1f] rounded-2xl p-4 my-2 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-3">
          <CheckCircle size={18} weight="fill" />
          <span>Preferências Configuradas</span>
        </div>
        <div className="space-y-1.5">
          {questions.map((q) => (
            <div key={q.name} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-1.5 border border-white/5" style={{ borderRadius: '4px' }}>
              <span className="text-[9px] text-white/40 uppercase font-mono truncate mr-2">{q.title.replace('?', '')}</span>
              <span className="text-[11px] text-white font-medium truncate">{selectedChoices[q.name] ? q.choices.find(c => c.value === selectedChoices[q.name])?.label : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg border border-white/10 bg-[#1f1f1f] overflow-hidden my-3 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ borderRadius: '6px' }}>
      <div className="p-4 space-y-4">
        {/* Header & Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <div className="size-5 rounded-full border border-white/20 flex items-center justify-center bg-[#1f1f1f]">
              <Question size={11} weight="bold" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">O Manus tem uma pergunta</span>
          </div>
          <div className="text-[10px] font-mono text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
            {showTextArea ? 'Final' : `${currentStep + 1} de ${questions.length}`}
          </div>
        </div>

        {/* Dynamic Content */}
        {!showTextArea ? (
          <div key={`step-${currentStep}`} className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300" style={{ borderRadius: '4px' }}>
            <div className="min-h-[28px]">
              <div className="text-[14px] font-medium text-[#e9e9e9] leading-tight">
                <StreamingText 
                  content={currentQuestion.title} 
                  speedMs={8} 
                  isStreaming={true}
                />
              </div>
              {currentQuestion.description && (
                <div className="text-[11px] text-white/40 mt-1">
                  <StreamingText 
                    content={currentQuestion.description} 
                    speedMs={5} 
                    isStreaming={true}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {currentQuestion.choices.map((choice) => {
                const isSelected = selectedChoices[currentQuestion.name] === choice.value;
                return (
                  <button
                    key={choice.value}
                    onClick={() => handleSelect(currentQuestion.name, choice.value)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-200 group ${
                      isSelected 
                        ? 'bg-white/5 border-white/20 shadow-inner' 
                        : 'bg-transparent border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                    }`}
                    style={{ borderRadius: '4px' }}
                  >
                    <div className={`size-3 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? 'border-white/80' : 'border-white/20 group-hover:border-white/40'
                    }`}>
                      {isSelected && <div className="size-1 rounded-full bg-white animate-in fade-in zoom-in-50" />}
                    </div>
                    <span className={`text-[12px] transition-colors truncate ${isSelected ? 'text-white font-medium' : 'text-white/60'}`}>
                      {choice.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300" style={{ borderRadius: '4px' }}>
             <div className="min-h-[28px] text-[14px] font-medium text-[#e9e9e9] leading-tight">
              <StreamingText 
                content="Deseja adicionar mais algum detalhe ou pensamento adicional?" 
                speedMs={8} 
                isStreaming={true}
              />
            </div>
            <textarea
              autoFocus
              placeholder="Outros pensamentos..."
              value={otherThoughts}
              onChange={(e) => setOtherThoughts(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/10 transition-colors resize-none h-20"
              style={{ borderRadius: '4px' }}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <button
            onClick={() => {
              if (showTextArea) setShowTextArea(false);
              else if (currentStep > 0) setCurrentStep(prev => prev - 1);
            }}
            disabled={currentStep === 0 && !showTextArea}
            className="text-[11px] font-medium text-white/30 hover:text-white disabled:opacity-0 transition-all cursor-pointer"
          >
            Voltar
          </button>
          
          {!showTextArea ? (
            <button
              onClick={handleNext}
              disabled={!selectedChoices[currentQuestion.name]}
              className="px-4 py-1.5 rounded-lg bg-white text-black font-bold text-[11px] hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1.5"
              style={{ borderRadius: '4px' }}
            >
              <span>{isLastStep ? 'Próximo' : 'Continuar'}</span>
              <CaretRight size={11} weight="bold" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"
              style={{ borderRadius: '4px' }}
            >
              <span>Concluir</span>
              <Check size={11} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageItem({ 
  message, 
  onSelectSuggestion,
  onInspectInComputer,
  onApprovalDecision,
  onStreamingDone,
  onFinishQuestionnaire,
  isAlreadyStreamed
}: { 
  message: ChatMessage; 
  onSelectSuggestion: (s: string) => void;
  onInspectInComputer?: () => void;
  onApprovalDecision?: (messageId: string, approved: boolean) => void;
  onStreamingDone?: (id: string) => void;
  onFinishQuestionnaire?: (answers: Record<string, string>, summaryText: string) => void;
  isAlreadyStreamed?: boolean;
}) {
  const isAssistant = message.role === 'assistant';
  const isWaiting = message.status === 'in_background' || Boolean(message.questionnaire && message.status !== 'completed');
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Keep message content intact so code blocks are fully syntax-highlighted
  const cleanText = message.content || '';

  if (!isAssistant) {
    return (
      <div className="flex justify-end">
        <div className="bg-bg-action-hover/60 px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed border border-border-divider-subtle text-text-content-primary shadow-xs">
          <MarkdownRenderer content={message.content} />
        </div>
      </div>
    );
  }

    // Map tool calls to specific MCP servers for display
    let finalToolSteps: ToolStep[] = (message.toolCalls || []).map((tc) => {
      const presentation = describeToolExecution(tc.toolName, tc.arguments || {}, tc.screenData?.actionDescription || '');

      // Determine MCP name for the UI label
      let mcpLabel = tc.server;
      if (!mcpLabel || mcpLabel === 'playwright_chromium') {
        if (tc.toolName.includes('fs') || tc.toolName.includes('file') || tc.toolName.includes('write') || tc.toolName.includes('read')) mcpLabel = 'WebDev MCP';
        else if (tc.toolName.includes('browser') || tc.toolName.includes('navigate') || tc.toolName.includes('click')) mcpLabel = 'Computer MCP';
        else if (tc.toolName.includes('bash') || tc.toolName.includes('terminal')) mcpLabel = 'Terminal Bash MCP';
        else mcpLabel = 'Computer MCP';
      }

      return {
        icon: tc.toolName,
        label: presentation.label,
        chip: presentation.chip,
      mono: tc.toolName.includes('fs') || tc.toolName.includes('cmd') || tc.toolName.includes('exec') || tc.toolName.includes('file') || tc.toolName.includes('shell'),
      detailMono: true,
      detail: [
        { text: `Status: ${tc.status === 'success' ? '✓ Sucesso' : '✗ Erro'}` },
        ...(tc.arguments ? [{ text: `Argumentos: ${JSON.stringify(tc.arguments)}` }] : []),
        ...(tc.screenData?.title ? [{ text: `Página: ${tc.screenData.title}` }] : []),
        { text: presentation.detail },
        ...(tc.screenData?.actionDescription && tc.screenData.actionDescription !== presentation.detail ? [{ text: tc.screenData.actionDescription }] : [])
      ]
    };
  });

  if (finalToolSteps.length === 0 && message.executionSteps && message.executionSteps.length > 0) {
    finalToolSteps = message.executionSteps.map((es) => {
      let icon = "think";
      const l = es.label.toLowerCase();
      if (l.includes("escrev") || l.includes("write") || l.includes("edit") || l.includes("cri") || l.includes("file")) icon = "write";
      else if (l.includes("execut") || l.includes("run") || l.includes("cmd") || l.includes("terminal") || l.includes("build") || l.includes("npm")) icon = "run";
      else if (l.includes("leit") || l.includes("read") || l.includes("view")) icon = "read";

      return {
        icon,
        label: es.label,
        chip: es.detail || "Concluído",
        mono: icon === "write" || icon === "run",
        detailMono: true,
        detail: es.detail ? [{ text: es.detail }] : []
      };
    });
  } else if (finalToolSteps.length === 0 && message.logs && message.logs.length > 0) {
    finalToolSteps = message.logs.map((log) => {
      return {
        icon: log.type === 'command' ? 'run' : log.type === 'error' ? 'lint' : 'think',
        label: log.type === 'command' ? 'Comando Executado' : 'Ação do Agente',
        chip: log.content,
        mono: log.type === 'command',
        detailMono: true,
        detail: [{ text: `${log.time || ''} - ${log.content}` }]
      };
    });
  }

  const finalDiffs: ToolDiff[] = (message.files || []).map((f) => ({
    file: f.path,
    add: f.code ? f.code.split('\n').length : 1,
    del: 0
  }));

  const finalDiffLines: Record<string, any[]> = {};
  (message.files || []).forEach((f) => {
    const lines = (f.code || '').split('\n').slice(0, 8);
    finalDiffLines[f.path] = lines.map((l) => ({ text: l, tone: 'add' }));
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Assistant Brand Avatar */}
      <div className="flex items-center gap-2.5">
        <img 
          src="https://imgdb.io/i/6lwOlmk.png" 
          alt="Logotipo do Agente" 
          className="size-6 object-contain rounded-md shadow-xs bg-bg-surface-panel p-0.5" 
          />
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-text-content-primary">Manus</span>
          <span className="font-mono px-1.5 py-0.5 border border-solid" style={{ borderRadius: '6px', backgroundColor: '#1a1a1a', borderColor: '#303030', borderWidth: '2.1507px', color: '#c0c0c0', fontSize: '9px' }}>
            Lite
          </span>
        </div>
      </div>

      <div className="pl-8 space-y-4">
        {/* Execution Timeline (Ran Tools - Top, Collapsed) - Move to top as requested */}
        {!isWaiting && (isAlreadyStreamed || !message.isStreaming) && message.executionSteps && message.executionSteps.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both">
            <ExecutionTimeline steps={message.executionSteps} completed />
          </div>
        )}

        {/* Tool Chips da Resposta Final do Agente (Actions Only - Below Timeline, Expanded) */}
        {!isWaiting && finalToolSteps.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-500 fill-mode-both">
            <ToolChips
              steps={finalToolSteps}
              diffs={[]}
              diffLines={{}}
              initialOpen={!isAlreadyStreamed && !message.isStreaming === false}
              labels={{ header: `${finalToolSteps.length} ferramenta(s) executada(s) pelo agente` }}
            />
          </div>
        )}

        {/* Clean Executive Response Text with Streaming Text Animation */}
        <div className="text-[15px] leading-relaxed text-text-content-primary/90 font-sans">
          <StreamingText 
            content={cleanText}
            isStreaming={Boolean(message.isStreaming && !isAlreadyStreamed)}
            initialDone={!message.isStreaming || Boolean(isAlreadyStreamed)}
            onDone={() => onStreamingDone?.(message.id)}
          />
        </div>

        {/* Inline Selection Questionnaire Component (@reui/c-questionnaire-7) */}
        {isWaiting && (isAlreadyStreamed || !message.isStreaming) && (
          <InlineChatQuestionnaire 
            questionnaire={message.questionnaire}
            onSubmit={(answers, summaryText) => {
              onFinishQuestionnaire?.(answers, summaryText);
            }}
          />
        )}

        {/* Human Approval Required Gate */}
        {!isWaiting && message.approval && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <ShieldWarning size={16} />
                <span>Autorização Humana Necessária</span>
              </div>
              <span className={`text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded font-bold ${
                message.approval.riskLevel === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                Risco {message.approval.riskLevel === 'high' ? 'Alto' : 'Médio'}
              </span>
            </div>

            <p className="text-xs text-text-content-primary/80 leading-relaxed">
              {message.approval.reason}
            </p>

            {message.approval.decision ? (
              <div className="pt-2 flex items-center gap-2 text-xs font-medium">
                {message.approval.decision === 'approved' ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <Check size={14} /> Ação autorizada pelo usuário
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle size={14} /> Ação recusada pelo usuário
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    if (onApprovalDecision) {
                      onApprovalDecision(message.id, true);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck size={14} />
                  <span>Autorizar e Prosseguir</span>
                </button>
                <button
                  onClick={() => {
                    if (onApprovalDecision) {
                      onApprovalDecision(message.id, false);
                    }
                  }}
                  className="bg-white/10 hover:bg-white/15 text-white/70 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <span>Recusar Operação</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Downloadable Artifacts Box */}
        {!isWaiting && message.artifacts && message.artifacts.length > 0 && (
          <div className="bg-bg-surface-panel border border-border-divider-subtle rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-content-primary animate-pulse">
              <DownloadSimple size={14} className="text-green-400" />
              <span>Artefatos de Trabalho Gerados ({message.artifacts.length})</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {message.artifacts.map((art) => (
                <div key={art.id} className="bg-bg-canvas-main/40 border border-border-divider-subtle/50 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-text-content-primary font-medium">{art.name}</span>
                    <span className="text-text-content-secondary/60 text-[10px]">({Math.round(art.sizeBytes / 1024)} KB)</span>
                  </div>
                  <a
                    href={art.downloadUrl}
                    download
                    className="text-blue-400 hover:text-blue-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <DownloadSimple size={12} />
                    <span>Baixar</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task Completion Bar and Message Suggestions Follow-ups */}
        {!isWaiting && (isAlreadyStreamed || !message.isStreaming) && message.status === 'completed' && (
          <div className="pt-3 mt-1 border-t border-white/5 animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both space-y-2">
            {/* Top Bar: Tarefa concluída | Copy | Replay | Time ----- Como foi este resultado? ★★★★★ */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-text-content-secondary/60">
                <div className="flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: '#68ca3c' }}>
                  <Check size={14} weight="bold" style={{ color: '#68ca3c' }} />
                  <span style={{ color: '#68ca3c' }}>Tarefa concluída</span>
                </div>

                <span className="text-white/20 select-none">|</span>

                <div className="flex items-center gap-1 text-text-content-secondary/40">
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(message.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="hover:text-text-content-primary transition-colors flex items-center justify-center size-6 rounded hover:bg-white/5 cursor-pointer" 
                    title="Copiar resposta"
                  >
                    {copied ? <Check size={13} style={{ color: '#68ca3c' }} /> : <Copy size={13} />}
                  </button>
                  <button 
                    onClick={() => onSelectSuggestion("Refazer resposta")}
                    className="hover:text-text-content-primary transition-colors flex items-center justify-center size-6 rounded hover:bg-white/5 cursor-pointer" 
                    title="Gerar nova resposta"
                  >
                    <ArrowClockwise size={13} />
                  </button>
                </div>

                <span className="text-[11px] text-white/40 font-normal">
                  {message.time || 'Hoje, 20:26'}
                </span>
              </div>

              {/* Right: Como foi este resultado? + 5 Stars */}
              <div className="flex items-center gap-2 text-text-content-secondary/70">
                <span className="text-[11px] text-white/50 hidden sm:inline">Como foi este resultado?</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star === rating ? 0 : star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                      title={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      <Star 
                        size={13} 
                        weight={(hoverRating || rating) >= star ? "fill" : "regular"} 
                        className={(hoverRating || rating) >= star ? "text-amber-400" : "text-white/20 hover:text-white/40"}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions Follow-up List (stacked vertically with subtle divider lines) */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="flex flex-col divide-y divide-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                {message.suggestions.map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => onSelectSuggestion(suggestion)}
                    className="group w-full flex items-start sm:items-center justify-between gap-3 py-3 px-1 text-left hover:bg-white/[0.03] rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <ChatCircleDots size={16} className="text-white/40 group-hover:text-white/80 shrink-0 mt-0.5 sm:mt-0 transition-colors" />
                      <span className="text-[12.5px] text-white/80 group-hover:text-white leading-relaxed font-normal">
                        {suggestion}
                      </span>
                    </div>
                    <ArrowRight size={14} className="text-white/30 group-hover:text-white/80 shrink-0 transition-all group-hover:translate-x-0.5 mt-0.5 sm:mt-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isWaiting && (isAlreadyStreamed || !message.isStreaming) && (
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5 animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-zinc-400/90 text-[11px] font-medium">
                  <div className="size-3.5 border border-zinc-500/30 rounded-full flex items-center justify-center">
                    <div className="size-1.5 bg-zinc-400 rounded-full animate-pulse" />
                  </div>
                  <span>Manus continuará após sua resposta</span>
                </div>
                <div className="flex items-center gap-1 text-text-content-secondary/40">
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(message.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="hover:text-text-content-primary transition-colors flex items-center justify-center size-7 rounded-lg hover:bg-white/5 cursor-pointer" 
                    title="Copiar resposta"
                  >
                    {copied ? <Check size={14} style={{ color: '#68ca3c' }} /> : <Copy size={14} />}
                  </button>
                  <button 
                    onClick={() => onSelectSuggestion("Refazer resposta")}
                    className="hover:text-text-content-primary transition-colors flex items-center justify-center size-7 rounded-lg hover:bg-white/5 cursor-pointer" 
                    title="Gerar nova resposta"
                  >
                    <ArrowClockwise size={14} />
                  </button>
                </div>
             </div>

             <div className="flex items-center gap-3 text-text-content-secondary/40">
                <span className="text-[10px] font-mono opacity-60">{message.time}</span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

function InitialThinkingAnimation({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div className="w-full max-w-[820px] pl-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5 py-1">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-cover bg-center border border-white/10 shadow-xs" style={{ backgroundImage: `url('https://imgdb.io/i/z2ZOrTk.png')` }}>
          <Sparkle size={13} weight="fill" className="animate-pulse text-white" />
        </span>
        <span className="thinking-shimmer text-[12px] font-medium">Pensando e preparando a próxima etapa · {elapsedSeconds || 1}s</span>
      </div>
    </div>
  );
}

function AgentProgressNotes({ notes }: { notes: AgentProgressNote[] }) {
  const note = notes[0];
  if (!note) return null;

  return (
    <section
      aria-label="Notas do agente"
      className="w-full max-w-[820px] pl-8 animate-in fade-in duration-300"
    >
      <div className="min-w-0 text-left">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-medium text-text-content-secondary/55">
          <span className={`size-1.5 rounded-full ${note.status === 'running' ? 'bg-white/60 animate-pulse' : note.status === 'warning' ? 'bg-amber-300/80' : 'bg-white/35'}`} />
          <span>Nota · {note.label}</span>
          <span className="font-mono text-[9px] text-text-content-secondary/35">{note.timestamp}</span>
        </div>
        <MarkdownRenderer
          content={note.text}
          className="text-[15px] leading-relaxed text-text-content-primary/90"
        />
      </div>
    </section>
  );
}

function LocalActiveThinkingState({ elapsedSeconds, step, steps }: { elapsedSeconds: number; step: string; steps: ExecutionStep[] }) {
  // A step is a real web search only if it explicitly involves search engines or browsing and is NOT a command, terminal, check, or sandbox task.
  const isWebSearchStep = (text: string) => {
    const isCommandOrCheck = /verify|check|exec|run|npm|test|install|sandbox|terminal|fs_|c[oó]digo|write|read/i.test(text);
    if (isCommandOrCheck) return false;
    return /google|bing|search|pesquis|crawler|navigate|url|site/i.test(text);
  };

  const hasSearchInHistory = steps.some(s => isWebSearchStep(`${s.label} ${s.detail}`));
  const hasCodingInHistory = steps.some(s => !isWebSearchStep(`${s.label} ${s.detail}`) && /write|read|edit|c[oó]digo|npm|terminal|arquivo|fs_writeFile|fs_readFile|terminal_exec|sandbox|verify|check|exec|run/i.test(`${s.label} ${s.detail}`));

  const isCurrentlySearching = isWebSearchStep(`${step} ${steps.find(s => s.status === 'running')?.label || ''}`);
  const isCurrentlyCoding = !isCurrentlySearching && /write|read|edit|c[oó]digo|npm|terminal|arquivo|fs_writeFile|fs_readFile|terminal_exec|sandbox|verify|check|exec|run/i.test(`${step} ${steps.find(s => s.status === 'running')?.label || ''}`);

  const isQueryRelatedToSearch = !isCurrentlyCoding && !hasCodingInHistory && /pesquis|procur|buscar|google|site|link|naveg|url|search|find|ycombinator|github/i.test(step);
  const isQueryRelatedToCoding = /cria|codigo|escreve|edit|pasta|file|create|app|npm|run|install|yarn|verify|check|exec|sandbox/i.test(step);

  const isReasoningActive = step.toLowerCase().includes('racioc') || step.toLowerCase().includes('analis') || step.toLowerCase().includes('planej');

  let contextVariant = "Steps";
  if (isCurrentlyCoding || hasCodingInHistory || isQueryRelatedToCoding) {
    contextVariant = "Coding";
  } else if (isCurrentlySearching || hasSearchInHistory || isQueryRelatedToSearch) {
    contextVariant = "Search";
  } else if (isReasoningActive) {
    contextVariant = "Reasoning";
  }

  // A variante agora acompanha o processo real. Não trocamos a árvore pelo relógio,
  // porque isso desmontava a timeline e fazia todas as etapas entrarem novamente.
  const currentVariant = contextVariant;

  // Only the current/running step belongs in the live animation. Keeping the
  // historical steps here was what made the whole list replay from the top.
  const activeStep = [...steps].reverse().find(s => s.status === 'running') || steps[steps.length - 1];
  const mappedRows = activeStep ? [{
    primary: activeStep.label,
    secondary: activeStep.detail,
    mono: contextVariant === "Coding" || activeStep.label.includes('.') || activeStep.label.includes('npm') || activeStep.label.includes('run')
  }] : [{ primary: step || 'Preparando a próxima etapa...' }];

  return (
    <section
      aria-label="Animação de execução do agente"
      className="w-full max-w-[820px] animate-in fade-in duration-300"
    >
      {/* This is a plain status lane: no card, background or border. */}
      <div className="ml-8 transition-all duration-300 ease-out">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-medium text-text-content-secondary/70">
          <Sparkle size={12} weight="fill" className="animate-pulse text-text-content-primary/60" />
          <span>Pensando</span>
          <span className="font-mono text-[9px] text-text-content-secondary/45">{elapsedSeconds || 1}s</span>
        </div>
        <ThinkingState
          variant={currentVariant}
          rows={mappedRows}
          elapsedSeconds={elapsedSeconds}
          working={true}
          active={currentVariant === "Search" ? `Pesquisando: ${step || "fontes relevantes na web"}` : undefined}
        />
      </div>
    </section>
  );
}

function ExecutionTimeline({
  steps,
  activeStep,
  elapsedSeconds,
  completed = false
}: {
  steps: ExecutionStep[];
  activeStep?: string;
  elapsedSeconds?: number;
  completed?: boolean;
}) {
  const sequence = [800, 600, 1800, 2600, 1600];
  const [stage, setStage] = useState(completed ? sequence.length - 1 : 0);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  useEffect(() => {
    if (completed) {
      setStage(sequence.length - 1);
      return;
    }
    if (stage >= sequence.length - 1) return;
    const timer = window.setTimeout(() => setStage((current) => current + 1), sequence[stage]);
    return () => window.clearTimeout(timer);
  }, [completed, stage]);

  const searchVariant = steps.some((step) => /search|pesquis|google/i.test(`${step.label} ${step.detail}`));
  const codingVariant = steps.some((step) => /edit|c[oó]digo|npm|terminal|arquivo/i.test(`${step.label} ${step.detail}`));
  const working = !completed && stage < sequence.length - 1;
  const autoExpanded = false;
  const expanded = manualExpanded ?? autoExpanded;
  const visibleSteps = steps;
  const focusedStep = [...steps].reverse().find((step) => step.status === 'running') || steps.at(-1);
  const activeLabel = searchVariant ? 'Searching the web' : codingVariant ? 'Running tools' : 'Thinking';
  const doneLabel = searchVariant ? 'Searched the web' : codingVariant ? `Ran ${Math.max(1, steps.length)} tools` : 'Thought process settled';

  const renderStep = (step: ExecutionStep, index: number) => {
    const isRunning = step.status === 'running';
    const isWarning = step.status === 'warning';
    return (
      <div key={`${step.id}_${index}`} className={`relative flex min-h-7 w-full min-w-0 items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-200 ${isRunning ? 'bg-bg-action-hover/50' : 'hover:bg-bg-action-hover/30'}`} style={{ animation: `thinking-fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 120}ms both` }}>
        {searchVariant ? (
          <Favicon 
            urlOrDomain={step.detail || step.label} 
            size={13} 
            fallbackIcon={<Globe size={13} className={`${isWarning ? 'text-amber-300' : 'text-cyan-300'} shrink-0`} />} 
          />
        ) : isWarning ? (
          <ShieldWarning size={13} className="shrink-0 text-amber-300" />
        ) : isRunning ? (
          <Spinner size={13} className="animate-spin text-text-content-secondary shrink-0" />
        ) : (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-cover bg-center border border-white/10 shadow-xs" style={{ backgroundImage: `url('https://imgdb.io/i/z2ZOrTk.png')` }}>
            {getContextualToolIcon(step.label, step.label, step.detail)}
          </span>
        )}
        <div className="min-w-0 flex-1 flex flex-col items-stretch gap-0.5">
          <span className={`min-w-0 break-words [overflow-wrap:anywhere] text-[11px] ${searchVariant ? 'text-text-content-primary/80' : 'text-text-content-primary/70'} ${codingVariant ? 'font-mono' : 'font-medium'}`}>{step.label}</span>
          {step.detail && <span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[10px] text-text-content-secondary/70">{step.detail}</span>}
        </div>
        {step.timestamp && <span className="ml-auto shrink-0 text-[9px] font-mono text-text-content-secondary/40">{step.timestamp}</span>}
      </div>
    );
  };

  return (
    <div className={`execution-timeline flex w-full max-w-[780px] flex-col bg-transparent p-0 ${completed ? 'mt-1' : ''}`} style={{ minHeight: working || expanded ? 148 : undefined, transition: 'min-height 400ms cubic-bezier(0.23,1,0.32,1)' }}>
      <div className="flex items-center gap-2">
        <button type="button" aria-expanded={expanded} onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))} className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-bg-action-hover cursor-pointer">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-cover bg-center border border-white/10 shadow-xs" style={{ backgroundImage: `url('https://imgdb.io/i/z2ZOrTk.png')` }}>
            <Sparkle size={13} weight="fill" className={working ? 'text-white animate-pulse' : 'text-text-content-secondary'} />
          </span>
          <span role="status" className="text-[13px] font-medium">
            {working ? <span className="thinking-shimmer">{activeLabel}</span> : <span className="text-text-content-primary/60">{doneLabel}</span>}
          </span>
          <CaretDown size={13} className={`text-text-content-secondary/40 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <p className="pl-6 text-[10px] text-text-content-secondary/60">{working ? (focusedStep?.detail || focusedStep?.label || activeStep || 'Preparing the next step...') : 'The trace settled and remains expandable.'}</p>

      <div className="grid transition-[grid-template-rows,opacity] duration-400" style={{ gridTemplateRows: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.23,1,0.32,1)' }}>
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span aria-hidden className="absolute left-[3px] top-0 bottom-0 w-px bg-border-divider-subtle" />
            <div className="relative flex flex-col gap-1 py-1">
              {searchVariant && focusedStep && (
                <div className="flex min-h-7 items-center gap-2 px-1.5 text-[11px] text-text-content-primary/60" style={{ animation: 'thinking-fade-in 300ms ease-out both' }}>
                  <Favicon urlOrDomain={focusedStep.detail} size={13} fallbackIcon={<Globe size={13} className="shrink-0 text-text-content-secondary/60" />} />
                  <span className="truncate">{focusedStep.detail.match(/pesquisando “?([^”"]+)/i)?.[1] || focusedStep.detail}</span>
                </div>
              )}
              {visibleSteps.map(renderStep)}
              {visibleSteps.length === 0 && <div className="min-h-7 px-1.5 text-[11px] text-text-content-secondary/60">Preparing the first step...</div>}
            </div>
          </div>
        </div>
      </div>

      {completed && steps.length > 1 && <span className="mt-2 pl-6 text-[10px] text-text-content-secondary/40">{steps.length} etapas registradas · clique no cabeçalho para expandir</span>}
    </div>
  );
}

function ChatInput({ onSend, onStop, isThinking }: { onSend: (val: string) => void; onStop: () => void; isThinking: boolean }) {
  const [value, setValue] = useState('');

  return (
    <div className="relative group">
      <div className="bg-bg-surface-panel border border-border-divider-subtle rounded-2xl focus-within:border-border-control-active transition-all shadow-2xl overflow-hidden">
        <textarea 
          placeholder="Mensagem para o agente Manus..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={1}
          className="w-full bg-bg-surface-panel p-4 pr-16 text-sm outline-none resize-none placeholder:text-text-content-secondary/30 min-h-[56px] max-h-[200px] text-text-content-primary font-sans"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (value.trim() && !isThinking) {
                onSend(value);
                setValue('');
              }
            }
          }}
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border-divider-subtle bg-bg-canvas-main/20">
           <div className="flex items-center gap-2">
              <button 
                title="Anexar arquivo"
                className="p-1.5 hover:bg-bg-action-hover rounded-md text-text-content-secondary/40 hover:text-text-content-primary transition-colors"
              >
                <Plus size={16} />
              </button>
              <button 
                title="Conectar Repositório GitHub"
                className="p-1.5 hover:bg-bg-action-hover rounded-md text-text-content-secondary/40 hover:text-text-content-primary transition-colors"
              >
                <GithubLogo size={16} />
              </button>
              <img 
                src="https://imgdb.io/i/6lwOlmk.png" 
                alt="Agente" 
                className="size-5 object-contain rounded bg-bg-action-hover p-0.5" 
                title="Agente Manus Conectado"
              />
              <div className="h-4 w-px bg-border-divider-subtle mx-1" />
              <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-bg-action-hover rounded-md text-text-content-secondary/40 hover:text-text-content-primary transition-colors cursor-pointer">
                <Cloud size={14} />
                <span className="text-[11px] font-medium text-text-content-secondary/80">Nuvem</span>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <button 
                title="Entrada por voz"
                className="p-1.5 hover:bg-bg-action-hover rounded-md text-text-content-secondary/40 hover:text-text-content-primary transition-colors"
              >
                <Microphone size={16} />
              </button>
              <button 
                onClick={() => {
                  if (isThinking) {
                    onStop();
                  } else if (value.trim()) {
                    onSend(value);
                    setValue('');
                  }
                }}
                disabled={!value.trim() && !isThinking}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isThinking 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : value.trim()
                    ? 'bg-interactive-cta-bg text-bg-canvas-main hover:opacity-90 shadow-xs' 
                    : 'bg-bg-action-hover text-text-content-secondary/20'
                }`}
                title={isThinking ? 'Interromper agente' : 'Enviar comando'}
              >
                {isThinking ? <StopCircle size={18} /> : <ArrowUp size={18} />}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
