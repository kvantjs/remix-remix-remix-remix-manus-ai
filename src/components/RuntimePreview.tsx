import { useState } from 'react';
import { 
  Monitor, 
  DeviceMobile, 
  Globe, 
  ArrowsCounterClockwise, 
  Terminal, 
  Cube, 
  Code
} from '@phosphor-icons/react';
import { DynamicRuntimeRunner } from './DynamicRuntimeRunner';

interface RuntimePreviewProps {
  activeCode?: string;
  onSendPrompt?: (prompt: string) => void;
}

export function RuntimePreview({ activeCode, onSendPrompt }: RuntimePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [inputUrl] = useState('http://localhost:3000/');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Vite Dev Server v6.1.1 pronto na porta 3000 (HMR Ativo)`,
    `[${new Date().toLocaleTimeString()}] Dynamic React Engine: Renderizando aplicação interativa em tempo real`
  ]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLogs(prev => [
      `[${new Date().toLocaleTimeString()}] HMR: Recompilando componente no runtime com Babel...`,
      ...prev
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-[#141414] select-none">
      {/* Top Browser Address & Controls Toolbar */}
      <div className="h-11 bg-[#1c1c1c] border-b border-white/5 flex items-center justify-between px-3 gap-3 shrink-0">
        {/* Left: Window Controls + Viewport switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-white/20" />
            <div className="size-2.5 rounded-full bg-white/20" />
            <div className="size-2.5 rounded-full bg-white/20" />
          </div>

          <div className="h-3 w-px bg-white/10" />

          {/* Desktop vs Mobile Toggle */}
          <div className="flex items-center bg-white/[0.04] border border-white/5 rounded-md p-0.5">
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                device === 'desktop' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
              title="Visualização Desktop"
            >
              <Monitor size={13} />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                device === 'mobile' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
              title="Visualização Mobile"
            >
              <DeviceMobile size={13} />
            </button>
          </div>
        </div>

        {/* Center: Browser Address Bar */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs text-white/50 focus-within:border-white/20 transition-all">
            <Globe size={12} className="text-white/30 shrink-0" />
            <span className="text-white/70 font-mono text-[11px] truncate flex-1">{inputUrl}</span>
            <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.2 rounded font-mono shrink-0 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
              200 LIVE
            </span>
            <button
              onClick={handleRefresh}
              className="text-white/30 hover:text-white transition-colors cursor-pointer"
              title="Recarregar aplicação"
            >
              <ArrowsCounterClockwise size={11} />
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2 text-white/40">
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              showConsole ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-white/50 hover:text-white'
            }`}
            title="Abrir Console do Runtime"
          >
            <Terminal size={13} />
            <span className="text-[11px]">Console</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-2 bg-[#171717]">
        {/* Device Frame */}
        <div
          className={`transition-all duration-300 bg-[#121212] border border-white/5 shadow-2xl overflow-hidden flex flex-col ${
            device === 'desktop'
              ? 'w-full h-full rounded-xl'
              : 'w-[375px] h-[667px] my-auto rounded-[36px] ring-8 ring-[#222222] border-4 border-[#333]'
          }`}
        >
          {/* Mobile Notch Bar */}
          {device === 'mobile' && (
            <div className="h-6 bg-[#161616] px-6 pt-1 flex items-center justify-between text-[10px] text-white/50 border-b border-white/5 shrink-0">
              <span>9:41</span>
              <div className="w-16 h-3 bg-[#0a0a0a] rounded-full mx-auto" />
              <div className="flex items-center gap-1">
                <span>5G</span>
                <div className="w-4 h-2 border border-white/40 rounded-xs p-0.5">
                  <div className="h-full w-full bg-white/70 rounded-xs" />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC REACT RUNTIME CANVAS */}
          <div key={refreshKey} className="flex-1 overflow-auto bg-[#121212] text-white">
            {activeCode ? (
              <DynamicRuntimeRunner code={activeCode} />
            ) : (
              <EmptyRuntimeState onSendPrompt={onSendPrompt} />
            )}
          </div>
        </div>

        {/* Console Drawer (Toggleable) */}
        {showConsole && (
          <div className="absolute bottom-2 left-2 right-2 h-44 bg-[#141414] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden z-20 font-mono text-[11px]">
            <div className="h-7 bg-[#1c1c1c] border-b border-white/5 px-3 flex items-center justify-between text-white/40">
              <span className="font-semibold text-white/70">Console de Runtime & Network</span>
              <button
                onClick={() => setShowConsole(false)}
                className="hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-1 text-white/70 custom-scrollbar">
              {logs.map((l, i) => (
                <div key={i} className="leading-relaxed">
                  {l}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyRuntimeState({ onSendPrompt }: { onSendPrompt?: (p: string) => void }) {
  const suggestions = [
    "Crie uma aplicação SaaS de analytics com gráficos interativos e filtros",
    "Crie um aplicativo de finanças com carteira de investimentos e transferências Pix",
    "Crie uma loja de e-commerce moderna com carrinho dinâmico e checkout",
    "Crie um estúdio criativo editorial com portfólio e calculadora de orçamento"
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-5">
      <div className="size-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-lg">
        <Cube size={28} className="animate-pulse" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h2 className="text-base font-bold text-white tracking-tight">Preview de Runtime Ativo</h2>
        <p className="text-xs text-white/50 leading-relaxed">
          O agente construirá o design e a aplicação do zero a partir do seu comando no chat.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2 pt-2 text-left">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block">
          Sugestões para o agente:
        </span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => onSendPrompt && onSendPrompt(s)}
            className="w-full p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-xs text-white/70 hover:text-white flex items-center justify-between group cursor-pointer"
          >
            <span className="truncate">{s}</span>
            <Code size={12} className="text-white/20 group-hover:text-blue-400 shrink-0 ml-2" />
          </button>
        ))}
      </div>
    </div>
  );
}
