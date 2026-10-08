import { useEffect, useRef, useMemo, useState } from 'react';
import { Monitor, LockKey, CheckCircle, XCircle, Spinner, Trash } from '@phosphor-icons/react';
import { ToolCallTrace } from '../types/project';

// Strip ANSI escape codes and normalize newline characters from terminal output
function stripAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u001b\u009b][\[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nxy=><]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

interface ConsolidatedTerminalBlock {
  key: string;
  command: string;
  toolName: string;
  output: string;
  status: 'running' | 'success' | 'error';
  timestamp: string;
}

export function TerminalView({ liveToolCalls = [] }: { activeCode?: string; liveToolCalls?: ToolCallTrace[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [cleared, setCleared] = useState(false);

  // Consolidate liveToolCalls into distinct, non-duplicated command execution blocks
  const blocks = useMemo(() => {
    if (cleared) return [];

    const rawTerminalTraces = liveToolCalls.filter(
      t => t.actionType === 'terminal' || 
           t.toolName?.toLowerCase().includes('bash') || 
           t.toolName?.toLowerCase().includes('python') || 
           Boolean(t.screenData?.terminalOutput)
    );

    const consolidated: ConsolidatedTerminalBlock[] = [];

    for (const trace of rawTerminalTraces) {
      const rawCmd = trace.screenData?.command || trace.arguments?.command || trace.toolName || 'bash_exec';
      // Force command to lowercase
      const command = String(rawCmd).toLowerCase().trim();
      const toolName = String(trace.toolName || 'bash_exec').toLowerCase().trim();
      
      let rawOutput = '';
      if (trace.screenData?.terminalOutput) {
        rawOutput = trace.screenData.terminalOutput;
      } else if (trace.result) {
        try {
          const parsed = JSON.parse(trace.result);
          rawOutput = (parsed.stdout || '') + (parsed.stderr ? `\n[stderr]\n${parsed.stderr}` : '');
        } catch {
          rawOutput = String(trace.result);
        }
      }

      const output = stripAnsi(rawOutput);
      const status = trace.status === 'error' ? 'error' : trace.status === 'running' ? 'running' : 'success';
      const timestamp = trace.timestamp || new Date().toLocaleTimeString();

      // Check if the previous block belongs to the same command execution session
      const lastBlock = consolidated[consolidated.length - 1];
      const isSameSession = lastBlock && (
        lastBlock.command === command || 
        (lastBlock.status === 'running' && lastBlock.toolName === toolName)
      );

      if (isSameSession) {
        // Consolidate into the existing command block
        if (output) {
          if (output.length >= lastBlock.output.length || output.startsWith(lastBlock.output.slice(0, 15))) {
            lastBlock.output = output;
          } else if (!lastBlock.output.includes(output)) {
            lastBlock.output = lastBlock.output ? `${lastBlock.output}\n${output}` : output;
          }
        }
        if (status !== 'running') {
          lastBlock.status = status;
        }
        if (timestamp) {
          lastBlock.timestamp = timestamp;
        }
      } else {
        consolidated.push({
          key: `block_${trace.id || Date.now()}_${consolidated.length}`,
          command,
          toolName,
          output,
          status,
          timestamp
        });
      }
    }

    return consolidated;
  }, [liveToolCalls, cleared]);

  const lastBlock = blocks[blocks.length - 1];
  const lastCommand = lastBlock ? lastBlock.command.toLowerCase() : 'aguardando comando...';

  useEffect(() => {
    if (cleared && liveToolCalls.length > 0) {
      // Re-enable live updates when new tool calls arrive after user cleared
      setCleared(false);
    }
  }, [liveToolCalls.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [blocks]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-[#e6edf3] font-mono text-[12px] select-text">
      {/* Terminal Header */}
      <div className="h-10 border-b border-white/10 bg-[#1a1a1a] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3 text-white/70 text-[11px] font-sans truncate mr-4">
          <span className="flex items-center gap-2 truncate">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/90 font-medium">Terminal Bash MCP</span>
            <span className="opacity-40">|</span>
            <span className="opacity-70">Comando:</span>
            <span className="text-white font-mono font-semibold truncate">{lastCommand.slice(0, 70)}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCleared(true)}
            className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
            title="Limpar mensagens do terminal"
          >
            <Trash size={12} />
            <span>Limpar</span>
          </button>
          <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-sans">
            <LockKey size={12} />
            <span className="hidden sm:inline">área de trabalho isolada</span>
          </div>
          <Monitor size={16} className="text-white/50" />
        </div>
      </div>

      {/* Terminal Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1a1a1a]">
        {/* Consolidated Command Execution Blocks (No Cards, Pure Stream) */}
        {blocks.map((block) => (
          <div key={block.key} className="space-y-1.5 group">
            {/* Command Prompt Line - Command in White */}
            <div className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#3fb950] font-bold">ubuntu@sandbox</span>
                <span className="text-white/50">:</span>
                <span className="text-[#58a6ff] font-bold">~</span>
                <span className="text-white/50">$</span>
                <span className="text-white font-bold font-mono break-all">{block.command.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
                {block.status === 'running' && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Spinner size={12} className="animate-spin" />
                    <span>executando</span>
                  </span>
                )}
                {block.status === 'success' && (
                  <span className="flex items-center gap-1 text-emerald-400/80">
                    <CheckCircle size={12} weight="fill" />
                    <span>exit 0</span>
                  </span>
                )}
                {block.status === 'error' && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <XCircle size={12} weight="fill" />
                    <span>erro</span>
                  </span>
                )}
                <span>· {block.timestamp}</span>
              </div>
            </div>

            {/* Well-Formatted Command Output in Neutral Gray Text */}
            {block.output ? (
              <div className="text-zinc-300 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all py-1 pl-3 border-l border-white/5">
                {block.output.includes('[stderr]') ? (
                  <>
                    <div>{block.output.split('[stderr]')[0].trim()}</div>
                    <div className="text-rose-400/90 border-l border-rose-500/40 pl-3 mt-1.5 pt-0.5 font-mono text-[11.5px]">
                      <span className="text-rose-400/80 font-bold text-[10px] block uppercase tracking-wider mb-0.5">[stderr]</span>
                      {block.output.split('[stderr]')[1].trim()}
                    </div>
                  </>
                ) : (
                  block.output.trim()
                )}
              </div>
            ) : block.status === 'running' ? (
              <div className="text-zinc-400/80 font-mono text-[11px] flex items-center gap-2 py-1 pl-3">
                <div className="size-2 rounded-full bg-amber-400 animate-ping" />
                <span>Aguardando resultado do comando no terminal...</span>
              </div>
            ) : null}
          </div>
        ))}

        {/* Live Running Prompt Cursor Indicator at Bottom */}
        {blocks.length > 0 && lastBlock?.status === 'running' && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[#3fb950] font-bold">ubuntu@sandbox</span>
            <span className="text-white/50">:</span>
            <span className="text-[#58a6ff] font-bold">~</span>
            <span className="text-white/50">$</span>
            <div className="w-2 h-4 bg-white/80 animate-pulse" />
          </div>
        )}

        {/* Empty State */}
        {blocks.length === 0 && (
          <div className="text-zinc-500 text-[11px] italic py-8 text-center space-y-1">
            <p>Nenhum comando de terminal executado ainda.</p>
            <p className="text-[10px] text-zinc-600">Aguardando execuções de comandos do agente no terminal.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
