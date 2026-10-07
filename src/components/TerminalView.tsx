import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, LockKey } from '@phosphor-icons/react';
import { SyntaxCodeView, detectLanguage } from './SyntaxCodeView';
import { ToolCallTrace } from '../types/project';

function TerminalOutput({ content }: { content: string }) {
  const trimmed = content.trim();
  const isJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  const isCode = trimmed.includes('import ') || trimmed.includes('export ') || trimmed.includes('<template>') || trimmed.includes('function ') || trimmed.includes('<!DOCTYPE') || trimmed.includes('class ');

  if (isJson || isCode) {
    const lang = isJson ? 'json' : detectLanguage(undefined, content);
    let formattedCode = content;
    if (isJson) {
      try { formattedCode = JSON.stringify(JSON.parse(content), null, 2); } catch { formattedCode = content; }
    }
    return (
      <div className="my-1.5 pl-2 border-l-2 border-blue-500/40">
        <SyntaxCodeView code={formattedCode} language={lang} compact showLineNumbers={formattedCode.split('\n').length > 3} maxHeight="320px" />
      </div>
    );
  }

  return <div className="text-[#a0a0a0] pl-4 whitespace-pre-wrap font-mono text-[11px] border-l border-white/5 my-1">{content}</div>;
}

interface TerminalLine {
  id: string;
  type: 'output' | 'system' | 'error';
  content: string;
  time: string;
}

export function TerminalView({ liveToolCalls = [] }: { activeCode?: string; liveToolCalls?: ToolCallTrace[] }) {
  const [history] = useState<TerminalLine[]>([
    { id: 'init-1', type: 'system', content: 'Sandbox de execução do agente · Ubuntu 24.04 · saída ao vivo', time: '12:00:00' },
    { id: 'init-2', type: 'system', content: 'Somente o pipeline interno do agente pode executar comandos. Esta superfície é uma visualização somente leitura.', time: '12:00:01' }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const traces = liveToolCalls.filter(t => t.actionType === 'terminal' || t.toolName.includes('bash') || t.toolName.includes('python') || t.screenData?.terminalOutput).slice(-40);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [traces.length]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-[#ededed] font-mono text-[12px] select-text">
      <div className="h-9 border-b border-white/5 bg-[#1a1a1a] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-white/50 text-[11px] font-sans">
          <TerminalIcon size={13} className="text-green-400" />
          <span className="font-semibold text-white/80">ubuntu@kvant:~/workspace</span>
          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">Streaming ao vivo</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/35 text-[10px] font-sans"><LockKey size={12} /> controle exclusivo do agente</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {history.map(line => (
          <div key={line.id} className="leading-relaxed">
            <div className="text-blue-400/80 text-[11px] font-sans">{line.content}</div>
          </div>
        ))}
        {traces.map((trace, idx) => (
          <div key={`live-${trace.id || 'trace'}-${idx}`} className="leading-relaxed border-l-2 border-emerald-400/40 pl-2">
            <div className="text-emerald-300/80 text-[10px]">ubuntu@kvant:~/workspace$ {trace.screenData?.command || trace.arguments?.command || trace.toolName}</div>
            <TerminalOutput content={String(trace.screenData?.terminalOutput || trace.result || '')} />
          </div>
        ))}
        {traces.length === 0 && <div className="text-white/30 text-[11px]">Aguardando o próximo comando autorizado do agente...</div>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
