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
  Lightning,
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
  Spinner
} from '@phosphor-icons/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ToolCallTrace, AgentExecutionLog } from '../types/project';
import { markdownFences } from '@/components/reui/code-block/code-block-highlight';
import { ProfessionalCodeBlock } from './ProfessionalCodeBlock';
import { SyntaxCodeView, InlineCodeSnippet } from './SyntaxCodeView';
import ThinkingState, { ThinkingStateGroup } from './ThinkingState';
import ToolChips, { getContextualToolIcon, getContextualFileIcon, ToolStep, ToolDiff } from './ToolChips';
import StreamingText from './StreamingText';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Favicon, extractCleanDomain } from '@/lib/favicon';
import PromptBar from './PromptBar';
import { AgentContextQuestionnaire, QuestionnaireQuestion, DEFAULT_APP_QUESTIONS } from './AgentContextQuestionnaire';

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

const RANDOM_QUESTION_POOL = [
  'Qual ideia simples eu poderia transformar em um produto digital?',
  'Pesquise uma tendência recente de tecnologia e explique por que ela importa.',
  'Crie um plano de estudos de 7 dias para aprender uma habilidade nova.',
  'Como posso organizar melhor meu projeto atual?',
  'Compare duas abordagens para resolver um problema de forma clara.',
  'Sugira uma experiência visual memorável para uma página inicial.',
  'Quais perguntas devo fazer antes de começar uma nova aplicação?',
  'Explique um conceito complexo usando uma analogia do dia a dia.'
];

function pickRandomQuestions() {
  return [...RANDOM_QUESTION_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
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
  }) => void;
  onInspectInComputer?: () => void;
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

Estou conectado a um **Computador na Nuvem Linux 100% real e operacional**, onde realizo ações ao vivo para atender às suas solicitações:

### O que o Computador do Agente faz em tempo real:
1. **Navegador Web Real**: Abro o navegador para navegar em URLs reais, pesquisar no Google, rolar páginas, inspecionar fontes e extrair dados da web em tempo real.
2. **Terminal Shell Bash**: Executo comandos no container Linux Ubuntu (Node.js, npm, curl, verificações de rede e processos).
3. **Editor de Código do Workspace**: Escrevo e gravo código-fonte limpo com estados dinâmicos e sincronização com o preview.
4. **Transmissão ao Vivo**: O computador da nuvem é operado com exclusividade pelo agente. Na aba **Computador do Agente**, você assiste à transmissão ao vivo das minhas ações em tempo real (navegações no Playwright, cliques, comandos no terminal e código gerado), sem necessidade de botões manuais.

Basta me dizer no chat o que você quer que eu faça na web ou no computador!`,
      suggestions: [
        'Pesquisar na web e inspecionar a API do GitHub no navegador do agente',
        'Executar diagnósticos de rede com curl e checar o terminal bash',
        'Criar uma plataforma de investimentos com simulador dinâmico de juros',
        'Pesquisar especificações de design de ponta e criar um dashboard'
      ]
    }
  ]);

  const [streamedIds, setStreamedIds] = useState<Set<string>>(() => new Set(['1']));
  const [activeQuestionnaireModal, setActiveQuestionnaireModal] = useState<{
    title?: string;
    description?: string;
    questions?: QuestionnaireQuestion[];
  } | null>(null);
  const [isQuestionnaireMinimized, setIsQuestionnaireMinimized] = useState(false);
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
  const [randomQuestions, setRandomQuestions] = useState(() => pickRandomQuestions());
  const executionStepsRef = useRef<ExecutionStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateExecutionSteps = (updater: (steps: ExecutionStep[]) => ExecutionStep[]) => {
    setExecutionSteps((previous) => {
      const next = updater(previous).slice(-9);
      executionStepsRef.current = next;
      return next;
    });
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
        contextText: 'Instância Linux x86_64 ativa. Agente autônomo com navegador Chromium.',
        toolCalls: allToolCalls
      });
    }
    isThinkingPrev.current = isThinking;
  }, [isThinking, messages, isAgentInBackground]);

  const handleResumeFromBackground = (summaryText: string) => {
    setIsAgentInBackground(false);
    setActiveQuestionnaireModal(null);
    setIsQuestionnaireMinimized(false);
    setMessages(prev => prev.map(m => m.status === 'in_background' ? { ...m, status: 'completed' } : m));
    handleSendMessage(`[Contexto Definido]: ${summaryText}`);
  };

  const handleResumeWithDefaults = () => {
    setIsAgentInBackground(false);
    setActiveQuestionnaireModal(null);
    setIsQuestionnaireMinimized(false);
    setMessages(prev => prev.map(m => m.status === 'in_background' ? { ...m, status: 'completed' } : m));
    handleSendMessage(`[Contexto Definido]: Prossiga com a melhor arquitetura de software, padrão Fintech/SaaS, paleta escura e recursos dinâmicos autônomos.`);
  };

  useEffect(() => {
    if (externalPrompt) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isThinking) return;

    if (userPrompt.trim().toLowerCase() === '/context' || userPrompt.trim().toLowerCase() === 'context') {
      setActiveQuestionnaireModal({
        title: 'Especificação de Contexto do Agente',
        description: 'Defina o nicho, direção visual e prioridades para personalizar a criação:',
        questions: DEFAULT_APP_QUESTIONS
      });
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
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
                  if (currentEvent === 'status') {
                    setCurrentStep(data.text);
                    beginExecutionStep('Raciocinando sobre a próxima ação', data.text);
                  } else if (currentEvent === 'step') {
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
                    setCurrentStep(`Executando ${data.toolName}: ${data.reason}`);
                    beginExecutionStep(data.toolName, data.reason || 'Executando no computador da nuvem.');
                    const activeTrace: ToolCallTrace = {
                      id: `active_${Date.now()}`,
                      toolName: data.toolName,
                      server: 'playwright_chromium',
                      arguments: data.arguments || {},
                      result: 'Executando no computador...',
                      timestamp: new Date().toLocaleTimeString(),
                      status: 'running',
                      screenData: {
                        url: data.arguments?.url || 'https://news.ycombinator.com',
                        title: 'Acessando ao vivo...',
                        actionDescription: data.reason
                      }
                    };
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: `Agente executando ${data.toolName}`,
                        contextText: data.reason,
                        toolCalls: [...liveToolCalls, activeTrace]
                      });
                    }
                  } else if (currentEvent === 'tool_finish') {
                    liveToolCalls.push(data.toolCall);
                    completeExecutionStep(
                      data.toolCall.toolName,
                      data.toolCall.screenData?.actionDescription || 'Ação concluída; resultado incorporado ao contexto.',
                      data.toolCall.status === 'warning' ? 'warning' : data.toolCall.status === 'error' ? 'warning' : 'complete'
                    );
                    if (onAgentStateChange) {
                      onAgentStateChange({
                        isWorking: true,
                        statusText: `Agente concluiu ${data.toolCall.toolName}`,
                        contextText: data.toolCall.screenData?.actionDescription || data.toolCall.toolName,
                        toolCalls: [...liveToolCalls]
                      });
                    }
                  } else if (currentEvent === 'approval_required') {
                    setCurrentStep(`Aguardando autorização: ${data.approval?.reason || 'Ação destrutiva'}`);
                    beginExecutionStep('Aguardando sua autorização', data.approval?.reason || 'O agente pausou antes de uma ação sensível.');
                    completeExecutionStep('Aguardando sua autorização', data.approval?.reason || 'Ação pausada até sua decisão.', 'warning');
                  } else if (currentEvent === 'complete') {
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

      const isBg = Boolean(payload.questionnaire) || payload.status === 'in_background';
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        isStreaming: true,
        status: isBg ? 'in_background' : payload.approval ? 'waiting_for_approval' : 'completed',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        workingTime: payload.workingTime || `${elapsedSeconds || 24}s`,
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
        content: payload.explanation || payload.response || 'Tarefa executada pelo agente.',
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
        setActiveQuestionnaireModal(payload.questionnaire);
        setIsAgentInBackground(true);
        setIsQuestionnaireMinimized(false);
        if (onAgentStateChange) {
          onAgentStateChange({
            isWorking: true,
            statusText: '⏳ Agente esperando uma resposta',
            contextText: 'O agente está aguardando suas definições de opções no pop-up para prosseguir a criação.',
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
        onFileUpdate(generatedFilesList);
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
    <div className="flex-1 flex flex-col min-w-0 bg-[#141414] relative">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 shrink-0 z-10 bg-[#1a1a1a]">
        <div className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors group">
          <img 
            src="https://imgdb.io/i/6lwOlmk.png" 
            alt="Logotipo do Agente" 
            className="size-6 object-contain rounded-md shadow-xs" 
          />
          <span className="text-sm font-medium text-[#dcdcdc]">manus</span>
          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
            <span className="size-1.5 bg-green-400 rounded-full animate-pulse" />
            Online
          </span>
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
          {isAgentInBackground ? (
            <div className="flex items-center gap-1.5 text-xs font-medium bg-[#222226] border border-[#333338] px-2.5 py-1 rounded-md">
               <Spinner size={14} className="text-yellow-400 shrink-0" />
               <span className="text-yellow-400">Esperando resposta</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-content-secondary text-xs font-medium bg-bg-action-hover border border-border-divider-subtle px-2.5 py-1 rounded-md">
               <Lightning size={14} />
               <span>Ativo</span>
            </div>
          )}
          <button title="Compartilhar" className="hover:text-[#dcdcdc] transition-colors cursor-pointer">
            <ShareNetwork size={18} />
          </button>
          <button className="hover:text-[#dcdcdc] transition-colors cursor-pointer">
            <DotsThree size={18} />
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center bg-[#1a1a1a]">
        <div className="w-full max-w-3xl px-6 py-8 space-y-10">
          {messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isAlreadyStreamed={streamedIds.has(msg.id)}
              onStreamingDone={handleStreamingDone}
              onSelectSuggestion={handleSendMessage}
              onInspectInComputer={onInspectInComputer}
              onOpenQuestionnaire={(q) => setActiveQuestionnaireModal(q)}
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
          
          {isThinking && (
            <LocalActiveThinkingState 
              elapsedSeconds={elapsedSeconds} 
              step={currentStep}
              steps={executionSteps}
            />
          )}

          {messages.length === 1 && !isThinking && (
            <RandomQuestionBox
              questions={randomQuestions}
              onSelect={handleSendMessage}
              onRefresh={() => setRandomQuestions(pickRandomQuestions())}
            />
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
          placeholder={isAgentInBackground ? "Agente esperando uma resposta..." : "Mensagem para o agente manus ou digite @ para fontes e / para comandos..."}
        />
        
        <p className="mt-2 text-center text-[10px] text-[#dcdcdc]/30">
          manus ativo: digite @ para fontes & arquivos, / para comandos rápidos e selecione o modelo de IA.
        </p>
      </div>

      {/* Floating Small Pop-up Questionnaire (STRICTLY inside ChatArea, bottom-right) */}
      {activeQuestionnaireModal && !isQuestionnaireMinimized && (
        <div className="absolute bottom-28 right-6 z-40 max-w-84 w-[calc(100%-3rem)] sm:w-80 animate-in fade-in slide-in-from-bottom-3 duration-300 drop-shadow-2xl">
          <AgentContextQuestionnaire
            title={activeQuestionnaireModal.title}
            description={activeQuestionnaireModal.description}
            questions={activeQuestionnaireModal.questions}
            onClose={() => setIsQuestionnaireMinimized(true)}
            onSubmitContext={(_answers, summaryText) => {
              handleResumeFromBackground(summaryText);
            }}
          />
        </div>
      )}

      {/* Floating Minimized Badge inside ChatArea */}
      {activeQuestionnaireModal && isQuestionnaireMinimized && (
        <button
          type="button"
          onClick={() => setIsQuestionnaireMinimized(false)}
          className="absolute bottom-28 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-xs font-medium shadow-2xl hover:bg-[#202024] hover:border-zinc-500 transition-all cursor-pointer group animate-in fade-in"
        >
          <Spinner size={14} className="text-yellow-400 shrink-0" />
          <span className="text-yellow-400">Agente esperando uma resposta ({activeQuestionnaireModal.questions?.length || 3} perguntas)</span>
          <span className="text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded font-mono border border-white/10">Abrir</span>
        </button>
      )}
    </div>
  );
}

function RandomQuestionBox({
  questions,
  onSelect,
  onRefresh
}: {
  questions: string[];
  onSelect: (question: string) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="w-full max-w-[820px] rounded-2xl border border-white/10 bg-white/[0.025] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/20">
            <Question size={15} weight="bold" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">Perguntas para explorar</p>
            <p className="text-[10px] text-white/35">Escolha uma ideia ou peça outra seleção.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-white/45 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          Sortear outras
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {questions.map((question) => (
          <button
            type="button"
            key={question}
            onClick={() => onSelect(question)}
            className="group flex min-h-20 flex-col justify-between rounded-xl border border-white/8 bg-[#202020]/70 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-blue-500/[0.08]"
          >
            <span className="text-[11px] leading-relaxed text-white/60 transition-colors group-hover:text-white/85">{question}</span>
            <span className="mt-3 flex items-center gap-1 text-[10px] font-medium text-blue-300/65 group-hover:text-blue-200">
              Explorar <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MessageItem({ 
  message, 
  onSelectSuggestion,
  onInspectInComputer,
  onApprovalDecision,
  onStreamingDone,
  onOpenQuestionnaire,
  isAlreadyStreamed
}: { 
  message: ChatMessage; 
  onSelectSuggestion: (s: string) => void;
  onInspectInComputer?: () => void;
  onApprovalDecision?: (messageId: string, approved: boolean) => void;
  onStreamingDone?: (id: string) => void;
  onOpenQuestionnaire?: (q: any) => void;
  isAlreadyStreamed?: boolean;
}) {
  const isAssistant = message.role === 'assistant';
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Map tool calls to ToolStep[] and files to ToolDiff[] for the final response
  const finalToolSteps: ToolStep[] = (message.toolCalls || []).map((tc) => {
    let chipText = '';
    if (tc.arguments?.filePath) chipText = tc.arguments.filePath;
    else if (tc.arguments?.url) chipText = tc.arguments.url;
    else if (tc.arguments?.command) chipText = tc.arguments.command;
    else if (tc.arguments?.query) chipText = tc.arguments.query;
    else if (tc.screenData?.actionDescription) chipText = tc.screenData.actionDescription;
    else chipText = tc.server || tc.toolName;

    return {
      icon: tc.toolName,
      label: tc.toolName,
      chip: chipText,
      mono: tc.toolName.includes('fs') || tc.toolName.includes('cmd') || tc.toolName.includes('exec') || tc.toolName.includes('file') || tc.toolName.includes('shell'),
      detailMono: true,
      detail: [
        { text: `Status: ${tc.status === 'success' ? '✓ Sucesso' : '✗ Erro'}` },
        ...(tc.arguments ? [{ text: `Argumentos: ${JSON.stringify(tc.arguments)}` }] : []),
        ...(tc.screenData?.title ? [{ text: `Página: ${tc.screenData.title}` }] : []),
        ...(tc.screenData?.actionDescription ? [{ text: tc.screenData.actionDescription }] : [])
      ]
    };
  });

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
          <span className="text-text-content-primary">manus</span>
          <span className="text-[9px] bg-bg-action-hover border border-border-divider-subtle px-1.5 py-0.5 rounded text-text-content-secondary font-mono">
            Autonomous Agent
          </span>
        </div>
      </div>

      <div className="pl-8 space-y-4">
        {/* Tool Chips da Resposta Final do Agente */}
        {finalToolSteps.length > 0 && (
          <ToolChips
            steps={finalToolSteps}
            diffs={finalDiffs.length > 0 ? finalDiffs : undefined}
            diffLines={Object.keys(finalDiffLines).length > 0 ? finalDiffLines : undefined}
            labels={{ header: `${finalToolSteps.length} ferramentas executadas pelo agente` }}
          />
        )}

        {message.executionSteps && message.executionSteps.length > 0 && (
          <ExecutionTimeline steps={message.executionSteps} completed />
        )}

        {/* Clean Executive Response Text with Streaming Text Animation */}
        <div className="text-sm leading-relaxed text-text-content-primary/90 font-sans">
          <StreamingText 
            content={cleanText}
            isStreaming={Boolean(message.isStreaming && !isAlreadyStreamed)}
            initialDone={!message.isStreaming || Boolean(isAlreadyStreamed)}
            onDone={() => onStreamingDone?.(message.id)}
            sources={message.sources?.map(s => ({
              name: s.title,
              domain: extractCleanDomain(s.url) || s.url,
              href: s.url
            }))}
            followUps={message.suggestions}
            onFollowUp={(text) => onSelectSuggestion(text)}
          />
        </div>

        {/* Generated Files Notification Box (Vibecoding Clean UI) */}
        {message.files && message.files.length > 0 && (
          <div className="bg-bg-surface-panel border border-border-divider-subtle rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={15} className="text-text-content-secondary" />
                <span className="text-xs font-semibold text-text-content-primary">Arquivos Gerados & Sincronizados</span>
                <span className="text-[10px] bg-white/5 text-text-content-secondary border border-border-divider-subtle px-1.5 py-0.5 rounded-full font-mono">
                  {message.files.length} arquivo(s)
                </span>
              </div>
              <button
                onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                className="text-[11px] text-text-content-secondary hover:text-text-content-primary flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{showCodeSnippet ? 'Ocultar código' : 'Ver código'}</span>
                <CaretRight size={12} className={`transition-transform ${showCodeSnippet ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <div className="space-y-1.5">
              {message.files.map((file, fIdx) => (
                <div key={fIdx} className="bg-bg-canvas-main/50 border border-border-divider-subtle rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    {getContextualFileIcon(file.path)}
                    <span className="text-text-content-primary/90 font-medium">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-text-content-secondary/60">
                    {file.code.split('\n').length} linhas · TypeScript
                  </span>
                </div>
              ))}
            </div>

            {/* Collapsible Inspection with Professional Code Block */}
            {showCodeSnippet && (
              <div className="pt-2 border-t border-border-divider-subtle space-y-3 animate-in fade-in duration-200">
                {message.files.map((file, fIdx) => (
                  <ProfessionalCodeBlock 
                     key={fIdx}
                     code={file.code}
                     language={file.lang || 'typescript'}
                     filename={file.path}
                     diff={{ added: "1-999" }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Web Search Sources & Citations (Grounding) */}
        {message.sources && message.sources.length > 0 && (
          <div className="bg-bg-surface-panel border border-border-divider-subtle rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-content-primary">
              <Favicon urlOrDomain={message.sources[0]?.url} size={14} fallbackIcon={<Globe size={14} className="text-cyan-400" />} />
              <span>Fontes da Web Consultadas ({message.sources.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {message.sources.map((src, sIdx) => {
                const domain = extractCleanDomain(src.url);
                return (
                  <a
                    key={sIdx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-bg-canvas-main/40 hover:bg-bg-action-hover border border-border-divider-subtle/50 rounded-lg p-2.5 text-xs space-y-1 block transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Favicon urlOrDomain={src.url} size={13} />
                        <span className="font-medium text-blue-400 group-hover:text-blue-300 truncate text-[11px]">
                          {src.title}
                        </span>
                      </div>
                      <ArrowSquareOut size={11} className="text-text-content-secondary/60 group-hover:text-text-content-primary shrink-0" />
                    </div>
                    {src.snippet && (
                      <p className="text-[10px] text-text-content-secondary/85 line-clamp-2 leading-relaxed">
                        {src.snippet}
                      </p>
                    )}
                    <span className="text-[9px] text-text-content-secondary/40 font-mono truncate block">
                      {domain || src.url}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Human Approval Required Gate */}
        {message.approval && (
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
        {message.artifacts && message.artifacts.length > 0 && (
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

        {/* Compact Context Questionnaire Card (opens pop-up) */}
        {message.questionnaire && (
          <div className="bg-[#18181b] border border-[#27272a] hover:border-zinc-500 rounded-xl p-3.5 flex items-center justify-between transition-all shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-white/5 border border-white/10 text-white flex items-center justify-center shrink-0">
                <Faders size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {message.questionnaire.title || 'Questionário de Contexto do Agente'}
                  </span>
                  <span className="text-[9.5px] bg-white/5 text-zinc-300 border border-white/10 px-1.5 py-0.2 rounded font-mono font-medium">
                    Pop-up
                  </span>
                </div>
                <p className="text-[11px] text-[#a1a1aa] truncate mt-0.5">
                  {message.questionnaire.description || 'Defina o nicho, direção visual e prioridades para o agente'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenQuestionnaire?.(message.questionnaire)}
              className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ml-3"
            >
              <Faders size={13} />
              <span>Abrir Opções</span>
            </button>
          </div>
        )}

        {/* Proactive Clarifications (Treinamento rule) */}
        {message.clarifications && message.clarifications.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Question size={14} />
              <span>Pontos de Clarificação da Demanda</span>
            </div>
            <p className="text-[11px] text-text-content-secondary/60">
              Para refinar ainda mais a arquitetura na próxima etapa, confirme se deseja especificar:
            </p>
            <div className="space-y-1.5 pt-1">
              {message.clarifications.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion(q)}
                  className="w-full text-left p-2 rounded-lg bg-bg-canvas-main/50 hover:bg-bg-action-hover border border-border-divider-subtle text-text-content-primary/80 hover:text-text-content-primary transition-colors flex items-center justify-between text-xs"
                >
                  <span>{q}</span>
                  <ArrowRight size={12} className="text-text-content-secondary/50 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Response Status Bar */}
        {(message.status === 'in_background' || (message.questionnaire && message.status !== 'completed')) && (
          <div className="flex items-center justify-between pt-2.5 border-t border-border-divider-subtle">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Spinner size={15} className="text-yellow-400 shrink-0" />
              <span className="font-semibold text-yellow-400">Agente esperando uma resposta</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                (aguardando suas definições de opções no pop-up)
              </span>
            </div>
            <button
              onClick={() => onOpenQuestionnaire?.(message.questionnaire)}
              className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-lg transition-colors border border-white/10"
            >
              <span>Abrir opções</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* Task Completion Bar */}
        {message.status === 'completed' && (
          <div className="flex items-center justify-between pt-2 border-t border-border-divider-subtle">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                  <div className="size-4 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check size={10} />
                  </div>
                  <span>Tarefa concluída</span>
                </div>
                <div className="flex items-center gap-2 text-text-content-secondary/40 text-xs">
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(message.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="hover:text-text-content-primary transition-colors" 
                    title="Copiar resposta"
                  >
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                  <span className="text-[10px] font-mono">{message.time}</span>
                </div>
             </div>

             <div className="flex items-center gap-2 text-text-content-secondary/40">
               <span className="text-[10px]">Avaliar resultado:</span>
               <div className="flex gap-0.5 cursor-pointer">
                 {[1,2,3,4,5].map(i => (
                    <Star key={i} size={11} className="hover:text-yellow-400 transition-colors" />
                 ))}
               </div>
             </div>
          </div>
        )}

        {/* Dynamic Follow-up Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-text-content-secondary/45 uppercase tracking-wider block">
              Próximos passos recomendados
            </span>
            {message.suggestions.map((s: string, i: number) => (
              <button 
                key={i} 
                onClick={() => onSelectSuggestion(s)}
                className="w-full text-left p-3 rounded-xl bg-bg-surface-panel/30 border border-border-divider-subtle hover:bg-bg-action-hover transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="text-xs text-text-content-secondary group-hover:text-text-content-primary">{s}</span>
                <ArrowRight size={13} className="text-text-content-secondary/20 group-hover:text-text-content-secondary/60 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocalActiveThinkingState({ elapsedSeconds, step, steps }: { elapsedSeconds: number; step: string; steps: ExecutionStep[] }) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    if (steps.length === 0) {
      setPhase(0);
    }
  }, [steps.length]);

  useEffect(() => {
    if (phase === 0) {
      const t = setTimeout(() => setPhase(1), 3200); // 3.2s for Pensando
      return () => clearTimeout(t);
    } else if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 4200); // 4.2s for Raciocinando
      return () => clearTimeout(t);
    }
  }, [phase]);

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

  // Determine active variant based on sequential cognitive phase:
  // Phase 0: "Steps" (Thinking)
  // Phase 1: "Reasoning" (Raciocínio)
  // Phase 2: "Steps" (Thinking novamente)
  // Phase 3: Context-aware variant ("Search", "Coding", or "Steps")
  let contextVariant = "Steps";
  if (isCurrentlyCoding || hasCodingInHistory || isQueryRelatedToCoding) {
    contextVariant = "Coding";
  } else if (isCurrentlySearching || hasSearchInHistory || isQueryRelatedToSearch) {
    contextVariant = "Search";
  } else if (isReasoningActive) {
    contextVariant = "Reasoning";
  }

  // Enforce natural cognitive stage progression so every animation is clearly visible:
  // Phase 0: "Steps" (Pensando - 3.2s) -> Phase 1: "Reasoning" (Raciocinando - 4.2s) -> Phase 2+: Action execution ("Coding" or "Search")
  let currentVariant = "Steps";
  if (phase === 0) {
    currentVariant = "Steps";
  } else if (phase === 1) {
    currentVariant = "Reasoning";
  } else {
    currentVariant = contextVariant === "Steps" ? "Coding" : contextVariant;
  }

  // In Phase < 3, if no real steps exist yet, we show the initial trace. As soon as steps arrive, we map ALL of them dynamically!
  const mappedRows = steps.length > 0 ? steps.map(s => ({
    primary: s.label,
    secondary: s.detail,
    mono: contextVariant === "Coding" || s.label.includes('.') || s.label.includes('npm') || s.label.includes('run')
  })) : undefined;

  const mappedToolSteps = steps.map(s => {
    let icon = "think";
    const lowercaseLabel = s.label.toLowerCase();
    
    if (lowercaseLabel.includes("escrev") || lowercaseLabel.includes("grav") || lowercaseLabel.includes("salv") || lowercaseLabel.includes("write") || lowercaseLabel.includes("edit") || lowercaseLabel.includes("cri") || lowercaseLabel.includes("alter")) {
      icon = "write";
    } else if (lowercaseLabel.includes("execut") || lowercaseLabel.includes("rod") || lowercaseLabel.includes("run") || lowercaseLabel.includes("npm") || lowercaseLabel.includes("check") || lowercaseLabel.includes("test")) {
      icon = "run";
    } else if (lowercaseLabel.includes("leit") || lowercaseLabel.includes("ler") || lowercaseLabel.includes("read") || lowercaseLabel.includes("scan") || lowercaseLabel.includes("carreg")) {
      icon = "read";
    }

    return {
      icon,
      label: s.label,
      chip: s.detail || "Executando...",
      mono: icon === "write" || icon === "run",
      detailMono: icon === "write" || icon === "run",
      detail: s.detail ? [{ text: s.detail }] : []
    };
  });

  const diffs: any[] = [];
  const diffLines: Record<string, any[]> = {};

  steps.forEach(s => {
    if (s.label.toLowerCase().includes("write") || s.label.toLowerCase().includes("edit") || s.label.toLowerCase().includes("escrev") || s.label.toLowerCase().includes("grav")) {
      const match = s.detail.match(/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const file = match[1];
        if (!diffs.some(d => d.file === file)) {
          diffs.push({ file, add: 1, del: 0 });
          diffLines[file] = [
            { text: s.detail, tone: "add" }
          ];
        }
      }
    }
  });

  return (
    <div className="w-full max-w-[820px] space-y-4 animate-in fade-in duration-300">
       <div className="flex items-center gap-2.5">
        <img 
          src="https://imgdb.io/i/6lwOlmk.png" 
          alt="Logotipo do Agente" 
          className="size-6 object-contain rounded-md shadow-xs bg-white/5 p-0.5 animate-pulse" 
        />
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-text-content-primary">manus</span>
          <span className="text-[9px] bg-bg-action-hover border border-border-divider-subtle px-1.5 py-0.5 rounded text-text-content-secondary font-mono">
            Executando · {elapsedSeconds || 1}s
          </span>
        </div>
      </div>
      
      {/* Transitions smoothly between variants with a stable variant key */}
      <div key={`thinking_trace_${currentVariant}`} className="pl-8 bg-transparent transition-all duration-300 ease-out">
        {currentVariant === "Coding" ? (
          <ToolChips 
            steps={mappedToolSteps.length > 0 ? mappedToolSteps : undefined} 
            diffs={diffs.length > 0 ? diffs : undefined}
            diffLines={Object.keys(diffLines).length > 0 ? diffLines : undefined}
            labels={{ header: `${steps.length} chamadas de ferramentas (${elapsedSeconds || 1}s)` }}
          />
        ) : (
          <ThinkingState 
            variant={currentVariant} 
            rows={mappedRows} 
            elapsedSeconds={elapsedSeconds}
            active={currentVariant === "Search" ? `Pesquisando: ${step || "fontes relevantes na web"}` : undefined}
          />
        )}
      </div>
    </div>
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
  const autoExpanded = true;
  const expanded = manualExpanded ?? autoExpanded;
  const visibleSteps = steps;
  const focusedStep = [...steps].reverse().find((step) => step.status === 'running') || steps.at(-1);
  const activeLabel = searchVariant ? 'Searching the web' : codingVariant ? 'Running tools' : 'Thinking';
  const doneLabel = searchVariant ? 'Searched the web' : codingVariant ? `Ran ${Math.max(1, steps.length)} tools` : 'Thought process settled';

  const renderStep = (step: ExecutionStep, index: number) => {
    const isRunning = step.status === 'running';
    const isWarning = step.status === 'warning';
    return (
      <div key={`${step.id}_${index}`} className={`relative flex min-h-7 w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left transition-colors duration-200 ${isRunning ? 'bg-bg-action-hover/50' : 'hover:bg-bg-action-hover/30'}`} style={{ animation: `thinking-fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 120}ms both` }}>
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
          getContextualToolIcon(step.label, step.label, step.detail)
        )}
        <span className={`min-w-0 truncate text-[11px] ${searchVariant ? 'text-text-content-primary/80' : 'text-text-content-primary/70'} ${codingVariant ? 'font-mono' : 'font-medium'}`}>{step.label}</span>
        {step.detail && <span className="min-w-0 truncate text-[10px] text-text-content-secondary/60">{step.detail}</span>}
        {step.timestamp && <span className="ml-auto shrink-0 text-[9px] font-mono text-text-content-secondary/40">{step.timestamp}</span>}
      </div>
    );
  };

  return (
    <div className={`execution-timeline flex w-full max-w-[780px] flex-col bg-transparent p-0 ${completed ? 'mt-1' : ''}`} style={{ minHeight: working || expanded ? 148 : undefined, transition: 'min-height 400ms cubic-bezier(0.23,1,0.32,1)' }}>
      <div className="flex items-center gap-2">
        <button type="button" aria-expanded={expanded} onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))} className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-bg-action-hover">
          <span className={`flex size-4 shrink-0 items-center justify-center transition-colors ${working ? 'text-text-content-primary/60' : 'text-text-content-secondary/40'}`}><Sparkle size={14} weight="fill" /></span>
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
