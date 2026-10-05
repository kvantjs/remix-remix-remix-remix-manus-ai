"use client";

import React from 'react';
import ApprovalCard, { ApprovalQuestion, ApprovalLabels } from './ApprovalCard';

export interface QuestionnaireChoiceItem {
  value: string;
  label: string;
  hint?: string;
}

export interface QuestionnaireQuestion {
  name: string;
  title: string;
  description?: string;
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
    title: 'Qual segmento / nicho da aplicação?',
    choices: [
      { value: 'fintech', label: 'Fintech & Private Banking' },
      { value: 'saas', label: 'SaaS & Telemetria em Tempo Real' },
      { value: 'ecommerce', label: 'E-Commerce & Loja de Alta Performance' },
      { value: 'editorial', label: 'Editorial & Estúdio Criativo' },
    ],
  },
  {
    name: 'style',
    title: 'Qual direção visual e paleta?',
    choices: [
      { value: 'dark_emerald', label: 'Dark Obsidian & Esmeralda' },
      { value: 'dark_slate', label: 'Dark Slate & Roxo Cyber' },
      { value: 'warm_bone', label: 'Warm Bone & Serif' },
      { value: 'neon_volt', label: 'High-Contrast Neon' },
    ],
  },
  {
    name: 'features',
    title: 'Quais recursos dinâmicos incluir?',
    choices: [
      { value: 'simulator', label: 'Simulador / Calculadora Interativa' },
      { value: 'live_stream', label: 'Feed de Dados em Tempo Real' },
      { value: 'forms_modal', label: 'Modais de Transação & Formulários' },
    ],
  },
];

export function AgentContextQuestionnaire({
  questions = DEFAULT_APP_QUESTIONS,
  onSubmitContext,
  onClose,
}: AgentQuestionnaireProps) {
  const activeQList = questions && questions.length > 0 ? questions : DEFAULT_APP_QUESTIONS;

  const approvalQuestions: ApprovalQuestion[] = activeQList.map((q, idx) => ({
    q: q.title,
    type: idx === activeQList.length - 1 ? 'check' : 'radio',
    options: q.choices.map((c) => c.label || c.value),
  }));

  const handleSubmitted = (
    answers: Record<number, number[]>,
    customAnswers?: Record<number, string>
  ) => {
    const resultObj: Record<string, string> = {};
    const summaryParts: string[] = [];

    activeQList.forEach((q, qIdx) => {
      const selectedIndices = answers[qIdx] || [];
      const customText = customAnswers?.[qIdx]?.trim();

      let chosenText = '';
      if (customText) {
        chosenText = customText;
      } else if (selectedIndices.length > 0) {
        chosenText = selectedIndices
          .map((i) => q.choices[i]?.label || q.choices[i]?.value || `Opção ${i + 1}`)
          .join(', ');
      } else {
        chosenText = q.choices[0]?.label || 'Padrão';
      }

      resultObj[q.name] = chosenText;
      summaryParts.push(`${q.title.replace('?', '').trim()}: ${chosenText}`);
    });

    const summary = summaryParts.join(' | ');
    onSubmitContext(resultObj, summary);
  };

  return (
    <ApprovalCard
      questions={approvalQuestions}
      onSubmitted={handleSubmitted}
      onClose={onClose}
      labels={{
        skip: 'Pular',
        continue: 'Continuar',
        send: 'Enviar',
        customPlaceholder: 'Outra preferência…',
        sentMessage: 'Contexto enviado!',
      }}
    />
  );
}

export default AgentContextQuestionnaire;
