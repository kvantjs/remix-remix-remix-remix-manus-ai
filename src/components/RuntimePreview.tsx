import { useMemo, useState } from 'react';
import {
  Monitor,
  DeviceMobile,
  ArrowsClockwise,
  Terminal,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
  Sparkle
} from '@phosphor-icons/react';
import { DynamicRuntimeRunner } from './DynamicRuntimeRunner';

interface RuntimePreviewProps {
  activeCode?: string;
  customFiles?: Record<string, string>;
  onSendPrompt?: (prompt: string) => void;
}

/**
 * Preview local compatível com a convenção React + Vite.
 * O manifesto é lido do workspace e os arquivos CSS são carregados pelo runner
 * dentro de um root isolado, sem dependência de serviço externo ou seletor de engine.
 */
export function RuntimePreview({ activeCode, customFiles = {}, onSendPrompt }: RuntimePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Vite React Runtime inicializado`,
    `[${new Date().toLocaleTimeString()}] HMR local aguardando alterações no workspace`
  ]);

  const fileCount = Object.keys(customFiles).length;
  const hasViteManifest = Boolean(customFiles['client/package.json'] || customFiles['package.json']);
  const hasEntry = Boolean(customFiles['client/src/main.tsx'] || customFiles['src/main.tsx']);
  const hasStyles = Object.keys(customFiles).some(path => path.endsWith('.css'));
  const hasApp = Boolean(activeCode || customFiles['client/src/App.tsx'] || customFiles['App.tsx']);
  const runtimeCode = activeCode || customFiles['client/src/App.tsx'] || customFiles['App.tsx'] || '';
  const runtimeStatus = useMemo(() => {
    if (!hasApp) return { label: 'AGUARDANDO CÓDIGO', tone: 'text-amber-300', icon: <WarningCircle size={12} /> };
    if (hasViteManifest && hasEntry && hasStyles) return { label: 'VITE LIVE', tone: 'text-emerald-300', icon: <CheckCircle size={12} /> };
    return { label: 'VITE DEV', tone: 'text-cyan-300', icon: <Sparkle size={12} /> };
  }, [hasApp, hasEntry, hasStyles, hasViteManifest]);

  const handleRefresh = () => {
    setRefreshKey(value => value + 1);
    setLogs(previous => [
      `[${new Date().toLocaleTimeString()}] HMR: preview React + Vite recompilado`,
      ...previous
    ].slice(0, 40));
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] select-none">
      <div className="h-11 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-3 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-white/20" />
            <div className="size-2.5 rounded-full bg-white/20" />
            <div className="size-2.5 rounded-full bg-white/20" />
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center bg-white/[0.04] border border-white/5 rounded-md p-0.5">
            <button onClick={() => setDevice('desktop')} className={`p-1 rounded transition-colors cursor-pointer ${device === 'desktop' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`} title="Visualização Desktop">
              <Monitor size={13} />
            </button>
            <button onClick={() => setDevice('mobile')} className={`p-1 rounded transition-colors cursor-pointer ${device === 'mobile' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`} title="Visualização Mobile">
              <DeviceMobile size={13} />
            </button>
          </div>
          <span className="text-[10px] font-mono text-white/45">React + Vite</span>
        </div>

        <div className="flex-1 max-w-md mx-auto">
          <div className="bg-[#202020] border border-white/5 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs text-white/50">
            <span className="text-cyan-300 font-mono text-[11px]">vite://localhost:5173</span>
            <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${runtimeStatus.tone} bg-white/[0.04]`}>
              {runtimeStatus.icon}{runtimeStatus.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/40">
          {hasApp && (
            <button onClick={() => onSendPrompt?.('Valide o projeto React + Vite completo, corrija qualquer erro de compilação e mantenha todos os arquivos existentes.')} className="p-1.5 rounded-md hover:bg-white/5 hover:text-white transition-colors cursor-pointer" title="Solicitar validação do projeto">
              <ArrowSquareOut size={13} />
            </button>
          )}
          <button onClick={handleRefresh} className="p-1.5 rounded-md hover:bg-white/5 hover:text-white transition-colors cursor-pointer" title="Recompilar preview Vite">
            <ArrowsClockwise size={13} />
          </button>
          <button onClick={() => setShowConsole(value => !value)} className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${showConsole ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/5 hover:text-white'}`} title="Abrir console do runtime">
            <Terminal size={13} />
            <span className="text-[11px]">Console</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-2 bg-[#171717]">
        <div className={`transition-all duration-300 bg-transparent border border-white/5 shadow-2xl overflow-hidden flex flex-col ${device === 'desktop' ? 'w-full h-full rounded-xl' : 'w-[375px] h-[667px] my-auto rounded-[36px] ring-8 ring-[#222] border-4 border-[#333]'}`}>
          {device === 'mobile' && <div className="h-6 bg-[#161616] px-6 pt-1 flex items-center justify-between text-[10px] text-white/50 border-b border-white/5 shrink-0"><span>9:41</span><div className="w-16 h-3 bg-[#0a0a0a] rounded-full mx-auto" /><span>5G</span></div>}
          <div key={`${refreshKey}-${runtimeCode}`} className="flex-1 overflow-auto w-full h-full relative bg-transparent">
            {hasApp ? (
              <DynamicRuntimeRunner key={refreshKey} code={runtimeCode} customFiles={customFiles} />
            ) : (
              <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center gap-3 p-8 text-center text-white/60">
                <Sparkle size={30} className="text-cyan-300" />
                <strong className="text-sm text-white">O projeto Vite aparecerá aqui</strong>
                <p className="max-w-sm text-xs leading-relaxed">Crie uma aplicação no chat ou abra um projeto com client/src/App.tsx, client/src/main.tsx e client/src/index.css.</p>
              </div>
            )}
          </div>
        </div>

        {showConsole && (
          <div className="absolute bottom-2 left-2 right-2 h-44 bg-[#141414] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden z-20 font-mono text-[11px]">
            <div className="h-7 bg-[#1c1c1c] border-b border-white/5 px-3 flex items-center justify-between text-white/40">
              <span className="font-semibold text-white/70">Vite Dev Server · Console</span>
              <button onClick={() => setShowConsole(false)} className="hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-1 text-white/55">
              {logs.map((log, index) => <div key={`${log}-${index}`}><span className="text-emerald-400 mr-2">›</span>{log}</div>)}
              <div><span className="text-cyan-400 mr-2">›</span>{fileCount} arquivos sincronizados · {hasStyles ? 'CSS carregado' : 'aguardando CSS'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="h-7 bg-[#1a1a1a] border-t border-white/5 px-3 flex items-center justify-between text-[10px] font-mono shrink-0">
        <span className="text-white/45">{fileCount || 0} arquivos no workspace · {hasViteManifest ? 'manifesto detectado' : 'manifesto pendente'}</span>
        <span className={runtimeStatus.tone}>{runtimeStatus.label}</span>
      </div>
    </div>
  );
}
