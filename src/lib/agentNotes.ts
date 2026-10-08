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

/**
 * Strips all emojis and pictographs completely from any text string.
 */
export function removeAllEmojis(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '') // Flags
    .replace(/\p{Extended_Pictographic}/gu, '')
    .trim();
}

/**
 * Sanitizes internal model/developer jargon and enriches phrases to be
 * long, comprehensive, and focused on the end-client experience.
 * Strictly guarantees no emojis are present and highlight placements vary organically.
 */
export function sanitizeAndEnrichClientNote(
  rawLabel: string,
  rawText: string
): { cleanLabel: string; cleanText: string } {
  let label = removeAllEmojis(String(rawLabel || '')).trim();
  let text = removeAllEmojis(String(rawText || '')).trim();

  // 1. Remove & replace developer/owner AI model jargon:
  // "consultando o modelo Y", "chamando modelo gemini", "modelo claude", "tokens", etc.
  const modelRegex = /(?:consultando|chamando|executando|avaliando\s+resposta\s+do)?\s*modelo\s+[a-zA-Z0-9_.\-]+/gi;
  text = text.replace(modelRegex, 'avaliando os parâmetros e diretrizes da solicitação');
  label = label.replace(modelRegex, 'Análise de Diretrizes');

  const specificModels = /\b(gemini(?:-[0-9a-z.\-]+)?|claude(?:-[0-9a-z.\-]+)?|gpt-[0-9a-z.\-]+|deepseek|llama|llm|tokens?|temperatura|top_p|system\s*instruction|system\s*prompt|raw\s*prompt|prompt\s*interno|backend\s*rpc|infer[êe]ncia)\b/gi;
  text = text.replace(specificModels, 'processamento avançado');
  label = label.replace(specificModels, 'Processamento');

  // Client-oriented transformations:
  text = text.replace(/consultando\s+o\s+modelo\s+[^\s,.]+/gi, 'consultando as diretrizes de desenvolvimento da solução');
  text = text.replace(/chamando\s+o\s+modelo\s+[^\s,.]+/gi, 'analisando os parâmetros técnicos de execução');
  text = text.replace(/resposta\s+do\s+modelo/gi, 'diretriz validada');
  text = text.replace(/delibera[çc][ãa]o\s+profunda\s+do\s+modelo/gi, 'planejamento analítico da arquitetura');
  text = text.replace(/\bkvant\b/gi, 'padrão de engenharia');
  text = text.replace(/deep\s+deliberation\s+gate/gi, 'validação de conformidade');
  text = text.replace(/gate\s+validado/gi, 'critérios técnicos atendidos com sucesso');
  text = text.replace(/o\s+computer\s+mcp/gi, 'o ambiente operacional seguro');
  text = text.replace(/\bmcp\b/gi, 'módulo integrado');

  // Clean labels
  label = label.replace(/delibera[çc][ãa]o\s+profunda/gi, 'Planejamento Arquitetural');
  label = label.replace(/computer\s+mcp/gi, 'Ambiente Integrado');
  label = label.replace(/webdev\s+mcp/gi, 'Módulo de Código');
  label = label.replace(/terminal\s+bash\s+mcp/gi, 'Terminal Integrado');
  label = label.replace(/stage\s+note/gi, 'Etapa de Desenvolvimento');
  label = label.replace(/\s*·\s*\d{5,}$/g, ''); // Strip trailing random ID suffix

  // 2. Ensure sentences and texts are rich and informative, varying in-text highlight placement across positions:
  if (text.length < 90) {
    const combined = `${label} ${text}`.toLowerCase();
    if (combined.includes('boot') || combined.includes('inicializ')) {
      text = 'Inicializando o ambiente operacional seguro e preparando as ferramentas necessárias para a execução com **rastreabilidade total** e ==estabilidade contínua de serviços==.';
    } else if (combined.includes('criter') || combined.includes('planej') || combined.includes('deliber') || combined.includes('racioc') || combined.includes('analis')) {
      text = 'Avaliando critérios técnicos da arquitetura com foco em alto padrão estético, antecipando cenários para garantir ==performance otimizada e entrega estável==.';
    } else if (combined.includes('navegad') || combined.includes('browser') || combined.includes('url') || combined.includes('página') || combined.includes('pagina')) {
      text = 'Inspecionando os elementos visuais e a interatividade da aplicação para certificar que a navegação proporcione uma ==experiência intuitiva e responsiva== para o usuário final.';
    } else if (combined.includes('arquivo') || combined.includes('ler') || combined.includes('read') || combined.includes('alvo')) {
      text = 'Examinando a estrutura de arquivos e o contexto do projeto para preservar as funcionalidades com ==total compatibilidade nos módulos afetados==.';
    } else if (combined.includes('grav') || combined.includes('edit') || combined.includes('write') || combined.includes('cria')) {
      text = 'Implementando melhorias modulares e atualizações técnicas no código-fonte, aplicando as diretrizes do sistema com foco em ==arquitetura limpa e escalabilidade==.';
    } else if (combined.includes('terminal') || combined.includes('comando') || combined.includes('execut') || combined.includes('shell')) {
      text = 'Executando verificações no ambiente integrado para sincronizar dependências e validar a compilação com ==rigor técnico comprovado==.';
    } else if (combined.includes('pesquis') || combined.includes('web') || combined.includes('busca')) {
      text = 'Consultando documentações técnicas e referências confiáveis na web para fundamentar a melhor solução prática com ==rigor metodológico e fontes auditadas==.';
    } else {
      const cleanEnd = text.replace(/[.]+$/, '');
      text = `${cleanEnd}. Estruturando as etapas com validações contínuas para entregar uma ==solução robusta e completa==.`;
    }
  }

  return {
    cleanLabel: removeAllEmojis(label),
    cleanText: removeAllEmojis(text),
  };
}
