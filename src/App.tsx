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
      <main className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row overflow-hidden relative bg-[#1a1a1a]">
        <div className={`min-h-0 min-w-0 flex-col ${isWorkspaceOpen && activeSidebarRoute !== 'chat' ? 'hidden lg:flex lg:w-[44%] lg:flex-none' : 'flex w-full flex-1 lg:w-auto'}`}>
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
        {isWorkspaceOpen && (
          <div className={`min-h-0 min-w-0 flex-col ${activeSidebarRoute === 'chat' ? 'hidden lg:flex' : 'flex w-full flex-1 lg:w-auto'}`}>
            <Suspense fallback={
              <div role="status" aria-live="polite" className="flex min-w-0 flex-1 flex-col border-l border-white/10 bg-[#1a1a1a]">
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
