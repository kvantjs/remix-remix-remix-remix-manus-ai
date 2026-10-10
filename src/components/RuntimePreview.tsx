import React, { lazy, Suspense, useMemo, useState } from 'react';
import {
  Monitor,
  DeviceMobile,
  ArrowsClockwise,
  Terminal,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
  Sparkle,
  NavigationArrow,
  PencilSimpleLine
} from '@phosphor-icons/react';

const DynamicRuntimeRunner = lazy(async () => {
  const module = await import('./DynamicRuntimeRunner');
  return { default: module.DynamicRuntimeRunner };
});

interface RuntimePreviewProps {
  activeCode?: string;
  customFiles?: Record<string, string>;
  onSendPrompt?: (prompt: string) => void;
  isWorking?: boolean;
}

/**
 * Preview local compatível com a convenção React + Vite.
 * O manifesto é lido do workspace e os arquivos CSS são carregados pelo runner
 * dentro de um root isolado, sem dependência de serviço externo ou seletor de engine.
 */
export function RuntimePreview({ activeCode, customFiles = {}, onSendPrompt, isWorking }: RuntimePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Preview inicializado`,
    `[${new Date().toLocaleTimeString()}] HMR local aguardando alterações no workspace`
  ]);

  const fileCount = Object.keys(customFiles).length;
  const hasViteManifest = Boolean(customFiles['client/package.json'] || customFiles['package.json']);
  const hasEntry = Boolean(customFiles['client/src/main.tsx'] || customFiles['src/main.tsx']);
  const hasStyles = Object.keys(customFiles).some(path => path.endsWith('.css'));
  const hasApp = Boolean(activeCode || customFiles['client/src/App.tsx'] || customFiles['App.tsx']);
  const runtimeCode = activeCode || customFiles['client/src/App.tsx'] || customFiles['App.tsx'] || '';
  const runtimeStatus = useMemo(() => {
    if (!hasApp) return { label: '', tone: 'text-amber-300', icon: <WarningCircle size={12} /> };
    if (hasViteManifest && hasEntry && hasStyles) return { label: 'VITE LIVE', tone: 'text-emerald-300', icon: <CheckCircle size={12} /> };
    return { label: 'VITE DEV', tone: 'text-cyan-300', icon: <Sparkle size={12} /> };
  }, [hasApp, hasEntry, hasStyles, hasViteManifest]);

  const handleRefresh = () => {
    setRefreshKey(value => value + 1);
    setLogs(previous => [
      `[${new Date().toLocaleTimeString()}] HMR: preview recompilado`,
      ...previous
    ].slice(0, 40));
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] select-none">
      <div className="h-11 bg-[#1a1a1a] border-b border-white/5 flex items-center justify-between px-3 gap-3 shrink-0">
        <div className="flex items-center gap-3">


          <div className="flex items-center bg-[#1a1a1a] border border-white/5 rounded-md p-0.5">
            <button onClick={() => setDevice('desktop')} className={`p-1 rounded transition-colors cursor-pointer ${device === 'desktop' ? 'bg-[#323232] text-white' : 'text-white/40 hover:text-white/70'}`} title="Visualização Desktop">
              <Monitor size={13} />
            </button>
            <button onClick={() => setDevice('mobile')} className={`p-1 rounded transition-colors cursor-pointer ${device === 'mobile' ? 'bg-[#323232] text-white' : 'text-white/40 hover:text-white/70'}`} title="Visualização Mobile">
              <DeviceMobile size={13} />
            </button>
          </div>

        </div>

        <div className="flex-1 max-w-md mx-auto">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs text-white/50">
            <div className="flex items-center gap-1.5 text-white/40">
              <NavigationArrow size={12} />
              <PencilSimpleLine size={12} />
            </div>
            <span style={{ color: '#707070' }} className="font-mono text-[11px]">/</span>
            <ArrowSquareOut size={14} className="ml-auto text-white/30" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/40">
          {hasApp && (
            <button onClick={() => onSendPrompt?.('Valide o projeto completo, corrija qualquer erro de compilação e mantenha todos os arquivos existentes.')} className="p-1.5 rounded-md hover:bg-white/5 hover:text-white transition-colors cursor-pointer" title="Solicitar validação do projeto">
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

      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-2 bg-[#1a1a1a]">
        <div className={`transition-all duration-300 bg-transparent border border-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col ${device === 'desktop' ? 'w-full h-full rounded-xl' : 'w-[375px] h-[667px] my-auto rounded-[36px] ring-8 ring-[#222] border-4 border-[#333]'}`}>
          {device === 'mobile' && <div className="h-6 bg-[#161616] px-6 pt-1 flex items-center justify-between text-[10px] text-white/50 border-b border-white/5 shrink-0"><span>9:41</span><div className="w-16 h-3 bg-[#0a0a0a] rounded-full mx-auto" /><span>5G</span></div>}
          <div key={`${refreshKey}-${runtimeCode}`} className="flex-1 overflow-auto w-full h-full relative bg-transparent">
            {isWorking ? (
              <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                <div className="sp-vortex-loader" />
              </div>
            ) : hasApp ? (
              <Suspense fallback={<div role="status" className="flex h-full min-h-48 items-center justify-center bg-[#1a1a1a] text-xs text-white/45">Carregando prévia executável…</div>}>
                <DynamicRuntimeRunner key={refreshKey} code={runtimeCode} customFiles={customFiles} />
              </Suspense>
            ) : (
              <div 
                className="w-full h-full min-h-[260px] flex flex-col items-center justify-center gap-6 p-8 text-center"
                style={{ 
                  backgroundImage: 'url(/manus-assets/preview-background.png)',
                  backgroundSize: '110%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/5 flex flex-col items-center gap-6 shadow-sm max-w-sm w-full">
                  <img src="/manus-assets/preview-empty.png" alt="Espaço de trabalho vazio" className="w-36 h-36 rounded-2xl object-cover" />
                  <div className="space-y-2">
                    <span style={{ color: '#707070' }} className="text-lg font-bold">Espaço em branco</span>
                    <p style={{ color: '#6f6f6f' }} className="text-xs leading-relaxed">O runtime está esperando. Peça ao agente para criar uma nova aplicação.</p>
                  </div>
                  <button 
                    onClick={() => onSendPrompt?.('Crie um site fintech elegante e dinâmico')}
                    style={{ backgroundColor: '#272727', color: '#d3d3d3', borderRadius: '12px' }}
                    className="px-5 py-2.5 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                  >
                    Pedir para criar algo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showConsole && (
          <div className="absolute bottom-2 left-2 right-2 h-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden z-20 font-mono text-[11px]">
            <div className="h-7 bg-[#1a1a1a] border-b border-white/5 px-3 flex items-center justify-between text-white/40">
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
