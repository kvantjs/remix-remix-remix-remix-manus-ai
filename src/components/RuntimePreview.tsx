import { useState, useEffect } from 'react';
import { 
  Monitor, 
  DeviceMobile, 
  Globe, 
  ArrowsCounterClockwise, 
  Terminal, 
  Cube,
  Sparkle,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { DynamicRuntimeRunner } from './DynamicRuntimeRunner';
import { Favicon } from '@/lib/favicon';

interface RuntimePreviewProps {
  activeCode?: string;
  customFiles?: Record<string, string>;
  onSendPrompt?: (prompt: string) => void;
  projectId?: string;
}

export function RuntimePreview({ activeCode, customFiles, onSendPrompt, projectId = 'remix-manus-ai' }: RuntimePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [useDaytona, setUseDaytona] = useState(true);
  const [daytonaUrl, setDaytonaUrl] = useState<string | null>(null);
  const [isDaytonaLoading, setIsDaytonaLoading] = useState(false);
  const [daytonaError, setDaytonaError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Conectado ao Sandbox Daytona SDK (@daytona/sdk)...`,
    `[${new Date().toLocaleTimeString()}] Aguardando criação/execução da aplicação pelo Agente no Daytona`
  ]);

  // Consulta o backend para capturar a URL pública e dinâmica via SDK Daytona sandbox.getPreviewLink() assim que o agente criar/executar o site
  const fetchDaytonaPreviewUrl = async () => {
    setIsDaytonaLoading(true);
    setDaytonaError(null);
    try {
      const res = await fetch(`/api/sandbox/daytona/preview-url?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success && data.previewUrl) {
        setDaytonaUrl(data.previewUrl);
        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Aplicação detectada no Sandbox Daytona. URL pública dinâmica capturada via getPreviewLink(): ${data.previewUrl}`,
          ...prev
        ]);
      } else {
        setDaytonaUrl(null);
        if (data.error && (data.error.includes('suspended') || data.error.includes('credits') || data.error.includes('indisponível'))) {
          setDaytonaError('Organização do Daytona suspensa por término de créditos.');
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ⚠️ Daytona indisponível (Créditos esgotados). Alternando para o Engine React Local de alta velocidade.`,
            ...prev
          ]);
          setUseDaytona(false);
        }
      }
    } catch (err: any) {
      setDaytonaError(err.message || 'Erro ao comunicar com o servidor Daytona.');
      setUseDaytona(false);
    } finally {
      setIsDaytonaLoading(false);
    }
  };

  useEffect(() => {
    fetchDaytonaPreviewUrl();
  }, [projectId, refreshKey]);

  // Keep-alive automático a cada 2 minutos enquanto houver interação do usuário/agente no Daytona
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/sandbox/daytona/keep-alive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      }).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Verificando URL pública via Daytona SDK...`,
      ...prev
    ]);
  };

  const displayUrl = useDaytona && daytonaUrl ? daytonaUrl : (daytonaUrl || 'Aguardando criação do site no Daytona...');

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

          {/* Engine Selector: Daytona Sandbox vs Local React Engine */}
          <div className="flex items-center bg-white/[0.04] border border-white/5 rounded-md p-0.5 text-[10px]">
            <button
              onClick={() => setUseDaytona(true)}
              className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                useDaytona ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30' : 'text-white/40 hover:text-white/70'
              }`}
              title="Executar no Sandbox Isolado Daytona SDK (@daytona/sdk)"
            >
              Daytona Sandbox
            </button>
            <button
              onClick={() => setUseDaytona(false)}
              className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                !useDaytona ? 'bg-white/15 text-white font-semibold' : 'text-white/40 hover:text-white/70'
              }`}
              title="Executar no Engine React Local"
            >
              Client Engine
            </button>
          </div>
        </div>

        {/* Center: Browser Address Bar */}
        <div className="flex-1 max-w-md mx-auto">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-lg px-2.5 py-1 flex items-center gap-2 text-xs text-white/50 focus-within:border-white/20 transition-all">
            <Favicon urlOrDomain={displayUrl} size={12} fallbackIcon={<Globe size={12} className="text-white/30 shrink-0" />} />
            {daytonaUrl || displayUrl.startsWith('http') ? (
              <a
                href={daytonaUrl || displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-blue-300 font-mono text-[11px] truncate flex-1 transition-colors underline-offset-2 hover:underline cursor-pointer flex items-center gap-1"
                title="Clique para abrir a URL pública na web"
              >
                <span className="truncate">{displayUrl}</span>
                <ArrowSquareOut size={11} className="shrink-0 opacity-60" />
              </a>
            ) : (
              <span className="text-white/70 font-mono text-[11px] truncate flex-1">{displayUrl}</span>
            )}
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 flex items-center gap-1 ${
              daytonaUrl ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              <span className={`size-1.5 rounded-full ${daytonaUrl ? 'bg-green-500 animate-pulse' : 'bg-blue-400'}`} />
              {useDaytona ? (daytonaUrl ? 'DAYTONA LIVE' : 'AGUARDANDO AGENTE') : '200 LIVE'}
            </span>
            <button
              onClick={handleRefresh}
              className="text-white/30 hover:text-white transition-colors cursor-pointer"
              title="Sincronizar e consultar URL via Daytona SDK"
            >
              <ArrowsCounterClockwise size={11} />
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2 text-white/40">
          {(daytonaUrl || displayUrl.startsWith('http')) && (
            <a
              href={daytonaUrl || displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-md bg-blue-500/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
              title="Abrir URL pública diretamente em uma nova guia do navegador"
            >
              <ArrowSquareOut size={13} className="shrink-0 text-blue-400" />
              <span className="text-[11px] font-mono font-semibold">Abrir na Web</span>
            </a>
          )}
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              showConsole ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-white/50 hover:text-white'
            }`}
            title="Abrir Console do Runtime Daytona"
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
          className={`transition-all duration-300 bg-transparent border border-white/5 shadow-2xl overflow-hidden flex flex-col ${
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

          {/* RUNTIME VIEWPORT */}
          <div key={`${activeCode}-${refreshKey}`} className="flex-1 overflow-auto w-full h-full relative bg-[#111]">
            {useDaytona ? (
              isDaytonaLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
                  <div className="size-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>Consultando URL pública via Daytona SDK (@daytona/sdk)...</span>
                </div>
              ) : daytonaUrl ? (
                <div className="w-full h-full relative group">
                  <iframe
                    src={daytonaUrl}
                    title="Preview Daytona Sandbox"
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  />
                  <div className="absolute top-3 right-3 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                    <a
                      href={daytonaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#18181b]/90 hover:bg-[#18181b] text-white text-xs font-mono border border-white/20 shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
                      title="Abrir URL pública em nova guia"
                    >
                      <ArrowSquareOut size={13} className="text-blue-400" />
                      <span>Abrir na Web ↗</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-slate-300">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <Sparkle size={28} />
                  </div>
                  <div className="font-semibold text-sm text-white">Aguardando o Agente criar e executar a aplicação no Daytona</div>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Nenhuma URL obtida ainda. Assim que o Agente de IA criar o site e executar os comandos no sandbox Daytona, o SDK capturará a URL pública e atualizará este preview automaticamente.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleRefresh}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-xs font-mono text-blue-300 border border-blue-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowsCounterClockwise size={12} />
                      Consultar Daytona SDK
                    </button>
                    <button
                      onClick={() => setUseDaytona(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors cursor-pointer"
                    >
                      Alternar para Engine React Local
                    </button>
                  </div>
                </div>
              )
            ) : (
              <DynamicRuntimeRunner code={activeCode || ''} customFiles={customFiles} />
            )}
          </div>
        </div>

        {/* Console Drawer (Toggleable) */}
        {showConsole && (
          <div className="absolute bottom-2 left-2 right-2 h-44 bg-[#141414] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden z-20 font-mono text-[11px]">
            <div className="h-7 bg-[#1c1c1c] border-b border-white/5 px-3 flex items-center justify-between text-white/40">
              <span className="font-semibold text-white/70">Console de Runtime & Network Daytona</span>
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
