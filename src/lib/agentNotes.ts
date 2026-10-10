export interface AgentProgressNote {
  id: string;
  label: string;
  text: string;
  status: 'running' | 'complete' | 'warning';
  timestamp: string;
  isPersistent?: boolean;
  toolExecution?: {
    tool: string;
    detail?: string;
  };
  placementVariant?: 'spotlight' | 'contextual' | 'milestone';
}

/** Remove pictographs so progress labels remain consistent with the UI typography. */
export function removeAllEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .trim();
}

/** Sanitize observable progress; never pad it with claims the runtime did not report. */
export function sanitizeProgressNote(
  rawLabel: string,
  rawText: string
): { cleanLabel: string; cleanText: string } {
  const sanitize = (value: string) => removeAllEmojis(String(value || '').trim())
    .replace(/\bOpenManus\b/gi, 'agente')
    .replace(/\bKopilot\b/gi, 'Manus')
    .replace(/\bKvant\b/gi, 'Manus')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanLabel = sanitize(rawLabel) || 'Etapa da tarefa';
  const cleanText = sanitize(rawText) || 'Etapa em andamento.';
  return { cleanLabel, cleanText };
}
