"use client";

import React, { useState } from 'react';
import { 
  Sparkle, 
  Check, 
  HelpCircle, 
  Send, 
  X,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Layers,
  Palette,
  Cpu,
  CheckCircle2
} from 'lucide-react';

export interface QuestionnaireChoiceItem {
  value: string;
  label: string;
  hint: string;
}

export interface QuestionnaireQuestion {
  name: string;
  title: string;
  description: string;
  choices: QuestionnaireChoiceItem[];
}

export interface AgentQuestionnaireProps {
  title?: string;
  description?: string;
  questions?: QuestionnaireQuestion[];
  onSubmitContext: (answers: Record<string, string>, formattedSummary: string) => void;
  onClose?: () => void;
}

export const DEFAULT_APP_QUESTIONS: QuestionnaireQuestion[] = [
  {
    name: 'niche',
    title: 'Qual é o segmento / nicho da aplicação?',
    description: 'Define a arquitetura de informação, modelos de dados e fluxos de telas.',
    choices: [
      {
        value: 'fintech',
        label: 'Fintech & Private Banking',
        hint: 'Carteira global de ativos, PIX/transferências, extrato e simulador de juros compostos.',
      },
      {
        value: 'saas',
        label: 'SaaS & Telemetria em Tempo Real',
        hint: 'Painel de logs com streaming ao vivo, métricas de CPU/RAM e busca instantânea.',
      },
      {
        value: 'ecommerce',
        label: 'E-Commerce & Loja de Alta Performance',
        hint: 'Grade de produtos, carrinho reativo com cupons, cálculo de frete e checkout em etapas.',
      },
      {
        value: 'editorial',
        label: 'Editorial & Estúdio Criativo',
        hint: 'Tipografia editorial premium, showcase de projetos, leitor de artigos e alternância de temas.',
      },
    ],
  },
  {
    name: 'style',
    title: 'Qual é a direção visual e paleta de cores?',
    description: 'Aplica a regra 60-30-10 com contraste elevado e identidade visual exclusiva.',
    choices: [
      {
        value: 'dark_emerald',
        label: 'Dark Obsidian & Esmeralda (Fintech Pro)',
        hint: 'Fundo profundo #070D0B, bordas refinadas esmeralda e acentos de alta intenção.',
      },
      {
        value: 'dark_slate',
        label: 'Dark Slate & Roxo Cyber (Dev SaaS)',
        hint: 'Fundo #090A0F, cartões translúcidos e acentos em violeta e ciano.',
      },
      {
        value: 'warm_bone',
        label: 'Warm Bone & Tipografia Serif (Editorial)',
        hint: 'Fundo creme/marfim #FBFBFA, tipografia serifada e contrastes limpos.',
      },
      {
        value: 'neon_volt',
        label: 'High-Contrast Neon & Volt (Performance)',
        hint: 'Fundo ultra-escuro #0C0C0E com acento volt #D4FF00 e fontes mono.',
      },
    ],
  },
  {
    name: 'features',
    title: 'Quais recursos dinâmicos você quer como prioridade?',
    description: 'Todos os componentes serão implementados com estado React 100% interativo.',
    choices: [
      {
        value: 'simulator',
        label: 'Simulador / Calculadora Matemática Interativa',
        hint: 'Recálculo instantâneo com sliders e fórmulas financeiras/operacionais.',
      },
      {
        value: 'live_stream',
        label: 'Feed de Dados em Tempo Real com Filtros',
        hint: 'Atualizações contínuas de telemetria, pausa/play e busca instantânea.',
      },
      {
        value: 'forms_modal',
        label: 'Modais de Transação & Formulários com Validação',
        hint: 'Fluxo completo de criação de registros adicionando itens ao estado em tempo real.',
      },
    ],
  },
];

export function AgentContextQuestionnaire({
  title = 'Especificação de Contexto do Agente',
  description = 'Marque suas preferências para que o agente construa o projeto exatamente de acordo com sua visão:',
  questions = DEFAULT_APP_QUESTIONS,
  onSubmitContext,
  onClose,
}: AgentQuestionnaireProps) {
  const activeQuestions = questions && questions.length > 0 ? questions : DEFAULT_APP_QUESTIONS;

  // Initialize with the first choice of each question as default selected
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of activeQuestions) {
      if (q.choices && q.choices.length > 0) {
        initial[q.name] = q.choices[0].value;
      }
    }
    return initial;
  });

  const [activeStep, setActiveStep] = useState(0);

  const currentQuestion = activeQuestions[activeStep] || activeQuestions[0];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === activeQuestions.length - 1;

  const handleSelectChoice = (questionName: string, choiceValue: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionName]: choiceValue,
    }));
  };

  const handleConfirmSubmit = () => {
    const summaryParts: string[] = [];
    for (const q of activeQuestions) {
      const chosenValue = selectedAnswers[q.name];
      const matched = q.choices.find((c) => c.value === chosenValue);
      const label = matched?.label || chosenValue || 'Padrão';
      summaryParts.push(`${q.title.replace('?', '').trim()}: ${label}`);
    }

    const summary = summaryParts.join(' | ');
    onSubmitContext(selectedAnswers, summary);
    if (onClose) onClose();
  };

  const getStepIcon = (index: number) => {
    if (index === 0) return <Layers size={13} />;
    if (index === 1) return <Palette size={13} />;
    return <Cpu size={13} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Pop-up Card */}
      <div 
        className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#27272a] bg-[#141417] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs">
              <Sliders size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Etapa {activeStep + 1}/{activeQuestions.length}
                </span>
              </h3>
              <p className="text-[11px] text-[#a1a1aa] line-clamp-1">
                {description}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="size-7 rounded-lg hover:bg-white/10 text-[#a1a1aa] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar questionário"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-5 pt-3 pb-2 bg-[#161619] border-b border-[#27272a] flex items-center gap-1.5 shrink-0 overflow-x-auto">
          {activeQuestions.map((q, idx) => {
            const isCurrent = idx === activeStep;
            const isCompleted = idx < activeStep || Boolean(selectedAnswers[q.name]);
            return (
              <button
                key={q.name}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : isCompleted
                    ? 'bg-[#27272a] text-[#d4d4d8] hover:bg-[#323236]'
                    : 'bg-[#202023] text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  getStepIcon(idx)
                )}
                <span>Passo {idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Question & Choices Area */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white tracking-tight">
              {currentQuestion.title}
            </h4>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              {currentQuestion.description}
            </p>
          </div>

          {/* Choices Grid / List */}
          <div className="space-y-2.5 pt-1">
            {currentQuestion.choices.map((choice) => {
              const isSelected = selectedAnswers[currentQuestion.name] === choice.value;
              return (
                <div
                  key={choice.value}
                  onClick={() => handleSelectChoice(currentQuestion.name, choice.value)}
                  className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-[#202024]/70 border-[#2e2e34] hover:border-blue-500/40 hover:bg-[#25252a]'
                  }`}
                >
                  {/* Radio Indicator */}
                  <div
                    className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                        : 'border-[#52525b] bg-[#18181b]'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>

                  {/* Choice Text Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs sm:text-[13px] font-semibold tracking-tight ${isSelected ? 'text-white' : 'text-[#e4e4e7]'}`}>
                        {choice.label}
                      </span>
                      {isSelected && (
                        <span className="text-[9.5px] uppercase font-mono tracking-wider font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded">
                          Selecionado
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                      {choice.hint}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 border-t border-[#27272a] bg-[#141417] flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isFirstStep
                ? 'opacity-30 border-transparent text-[#71717a] cursor-not-allowed'
                : 'border-[#3f3f46] bg-[#27272a] hover:bg-[#323236] text-[#e4e4e7]'
            }`}
          >
            <ChevronLeft size={14} />
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Próximo Passo</span>
                <ChevronRight size={14} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleConfirmSubmit}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Send size={13} />
              <span>Confirmar & Enviar Contexto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
