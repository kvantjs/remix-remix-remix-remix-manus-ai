import { useEffect, useRef, useState, useMemo } from 'react';
import { Monitor, LockKey } from '@phosphor-icons/react';
import { ToolCallTrace } from '../types/project';

function TerminalOutput({ content }: { content: string }) {
  return <div className="text-[#d1d5db] whitespace-pre-wrap font-mono text-[12px] my-1 leading-relaxed">{content}</div>;
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
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const traces = useMemo(() => 
    liveToolCalls.filter(t => t.actionType === 'terminal' || t.toolName.includes('bash') || t.toolName.includes('python') || t.screenData?.terminalOutput).slice(-40)
  , [liveToolCalls]);

  const lastCommand = traces.length > 0 ? (traces[traces.length - 1].screenData?.command || traces[traces.length - 1].arguments?.command || traces[traces.length - 1].toolName) : 'Nenhum comando em execução';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [traces.length]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-[#ededed] font-mono text-[12px] select-text">
      <div className="h-10 border-b border-white/5 bg-[#1a1a1a] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3 text-white/60 text-[11px] font-sans truncate mr-4">
          <span className="truncate">
            <span className="text-white/80 font-medium">Kvant está usando o Terminal</span>
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-80">Executando comando </span>
            <span className="text-emerald-400 font-mono truncate">{String(lastCommand).slice(0, 80)}{String(lastCommand).length > 80 ? '...' : ''}</span>
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-white/35 text-[10px] font-sans">
            <LockKey size={12} />
            <span className="hidden sm:inline">controle exclusivo do agente</span>
          </div>
          <Monitor size={18} className="text-white/40" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {history.map(line => (
          <div key={line.id} className="leading-relaxed">
            <div className="text-blue-400/60 text-[11px] font-sans italic opacity-70">{line.content}</div>
          </div>
        ))}
        {traces.map((trace, idx) => (
          <div key={`live-${trace.id || 'trace'}-${idx}`} className="leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="flex shrink-0">
                <span className="text-[#4ade80] font-bold">ubuntu@sandbox</span>
                <span className="text-white/80">:</span>
                <span className="text-[#3b82f6] font-bold">~</span>
                <span className="text-white/80">$</span>
              </div>
              <div className="text-white font-bold break-all">
                {trace.screenData?.command || trace.arguments?.command || trace.toolName}
              </div>
            </div>
            <div className="mt-1">
              <TerminalOutput content={String(trace.screenData?.terminalOutput || trace.result || '')} />
            </div>
          </div>
        ))}
        {traces.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex shrink-0">
              <span className="text-[#4ade80] font-bold">ubuntu@sandbox</span>
              <span className="text-white/80">:</span>
              <span className="text-[#3b82f6] font-bold">~</span>
              <span className="text-white/80">$</span>
            </div>
            <div className="w-2 h-4 bg-white/50 animate-pulse" />
          </div>
        )}
        {traces.length === 0 && <div className="text-white/20 text-[11px] italic">Aguardando o próximo comando autorizado do agente...</div>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
