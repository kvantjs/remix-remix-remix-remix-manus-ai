import { useEffect, useRef, useState, useMemo } from 'react';
import { Monitor, LockKey } from '@phosphor-icons/react';
import { ToolCallTrace } from '../types/project';

function TerminalOutput({ content }: { content: string }) {
  return (
    <div className="text-[#e2e8f0] whitespace-pre-wrap font-mono text-[12px] my-1 leading-relaxed selection:bg-white/10 select-text">
      {content}
    </div>
  );
}

interface TerminalLine {
  id: string;
  type: 'output' | 'system' | 'error';
  content: string;
  time: string;
}

const formatTerminalCommand = (cmd: string) => {
  if (!cmd) return '';
  let formatted = cmd.trim();
  
  // Convert standard tool names to lowercase
  if (formatted === formatted.toUpperCase()) {
    formatted = formatted.toLowerCase();
  }
  
  formatted = formatted
    .replace(/\bRUN_BASH_COMMAND\b/g, 'bash')
    .replace(/\bBASH_COMMAND\b/g, 'bash')
    .replace(/\bEXECUTE_BASH\b/g, 'bash')
    .replace(/\bBASH\b/g, 'bash')
    .replace(/\bPYTHON\b/g, 'python3')
    .replace(/\bPYTHON3\b/g, 'python3');
    
  return formatted.toLowerCase();
};

export function TerminalView({ liveToolCalls = [] }: { activeCode?: string; liveToolCalls?: ToolCallTrace[] }) {
  const [history] = useState<TerminalLine[]>([
    { id: 'init-1', type: 'system', content: 'Sandbox de execução do agente · Ubuntu 24.04 · saída ao vivo', time: '12:00:00' },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const traces = useMemo(() => 
    liveToolCalls.filter(t => t.actionType === 'terminal' || t.toolName.includes('bash') || t.toolName.includes('python') || t.screenData?.terminalOutput).slice(-40)
  , [liveToolCalls]);

  const consolidatedTraces = useMemo(() => {
    const result: ToolCallTrace[] = [];
    for (const trace of traces) {
      const rawCmd = trace.screenData?.command || trace.arguments?.command || trace.toolName;
      const cleanCmd = formatTerminalCommand(rawCmd).trim().toLowerCase();
      
      const lastItem = result[result.length - 1];
      if (lastItem) {
        const lastRawCmd = lastItem.screenData?.command || lastItem.arguments?.command || lastItem.toolName;
        const lastCleanCmd = formatTerminalCommand(lastRawCmd).trim().toLowerCase();
        
        // Group/merge if same ID or exact same command text
        if ((trace.id && lastItem.id === trace.id) || (cleanCmd && cleanCmd === lastCleanCmd)) {
          const lastOutput = lastItem.screenData?.terminalOutput || lastItem.result || '';
          const currentOutput = trace.screenData?.terminalOutput || trace.result || '';
          
          const extractOutput = (txt: string) => {
            if (typeof txt === 'string' && txt.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(txt);
                if (parsed && typeof parsed === 'object') {
                  if ('stdout' in parsed || 'stderr' in parsed) {
                    const out = parsed.stdout || '';
                    const err = parsed.stderr || '';
                    return out + (err ? '\n' + err : '');
                  } else if ('terminalOutput' in parsed) {
                    return parsed.terminalOutput || '';
                  } else if ('output' in parsed) {
                    return parsed.output || '';
                  } else if ('summary' in parsed) {
                    return parsed.summary || '';
                  }
                }
              } catch {}
            }
            return txt;
          };
          
          const extractedLast = extractOutput(lastOutput);
          const extractedCurrent = extractOutput(currentOutput);
          
          let mergedOutput = extractedCurrent;
          if (extractedLast && extractedCurrent) {
            if (extractedCurrent.startsWith(extractedLast)) {
              mergedOutput = extractedCurrent;
            } else if (extractedLast.endsWith(extractedCurrent)) {
              mergedOutput = extractedLast;
            } else if (extractedLast.includes(extractedCurrent)) {
              mergedOutput = extractedLast;
            } else {
              mergedOutput = extractedLast + '\n' + extractedCurrent;
            }
          } else {
            mergedOutput = extractedCurrent || extractedLast;
          }
          
          lastItem.screenData = {
            ...lastItem.screenData,
            terminalOutput: mergedOutput,
            command: rawCmd
          };
          lastItem.result = mergedOutput;
          if (trace.status) {
            lastItem.status = trace.status;
          }
          continue;
        }
      }
      
      const cleanResult = (() => {
        const rawRes = trace.screenData?.terminalOutput || trace.result || '';
        if (typeof rawRes === 'string' && rawRes.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(rawRes);
            if (parsed && typeof parsed === 'object') {
              if ('stdout' in parsed || 'stderr' in parsed) {
                const out = parsed.stdout || '';
                const err = parsed.stderr || '';
                return out + (err ? '\n' + err : '');
              } else if ('terminalOutput' in parsed) {
                return parsed.terminalOutput || '';
              } else if ('output' in parsed) {
                return parsed.output || '';
              } else if ('summary' in parsed) {
                return parsed.summary || '';
              }
            }
          } catch {}
        }
        return rawRes;
      })();
      
      result.push({
        ...trace,
        result: cleanResult,
        screenData: {
          ...trace.screenData,
          terminalOutput: cleanResult
        }
      });
    }
    return result;
  }, [traces]);

  const lastCommand = consolidatedTraces.length > 0 
    ? (consolidatedTraces[consolidatedTraces.length - 1].screenData?.command || consolidatedTraces[consolidatedTraces.length - 1].arguments?.command || consolidatedTraces[consolidatedTraces.length - 1].toolName) 
    : 'Nenhum comando em execução';

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [consolidatedTraces.length]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-[#ededed] font-mono text-[11px] sm:text-[12px] select-text">
      <div className="h-10 border-b border-white/5 bg-[#1a1a1a] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3 text-white/60 text-[11px] font-sans truncate mr-4">
          <span className="truncate">
            <span className="text-white/80 font-medium">Kvant está usando o Terminal</span>
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-80">Executando comando </span>
            <span className="text-emerald-400 font-mono truncate">{formatTerminalCommand(String(lastCommand)).slice(0, 80)}{String(lastCommand).length > 80 ? '...' : ''}</span>
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar bg-[#1a1a1a]">
        {history.map(line => (
          <div key={line.id} className="leading-relaxed">
            <div className="text-blue-400/60 text-[11px] font-sans italic opacity-70">{line.content}</div>
          </div>
        ))}
        {consolidatedTraces.map((trace, idx) => {
          const rawCmd = trace.screenData?.command || trace.arguments?.command || trace.toolName;
          const formattedCmd = formatTerminalCommand(rawCmd);
          const formattedOutput = trace.screenData?.terminalOutput || trace.result || '';
          
          return (
            <div key={`live-${trace.id || 'trace'}-${idx}`} className="leading-relaxed space-y-0.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <div className="flex shrink-0 select-none font-mono font-bold text-[12px]">
                  <span className="text-[#4ade80]">ubuntu@sandbox</span>
                  <span className="text-white">:</span>
                  <span className="text-[#3b82f6]">~</span>
                  <span className="text-white">$</span>
                </div>
                <div className="text-white font-mono text-[12px] break-all whitespace-pre-wrap">
                  {formattedCmd}
                </div>
              </div>
              {formattedOutput && (
                <div className="pt-0.5">
                  <TerminalOutput content={String(formattedOutput)} />
                </div>
              )}
            </div>
          );
        })}
        {consolidatedTraces.length > 0 && consolidatedTraces[consolidatedTraces.length - 1].status === 'running' && (
          <div className="flex items-center gap-2 pt-1 animate-pulse">
            <div className="flex shrink-0 select-none font-mono font-bold text-[12px]">
              <span className="text-[#4ade80]">ubuntu@sandbox</span>
              <span className="text-white">:</span>
              <span className="text-[#3b82f6]">~</span>
              <span className="text-white">$</span>
            </div>
            <div className="w-2 h-4 bg-white/50" />
          </div>
        )}
        {consolidatedTraces.length === 0 && <div className="text-white/20 text-[11px] italic">Aguardando o próximo comando autorizado do agente...</div>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
