/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Workspace } from './components/Workspace';
import { useState, useCallback, useEffect } from 'react';
import { ToolCallTrace } from './types/project';

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

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  const [customFiles, setCustomFiles] = useState<Record<string, string>>({});
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const [workspaceTab, setWorkspaceTab] = useState<'computer' | 'workspace' | 'code_tab' | 'preview_tab' | 'terminal_tab'>('workspace');

  // Agent execution state for Computador do Kvant
  const [toolCalls, setToolCalls] = useState<ToolCallTrace[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [workingTime, setWorkingTime] = useState('0s');
  const [statusText, setStatusText] = useState('Computador do Agente 100% Operacional');
  const [contextText, setContextText] = useState(
    'Instância Ubuntu 24.04 x86_64 ativa. Agente autônomo com navegador headless, shell bash e tool calling em tempo real.'
  );
  const [agentIntent, setAgentIntent] = useState<any>(null);
  const [browserStatus, setBrowserStatus] = useState<'loading' | 'interactive' | 'error' | 'blocked'>('interactive');

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
    setIsWorkspaceOpen(true);
    setWorkspaceTab(prev => (prev === 'computer' ? 'workspace' : prev));
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
          prev.every((t, i) => t.id === state.toolCalls![i].id && t.status === state.toolCalls![i].status)
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
  }, []);

  const handleCloseWorkspace = useCallback(() => {
    setIsWorkspaceOpen(false);
  }, []);

  const handleSendPrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
  }, []);

  return (
    <div className={`${theme} flex h-screen w-full bg-[#1a1a1a] text-text-content-primary overflow-hidden font-sans selection:bg-blue-500/20`}>
      <div className="hidden h-full shrink-0 lg:flex">
        <Sidebar theme={theme} toggleTheme={toggleTheme} />
      </div>
      <main className="flex-1 min-w-0 flex overflow-hidden relative bg-[#1a1a1a]">
        <div className={`min-w-0 flex-1 overflow-hidden flex-col ${isWorkspaceOpen ? 'hidden lg:flex' : 'flex'}`}>
        <ChatArea 
          onFileUpdate={handleFileUpdate} 
          externalPrompt={pendingPrompt}
          onClearExternalPrompt={handleClearExternalPrompt}
          currentFiles={customFiles}
          onAgentStateChange={handleAgentStateChange}
          onInspectInComputer={handleInspectInComputer}
        />
        </div>
        {isWorkspaceOpen && (
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
          />
        )}
      </main>
    </div>
  );
}
