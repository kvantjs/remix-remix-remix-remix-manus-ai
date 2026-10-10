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
  ChatCircleDots,
  CaretLeft,
  ListBullets
} from '@phosphor-icons/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToolCallTrace, AgentExecutionLog } from '../types/project';
import { markdownFences } from '@/components/reui/code-block/code-block-highlight';
import { ProfessionalCodeBlock } from './ProfessionalCodeBlock';
import { SyntaxCodeView, InlineCodeSnippet } from './SyntaxCodeView';
import ThinkingState, { AnimatedThinkingStatus, ThinkingPhase } from './ThinkingState';
import { WorkingDot } from './WorkingLoader';
import ToolChips, { getContextualToolIcon, getContextualFileIcon, ToolStep, ToolDiff } from './ToolChips';
import StreamingText from './StreamingText';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Favicon, extractCleanDomain } from '@/lib/favicon';
import { sanitizeProgressNote, AgentProgressNote, removeAllEmojis } from '@/lib/agentNotes';
import PromptBar from './PromptBar';
import ManusMark from './ManusMark';
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
  attachmentContext?: string;
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

function toUserFacingAgentText(value: unknown, fallback: string) {
  const text = String(value ?? '').trim()
    .replace(/\bOpenManus\b/gi, 'agente')
    .replace(/\bKopilot\b/gi, 'Manus')
    .replace(/\bKvant\b/gi, 'Manus')
    .replace(/\bagente Manus\b/gi, 'agente');
  return text || fallback;
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
    toolCalls?: ToolCallTrace[];
    intent?: any;
    browserStatus?: 'loading' | 'interactive' | 'error' | 'blocked';
  }) => void;
  onInspectInComputer?: () => void;
  onToggleSidebar?: () => void;
}

export function ChatArea({ 
  onFileUpdate, 
  externalPrompt, 
  onClearExternalPrompt, 
  currentFiles,
  onAgentStateChange,
  onInspectInComputer,
  onToggleSidebar
}: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      isStreaming: false,
      content: `Olá! Sou o Manus. O que vamos fazer hoje?`,
      suggestions: [
        'Pesquise na web sobre um tema e resuma as fontes',
        'Crie uma página de apresentação para meu projeto',
        'Revise estes arquivos e sugira melhorias',
        'Explique como você pode ajudar nesta tarefa'
      ]
    }
  ]);

  const [streamedIds, setStreamedIds] = useState<Set<string>>(() => new Set(['welcome']));
  const [isAgentInBackground, setIsAgentInBackground] = useState(false);
  const [bgElapsedSeconds, setBgElapsedSeconds] = useState(0);
  const [shareFeedback, setShareFeedback] = useState('');

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
  const [agentLivePhase, setAgentLivePhase] = useState<ThinkingPhase>('Pensando');
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

  const highlightProgressNote = (label: string, text: string, status: AgentProgressNote['status'] = 'complete') => {
    const { cleanLabel, cleanText } = sanitizeProgressNote(label, text);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setProgressNotes((previous) => {
      const persistentId = `destaque_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newPersistent: AgentProgressNote = {
        id: persistentId,
        label: cleanLabel,
        text: cleanText,
        status,
        timestamp,
        isPersistent: true
      };
      const existingPersistent = previous.filter((n) => n.isPersistent);
      const existingLive = previous.find((n) => !n.isPersistent);
      // No fixed limit (e.g. -3), the agent chooses how many to highlight
      const nextPersistent = [...existingPersistent, newPersistent];
      const next = existingLive ? [...nextPersistent, existingLive] : nextPersistent;
      progressNotesRef.current = next;
      return next;
    });
  };

  const updateProgressNote = (
    label: string,
    text: string,
    status: AgentProgressNote['status'] = 'running',
    options?: { isPersistent?: boolean }
  ) => {
    if (options?.isPersistent) {
      highlightProgressNote(label, text, status);
      return;
    }
    const { cleanLabel, cleanText } = sanitizeProgressNote(label, text);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setProgressNotes((previous) => {
      const existingPersistent = previous.filter((n) => n.isPersistent);
      const existingLive = previous.find((n) => !n.isPersistent);
      const liveNote: AgentProgressNote = {
        id: existingLive?.id || 'agent-live-note',
        label: cleanLabel,
        text: cleanText,
        status,
        timestamp,
        isPersistent: false
      };
      const next = [...existingPersistent, liveNote];
      progressNotesRef.current = next;
      return next;
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
    void prompt;
    highlightProgressNote('Tarefa recebida', 'O pedido foi recebido. Vou iniciar a execução e mostrar as etapas relevantes aqui.', 'complete');
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
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isThinking]);

  const handleResumeFromBackground = (summaryText: string) => {
    setIsAgentInBackground(false);
    setMessages(prev => prev.filter(m => m.status !== 'in_background' && !m.questionnaire));
    
    // Seamless context injection: Continue working without adding a visible user message to the UI
    const injectedContext = `[Contexto Adquirido Autonomamente]: O usuário definiu as preferências: ${summaryText}. O subagente sincronizou os dados. Continue a tarefa agora.`;
    handleSendMessage(injectedContext, true);
  };

  const handleResumeWithDefaults = () => {
    setIsAgentInBackground(false);
    setMessages(prev => prev.filter(m => m.status !== 'in_background' && !m.questionnaire));
    handleSendMessage(`[Contexto Definido]: Prossiga com a melhor arquitetura de software, padrão Fintech/SaaS, paleta escura e recursos dinâmicos autônomos.`);
  };

  useEffect(() => {
    if (externalPrompt) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (userPrompt: string, isSilentContext: boolean = false, attachments: File[] = []) => {
    if ((!userPrompt.trim() && attachments.length === 0) || isThinking) return;
    const requestStartTime = Date.now();

    if (!isSilentContext && attachments.length === 0 && (userPrompt.trim().toLowerCase() === '/context' || userPrompt.trim().toLowerCase() === 'context')) {
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

    let attachmentContext = '';
    if (attachments.length > 0) {
      try {
        let totalBytes = 0;
        const fileContents: string[] = [];
        for (const file of attachments) {
          totalBytes += file.size;
          if (file.size > 512 * 1024 || totalBytes > 1024 * 1024) {
            throw new Error('Os anexos devem ter até 512 KB cada e 1 MB no total.');
          }
          const text = await file.text();
          if (text.length > 100_000) throw new Error(`O arquivo ${file.name} excede o limite de texto processável.`);
          fileContents.push(`--- ${file.name} ---\n${text}`);
        }
        attachmentContext = `\n\nConteúdo dos arquivos enviados pelo usuário:\n${fileContents.join('\n\n')}`;
      } catch (error: any) {
        setMessages((previous) => [...previous, {
          id: `attachment_error_${Date.now()}`,
          role: 'assistant',
          status: 'failed',
          content: error?.message || 'Não foi possível ler os arquivos anexados.'
        }]);
        return;
      }
    }
    const normalizedPrompt = userPrompt.trim() || 'Analise os arquivos anexados.';
    const backendPrompt = `${normalizedPrompt}${attachmentContext}`;

    if (!isSilentContext) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: attachments.length
          ? `${normalizedPrompt}\n\nArquivos anexados: ${attachments.map((file) => file.name).join(', ')}`
          : normalizedPrompt,
        attachmentContext
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsThinking(true);
    setAgentLivePhase('Pensando');
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

      const historyPayload = messages.filter((m) => m.id !== 'welcome').map(m => ({
        role: m.role,
        content: `${m.content}${m.attachmentContext || ''}`
      }));

      let payload: any = null;
      const liveToolCalls: ToolCallTrace[] = [];

      try {
        const streamRes = await fetch('/api/agent/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: backendPrompt,
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
                    setAgentLivePhase('Trabalhando');
                    updateProgressNote('Preparando o computador', 'Inicializando o ambiente necessário para a tarefa.', 'running');
                    setCurrentStep('Preparando o computador do agente…');
                    beginExecutionStep('Inicializando ambiente do agente', 'Preparando ambiente seguro e ferramentas de execução.');
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: 'Preparando o computador do agente…',
                        contextText: 'O ambiente necessário para a tarefa está sendo preparado.',
                        toolCalls: [...liveToolCalls],
                        browserStatus: 'loading'
                      });
                    }
                  } else if (currentEvent === 'computer_ready') {
                    setAgentLivePhase('Raciocinando');
                    highlightProgressNote('Computador pronto', 'O computador do agente está pronto para a próxima ação.', 'complete');
                    completeExecutionStep('Inicializando ambiente do agente', 'Computador do agente pronto.');
                    setCurrentStep('Computador do agente pronto.');
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: 'Computador do agente pronto.',
                        contextText: 'Boot concluído. O agente pode iniciar ações autorizadas.',
                        toolCalls: [...liveToolCalls],
                        browserStatus: 'interactive'
                      });
                    }
                  } else if (currentEvent === 'stage_note') {
                    setAgentLivePhase('Pensando');
                    const stageLabel = toUserFacingAgentText(data.label, 'Etapa da tarefa');
                    if (data.highlight || data.persistent) {
                      highlightProgressNote(stageLabel, 'Etapa concluída.', 'complete');
                    } else {
                      updateProgressNote(stageLabel, 'Etapa em andamento.', 'running');
                    }
                    setCurrentStep(stageLabel);
                  } else if (currentEvent === 'execution_gate') {
                    setAgentLivePhase('Pensando');
                    updateProgressNote('Próxima etapa', 'Preparando a próxima ação.', 'running');
                    setCurrentStep('Preparando a próxima ação…');
                  } else if (currentEvent === 'deliberation') {
                    setAgentLivePhase('Raciocinando');
                    const deliberationLabel = toUserFacingAgentText(data.label, 'Plano de execução');
                    const deliberationText = data.complete ? 'Plano de execução definido.' : 'Organizando as etapas da tarefa.';
                    if (data.complete) {
                      highlightProgressNote(
                        deliberationLabel,
                        deliberationText,
                        'complete'
                      );
                      restartExecutionAnimation();
                    } else {
                      updateProgressNote(deliberationLabel, deliberationText, 'running');
                    }
                    setCurrentStep(deliberationText);
                    beginExecutionStep(deliberationLabel, deliberationText);
                    if (data.complete) {
                      completeExecutionStep(deliberationLabel, `${deliberationText} Etapa validada.`);
                    }
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: data.complete ? 'Plano definido' : 'Planejando a tarefa',
                        contextText: deliberationText,
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'status') {
                    const statusText = 'Preparando a próxima ação.';
                    setAgentLivePhase('Pensando');
                    updateProgressNote('Próxima etapa', statusText, 'running');
                    setCurrentStep(statusText);
                    beginExecutionStep('Próxima etapa', statusText);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText,
                        contextText: statusText,
                        toolCalls: [...liveToolCalls],
                        intent: data.intent
                      });
                    }
                  } else if (currentEvent === 'step') {
                    setAgentLivePhase('Trabalhando');
                    const stepLabel = toUserFacingAgentText(data.toolName, 'Etapa de execução');
                    const stepText = `Executando: ${stepLabel}.`;
                    updateProgressNote(stepLabel, stepText, 'running');
                    setCurrentStep(stepText);
                    beginExecutionStep(stepLabel, stepText);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: stepText,
                        contextText: stepText,
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'tool_start') {
                    setAgentLivePhase('Trabalhando');
                    activateExecutionAnimation();
                    const rawCommand = data.arguments?.command || data.arguments?.code || '';
                    if (data.arguments && rawCommand) {
                      data.arguments.command = String(rawCommand).toLowerCase().trim();
                    }
                    const presentation = describeToolExecution(data.toolName, data.arguments || {}, data.reason || '');
                    const startedFilePath = String(data.arguments?.filePath || data.arguments?.path || data.arguments?.filename || '').trim();
                    const presentationLabel = startedFilePath ? `${presentation.label} · ${startedFilePath}` : presentation.label;
                    updateProgressNote(presentationLabel, `${presentation.detail || presentation.chip}.`, 'running');
                    setCurrentStep(`${presentation.label}: ${presentation.chip}`);
                    beginExecutionStep(presentation.label, presentation.detail);
                    const activeTrace: ToolCallTrace = {
                      id: `active_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
                        url: data.arguments?.url || '',
                        title: 'Acessando ao vivo...',
                        actionDescription: data.reason,
                        command: rawCommand ? String(rawCommand).toLowerCase().trim() : undefined,
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
                        contextText: 'Executando a ferramenta necessária para esta etapa.',
                        toolCalls: [...liveToolCalls],
                        browserStatus: data.toolName.includes('browser') || data.toolName.includes('navigate') ? 'loading' : undefined
                      });
                    }
                  } else if (currentEvent === 'browser_progress') {
                    setAgentLivePhase('Trabalhando');
                    browserProgressSequenceRef.current += 1;
                    activateExecutionAnimation();
                    updateProgressNote('Navegador ao vivo', data.actionDescription || data.status || 'Acompanhando mouse, rolagem e conteúdo da página.', 'running');
                    const progressTrace: ToolCallTrace = {
                      id: `active_browser_${data.toolName || 'action'}_${Date.now()}_${browserProgressSequenceRef.current}_${Math.random().toString(36).slice(2, 6)}`,
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
                    setAgentLivePhase('Trabalhando');
                    activateExecutionAnimation();
                    const rawCmd = data.command || 'bash_exec';
                    const command = String(rawCmd).toLowerCase().trim();
                    const chunk = String(data.chunk || '');
                    const isDone = Boolean(data.done);
                    const exitCode = data.exitCode ?? 0;

                    // Update existing running terminal trace in place if present
                    let existingIndex = -1;
                    for (let i = liveToolCalls.length - 1; i >= 0; i--) {
                      const t = liveToolCalls[i];
                      if (t.actionType === 'terminal' || t.toolName?.toLowerCase().includes('bash') || t.toolName?.toLowerCase().includes('python')) {
                        existingIndex = i;
                        break;
                      }
                    }

                    if (existingIndex >= 0) {
                      const existing = liveToolCalls[existingIndex];
                      const prevOutput = existing.screenData?.terminalOutput || '';
                      const updatedOutput = chunk ? (prevOutput ? `${prevOutput}${chunk}` : chunk) : prevOutput;

                      liveToolCalls[existingIndex] = {
                        ...existing,
                        status: isDone ? (Number(exitCode) === 0 ? 'success' : 'error') : 'running',
                        result: updatedOutput || (isDone ? `Processo finalizado com exitCode ${exitCode}` : 'Processo em execução...'),
                        screenData: {
                          ...existing.screenData,
                          command,
                          terminalOutput: updatedOutput,
                          actionDescription: isDone ? `Comando concluído (exit ${exitCode})` : 'Recebendo saída do terminal ao vivo'
                        }
                      };
                    } else {
                      const terminalTrace: ToolCallTrace = {
                        id: `terminal_live_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        toolName: data.toolName || 'bash_exec',
                        server: 'Terminal Bash MCP',
                        arguments: { command },
                        result: chunk || (isDone ? `Processo finalizado com exitCode ${exitCode}` : 'Processo em execução...'),
                        timestamp: new Date().toLocaleTimeString(),
                        status: isDone ? (Number(exitCode) === 0 ? 'success' : 'error') : 'running',
                        actionType: 'terminal',
                        screenData: { command, terminalOutput: chunk, actionDescription: isDone ? 'Comando finalizado' : 'Recebendo saída do terminal ao vivo' }
                      };
                      liveToolCalls.push(terminalTrace);
                    }

                    updateProgressNote('Terminal ao vivo', chunk ? `${command}: ${chunk.slice(-240)}` : `${command} em execução...`, isDone ? 'complete' : 'running');
                    setCurrentStep(chunk ? `Terminal: ${chunk.slice(-160)}` : `Executando: ${command}`);
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: isDone ? `Terminal finalizado (exit ${exitCode})` : `Terminal executando: ${command}`,
                        contextText: chunk || `Recebendo saída incremental de ${command}`,
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'tool_finish') {
                    setAgentLivePhase('Raciocinando');
                    restartExecutionAnimation();
                    const toolCall = data.toolCall;
                    if (toolCall.arguments?.command) {
                      toolCall.arguments.command = String(toolCall.arguments.command).toLowerCase().trim();
                    }
                    if (toolCall.screenData?.command) {
                      toolCall.screenData.command = String(toolCall.screenData.command).toLowerCase().trim();
                    }

                    const finishedPresentation = describeToolExecution(toolCall.toolName, toolCall.arguments || {}, toolCall.screenData?.actionDescription || '');
                    const finishedFilePath = String(toolCall.arguments?.filePath || toolCall.arguments?.path || toolCall.arguments?.filename || '').trim();
                    const finishedLabel = finishedFilePath ? `${finishedPresentation.label} · ${finishedFilePath}` : finishedPresentation.label;
                    const actionSucceeded = toolCall.status !== 'error' && toolCall.status !== 'warning';
                    const resultSummary = actionSucceeded
                      ? `${finishedPresentation.detail || 'A ferramenta concluiu a operação.'}.`
                      : `A ferramenta retornou ${toolCall.status === 'error' ? 'um erro' : 'um aviso'}; confira o resultado antes de continuar.`;
                    updateProgressNote(finishedLabel, resultSummary, actionSucceeded ? 'complete' : 'warning');
                    
                    // Replace active trace if present, otherwise push
                    let runningIndex = -1;
                    for (let i = liveToolCalls.length - 1; i >= 0; i--) {
                      const t = liveToolCalls[i];
                      if ((t.actionType === 'terminal' || t.toolName === toolCall.toolName) && (t.status === 'running' || t.id.startsWith('active_') || t.id.startsWith('terminal_'))) {
                        runningIndex = i;
                        break;
                      }
                    }

                    if (runningIndex >= 0) {
                      liveToolCalls[runningIndex] = {
                        ...toolCall,
                        id: liveToolCalls[runningIndex].id,
                        screenData: {
                          ...liveToolCalls[runningIndex].screenData,
                          ...toolCall.screenData,
                          command: toolCall.screenData?.command || toolCall.arguments?.command || liveToolCalls[runningIndex].screenData?.command,
                          terminalOutput: toolCall.screenData?.terminalOutput || liveToolCalls[runningIndex].screenData?.terminalOutput
                        }
                      };
                    } else {
                      liveToolCalls.push(toolCall);
                    }
                    
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
                        statusText: 'Resultado da ferramenta recebido',
                        contextText: toolCall.screenData?.actionDescription || toolCall.toolName,
                        toolCalls: [...liveToolCalls],
                        browserStatus: bStatus
                      });
                    }
                  } else if (currentEvent === 'approval_required') {
                    setAgentLivePhase('Pensando');
                    setCurrentStep(`Aguardando autorização: ${data.approval?.reason || 'Ação destrutiva'}`);
                    beginExecutionStep('Aguardando sua autorização', data.approval?.reason || 'O agente pausou antes de uma ação sensível.');
                    completeExecutionStep('Aguardando sua autorização', data.approval?.reason || 'Ação pausada até sua decisão.', 'warning');
                  } else if (currentEvent === 'error') {
                    const rawError = String(data.message || 'O serviço de execução retornou um erro.');
                    const safeError = /\b(?:OpenManus|Manus)\b/i.test(rawError)
                      ? 'O serviço de execução retornou um erro.'
                      : rawError;
                    payload = { status: 'failed', response: `Não foi possível concluir a execução: ${safeError}` };
                    setShowExecutionAnimation(false);
                    setInitialThoughtComplete(false);
                    setFinalResponseReceived(true);
                    setCurrentStep('Execução interrompida.');
                  } else if (currentEvent === 'complete') {
                    setAgentLivePhase('Pensando');
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

      // Preserve the agent response; do not synthesize unverified work results.
      const finalToolCalls = Array.isArray(payload.toolCalls) && payload.toolCalls.length > 0 ? payload.toolCalls : liveToolCalls;
      const rawText = payload.explanation || payload.response || payload.content || payload.message || '';
      const assistantContent = String(rawText).trim() || 'O agente não retornou uma resposta final.';
      const isBg = Boolean(payload.questionnaire) || payload.status === 'in_background';
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        isStreaming: true,
        status: isBg ? 'in_background' : payload.approval ? 'waiting_for_approval' : payload.status === 'failed' ? 'failed' : 'completed',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        workingTime: payload.workingTime || `${Math.max(elapsedSeconds, Math.round((Date.now() - requestStartTime) / 1000), 5)}s`,
        sources: payload.sources || [],
        approval: payload.approval,
        artifacts: payload.artifacts || [],
        logs: Array.isArray(payload.logs) ? payload.logs : [],
        toolCalls: finalToolCalls,
        content: assistantContent,
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
        clarifications: payload.clarifications,
        questionnaire: payload.questionnaire,
        files: generatedFilesList,
        executionSteps: [
          ...executionStepsRef.current.map((step) => step.status === 'running' && !isBg ? {
            ...step,
            status: payload.approval || payload.status === 'failed' ? 'warning' as const : 'complete' as const
          } : step),
          {
            id: `summary_${Date.now()}`,
            label: isBg ? 'Aguardando sua resposta' : payload.approval ? 'Aguardando autorização' : payload.status === 'failed' ? 'Execução interrompida' : 'Resposta recebida',
            detail: isBg 
              ? 'O agente está aguardando sua resposta para continuar.'
              : payload.approval 
                ? 'A execução foi pausada para autorização.' 
                : payload.status === 'failed'
                  ? 'O serviço retornou um erro; a tarefa não foi concluída.'
                  : 'Uma resposta foi recebida do agente.',
            status: isBg ? 'running' : payload.approval || payload.status === 'failed' ? 'warning' : 'complete',
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
            statusText: 'Aguardando sua resposta',
            contextText: 'O agente está aguardando suas opções no chat para continuar.',
            toolCalls: [...liveToolCalls]
          });
        }
      } else {
        setIsAgentInBackground(false);
        onAgentStateChange?.({
          isWorking: false,
          statusText: payload.status === 'failed' ? 'Execução interrompida.' : payload.approval ? 'Execução pausada aguardando autorização.' : 'Execução concluída.',
          contextText: payload.status === 'failed' ? 'A execução não foi concluída.' : payload.approval ? 'O computador permanece disponível, mas nenhuma nova ação será executada até a autorização.' : 'O ciclo terminou; o computador está pronto para a próxima instrução.',
          toolCalls: finalToolCalls,
          browserStatus: 'interactive'
        });
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
          content: `Não foi possível concluir a execução: ${err.message || String(err)}. Você pode tentar novamente ou revisar a conexão.`,
          suggestions: ["Tentar novamente", "Verificar conexão com a API"]
        };
        setMessages(prev => [...prev, errorMsg]);
        setShowExecutionAnimation(false);
        setInitialThoughtComplete(false);
        setCurrentStep('Execução interrompida por um erro.');
        onAgentStateChange?.({
          isWorking: false,
          statusText: 'Execução interrompida por um erro.',
          contextText: 'O serviço não concluiu a solicitação. Revise o erro antes de tentar novamente.'
        });
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setShowExecutionAnimation(false);
    setInitialThoughtComplete(false);
    setCurrentStep('Execução interrompida pelo usuário.');
    completeExecutionStep('Execução interrompida', 'A tarefa foi cancelada pelo usuário.', 'warning');
    onAgentStateChange?.({
      isWorking: false,
      statusText: 'Execução interrompida pelo usuário.',
      contextText: 'A tarefa foi cancelada pelo usuário.'
    });
    setIsThinking(false);
  };

  const handleShareConversation = async () => {
    const transcript = messages
      .filter((message) => message.id !== 'welcome')
      .map((message) => `${message.role === 'user' ? 'Você' : 'Manus'}:\n${message.content}`)
      .join('\n\n');
    if (!transcript) {
      setShareFeedback('Ainda não há mensagens para compartilhar');
      window.setTimeout(() => setShareFeedback(''), 2200);
      return;
    }
    try {
      const nativeShare = (navigator as unknown as { share?: (data: { title: string; text: string }) => Promise<void> }).share;
      if (nativeShare) await nativeShare.call(navigator, { title: 'Conversa no Manus', text: transcript });
      else await navigator.clipboard.writeText(transcript);
      setShareFeedback(nativeShare ? 'Conversa compartilhada' : 'Conversa copiada');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareFeedback('Não foi possível compartilhar');
    }
    window.setTimeout(() => setShareFeedback(''), 2200);
  };

  const isWelcomeOnly = messages.length === 1 && messages[0]?.id === 'welcome';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a] relative">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-3 sm:px-5 border-b border-white/[0.06] shrink-0 z-10 bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleSidebar} aria-label="Abrir navegação" className="lg:hidden flex size-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/[0.06] hover:text-white">
            <ListBullets size={18} />
          </button>
          <span className="px-2.5 py-1 text-sm font-medium text-[#dcdcdc]/90">Manus</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 text-[#dcdcdc]/45">
          <button type="button" title="Abrir o computador do agente" aria-label="Abrir o computador do agente" onClick={onInspectInComputer} className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-[#dcdcdc] transition-colors">
            <ArrowsOut size={18} />
          </button>
          <div className="flex size-8 items-center justify-center" title={isThinking ? 'Agente trabalhando' : 'Agente aguardando'} aria-label={isThinking ? 'Agente trabalhando' : 'Agente aguardando'}>
            <span className={`size-2 rounded-full ${isThinking ? 'bg-blue-400 animate-pulse' : 'bg-white/25'}`} />
          </div>
          <button type="button" title={shareFeedback || 'Compartilhar conversa'} aria-label="Compartilhar conversa" onClick={handleShareConversation} className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-[#dcdcdc] transition-colors">
            <ShareNetwork size={18} />
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div 
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center bg-[#1a1a1a]"
      >
        {isWelcomeOnly ? (
          <div className="flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-5 pb-16 pt-8 text-center sm:px-8">
            <div className="w-full max-w-xl">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/70">
                <Sparkle size={19} weight="regular" />
              </div>
              <h1 className="mt-5 text-xl font-medium tracking-tight text-white/90 sm:text-2xl">O que você gostaria de fazer?</h1>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/45 sm:text-sm">Descreva uma tarefa ou escolha um ponto de partida.</p>
              <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(messages[0]?.suggestions || []).map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => handleSendMessage(suggestion)} className="group flex min-h-12 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-left text-xs leading-relaxed text-white/65 transition-colors hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-white/90 sm:text-[13px]">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/45 group-hover:text-white/75"><Sparkle size={13} /></span>
                    <span className="flex-1">{suggestion}</span>
                    <ArrowRight size={14} className="shrink-0 text-white/25 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
        <div className="w-full max-w-3xl px-6 py-8 space-y-10 messages-container bg-[#1a1a1a]">
          {messages.filter((msg) => msg.id !== 'welcome').map((msg) => (
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
                <InitialThinkingAnimation elapsedSeconds={elapsedSeconds} livePhase={agentLivePhase} />
              )}

              {/* The execution animation with embedded notes placed below the header and above the tool chips */}
              {initialThoughtComplete && showExecutionAnimation ? (
                <LocalActiveThinkingState
                  elapsedSeconds={elapsedSeconds}
                  step={currentStep}
                  steps={executionSteps}
                  notes={progressNotes}
                  livePhase={agentLivePhase}
                  onHighlightNote={(n) => highlightProgressNote(n.label, n.text, n.status)}
                />
              ) : initialThoughtComplete && progressNotes.length > 0 ? (
                <AgentProgressNotes
                  notes={progressNotes}
                  onHighlightNote={(n) => highlightProgressNote(n.label, n.text, n.status)}
                />
              ) : null}
            </div>
          )}

          {isAgentInBackground && !isThinking && !messages.some(m => m.isStreaming) && (
             <div className="flex items-center gap-3 pl-8 py-2 animate-in fade-in slide-in-from-left-2 duration-500">
               <div className="size-8 rounded-lg bg-bg-surface-panel border border-border-divider-subtle flex items-center justify-center relative">
                 <ManusMark className="size-5" />
                 <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/5">
                   <div className="size-1.5 bg-zinc-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(161,161,170,0.5)]" />
                 </div>
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="text-[10px] font-bold text-text-content-primary/80 uppercase tracking-widest">Subagente em Espera</span>
                 <span className="text-[10px] text-text-content-secondary/60 font-mono flex items-center gap-1.5">
                    <span className="size-1 bg-zinc-400/50 rounded-full animate-pulse" />
                    Aguardando escolhas do usuário no questionário · {bgElapsedSeconds}s
                 </span>
               </div>
             </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        )}
        <div className="h-28 shrink-0" />
      </div>



      {/* Floating Input Section */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-20">
        <PromptBar 
          onSend={(text, attachments) => handleSendMessage(text, false, attachments)}
          onStop={handleStop}
          isThinking={isThinking} 
          placeholder="Pergunte ao Manus ou descreva o que você quer fazer..."
        />
        
        <p className="mt-2 text-center text-[10px] text-[#dcdcdc]/30">
          O Manus pode pesquisar na web, trabalhar com arquivos de texto e ajudar a criar no workspace.
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
    return null;
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
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">O agente tem uma pergunta</span>
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

  // Parse questionnaire from content if present in <c-questionnaire-... /> tag
  let activeQuestionnaire = message.questionnaire;
  let cleanText = message.content || '';

  if (!activeQuestionnaire && cleanText.includes('<c-questionnaire')) {
    const match = cleanText.match(/<c-questionnaire[-\w]*\s+([^>]*)\/>/s) || cleanText.match(/<c-questionnaire[-\w]*\s+([^>]*)>([\s\S]*?)<\/c-questionnaire[-\w]*>/s);
    if (match) {
      const attrsStr = match[1];
      const titleMatch = attrsStr.match(/title=(["'])(.*?)\1/s);
      const descMatch = attrsStr.match(/description=(["'])(.*?)\1/s);
      const questionsMatch = attrsStr.match(/questions=(["'])([\s\S]*?)\1/s);

      if (questionsMatch) {
        try {
          let qJson = questionsMatch[2]
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
          const rawQuestions = JSON.parse(qJson);
          const normalizedQuestions = rawQuestions.map((q: any, idx: number) => ({
            name: q.id || q.name || `q_${idx}`,
            title: q.label || q.title || '',
            description: q.description,
            choices: (q.options || q.choices || []).map((opt: any) =>
              typeof opt === 'string' ? { value: opt.toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: opt } : opt
            )
          }));
          activeQuestionnaire = {
            title: titleMatch ? titleMatch[2] : 'Questionário de Contexto',
            description: descMatch ? descMatch[2] : undefined,
            questions: normalizedQuestions
          };
          cleanText = cleanText.replace(match[0], '').trim();
        } catch (e) {
          console.error('Failed to parse questionnaire JSON from tag:', e);
        }
      }
    }
  }

  const isWaiting = message.status === 'in_background' || Boolean(activeQuestionnaire && message.status !== 'completed');
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  // Keep message content intact so code blocks are fully syntax-highlighted

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

  if (finalToolSteps.length === 0 && message.logs && message.logs.length > 0) {
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
        <ManusMark alt="Símbolo Manus" className="size-6 rounded-md shadow-xs bg-bg-surface-panel p-0.5" />
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-text-content-primary">Manus</span>
        </div>
      </div>

      <div className="pl-8 space-y-4">
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
        {activeQuestionnaire && activeQuestionnaire.questions && activeQuestionnaire.questions.length > 0 && (
          <InlineChatQuestionnaire 
            questionnaire={activeQuestionnaire}
            onSubmit={(answers, summaryText) => {
              onFinishQuestionnaire?.(answers, summaryText);
            }}
          />
        )}

        {/* Execution Timeline (Ran Tools - Collapsed) */}
        {!isWaiting && (isAlreadyStreamed || !message.isStreaming) && message.executionSteps && message.executionSteps.length > 0 && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-500 fill-mode-both">
            <ExecutionTimeline steps={message.executionSteps} completed={message.status !== 'in_background' && message.status !== 'waiting_for_approval'} />
          </div>
        )}

        {/* Tool Chips da Resposta do Agente (Actions Only - Em baixo conforme solicitado) */}
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

                {message.time && <span className="text-[11px] text-white/40 font-normal">{message.time}</span>}
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
                  <span>O agente continuará após sua resposta</span>
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

function InitialThinkingAnimation({ elapsedSeconds, livePhase }: { elapsedSeconds: number; livePhase?: ThinkingPhase }) {
  return (
    <div className="w-full max-w-[820px] pl-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 py-0.5">
        <WorkingDot size={11} />
        <AnimatedThinkingStatus
          livePhase={livePhase}
          elapsedSeconds={elapsedSeconds || 1}
        />
      </div>
    </div>
  );
}

function AgentProgressNotes({
  notes,
  inline = false,
  activeTool,
  onHighlightNote,
}: {
  notes: AgentProgressNote[];
  inline?: boolean;
  activeTool?: { primary: string; secondary?: string; icon?: string };
  onHighlightNote?: (note: AgentProgressNote) => void;
}) {
  if (!notes || notes.length === 0) return null;

  const persistentNotes = useMemo(() => notes.filter((n) => n.isPersistent), [notes]);
  const liveNotes = useMemo(() => notes.filter((n) => !n.isPersistent), [notes]);

  const [activeNoteIndex, setActiveNoteIndex] = useState(0);
  const liveIndex = 0;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sync index when new persistent notes are generated
  const prevCountRef = useRef(persistentNotes.length);
  useEffect(() => {
    if (persistentNotes.length > prevCountRef.current) {
      setActiveNoteIndex(persistentNotes.length - 1);
      prevCountRef.current = persistentNotes.length;
    }
  }, [persistentNotes.length]);

  const safePersistentIndex = Math.min(activeNoteIndex, Math.max(0, persistentNotes.length - 1));
  const currentHighlightedNote = persistentNotes[safePersistentIndex] || persistentNotes[0];

  // Secondary notes: from 2nd note onward (or all notes other than the currently active one)
  const secondaryNotes = persistentNotes.slice(1);

  const safeLiveIndex = Math.min(liveIndex, Math.max(0, liveNotes.length - 1));
  const currentLiveNote = liveNotes[safeLiveIndex];

  const isDuplicateOfPersistent = Boolean(
    currentLiveNote &&
      currentHighlightedNote &&
      removeAllEmojis(currentLiveNote.text.trim()) === removeAllEmojis(currentHighlightedNote.text.trim())
  );

  return (
    <div
      aria-label="Notas do agente"
      className={`w-full ${inline ? 'my-2 max-w-[760px]' : 'max-w-[820px] pl-8'} flex flex-col gap-2.5 text-left`}
    >
      {/* 1. Primary Highlighted Note: Pure text, no background card, 5s motion alternation */}
      <AnimatePresence mode="wait">
        {currentHighlightedNote && (
          <motion.div
            key={currentHighlightedNote.id + '_' + safePersistentIndex}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{
              duration: 0.55,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="w-full text-left py-0.5"
          >
            <MarkdownRenderer
              content={removeAllEmojis(String(currentHighlightedNote.text || '')).trim()}
              className="text-[13px] leading-relaxed text-text-content-primary font-normal [&_p]:my-1.5 [&_strong]:text-white [&_strong]:font-bold [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1.5 [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_mark]:bg-neutral-800 [&_mark]:text-neutral-100 [&_mark]:border-neutral-700/60 [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded [&_mark]:font-medium [&_mark]:shadow-xs"
            />

            {/* Tool Chips below highlighted note: Only shown if a tool is executing or associated with note */}
            {activeTool ? (
              <div className="mt-2.5 flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.04] border border-white/10 px-2.5 py-1.5 rounded-md w-fit animate-in fade-in duration-300">
                <span className="flex size-4 items-center justify-center rounded bg-white/10 text-neutral-200">
                  {getContextualToolIcon(
                    activeTool.icon || activeTool.primary,
                    activeTool.primary,
                    activeTool.secondary || ''
                  )}
                </span>
                <span className="font-medium text-neutral-200">{activeTool.primary}</span>
                {activeTool.secondary && (
                  <span className="text-[10px] text-neutral-400 truncate max-w-[240px]">
                    {activeTool.secondary}
                  </span>
                )}
              </div>
            ) : currentHighlightedNote.toolExecution ? (
              <div className="mt-2.5 flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.04] border border-white/10 px-2.5 py-1.5 rounded-md w-fit animate-in fade-in duration-300">
                <span className="size-1.5 rounded-full bg-neutral-400" />
                <span className="font-medium text-neutral-200">{currentHighlightedNote.toolExecution.tool}</span>
                {currentHighlightedNote.toolExecution.detail && (
                  <span className="text-[10px] text-neutral-400 truncate max-w-[240px]">
                    {currentHighlightedNote.toolExecution.detail}
                  </span>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Dropdown trigger below primary note with icon and text */}
      {secondaryNotes.length > 0 && (
        <div className="w-full text-left">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-sans text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer py-0.5 select-none"
          >
            <CaretRight
              size={12}
              className={`transition-transform duration-200 text-neutral-400 ${
                isDropdownOpen ? 'rotate-90' : ''
              }`}
            />
            <span>
              {isDropdownOpen
                ? 'Ocultar notas adicionais'
                : `Ver outras notas destacadas (${secondaryNotes.length})`}
            </span>
          </button>

          {/* Dropdown list showing from 2nd note onward, all at once, small text, connected by a vertical line */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="w-full overflow-hidden pt-1 pb-1"
              >
                <div className="relative pl-3.5 border-l border-white/10 ml-1.5 space-y-3.5 my-1.5">
                  {secondaryNotes.map((note, idx) => (
                    <div
                      key={note.id || idx}
                      className="relative group text-left"
                    >
                      {/* Node dot linking on the continuous line */}
                      <div className="absolute -left-[17.5px] top-1.5 size-1.5 rounded-full bg-neutral-500 group-hover:bg-neutral-300 transition-colors" />

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                          <span className="font-semibold text-neutral-300">
                            Nota #{idx + 2} · {removeAllEmojis(note.label || 'Nota')}
                          </span>
                          <span>{note.timestamp}</span>
                        </div>
                        <MarkdownRenderer
                          content={removeAllEmojis(String(note.text || '')).trim()}
                          className="text-[11.5px] leading-relaxed text-text-content-secondary font-normal [&_p]:my-0.5 [&_strong]:text-neutral-200 [&_strong]:font-medium [&_mark]:bg-neutral-800 [&_mark]:text-neutral-100 [&_mark]:border-neutral-700/60 [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded [&_mark]:text-[10.5px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. Live Animated Note: 2s motion alternation */}
      {currentLiveNote && !isDuplicateOfPersistent && (
        <div className="w-full min-w-0 transition-all duration-300 text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLiveNote.id + '_' + safeLiveIndex}
              initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <MarkdownRenderer
                content={removeAllEmojis(String(currentLiveNote.text || '')).trim()}
                className="text-[13px] leading-relaxed text-text-content-secondary font-normal [&_p]:my-1.5 [&_strong]:text-white/90 [&_strong]:font-bold [&_mark]:bg-neutral-800 [&_mark]:text-neutral-100 [&_mark]:border-neutral-700/60 [&_mark]:px-1.5 [&_mark]:py-0.5 [&_mark]:rounded [&_mark]:font-medium [&_mark]:shadow-xs"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function LocalActiveThinkingState({
  elapsedSeconds,
  step,
  steps,
  notes,
  livePhase: propLivePhase,
  onHighlightNote,
}: {
  elapsedSeconds: number;
  step: string;
  steps: ExecutionStep[];
  notes?: AgentProgressNote[];
  livePhase?: ThinkingPhase;
  onHighlightNote?: (note: AgentProgressNote) => void;
}) {
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

  let contextVariant = "Coding";
  if (isCurrentlySearching || hasSearchInHistory || isQueryRelatedToSearch) {
    contextVariant = "Search";
  } else if (isReasoningActive && !hasCodingInHistory) {
    contextVariant = "Reasoning";
  }

  // A variante agora acompanha o processo real. Não trocamos a árvore pelo relógio,
  // porque isso desmontava a timeline e fazia todas as etapas entrarem novamente.
  const currentVariant = contextVariant;

  // Only the current/running step belongs in the live animation. Keeping the
  // historical steps here was what made the whole list replay from the top.
  const activeStep = [...steps].reverse().find(s => s.status === 'running') || steps[steps.length - 1];
  const cleanLabel = String(activeStep?.label || step || 'Preparando a próxima etapa...').replace(/\r?\n+/g, ' ').trim();
  const cleanDetail = activeStep?.detail ? String(activeStep.detail).replace(/\r?\n+/g, ' ').trim() : undefined;

  const mappedRows = steps.length > 0 ? [{
    primary: cleanLabel,
    secondary: cleanDetail,
    icon: activeStep?.label || step,
    mono: contextVariant === "Coding" || cleanLabel.includes('.') || cleanLabel.includes('npm') || cleanLabel.includes('run')
  }] : [];

  // Synchronize live phase with live actions
  const isToolRunning = steps.some(s => s.status === 'running' && !/racioc|deliber|analis|planej|critér/i.test(`${s.label} ${s.detail}`));
  const isReasoning = isReasoningActive || steps.some(s => s.status === 'running' && /racioc|deliber|analis|planej|critér/i.test(`${s.label} ${s.detail}`));

  let currentLivePhase: ThinkingPhase = propLivePhase || 'Pensando';
  if (isToolRunning || isCurrentlyCoding || isCurrentlySearching) {
    currentLivePhase = 'Trabalhando';
  } else if (isReasoning) {
    currentLivePhase = 'Raciocinando';
  }

  return (
    <section
      aria-label="Animação de execução do agente"
      className="w-full max-w-[820px] animate-in fade-in duration-300"
    >
      {/* This is a plain status lane: no card, background or border. */}
      <div className="ml-8 transition-all duration-300 ease-out">
        <ThinkingState
          variant={currentVariant}
          rows={mappedRows}
          elapsedSeconds={elapsedSeconds}
          working={true}
          livePhase={currentLivePhase}
          notes={notes && notes.length > 0 ? (
            <AgentProgressNotes
              notes={notes}
              inline
              onHighlightNote={onHighlightNote}
            />
          ) : null}
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
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  const searchVariant = steps.some((step) => /search|pesquis|google/i.test(`${step.label} ${step.detail}`));
  const codingVariant = steps.some((step) => /edit|c[oó]digo|npm|terminal|arquivo/i.test(`${step.label} ${step.detail}`));
  const working = !completed;
  const autoExpanded = false;
  const expanded = manualExpanded ?? autoExpanded;
  const visibleSteps = steps;
  const focusedStep = [...steps].reverse().find((step) => step.status === 'running') || steps.at(-1);
  const activeLabel = searchVariant ? 'Pesquisando na web' : codingVariant ? 'Executando ferramentas' : 'Pensando';
  const doneLabel = 'Atividade encerrada';

  const renderStep = (step: ExecutionStep, index: number) => {
    const isRunning = step.status === 'running';
    const isWarning = step.status === 'warning';
    const cleanLabelStr = String(step.label || '').replace(/\r?\n+/g, ' ').trim();
    const truncatedLabel = cleanLabelStr.length > 70 ? `${cleanLabelStr.slice(0, 70)}…` : cleanLabelStr;
    const cleanDetailStr = step.detail ? String(step.detail).replace(/\r?\n+/g, ' ').trim() : undefined;
    const truncatedDetail = cleanDetailStr && cleanDetailStr.length > 40 ? `${cleanDetailStr.slice(0, 40)}…` : cleanDetailStr;

    return (
      <div key={`${step.id}_${index}`} className={`relative flex min-h-7 w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-200 whitespace-nowrap overflow-hidden ${isRunning ? 'bg-bg-action-hover/50' : 'hover:bg-bg-action-hover/30'}`} style={{ animation: `thinking-fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 120}ms both` }}>
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
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-white/5 border border-white/10 shadow-xs">
            {getContextualToolIcon(step.label, step.label, step.detail)}
          </span>
        )}
        <div className="min-w-0 flex-1 flex items-center justify-between gap-2 overflow-hidden whitespace-nowrap">
          <span className={`min-w-0 truncate whitespace-nowrap text-[12.5px] ${searchVariant ? 'text-text-content-primary/90' : 'text-text-content-primary/85'} ${codingVariant ? 'font-mono' : 'font-medium'}`}>
            {truncatedLabel}
          </span>
          {truncatedDetail && (
            <span className="min-w-0 truncate whitespace-nowrap text-[11px] text-text-content-secondary/70 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 shrink-0 max-w-[200px]">
              {truncatedDetail}
            </span>
          )}
        </div>
        {step.timestamp && <span className="ml-auto shrink-0 text-[9px] font-mono text-text-content-secondary/40">{step.timestamp}</span>}
      </div>
    );
  };

  return (
    <div className={`execution-timeline flex w-full max-w-[780px] flex-col bg-transparent p-0 ${completed ? 'mt-1' : ''}`} style={{ minHeight: working || expanded ? 148 : undefined, transition: 'min-height 400ms cubic-bezier(0.23,1,0.32,1)' }}>
      <div className="flex items-center gap-2">
        <button type="button" aria-expanded={expanded} onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))} className="flex w-fit items-center gap-1.5 py-0.5 text-left transition-colors hover:opacity-85 cursor-pointer">
          <span role="status" className="text-[13px] font-medium">
            {working ? <span className="thinking-shimmer">{activeLabel}</span> : <span className="text-text-content-primary/60">{doneLabel}</span>}
          </span>
          <CaretDown size={13} className={`text-text-content-secondary/40 transition-transform duration-300 ml-0.5 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
          <p className="pl-6 text-[10px] text-text-content-secondary/60">{working ? (focusedStep?.detail || focusedStep?.label || activeStep || 'Aguardando a próxima etapa.') : 'Etapas registradas nesta tarefa.'}</p>

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
              {visibleSteps.length === 0 && <div className="min-h-7 px-1.5 text-[11px] text-text-content-secondary/60">Aguardando o primeiro evento.</div>}
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
          placeholder="Mensagem para o agente..."
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
              <ManusMark alt="Manus" className="size-5 rounded bg-bg-action-hover p-0.5" />
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
