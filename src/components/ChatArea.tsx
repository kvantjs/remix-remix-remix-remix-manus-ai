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
  XCircle
} from '@phosphor-icons/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ToolCallTrace, AgentExecutionLog } from '../types/project';
import { markdownFences } from '@/components/reui/code-block/code-block-highlight';
import { ProfessionalCodeBlock } from './ProfessionalCodeBlock';
import { SyntaxCodeView, InlineCodeSnippet } from './SyntaxCodeView';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'completed' | 'failed' | 'waiting_for_approval';
  time?: string;
  workingTime?: string;
  thought?: string;
  logs?: AgentExecutionLog[];
  toolCalls?: ToolCallTrace[];
  suggestions?: string[];
  clarifications?: string[];
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
  }, [isThinking, messages]);

  useEffect(() => {
    if (externalPrompt) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim() || isThinking) return;

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

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        status: payload.approval ? 'waiting_for_approval' : 'completed',
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
            content: `${(payload.toolCalls || liveToolCalls).length} ferramentas reais executadas no computador da nuvem`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        toolCalls: payload.toolCalls || liveToolCalls,
        content: payload.explanation || payload.response || 'Tarefa executada pelo agente.',
        suggestions: payload.suggestions || [
          "Inspecionar ações do agente no Computador",
          "Visualizar runtime interativo no Preview",
          "Executar novos comandos de teste"
        ],
        clarifications: payload.clarifications,
        files: generatedFilesList
        ,executionSteps: [
          ...executionStepsRef.current.map((step) => step.status === 'running' ? { ...step, status: 'complete' as const } : step),
          {
            id: `summary_${Date.now()}`,
            label: 'Síntese final',
            detail: payload.approval ? 'A execução foi pausada para autorização.' : 'Resultados reunidos e resposta pronta para você.',
            status: payload.approval ? 'warning' : 'complete',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };

      setMessages(prev => [...prev, assistantMsg]);

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
          <span className="text-sm font-medium text-[#dcdcdc]">CoreSpark</span>
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
          <div className="flex items-center gap-2 text-blue-400 text-xs font-medium bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md cursor-pointer hover:bg-blue-500/20 transition-colors">
             <Lightning size={14} />
             <span>Ativo</span>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center bg-[#1a1a1a]">
        <div className="w-full max-w-3xl px-6 py-8 space-y-10">
          {messages.map((msg) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              onSelectSuggestion={handleSendMessage}
              onInspectInComputer={onInspectInComputer}
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
            <ThinkingState 
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
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
        <ChatInput 
          onSend={handleSendMessage} 
          onStop={handleStop}
          isThinking={isThinking} 
        />
        
        <p className="mt-2 text-center text-[10px] text-[#dcdcdc]/30">
          CoreSpark (Versão de Desenvolvimento) ativo: executa comandos, gera código na aba Código, renderiza no Runtime e chama ferramentas MCP.
        </p>
      </div>
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
  onApprovalDecision
}: { 
  message: ChatMessage; 
  onSelectSuggestion: (s: string) => void;
  onInspectInComputer?: () => void;
  onApprovalDecision?: (messageId: string, approved: boolean) => void;
}) {
  const isAssistant = message.role === 'assistant';
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keep message content intact so code blocks are fully syntax-highlighted
  const cleanText = message.content || '';

  if (!isAssistant) {
    return (
      <div className="flex justify-end">
        <div className="bg-[#262626] px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed border border-white/5 text-[#dcdcdc] shadow-xs">
          <MarkdownRenderer content={message.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Assistant Brand Avatar */}
      <div className="flex items-center gap-2.5">
        <img 
          src="https://imgdb.io/i/6lwOlmk.png" 
          alt="Logotipo do Agente" 
          className="size-6 object-contain rounded-md shadow-xs bg-white/5 p-0.5" 
        />
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-[#dcdcdc]">manus</span>
          <span className="text-[9px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-[#dcdcdc]/50 font-mono">
            Autonomous Agent
          </span>
        </div>
      </div>

      <div className="pl-8 space-y-4">
        {message.executionSteps && message.executionSteps.length > 0 && (
          <ExecutionTimeline steps={message.executionSteps} completed />
        )}

        {/* Clean Executive Response Text with Markdown Renderer */}
        <div className="text-sm leading-relaxed text-[#dcdcdc]/90 font-sans">
          <MarkdownRenderer content={cleanText} />
        </div>

        {/* Generated Files Notification Box (Vibecoding Clean UI) */}
        {message.files && message.files.length > 0 && (
          <div className="bg-[#202020] border border-white/5 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={15} className="text-blue-400" />
                <span className="text-xs font-semibold text-white">Arquivos Gerados & Sincronizados</span>
                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-mono">
                  {message.files.length} arquivo(s)
                </span>
              </div>
              <button
                onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{showCodeSnippet ? 'Ocultar código' : 'Ver código'}</span>
                <CaretRight size={12} className={`transition-transform ${showCodeSnippet ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <div className="space-y-1.5">
              {message.files.map((file, fIdx) => (
                <div key={fIdx} className="bg-[#212121] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <FileText size={14} className="text-blue-400 shrink-0" />
                    <span className="text-white/90 font-medium">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-white/40">
                    {file.code.split('\n').length} linhas · TypeScript
                  </span>
                </div>
              ))}
            </div>

            {/* Collapsible Inspection with Professional Code Block */}
            {showCodeSnippet && (
              <div className="pt-2 border-t border-white/5 space-y-3 animate-in fade-in duration-200">
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
          <div className="bg-[#1c1c1e] border border-white/10 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
              <Globe size={14} className="text-cyan-400" />
              <span>Fontes da Web Consultadas ({message.sources.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {message.sources.map((src, sIdx) => (
                <a
                  key={sIdx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#242426] hover:bg-[#2c2c30] border border-white/5 rounded-lg p-2.5 text-xs space-y-1 block transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-blue-400 group-hover:text-blue-300 truncate text-[11px]">
                      {src.title}
                    </span>
                    <ArrowSquareOut size={11} className="text-white/40 group-hover:text-white shrink-0" />
                  </div>
                  {src.snippet && (
                    <p className="text-[10px] text-white/60 line-clamp-2 leading-relaxed">
                      {src.snippet}
                    </p>
                  )}
                  <span className="text-[9px] text-white/30 font-mono truncate block">
                    {src.url}
                  </span>
                </a>
              ))}
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

            <p className="text-xs text-white/80 leading-relaxed">
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
          <div className="bg-[#1c1c1e] border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
              <DownloadSimple size={14} className="text-green-400" />
              <span>Artefatos de Trabalho Gerados ({message.artifacts.length})</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {message.artifacts.map((art) => (
                <div key={art.id} className="bg-[#242426] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-white/90 font-medium">{art.name}</span>
                    <span className="text-white/40 text-[10px]">({Math.round(art.sizeBytes / 1024)} KB)</span>
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

        {/* Proactive Clarifications (Treinamento rule) */}
        {message.clarifications && message.clarifications.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Question size={14} />
              <span>Pontos de Clarificação da Demanda</span>
            </div>
            <p className="text-[11px] text-white/50">
              Para refinar ainda mais a arquitetura na próxima etapa, confirme se deseja especificar:
            </p>
            <div className="space-y-1.5 pt-1">
              {message.clarifications.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion(q)}
                  className="w-full text-left p-2 rounded-lg bg-black/20 hover:bg-black/40 border border-white/5 text-[#dcdcdc]/80 hover:text-white transition-colors flex items-center justify-between text-xs"
                >
                  <span>{q}</span>
                  <ArrowRight size={12} className="text-white/30 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task Completion Bar */}
        {message.status === 'completed' && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                  <div className="size-4 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check size={10} />
                  </div>
                  <span>Tarefa concluída</span>
                </div>
                <div className="flex items-center gap-2 text-[#dcdcdc]/30 text-xs">
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(message.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="hover:text-[#dcdcdc] transition-colors" 
                    title="Copiar resposta"
                  >
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                  <span className="text-[10px] font-mono">{message.time}</span>
                </div>
             </div>

             <div className="flex items-center gap-2 text-[#dcdcdc]/30">
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
            <span className="text-[10px] font-bold text-[#dcdcdc]/30 uppercase tracking-wider block">
              Próximos passos recomendados
            </span>
            {message.suggestions.map((s: string, i: number) => (
              <button 
                key={i} 
                onClick={() => onSelectSuggestion(s)}
                className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span className="text-xs text-[#dcdcdc]/70 group-hover:text-[#dcdcdc]">{s}</span>
                <ArrowRight size={13} className="text-[#dcdcdc]/20 group-hover:text-[#dcdcdc]/60 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingState({ elapsedSeconds, step, steps }: { elapsedSeconds: number; step: string; steps: ExecutionStep[] }) {
  return (
    <div className="w-full max-w-[820px] space-y-4 animate-in fade-in duration-300">
       <div className="flex items-center gap-2.5">
        <img 
          src="https://imgdb.io/i/6lwOlmk.png" 
          alt="Logotipo do Agente" 
          className="size-6 object-contain rounded-md shadow-xs bg-white/5 p-0.5 animate-pulse" 
        />
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-[#dcdcdc]">manus</span>
          <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 rounded">
            Executando
          </span>
        </div>
      </div>
      <div className="w-full pl-8 bg-transparent">
        <ExecutionTimeline steps={steps} activeStep={step} elapsedSeconds={elapsedSeconds} />
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
  const autoExpanded = !completed && stage >= 1 && stage < sequence.length - 1;
  const expanded = manualExpanded ?? autoExpanded;
  const visibleCount = stage < 2 ? 0 : stage === 2 ? Math.min(2, steps.length) : steps.length;
  const visibleSteps = steps.slice(0, visibleCount);
  const focusedStep = [...steps].reverse().find((step) => step.status === 'running') || steps.at(-1);
  const activeLabel = searchVariant ? 'Searching the web' : codingVariant ? 'Running tools' : 'Thinking';
  const doneLabel = searchVariant ? 'Searched the web' : codingVariant ? `Ran ${Math.max(1, steps.length)} tools` : 'Thought process settled';

  const renderStep = (step: ExecutionStep, index: number) => {
    const isRunning = step.status === 'running';
    const isWarning = step.status === 'warning';
    return (
      <div key={step.id} className={`relative flex min-h-7 w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left transition-colors duration-200 ${isRunning ? 'bg-white/[0.035]' : 'hover:bg-white/[0.025]'}`} style={{ animation: `thinking-fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${index * 120}ms both` }}>
        {searchVariant ? <Globe size={13} className={`${isWarning ? 'text-amber-300' : 'text-cyan-300'} shrink-0`} /> : isWarning ? <ShieldWarning size={13} className="shrink-0 text-amber-300" /> : isRunning ? <span className="size-3 shrink-0 rounded-full border-[1.5px] border-white/20 border-t-blue-300 thinking-spinner" /> : <Check size={13} className="shrink-0 text-white/35" />}
        <span className={`min-w-0 truncate text-[11px] ${searchVariant ? 'text-white/75' : 'text-white/70'} ${codingVariant ? 'font-mono' : 'font-medium'}`}>{step.label}</span>
        {step.detail && <span className="min-w-0 truncate text-[10px] text-white/35">{step.detail}</span>}
        {step.timestamp && <span className="ml-auto shrink-0 text-[9px] font-mono text-white/20">{step.timestamp}</span>}
      </div>
    );
  };

  return (
    <div className={`execution-timeline flex w-full max-w-[780px] flex-col bg-transparent p-0 ${completed ? 'mt-1' : ''}`} style={{ minHeight: working || expanded ? 148 : undefined, transition: 'min-height 400ms cubic-bezier(0.23,1,0.32,1)' }}>
      <div className="flex items-center gap-2">
        <button type="button" aria-expanded={expanded} onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))} className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/[0.05]">
          <span className={`flex size-4 shrink-0 items-center justify-center transition-colors ${working ? 'text-white/60' : 'text-white/30'}`}><Sparkle size={14} weight="fill" /></span>
          <span role="status" className="text-[13px] font-medium">
            {working ? <span className="thinking-shimmer">{activeLabel}</span> : <span className="text-white/55">{doneLabel}</span>}
          </span>
          <CaretDown size={13} className={`text-white/30 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <p className="pl-6 text-[10px] text-white/35">{working ? (focusedStep?.detail || focusedStep?.label || activeStep || 'Preparing the next step...') : 'The trace settled and remains expandable.'}</p>

      <div className="grid transition-[grid-template-rows,opacity] duration-400" style={{ gridTemplateRows: expanded ? '1fr' : '0fr', opacity: expanded ? 1 : 0, transitionTimingFunction: 'cubic-bezier(0.23,1,0.32,1)' }}>
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span aria-hidden className="absolute left-[3px] top-0 bottom-0 w-px bg-white/10" />
            <div className="relative flex flex-col gap-1 py-1">
              {searchVariant && focusedStep && (
                <div className="flex min-h-7 items-center gap-2 px-1.5 text-[11px] text-white/55" style={{ animation: 'thinking-fade-in 300ms ease-out both' }}>
                  <Globe size={13} className="shrink-0 text-white/35" />
                  <span className="truncate">{focusedStep.detail.match(/pesquisando “?([^”"]+)/i)?.[1] || focusedStep.detail}</span>
                </div>
              )}
              {visibleSteps.map(renderStep)}
              {visibleSteps.length === 0 && <div className="min-h-7 px-1.5 text-[11px] text-white/35">Preparing the first step...</div>}
            </div>
          </div>
        </div>
      </div>

      {completed && steps.length > 1 && <span className="mt-2 pl-6 text-[10px] text-white/25">{steps.length} etapas registradas · clique no cabeçalho para expandir</span>}
    </div>
  );
}

function ChatInput({ onSend, onStop, isThinking }: { onSend: (val: string) => void; onStop: () => void; isThinking: boolean }) {
  const [value, setValue] = useState('');

  return (
    <div className="relative group">
      <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl focus-within:border-white/20 transition-all shadow-2xl overflow-hidden">
        <textarea 
          placeholder="Mensagem para o agente Manus..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={1}
          className="w-full bg-[#1f1f1f] p-4 pr-16 text-sm outline-none resize-none placeholder:text-[#dcdcdc]/30 min-h-[56px] max-h-[200px] text-[#dcdcdc] font-sans"
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
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-white/[0.02]">
           <div className="flex items-center gap-2">
              <button 
                title="Anexar arquivo"
                className="p-1.5 hover:bg-white/5 rounded-md text-[#dcdcdc]/40 hover:text-[#dcdcdc] transition-colors"
              >
                <Plus size={16} />
              </button>
              <button 
                title="Conectar Repositório GitHub"
                className="p-1.5 hover:bg-white/5 rounded-md text-[#dcdcdc]/40 hover:text-[#dcdcdc] transition-colors"
              >
                <GithubLogo size={16} />
              </button>
              <img 
                src="https://imgdb.io/i/6lwOlmk.png" 
                alt="Agente" 
                className="size-5 object-contain rounded bg-white/5 p-0.5" 
                title="Agente Manus Conectado"
              />
              <div className="h-4 w-px bg-white/10 mx-1" />
              <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded-md text-[#dcdcdc]/40 hover:text-[#dcdcdc] transition-colors cursor-pointer">
                <Cloud size={14} />
                <span className="text-[11px] font-medium text-[#dcdcdc]/60">Nuvem</span>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <button 
                title="Entrada por voz"
                className="p-1.5 hover:bg-white/5 rounded-md text-[#dcdcdc]/40 hover:text-[#dcdcdc] transition-colors"
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
                    ? 'bg-[#dcdcdc] text-black hover:bg-white shadow-xs' 
                    : 'bg-white/5 text-white/20'
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

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const parseInline = (text: string) => {
    const tokens: Array<{ type: 'text' | 'bold' | 'italic' | 'code' | 'link'; text: string; url?: string }> = [];
    let i = 0;
    while (i < text.length) {
      if (text.startsWith('**', i)) {
        const end = text.indexOf('**', i + 2);
        if (end !== -1) {
          tokens.push({ type: 'bold', text: text.slice(i + 2, end) });
          i = end + 2;
          continue;
        }
      }
      if (text.startsWith('*', i)) {
        const end = text.indexOf('*', i + 1);
        if (end !== -1) {
          tokens.push({ type: 'italic', text: text.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }
      if (text.startsWith('`', i)) {
        const end = text.indexOf('`', i + 1);
        if (end !== -1) {
          tokens.push({ type: 'code', text: text.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }
      if (text.startsWith('[', i)) {
        const endText = text.indexOf(']', i + 1);
        if (endText !== -1 && text.startsWith('(', endText + 1)) {
          const endUrl = text.indexOf(')', endText + 2);
          if (endUrl !== -1) {
            tokens.push({
              type: 'link',
              text: text.slice(i + 1, endText),
              url: text.slice(endText + 2, endUrl)
            });
            i = endUrl + 1;
            continue;
          }
        }
      }
      
      const lastToken = tokens[tokens.length - 1];
      if (lastToken && lastToken.type === 'text') {
        lastToken.text += text[i];
      } else {
        tokens.push({ type: 'text', text: text[i] });
      }
      i++;
    }

    return tokens.map((token, idx) => {
      const key = `${idx}-${token.text}`;
      if (token.type === 'bold') {
        return <strong key={key} className="font-bold text-white">{token.text}</strong>;
      }
      if (token.type === 'italic') {
        return <em key={key} className="italic text-white/80">{token.text}</em>;
      }
      if (token.type === 'code') {
        return <InlineCodeSnippet key={key} code={token.text} />;
      }
      if (token.type === 'link') {
        return (
          <a
            key={key}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium inline-flex items-center gap-0.5"
          >
            {token.text}
          </a>
        );
      }
      return token.text;
    });
  };

  const flushList = (key: string | number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 space-y-1 my-2 text-white/80">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCodeBlock = (key: string | number) => {
    if (inCodeBlock) {
      const code = codeBlockLines.join('\n');
      elements.push(
        <ProfessionalCodeBlock 
          key={`code-${key}`}
          code={code}
          language={codeBlockLang || undefined}
        />
      );
      codeBlockLines = [];
      codeBlockLang = '';
      inCodeBlock = false;
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Check for fenced code block toggle
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(idx);
        continue;
      } else {
        flushList(idx);
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="text-xs font-bold text-white mt-3 mb-1.5 tracking-tight border-b border-white/5 pb-0.5">
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="text-sm font-extrabold text-white mt-4 mb-2 tracking-tight">
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushList(idx);
      elements.push(
        <h1 key={idx} className="text-base font-black text-white mt-5 mb-2.5 tracking-tight">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    if (trimmed === '---') {
      flushList(idx);
      elements.push(<hr key={idx} className="border-white/5 my-3" />);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={idx} className="text-xs leading-relaxed text-white/80">
          {parseInline(trimmed.slice(2))}
        </li>
      );
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushList(idx);
      elements.push(
        <blockquote key={idx} className="border-l-2 border-blue-500 bg-white/[0.02] pl-3 py-1 my-2 text-xs italic text-white/70 rounded-r">
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    if (trimmed === '') {
      flushList(idx);
      elements.push(<div key={idx} className="h-1.5" />);
    } else {
      if (inList) {
        flushList(idx);
      }
      elements.push(
        <p key={idx} className="text-xs md:text-sm leading-relaxed text-[#dcdcdc]/90">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList('end');
  flushCodeBlock('end');

  return <div className="space-y-1">{elements}</div>;
}
