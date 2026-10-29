/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatArea } from './components/ChatArea';
import type { WorkspaceSubTab } from './components/Workspace';
import { type SidebarRoute, Sidebar } from './components/Sidebar';
import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { ToolCallTrace } from './types/project';

const Workspace = lazy(async () => {
  const module = await import('./components/Workspace');
  return { default: module.Workspace };
});

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kopilot-theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kopilot-theme', next);
      return next;
    });
  }, []);

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSidebarRoute, setActiveSidebarRoute] = useState<SidebarRoute>('chat');
  const [chatSessionId, setChatSessionId] = useState(0);
  const [workspaceSubTab, setWorkspaceSubTab] = useState<WorkspaceSubTab>('preview');
  const [customFiles, setCustomFiles] = useState<Record<string, string>>({});
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const [workspaceTab, setWorkspaceTab] = useState<'computer' | 'workspace' | 'code_tab' | 'preview_tab' | 'terminal_tab'>('computer');

  // Agent execution state for the Manus computer surface
  const [toolCalls, setToolCalls] = useState<ToolCallTrace[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [workingTime, setWorkingTime] = useState('0s');
  const [statusText, setStatusText] = useState('Aguardando uma tarefa');
  const [contextText, setContextText] = useState(
    'O computador do agente será iniciado quando a tarefa precisar dele.'
  );
  const [agentIntent, setAgentIntent] = useState<any>(null);
  const [browserStatus, setBrowserStatus] = useState<'loading' | 'interactive' | 'error' | 'blocked'>('interactive');
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(null);
  const wasWorkingRef = useRef(false);

  const handleFileUpdate = useCallback((files: Array<{ path: string; code: string; lang?: string }>) => {
    setCustomFiles(prev => {
      const updated = { ...prev };
      for (const f of files) {
        const cleanName = f.path.split('/').pop() || f.path;
        updated[f.path] = f.code;
        updated[cleanName] = f.code;
      }
      return updated;
    });
    if (window.matchMedia('(max-width: 1023px)').matches) return;
    setIsWorkspaceOpen(true);
    setActiveSidebarRoute('preview');
    setWorkspaceTab('workspace');
    setWorkspaceSubTab('preview');
  }, []);

  const handleAgentStateChange = useCallback((state: {
    isWorking: boolean;
    statusText?: string;
    contextText?: string;
    toolCalls?: ToolCallTrace[];
    workingTime?: string;
    intent?: any;
    browserStatus?: 'loading' | 'interactive' | 'error' | 'blocked';
  }) => {
    if (state.isWorking && !wasWorkingRef.current) {
      if (window.matchMedia('(max-width: 1023px)').matches) {
        setActiveSidebarRoute('chat');
      } else {
        setIsWorkspaceOpen(true);
        setWorkspaceTab('computer');
        setActiveSidebarRoute('computer');
      }
      const title = state.contextText?.trim().split('\n')[0];
      if (title) setActiveTaskTitle(title.length > 72 ? `${title.slice(0, 69)}…` : title);
    }
    wasWorkingRef.current = state.isWorking;
    setIsWorking(prev => prev !== state.isWorking ? state.isWorking : prev);
    if (state.intent !== undefined) {
      setAgentIntent(state.intent);
    }
    if (state.browserStatus !== undefined) {
      setBrowserStatus(state.browserStatus);
    }
    if (state.workingTime) {
      setWorkingTime(prev => prev !== state.workingTime ? state.workingTime! : prev);
    }
    if (state.statusText) {
      setStatusText(prev => prev !== state.statusText ? state.statusText! : prev);
    }
    if (state.contextText) {
      setContextText(prev => prev !== state.contextText ? state.contextText! : prev);
    }
    if (state.toolCalls !== undefined) {
      setToolCalls(prev => {
        if (
          prev.length === state.toolCalls!.length &&
          prev.every((t, i) => t === state.toolCalls![i])
        ) {
          return prev;
        }
        return state.toolCalls!;
      });
    }
  }, []);

  const handleClearExternalPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  const handleInspectInComputer = useCallback(() => {
    setIsWorkspaceOpen(true);
    setWorkspaceTab('computer');
    setActiveSidebarRoute('computer');
  }, []);

  const handleCloseWorkspace = useCallback(() => {
    setIsWorkspaceOpen(false);
    setActiveSidebarRoute('chat');
  }, []);

  const handleNewTask = useCallback(() => {
    if (isWorking) return;
    setMobileSidebarOpen(false);
    setPendingPrompt(null);
    setChatSessionId((current) => current + 1);
    setActiveTaskTitle(null);
    setToolCalls([]);
    setIsWorkspaceOpen(false);
    setActiveSidebarRoute('chat');
  }, [isWorking]);

  const handleSidebarNavigate = useCallback((route: SidebarRoute) => {
    setMobileSidebarOpen(false);
    setActiveSidebarRoute(route);
    if (route === 'chat') {
      setIsWorkspaceOpen(false);
      return;
    }
    setIsWorkspaceOpen(true);
    if (route === 'computer') {
      setWorkspaceTab('computer');
      return;
    }
    setWorkspaceTab('workspace');
    setWorkspaceSubTab(route as WorkspaceSubTab);
  }, []);

  const handleOpenMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);

  const handleSendPrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    if (prompt && prompt.trim()) {
      setActiveTaskTitle(prompt.trim());
    }
  }, []);

  const [chatWidth, setChatWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kopilot-chat-width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 900) return parsed;
      }
      return Math.max(380, Math.min(480, Math.round(window.innerWidth * 0.36)));
    }
    return 440;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);

    const onPointerMove = (e: MouseEvent) => {
      const sidebarWidth = window.innerWidth >= 1024 ? 264 : 0;
      const minChat = 320;
      const minWorkspace = 440;
      const maxChat = Math.max(minChat, window.innerWidth - sidebarWidth - minWorkspace);
      const newWidth = Math.min(Math.max(minChat, e.clientX - sidebarWidth), maxChat);
      setChatWidth(newWidth);
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  }, []);

  const resetResizing = useCallback(() => {
    const defaultWidth = Math.max(380, Math.min(480, Math.round(window.innerWidth * 0.36)));
    setChatWidth(defaultWidth);
    localStorage.removeItem('kopilot-chat-width');
  }, []);

  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('kopilot-chat-width', String(chatWidth));
    }
  }, [chatWidth, isResizing]);

  return (
    <div className={`${theme} flex h-screen w-full flex-col lg:flex-row bg-[#1a1a1a] text-text-content-primary overflow-hidden font-sans selection:bg-blue-500/20`}>
      <h1 className="sr-only">Manus AI — espaço de trabalho do agente</h1>
      <Sidebar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isWorking={isWorking}
        activeRoute={activeSidebarRoute}
        activeTaskLabel={activeTaskTitle}
        onNewTask={handleNewTask}
        onNavigate={handleSidebarNavigate}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <main className={`flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row overflow-hidden relative bg-[#1a1a1a] ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
        {/* Left Side: Chat Area */}
        <div 
          style={isWorkspaceOpen && typeof window !== 'undefined' && window.innerWidth >= 1024 ? { width: `${chatWidth}px` } : undefined}
          className={`min-h-0 min-w-0 flex-col ${
            isWorkspaceOpen 
              ? `${activeSidebarRoute === 'chat' ? 'flex w-full lg:flex-none' : 'hidden lg:flex lg:flex-none'} h-full border-r border-border-divider-subtle` 
              : 'flex w-full flex-1 h-full'
          }`}
        >
          <ChatArea
            key={chatSessionId}
            onFileUpdate={handleFileUpdate}
            externalPrompt={pendingPrompt}
            onClearExternalPrompt={handleClearExternalPrompt}
            currentFiles={customFiles}
            onAgentStateChange={handleAgentStateChange}
            onInspectInComputer={handleInspectInComputer}
            onToggleSidebar={handleOpenMobileSidebar}
          />
        </div>

        {/* Desktop Draggable Divider between Chat and Workspace */}
        {isWorkspaceOpen && (
          <div
            onMouseDown={startResizing}
            onDoubleClick={resetResizing}
            title="Arraste para redimensionar ou clique duas vezes para redefinir a largura"
            className="hidden lg:flex w-2 -ml-1 cursor-col-resize items-center justify-center relative z-20 group hover:bg-blue-500/20 transition-colors select-none"
          >
            <div className={`w-0.5 h-10 rounded-full transition-colors ${isResizing ? 'bg-blue-400' : 'bg-white/20 group-hover:bg-blue-400'}`} />
          </div>
        )}

        {/* Right Side: Workspace (Cloud Computer, Code Editor, Preview, Terminal) */}
        {isWorkspaceOpen && (
          <div className={`min-h-0 min-w-0 flex-1 flex flex-col h-full overflow-hidden ${activeSidebarRoute === 'chat' ? 'hidden lg:flex' : 'flex w-full'}`}>
            <Suspense fallback={
              <div role="status" aria-live="polite" className="flex min-w-0 flex-1 h-full w-full flex-col border-l border-white/10 bg-[#1a1a1a]">
                <div className="flex h-10 items-center gap-2 border-b border-white/[0.06] px-4">
                  <span className="h-3 w-28 animate-pulse rounded bg-white/[0.07]" />
                  <span className="h-3 w-24 animate-pulse rounded bg-white/[0.05]" />
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex items-center gap-3 text-sm text-white/45">
                    <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
                    <span>Carregando espaço de trabalho…</span>
                  </div>
                </div>
              </div>
            }>
              <Workspace
                onClose={handleCloseWorkspace}
                customFiles={customFiles}
                onFileUpdate={handleFileUpdate}
                onSendPrompt={handleSendPrompt}
                toolCalls={toolCalls}
                isWorking={isWorking}
                workingTime={workingTime}
                statusText={statusText}
                contextText={contextText}
                agentIntent={agentIntent}
                browserStatus={browserStatus}
                initialTab={workspaceTab}
                initialSubTab={workspaceSubTab}
              />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}
