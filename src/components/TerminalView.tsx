import { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Trash, 
  ArrowsCounterClockwise, 
  Lightning, 
  Play, 
  CheckCircle 
} from '@phosphor-icons/react';
import { SyntaxCodeView, detectLanguage } from './SyntaxCodeView';

function TerminalOutput({ content }: { content: string }) {
  const trimmed = content.trim();
  const isJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  const isCode = trimmed.includes('import ') || trimmed.includes('export ') || trimmed.includes('<template>') || trimmed.includes('function ') || trimmed.includes('<!DOCTYPE') || trimmed.includes('class ');

  if (isJson || isCode) {
    const lang = isJson ? 'json' : detectLanguage(undefined, content);
    let formattedCode = content;
    if (isJson) {
      try {
        formattedCode = JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        formattedCode = content;
      }
    }
    return (
      <div className="my-1.5 pl-2 border-l-2 border-blue-500/40">
        <SyntaxCodeView 
          code={formattedCode} 
          language={lang} 
          compact 
          showLineNumbers={formattedCode.split('\n').length > 3} 
          maxHeight="320px" 
        />
      </div>
    );
  }

  return (
    <div className="text-[#a0a0a0] pl-4 whitespace-pre-wrap font-mono text-[11px] border-l border-white/5 my-1">
      {content}
    </div>
  );
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  content: string;
  time: string;
}

export function TerminalView({ activeCode }: { activeCode?: string }) {
  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      content: 'Kvant Developer Sandbox Terminal (Versão de Desenvolvimento) (Node.js runtime + Vite dev server)',
      time: '12:00:00'
    },
    {
      id: 'init-2',
      type: 'system',
      content: 'Digite "help" para ver os comandos ou "curl https://api.github.com/zen" para testar chamadas reais de API.',
      time: '12:00:01'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const time = new Date().toLocaleTimeString();

    // Append user input line
    setHistory(prev => [
      ...prev,
      { id: Date.now().toString(), type: 'input', content: trimmed, time }
    ]);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInputVal('');
    setIsExecuting(true);

    try {
      // Local special commands
      if (trimmed.toLowerCase() === 'clear') {
        setHistory([]);
        setIsExecuting(false);
        return;
      }

      if (trimmed.toLowerCase().startsWith('cat app.tsx') || trimmed.toLowerCase().startsWith('cat client/src/app.tsx')) {
        const snippet = activeCode ? activeCode.slice(0, 1000) + (activeCode.length > 1000 ? '\n... (truncado)' : '') : '// Nenhum código carregado';
        setHistory(prev => [
          ...prev,
          { id: (Date.now() + 1).toString(), type: 'output', content: snippet, time }
        ]);
        setIsExecuting(false);
        return;
      }

      // Real execution on server
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed })
      });

      const data = await res.json();

      if (data.output === '__CLEAR__') {
        setHistory([]);
      } else {
        setHistory(prev => [
          ...prev,
          { id: (Date.now() + 1).toString(), type: 'output', content: data.output || 'Done', time }
        ]);
      }
    } catch (err: any) {
      setHistory(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: 'error', content: `bash: erro na execução: ${err.message}`, time }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex + 1 < commandHistory.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  return (
    <div 
      className="h-full flex flex-col bg-[#111111] text-[#ededed] font-mono text-[12px] select-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Top Bar */}
      <div className="h-9 border-b border-white/5 bg-[#181818] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-white/50 text-[11px] font-sans">
          <TerminalIcon size={13} className="text-green-400" />
          <span className="font-semibold text-white/80">bash (Sparkle@sandbox)</span>
          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded">
            Interativo Real
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              executeCommand('curl https://api.github.com/zen');
            }}
            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60 hover:text-white transition-colors"
            title="Testar requisição HTTP real"
          >
            Testar curl API
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              executeCommand('npm test');
            }}
            className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60 hover:text-white transition-colors"
          >
            Executar testes
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setHistory([]);
            }}
            className="p-1 hover:text-white text-white/40"
            title="Limpar terminal"
          >
            <Trash size={12} />
          </button>
        </div>
      </div>

      {/* Output Console Buffer */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {history.map((line) => (
          <div key={line.id} className="leading-relaxed">
            {line.type === 'input' && (
              <div className="flex items-start gap-2 text-white">
                <span className="text-green-400 font-semibold select-none">Sparkle@sandbox:~/project$</span>
                <span className="font-medium text-white/90">{line.content}</span>
              </div>
            )}
            {line.type === 'output' && (
              <TerminalOutput content={line.content} />
            )}
            {line.type === 'system' && (
              <div className="text-blue-400/80 text-[11px] font-sans flex items-center gap-1.5">
                <span>ℹ️</span> {line.content}
              </div>
            )}
            {line.type === 'error' && (
              <div className="text-red-400 text-[11px] pl-4 border-l border-red-500/30">
                {line.content}
              </div>
            )}
          </div>
        ))}

        {/* Live Input Prompt Row */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-green-400 font-semibold select-none shrink-0">Sparkle@sandbox:~/project$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            placeholder={isExecuting ? "Executando comando..." : "digite um comando (ex: curl, ping, status, help)..."}
            className="flex-1 bg-transparent text-white outline-none font-mono text-[12px] placeholder:text-white/20"
            autoFocus
          />
          {isExecuting && (
            <div className="size-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
