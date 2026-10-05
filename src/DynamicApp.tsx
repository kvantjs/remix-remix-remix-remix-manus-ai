import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MagnifyingGlass as Search, 
  Pause, 
  Play, 
  HardDrives as Server, 
  Trash as Trash2, 
  SlidersHorizontal, 
  Warning as AlertTriangle, 
  Info, 
  X,
  Sparkle as Sparkles,
  Terminal,
  Pulse as Activity,
  Download,
  Funnel as Filter,
  Check,
  CaretDown as ChevronDown
} from '@phosphor-icons/react';

type Severity = 'debug' | 'info' | 'warn' | 'error';

interface LogLine {
  id: string;
  timestamp: string;
  severity: Severity;
  service: string;
  message: string;
}

const SERVICES = [
  'gateway-api',
  'auth-service',
  'payment-service',
  'database-broker',
  'worker-pool'
];

const LOG_MESSAGES: Record<Severity, string[]> = {
  debug: [
    'Cache hit ratio: 94.2% for user_sessions',
    'Connection pool pool-3 size expanded to 15',
    'Query parsed successfully in 2.4ms',
    'Parsing bearer token authorization header',
    'TCP keep-alive handshake completed with 10.0.4.12',
    'GC cycle finished: reclaimed 142MB in 8.1ms',
    'Deserializing response payload (342 bytes)',
    'Loaded system variables config from environment broker'
  ],
  info: [
    'User session token validated successfully',
    'GET /api/v1/telemetry/live - 200 OK (14ms)',
    'Payment webhook processed for invoice_#4912',
    'Starting worker-node replica-42',
    'Syncing local index with core cluster repository',
    'User cobtinuacao@gmail.com logged in successfully',
    'Database migration patch 2.4.0-lite applied successfully',
    'Broker routed event "user.signup" to 3 active consumers'
  ],
  warn: [
    'API gateway throttle limit at 85% capacity',
    'Slow database query detected: SELECT * FROM audit_logs... (452ms)',
    'Redis storage usage exceeding warning threshold (78%)',
    'JWT expiration close for session user_9931',
    'Worker cluster auto-scale triggered: adding 2 nodes',
    'DNS resolution retry warning for backup-host-01',
    'High CPU usage warning on cluster node-us-east-1 (82.1%)'
  ],
  error: [
    'Payment gateway transaction failed: TIMEOUT_ERR_504',
    'Database broker connection lost: connection refused at 5432',
    'Failed to renew SSL certificate: ACME directory unreachable',
    'User auth failed: Invalid decryption hash in auth-handshake',
    'Out of memory crash in worker thread pool-3-worker-2',
    'Fatal read exception from file storage disk-B-unallocated',
    'Failed to post user.signup action: downstream consumer offline'
  ]
};

const SERVICE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'gateway-api': { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  'auth-service': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  'payment-service': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  'database-broker': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  'worker-pool': { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' }
};

const SEVERITY_STYLES: Record<Severity, { text: string; bg: string; border: string; label: string }> = {
  debug: { text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-500/20', label: 'DEBUG' },
  info: { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/20', label: 'INFO' },
  warn: { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-500/20', label: 'WARN' },
  error: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'ERROR' }
};

// Seed initial log history
const generateInitialLogs = (): LogLine[] => {
  const initial: LogLine[] = [];
  const startSec = Math.floor(Date.now() / 1000) - 25;
  
  for (let i = 0; i < 25; i++) {
    const time = new Date((startSec + i) * 1000);
    const tsStr = time.toTimeString().split(' ')[0];
    const severities: Severity[] = ['info', 'info', 'debug', 'info', 'warn', 'debug', 'info', 'error'];
    const sev = severities[Math.floor(Math.random() * severities.length)];
    const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const msgs = LOG_MESSAGES[sev];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    initial.push({
      id: `log-${startSec + i}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: tsStr,
      severity: sev,
      service: svc,
      message: msg
    });
  }
  return initial;
};

export default function DynamicApp() {
  const [logs, setLogs] = useState<LogLine[]>(generateInitialLogs);
  const [isLive, setIsLive] = useState(true);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Severity toggles
  const [activeSeverities, setActiveSeverities] = useState<Record<Severity, boolean>>({
    debug: true,
    info: true,
    warn: true,
    error: true
  });

  const consoleBodyRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);

  // Auto-generate random logs every second when live
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setLogs(prev => {
        const time = new Date();
        const tsStr = time.toTimeString().split(' ')[0];
        
        // Probability weighted severities: 50% info, 25% debug, 15% warn, 10% error
        const rand = Math.random();
        let sev: Severity = 'info';
        if (rand < 0.25) sev = 'debug';
        else if (rand < 0.75) sev = 'info';
        else if (rand < 0.90) sev = 'warn';
        else sev = 'error';

        const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)];
        const msgs = LOG_MESSAGES[sev];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];

        const newLog: LogLine = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: tsStr,
          severity: sev,
          service: svc,
          message: msg
        };

        const updated = [...prev, newLog];
        // Cap the buffer at exactly eighty lines
        if (updated.length > 80) {
          return updated.slice(updated.length - 80);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Keep track of scroll positions to enable/disable auto-scroll
  const handleScroll = () => {
    if (!consoleBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = consoleBodyRef.current;
    
    // If user is within 30px of the bottom, enable auto-scroll, otherwise disable it
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    isAutoScrollEnabled.current = isAtBottom;
  };

  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScrollEnabled.current && consoleBodyRef.current) {
      consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle Pause / Live Toggle
  const toggleLiveState = () => {
    setIsLive(prev => !prev);
  };

  // Toggle single severity filter
  const toggleSeverity = (sev: Severity) => {
    setActiveSeverities(prev => ({
      ...prev,
      [sev]: !prev[sev]
    }));
  };

  // Count occurrences of each severity in current log state
  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    logs.forEach(log => {
      counts[log.severity]++;
    });
    return counts;
  }, [logs]);

  // Filter logs based on service, search query, and severity toggles
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Service Filter
      if (selectedService !== 'all' && log.service !== selectedService) return false;
      
      // 2. Severity Filter
      if (!activeSeverities[log.severity]) return false;
      
      // 3. Search text query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(query);
        const matchesSvc = log.service.toLowerCase().includes(query);
        const matchesSev = log.severity.toLowerCase().includes(query);
        const matchesTs = log.timestamp.includes(query);
        if (!matchesMsg && !matchesSvc && !matchesSev && !matchesTs) return false;
      }

      return true;
    });
  }, [logs, selectedService, searchQuery, activeSeverities]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6 flex flex-col h-full bg-[#0d0e12] text-white">
      {/* Header Widget Description */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
            <Terminal size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Kvant Cloud Log Streamer</h1>
            <p className="text-[11px] text-white/40">Visualização unificada e monitoramento de microsserviços em tempo real.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Limpar Buffer de Logs"
          >
            <Trash2 size={13} />
            Limpar
          </button>
        </div>
      </div>

      {/* Main Panel Box with Toolbar, Body, and Status Footer */}
      <div className="bg-[#12131a] border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* TOOLBAR */}
        <div className="p-4 bg-[#161722] border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Service Select dropdown */}
            <div className="relative">
              <select 
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="appearance-none bg-[#1d1f2d] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium"
              >
                <option value="all">Todos os Serviços</option>
                {SERVICES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                <ChevronDown size={12} />
              </div>
            </div>

            {/* Search Field with Magnifier Glyph */}
            <div className="relative w-48 md:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="text"
                placeholder="Filtrar logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1d1f2d] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Severity Toggle Chips & Control Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#1d1f2d] p-1 rounded-lg border border-white/5">
              {(['debug', 'info', 'warn', 'error'] as Severity[]).map(sev => {
                const active = activeSeverities[sev];
                const styles = SEVERITY_STYLES[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => toggleSeverity(sev)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                      active 
                        ? `${styles.bg} ${styles.text} ring-1 ring-white/10` 
                        : 'bg-transparent text-white/30 hover:text-white/50'
                    }`}
                  >
                    <span>{sev}</span>
                    <span className={`px-1 rounded-sm text-[9px] font-mono ${active ? 'bg-white/10' : 'bg-white/[0.02]'}`}>
                      {severityCounts[sev]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-white/10 hidden md:block" />

            {/* Live Indicator Dot & Pause Button */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                isLive 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}>
                <span className="relative flex h-2 w-2">
                  {isLive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-white/30'}`}></span>
                </span>
                <span>{isLive ? 'LIVE' : 'PAUSADO'}</span>
              </div>

              <button
                onClick={toggleLiveState}
                className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  isLive 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                    : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30'
                }`}
                title={isLive ? 'Pausar fluxo de logs' : 'Retomar fluxo de logs'}
              >
                {isLive ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* LOG LINES TERMINAL PANEL */}
        <div 
          ref={consoleBodyRef}
          onScroll={handleScroll}
          className="h-[420px] bg-[#0c0d12] overflow-y-auto custom-scrollbar p-4 flex flex-col gap-1 select-text scroll-smooth"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/30 space-y-2">
              <Activity size={28} className="animate-pulse" />
              <p className="text-xs font-mono">Nenhum log encontrado para os filtros selecionados.</p>
              <button 
                onClick={() => {
                  setSelectedService('all');
                  setSearchQuery('');
                  setActiveSeverities({ debug: true, info: true, warn: true, error: true });
                }}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const colorInfo = SERVICE_COLORS[log.service] || { bg: 'bg-white/5', text: 'text-white/60', dot: 'bg-white/30' };
              const sevStyle = SEVERITY_STYLES[log.severity];
              const isError = log.severity === 'error';

              return (
                <div 
                  key={log.id} 
                  className={`flex flex-col md:flex-row md:items-start gap-2.5 py-1.5 px-3 rounded-md font-mono text-[11px] transition-all hover:bg-white/[0.02] ${
                    isError 
                      ? 'bg-rose-500/[0.04] border-l-2 border-rose-500/40' 
                      : 'border-l-2 border-transparent'
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-white/30 shrink-0 select-none md:w-16">
                    {log.timestamp}
                  </span>

                  {/* Severity Badge */}
                  <div className="md:w-16 shrink-0 select-none">
                    <span className={`inline-block w-14 text-center text-[9px] font-extrabold tracking-wider uppercase py-0.5 rounded-sm ${sevStyle.bg} ${sevStyle.text} border ${sevStyle.border}`}>
                      {sevStyle.label}
                    </span>
                  </div>

                  {/* Service Name */}
                  <div className="shrink-0 md:w-32 flex items-center gap-1.5 select-none">
                    <span className={`size-1.5 rounded-full ${colorInfo.dot}`} />
                    <span className={`text-[10px] font-bold ${colorInfo.text} truncate`}>
                      {log.service}
                    </span>
                  </div>

                  {/* Log Message */}
                  <span className={`flex-1 break-all ${isError ? 'text-rose-200' : 'text-white/80'}`}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* STATUS FOOTER BAR */}
        <div className="h-10 px-4 bg-[#161722] border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white/60">Filtro ativo:</span>
            <span>Exibindo {filteredLogs.length} de {logs.length} logs carregados</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Janela de Retenção: Máximo de 80 logs</span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/5 text-white/50">Auto-Scroll Ativo</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics / Extra Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#12131a] border border-white/5 rounded-xl p-4 space-y-1.5">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Performance</span>
          <div className="text-xl font-bold text-emerald-400">99.98% uptime</div>
          <p className="text-[10px] text-white/50">Clusters distribuídos operando em conformidade com SLAs de auditoria.</p>
        </div>
        <div className="bg-[#12131a] border border-white/5 rounded-xl p-4 space-y-1.5">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Buffer</span>
          <div className="text-xl font-bold text-indigo-400">{logs.length} / 80 slots</div>
          <p className="text-[10px] text-white/50">Buffer circular configurado. Logs excedentes sofrem rotação.</p>
        </div>
        <div className="bg-[#12131a] border border-white/5 rounded-xl p-4 space-y-1.5">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Engine</span>
          <div className="text-xl font-bold text-purple-400">HMR Live Active</div>
          <p className="text-[10px] text-white/50">Motor reativo compilado via Babel-Standalone instantaneamente.</p>
        </div>
      </div>
    </div>
  );
}
