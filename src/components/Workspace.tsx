import { 
  X, 
  ArrowsOut, 
  CaretRight, 
  Globe, 
  Code, 
  Gear, 
  Terminal,
  Desktop,
  Plus,
  ArrowSquareOut,
  CaretDown,
  ArrowsCounterClockwise,
  Lock, 
  Bell, 
  GithubLogo, 
  Calendar, 
  FileCode, 
  Folder, 
  PencilSimple, 
  Download, 
  Clock, 
  DotsThree, 
  ArrowUp, 
  PuzzlePiece, 
  MagnifyingGlass, 
  Browser,
  Trash,
  Check,
  FloppyDisk,
  FilePlus,
  FolderPlus,
  Sparkle,
  LinuxLogo
} from '@phosphor-icons/react';
import React, { useState, useEffect, useMemo } from 'react';
import { RuntimePreview } from './RuntimePreview';
import { TerminalView } from './TerminalView';
import { detectLanguage } from './SyntaxCodeView';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { KvantComputer } from './KvantComputer';
import { ToolCallTrace } from '../types/project';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "cn";
import { motion, AnimatePresence } from "motion/react";

export type TopLevelTab = 'computer' | 'workspace' | 'code_tab' | 'preview_tab' | 'terminal_tab';
export type WorkspaceSubTab = 'preview' | 'code' | 'terminal' | 'projects' | 'automations' | 'settings';

interface WorkspaceProps {
  onClose: () => void;
  customFiles?: Record<string, string>;
  onFileUpdate?: (files: Array<{ path: string; code: string; lang?: string }>) => void;
  onSendPrompt?: (prompt: string) => void;
  toolCalls?: ToolCallTrace[];
  isWorking?: boolean;
  workingTime?: string;
  statusText?: string;
  contextText?: string;
  initialTab?: string;
  agentIntent?: any;
  browserStatus?: 'loading' | 'interactive' | 'error' | 'blocked';
}

interface TabItem {
  id: TopLevelTab;
  label: string;
  closable: boolean;
}

export function Workspace({ 
  onClose, 
  customFiles = {}, 
  onFileUpdate,
  onSendPrompt,
  toolCalls,
  isWorking = false,
  workingTime,
  statusText,
  contextText,
  initialTab,
  agentIntent,
  browserStatus
}: WorkspaceProps) {
  // Top Level Application Tabs
  const [openTabs, setOpenTabs] = useState<TabItem[]>([
    { id: 'workspace', label: 'Espaço de Trabalho', closable: false },
    { id: 'computer', label: 'Computador do Agente', closable: true },
    { id: 'code_tab', label: 'Editor de Código', closable: true }
  ]);
  const [activeTopTab, setActiveTopTab] = useState<TopLevelTab>((initialTab as TopLevelTab) || 'workspace');
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (initialTab && ['computer', 'workspace', 'code_tab', 'preview_tab', 'terminal_tab'].includes(initialTab)) {
      setActiveTopTab(initialTab as TopLevelTab);
    }
  }, [initialTab]);
  useEffect(() => {
    if (isWorking) setActiveTopTab('computer');
  }, [isWorking]);

  // Sub-tabs for the Workspace (Preview, Código, Terminal, Projetos, Execuções, Configurações)
  const [workspaceSubTab, setWorkspaceSubTab] = useState<WorkspaceSubTab>('preview');
  const [activeFile, setActiveFile] = useState('client/src/App.tsx');

  // Resolve active code content for editor
  const activeCodeContent = useMemo(() => {
    if (customFiles[activeFile]) return customFiles[activeFile];
    if (customFiles['client/src/App.tsx']) return customFiles['client/src/App.tsx'];
    if (customFiles['App.tsx']) return customFiles['App.tsx'];
    const keys = Object.keys(customFiles);
    if (keys.length > 0) return customFiles[keys[0]];
    return DEFAULT_INITIAL_APP_CODE;
  }, [customFiles, activeFile]);

  // Resolve code content for runtime preview (always App component code)
  const runtimeAppCode = useMemo(() => {
    return customFiles['client/src/App.tsx'] || customFiles['App.tsx'] || customFiles['client/src/DynamicApp.tsx'] || DEFAULT_INITIAL_APP_CODE;
  }, [customFiles]);

  const handleCloseTab = (tabId: TopLevelTab, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t.id !== tabId);
    if (remaining.length === 0) {
      onClose();
      return;
    }
    setOpenTabs(remaining);
    if (activeTopTab === tabId) {
      setActiveTopTab(remaining[remaining.length - 1].id);
    }
  };

  const handleAddTab = (type: TopLevelTab, label: string) => {
    if (!openTabs.some(t => t.id === type)) {
      setOpenTabs(prev => [...prev, { id: type, label, closable: true }]);
    }
    setActiveTopTab(type);
    setShowNewTabMenu(false);
  };

  return (
    <div className={`${isMaximized ? 'w-full absolute inset-0 z-30' : 'w-full lg:w-[56%] lg:min-w-[460px] min-w-0 h-[58%] min-h-[360px] lg:h-full shrink-0'} border-l-0 lg:border-l border-t lg:border-t-0 border-border-divider-subtle bg-bg-surface-panel flex flex-col animate-in duration-200 select-none`}>
      
      {/* Top Application Tab Bar */}
      <div className="h-11 flex items-center px-3 bg-bg-canvas-main/60 border-b border-border-divider-subtle shrink-0 relative select-none">
        
        {/* Tabs list of the application */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {openTabs.map((tab) => {
            const isActive = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTopTab(tab.id)}
                className={`h-7 px-3 rounded-t-md text-xs font-normal transition-all flex items-center gap-2 group relative border-t border-x cursor-pointer ${
                  isActive 
                    ? 'bg-bg-surface-panel text-text-content-primary border-border-divider-subtle shadow-xs font-medium' 
                    : 'text-text-content-secondary hover:text-text-content-primary hover:bg-bg-action-hover border-transparent'
                }`}
              >
                {tab.id === 'computer' && (
                  <Desktop size={13} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? '#ffffff' : undefined }} className={!isActive ? "text-text-content-secondary" : ""} />
                )}
                {tab.id === 'workspace' && (
                  <LinuxLogo size={13} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? '#ffffff' : undefined }} className={!isActive ? "text-text-content-secondary" : ""} />
                )}
                {tab.id === 'code_tab' && (
                  <FileCode size={13} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? '#ffffff' : undefined }} className={!isActive ? "text-text-content-secondary" : ""} />
                )}
                {tab.id === 'preview_tab' && (
                  <Browser size={13} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? '#ffffff' : undefined }} className={!isActive ? "text-text-content-secondary" : ""} />
                )}
                {tab.id === 'terminal_tab' && (
                  <Terminal size={13} weight={isActive ? "fill" : "regular"} style={{ color: isActive ? '#ffffff' : undefined }} className={!isActive ? "text-text-content-secondary" : ""} />
                )}

                <span className="truncate max-w-[150px] text-[11.5px]" style={{ color: isActive ? '#f5f5f5' : '#8a8a8a' }}>{tab.label}</span>

                {tab.closable && (
                  <X 
                    size={11}
                    className="ml-0.5 text-text-content-secondary hover:text-text-content-primary p-0.5 rounded transition-all cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id, e);
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Plus and Caret Down buttons to add application tabs */}
          <div className="flex items-center text-text-content-secondary hover:text-text-content-primary px-0.5">
            <button 
              onClick={() => setShowNewTabMenu(!showNewTabMenu)}
              className="p-1 hover:bg-bg-action-hover rounded cursor-pointer transition-colors"
              title="Nova aba na aplicação"
            >
              <Plus size={13} />
            </button>
            <button 
              onClick={() => setShowNewTabMenu(!showNewTabMenu)}
              className="p-0.5 hover:bg-bg-action-hover rounded cursor-pointer transition-colors"
            >
              <CaretDown size={11} />
            </button>
          </div>
        </div>

        {/* Dropdown Menu for New Application Tab */}
        {showNewTabMenu && (
          <div className="absolute top-9 left-28 z-50 w-64 bg-bg-surface-panel border border-border-divider-subtle rounded-xl shadow-2xl p-1.5 space-y-1 text-xs text-text-content-primary/80 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => handleAddTab('workspace', 'Espaço de Trabalho')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-action-hover text-left transition-colors cursor-pointer"
            >
              <Code size={15} className="text-slate-400" />
              <div>
                <div className="font-medium text-text-content-primary">Espaço de Trabalho WebDev</div>
                <div className="text-[10px] text-text-content-secondary/60">Preview ao vivo, editor e terminal</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('code_tab', 'Editor de Código')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-action-hover text-left transition-colors cursor-pointer"
            >
              <FileCode size={15} className="text-slate-400" />
              <div>
                <div className="font-medium text-text-content-primary">Editor de Código Completo</div>
                <div className="text-[10px] text-text-content-secondary/60">Edição direta de arquivos e pastas</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('computer', 'Computador do Agente')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-action-hover text-left transition-colors cursor-pointer"
            >
              <Desktop size={15} className="text-slate-400" />
              <div>
                <div className="font-medium text-text-content-primary">Computador na Nuvem</div>
                <div className="text-[10px] text-text-content-secondary/60">Ubuntu 24.04 · Playwright e shell Bash</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('preview_tab', 'Pré-visualização')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-action-hover text-left transition-colors cursor-pointer"
            >
              <Browser size={15} className="text-emerald-400" />
              <div>
                <div className="font-medium text-text-content-primary">Preview de Runtime</div>
                <div className="text-[10px] text-text-content-secondary/60">Renderização em tempo real</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('terminal_tab', 'Terminal Bash')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-action-hover text-left transition-colors cursor-pointer"
            >
              <Terminal size={15} className="text-amber-400" />
              <div>
                <div className="font-medium text-text-content-primary">Terminal Bash</div>
                <div className="text-[10px] text-text-content-secondary/60">Linha de comando do container</div>
              </div>
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Top Right Window Controls: Fullscreen expand and Sidebar dock toggle */}
        <div className="flex items-center gap-1.5 text-text-content-secondary">
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restaurar tamanho" : "Tela cheia"} 
            className="cursor-pointer hover:text-text-content-primary transition-colors p-1"
          >
            <ArrowsOut size={14} />
          </button>
          <button 
            onClick={onClose}
            title="Fechar painel lateral" 
            className="cursor-pointer hover:text-text-content-primary transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE APPLICATION TAB */}
      
      {/* 1. Computador na Nuvem do Agente */}
      {activeTopTab === 'computer' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <KvantComputer 
            toolCalls={toolCalls}
            isWorking={isWorking}
            workingTime={workingTime}
            statusText={statusText}
            contextText={contextText}
            customFiles={customFiles}
            onFileUpdate={onFileUpdate}
            agentIntent={agentIntent}
            browserStatus={browserStatus}
            onRunTestTool={(prompt) => onSendPrompt && onSendPrompt(prompt)}
          />
        </div>
      )}

      {/* 2. Direct Code Tab */}
      {activeTopTab === 'code_tab' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-canvas-main">
          <InteractiveCodeEditor 
            activeFile={activeFile} 
            onFileChange={setActiveFile} 
            customFiles={customFiles}
            onFileUpdate={onFileUpdate}
          />
        </div>
      )}

      {/* 3. Direct Preview Tab */}
      {activeTopTab === 'preview_tab' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-surface-panel">
          <RuntimePreview 
            activeCode={runtimeAppCode} 
            customFiles={customFiles}
            onSendPrompt={onSendPrompt}
            isWorking={isWorking}
          />
        </div>
      )}

      {/* 4. Terminal Tab */}
      {activeTopTab === 'terminal_tab' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-canvas-main">
          <TerminalView activeCode={activeCodeContent} liveToolCalls={toolCalls} />
        </div>
      )}

      {/* 5. Espaço de Trabalho Completo (Sub-abas: Preview, Código, Terminal, Projetos, Execuções, Configurações) */}
      {activeTopTab === 'workspace' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-surface-panel">
          {/* Internal Navigation Bar for Workspace */}
          <div className="h-11 flex items-center justify-between px-3 border-b border-border-divider-subtle shrink-0 bg-bg-surface-panel">
            <div className="flex items-center">
              <ToggleGroup 
                value={[workspaceSubTab]} 
                onValueChange={(val) => {
                  if (val && val.length > 0) {
                    setWorkspaceSubTab(val[0] as WorkspaceSubTab);
                  }
                }}
                spacing={8}
                className="bg-transparent border-none p-0 h-auto gap-2"
              >
                <ToggleGroupItem 
                  value="preview" 
                  className={cn(
                    "relative transition-all duration-300 flex items-center gap-2 px-3 h-8 rounded-[10px] border",
                    workspaceSubTab === 'preview' 
                      ? "text-white bg-[#1a1a1a] border-[#323232] shadow-sm" 
                      : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Desktop size={12} weight="regular" />
                  <AnimatePresence initial={false}>
                    {workspaceSubTab === 'preview' && (
                      <motion.span
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          opacity: { duration: 0.15 }
                        }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-semibold"
                      >
                        Preview
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ToggleGroupItem>

                <ToggleGroupItem 
                  value="code" 
                  className={cn(
                    "relative transition-all duration-300 flex items-center gap-2 px-3 h-8 rounded-[10px] border",
                    workspaceSubTab === 'code' 
                      ? "text-white bg-[#1a1a1a] border-[#323232] shadow-sm" 
                      : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Code size={12} weight="regular" />
                  <AnimatePresence initial={false}>
                    {workspaceSubTab === 'code' && (
                      <motion.span
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          opacity: { duration: 0.15 }
                        }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-semibold"
                      >
                        Editor
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ToggleGroupItem>

                <ToggleGroupItem 
                  value="terminal" 
                  className={cn(
                    "relative transition-all duration-300 flex items-center gap-2 px-3 h-8 rounded-[10px] border",
                    workspaceSubTab === 'terminal' 
                      ? "text-white bg-[#1a1a1a] border-[#323232] shadow-sm" 
                      : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Terminal size={12} weight="regular" />
                  <AnimatePresence initial={false}>
                    {workspaceSubTab === 'terminal' && (
                      <motion.span
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          opacity: { duration: 0.15 }
                        }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-semibold"
                      >
                        Terminal
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ToggleGroupItem>

                <ToggleGroupItem 
                  value="projects" 
                  className={cn(
                    "relative transition-all duration-300 flex items-center gap-2 px-3 h-8 rounded-[10px] border",
                    workspaceSubTab === 'projects' 
                      ? "text-white bg-[#1a1a1a] border-[#323232] shadow-sm" 
                      : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Folder size={12} weight="regular" />
                  <AnimatePresence initial={false}>
                    {workspaceSubTab === 'projects' && (
                      <motion.span
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          opacity: { duration: 0.15 }
                        }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-semibold"
                      >
                        Git
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ToggleGroupItem>

                <ToggleGroupItem 
                  value="automations" 
                  className={cn(
                    "relative transition-all duration-300 flex items-center gap-2 px-3 h-8 rounded-[10px] border",
                    workspaceSubTab === 'automations' 
                      ? "text-white bg-[#1a1a1a] border-[#323232] shadow-sm" 
                      : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Calendar size={12} weight="regular" />
                  <AnimatePresence initial={false}>
                    {workspaceSubTab === 'automations' && (
                      <motion.span
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          opacity: { duration: 0.15 }
                        }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-semibold"
                      >
                        Execuções
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ToggleGroupItem>

                <ToggleGroupItem 
                  value="settings" 
                  className={cn(
                    "relative transition-all duration-300 flex items-center gap-2 px-3 h-8 rounded-[10px] border",
                    workspaceSubTab === 'settings' 
                      ? "text-white bg-[#1a1a1a] border-[#323232] shadow-sm" 
                      : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <Gear size={12} weight="regular" />
                  <AnimatePresence initial={false}>
                    {workspaceSubTab === 'settings' && (
                      <motion.span
                        layout
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          opacity: { duration: 0.15 }
                        }}
                        className="overflow-hidden whitespace-nowrap text-[11px] font-semibold"
                      >
                        Ajustes
                      </motion.span>
                    )}
                  </AnimatePresence>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
               <button 
                onClick={() => {
                  setWorkspaceSubTab('preview');
                }}
                className="bg-interactive-cta-bg text-bg-canvas-main px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-xs cursor-pointer"
               >
                  <Sparkle size={13} weight="fill" />
                  <span>Preview Vivo</span>
               </button>
            </div>
          </div>

          {/* Sub-tab content */}
          <div className="flex-1 overflow-hidden relative">
            {workspaceSubTab === 'preview' && (
              <RuntimePreview 
                activeCode={runtimeAppCode} 
                customFiles={customFiles}
                onSendPrompt={onSendPrompt}
                isWorking={isWorking}
              />
            )}
            {workspaceSubTab === 'code' && (
              <InteractiveCodeEditor 
                activeFile={activeFile} 
                onFileChange={setActiveFile} 
                customFiles={customFiles}
                onFileUpdate={onFileUpdate}
              />
            )}
            {workspaceSubTab === 'terminal' && (
              <TerminalView activeCode={activeCodeContent} liveToolCalls={toolCalls} />
            )}
            {workspaceSubTab === 'automations' && <AutomationsView />}
            {workspaceSubTab === 'projects' && <ProjectsView />}
            {workspaceSubTab === 'settings' && <SettingsView />}
          </div>
        </div>
      )}

    </div>
  );
}

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
        active ? 'bg-white/10 text-white shadow-xs' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const DEFAULT_INITIAL_APP_CODE = ``;

// Helper to build a file tree structure from list of path strings
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

function buildFileTree(filesMap: Record<string, string>): TreeNode[] {
  const rootNodes: Record<string, any> = {};

  // Standard base files guaranteed to exist in the workspace
  const allPaths = new Set<string>([
    'client/src/App.tsx',
    'client/src/index.css',
    'package.json',
    'README.md',
    ...Object.keys(filesMap)
  ]);

  for (const rawPath of allPaths) {
    const normalized = rawPath.replace(/^\//, '');
    const parts = normalized.split('/');
    let currentLevel = rootNodes;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          path: fullPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : {}
        };
      }
      if (!isFile) {
        currentLevel = currentLevel[part].children;
      }
    }
  }

  function convertToArray(nodeMap: Record<string, any>): TreeNode[] {
    return Object.values(nodeMap)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(node => ({
        name: node.name,
        path: node.path,
        type: node.type,
        children: node.children ? convertToArray(node.children) : undefined
      }));
  }

  return convertToArray(rootNodes);
}

const getMonacoLanguage = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'tsx' || ext === 'ts') return 'typescript';
  if (ext === 'jsx' || ext === 'js') return 'javascript';
  if (ext === 'css') return 'css';
  if (ext === 'html') return 'html';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  return 'typescript';
};

// REAL INTERACTIVE CODE EDITOR WITH FULL DYNAMIC FILE CREATION & EDITING
interface InteractiveCodeEditorProps {
  activeFile: string;
  onFileChange: (filePath: string) => void;
  customFiles: Record<string, string>;
  onFileUpdate?: (files: Array<{ path: string; code: string; lang?: string }>) => void;
}

function InteractiveCodeEditor({ activeFile, onFileChange, customFiles, onFileUpdate }: InteractiveCodeEditorProps) {
  const fileTree = useMemo(() => buildFileTree(customFiles), [customFiles]);
  const [editorContent, setEditorContent] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  // Load content when active file changes
  useEffect(() => {
    let content = customFiles[activeFile];
    if (content === undefined) {
      if (activeFile === 'client/src/App.tsx' || activeFile === 'App.tsx') {
        content = customFiles['client/src/App.tsx'] || customFiles['App.tsx'] || DEFAULT_INITIAL_APP_CODE;
      } else if (activeFile === 'client/src/index.css') {
        content = `@import "tailwindcss";\n\nbody {\n  @apply bg-[#080A0F] text-slate-100 antialiased;\n}`;
      } else if (activeFile === 'package.json') {
        content = `{\n  "name": "kvant-webdev-app",\n  "private": true,\n  "version": "1.0.0",\n  "type": "module",\n  "dependencies": {\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0",\n    "@phosphor-icons/react": "^2.1.10"\n  }\n}`;
      } else if (activeFile === 'README.md') {
        content = `# Projeto WebDev Kvant\n\nAplicação React construída e atualizada autonomamente pelo agente.`;
      } else {
        content = `// Arquivo: ${activeFile}\nexport default {};\n`;
      }
    }
    setEditorContent(content);
    setIsSaved(true);
  }, [activeFile, customFiles]);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    setIsSaved(false);
  };

  const handleSave = () => {
    if (onFileUpdate) {
      onFileUpdate([{
        path: activeFile,
        code: editorContent,
        lang: detectLanguage(activeFile, editorContent)
      }]);
    }
    setIsSaved(true);
  };

  const saveRef = React.useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
  }, [editorContent, activeFile, onFileUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Handle tab indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newText = editorContent.substring(0, start) + '  ' + editorContent.substring(end);
      setEditorContent(newText);
      setIsSaved(false);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFilePath.trim().replace(/^\/+/, '');
    if (!clean) return;
    const finalPath = clean.includes('/') ? clean : `client/src/${clean}`;
    if (onFileUpdate) {
      onFileUpdate([{
        path: finalPath,
        code: `import React from 'react';\n\nexport default function Component() {\n  return <div>Componente ${finalPath}</div>;\n}\n`,
        lang: detectLanguage(finalPath, '')
      }]);
    }
    onFileChange(finalPath);
    setNewFilePath('');
    setIsNewFileModalOpen(false);
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim().replace(/^\/+/, '');
    if (!clean) return;
    const dummyFile = `${clean}/README.md`;
    if (onFileUpdate) {
      onFileUpdate([{
        path: dummyFile,
        code: `# Pasta ${clean}\n`,
        lang: 'markdown'
      }]);
    }
    onFileChange(dummyFile);
    setNewFolderName('');
    setIsNewFolderModalOpen(false);
  };

  const handleDeleteActiveFile = () => {
    if (activeFile === 'client/src/App.tsx' || activeFile === 'package.json') {
      alert('Arquivos de sistema essenciais não podem ser removidos.');
      return;
    }
    if (confirm(`Deseja realmente excluir "${activeFile}" do workspace?`)) {
      if (onFileUpdate) {
        // Clear file content to indicate removal
        onFileUpdate([{ path: activeFile, code: '' }]);
      }
      onFileChange('client/src/App.tsx');
    }
  };

  const lineCount = useMemo(() => editorContent.split('\n').length, [editorContent]);
  const linesArray = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  return (
    <div className="h-full flex bg-[#1a1a1a] text-slate-100 overflow-hidden relative">
      {/* Left Sidebar: Dynamic Workspace File Tree */}
      <div className="w-56 border-r border-white/10 flex flex-col shrink-0 select-none" style={{ backgroundColor: '#1a1a1a' }}>
        {/* Workspace Tree Header */}
        <div className="h-9 px-3 border-b border-white/10 flex items-center justify-between shrink-0" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Folder size={14} className="text-[#f5f5f5]" style={{ color: '#f5f5f5' }} />
            <span style={{ color: '#f5f5f5' }}>Arquivos</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsNewFileModalOpen(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
              style={{ color: '#f5f5f5' }}
              title="Novo Arquivo (+ File)"
            >
              <FilePlus size={14} style={{ color: '#f5f5f5' }} />
            </button>
            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
              style={{ color: '#f5f5f5' }}
              title="Nova Pasta (+ Folder)"
            >
              <FolderPlus size={14} style={{ color: '#f5f5f5' }} />
            </button>
          </div>
        </div>

        {/* Tree Nodes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar text-xs" style={{ backgroundColor: '#1a1a1a' }}>
          {fileTree.map((node) => (
            <DynamicFileTreeNode 
              key={node.path} 
              node={node} 
              level={0} 
              activeFile={activeFile} 
              onFileChange={onFileChange}
              searchTerm={searchTerm}
            />
          ))}
        </div>

        {/* Workspace Footer Stats */}
        <div className="p-2.5 border-t border-white/5 text-[10px] flex items-center justify-between font-mono" style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5' }}>
          <span style={{ color: '#f5f5f5' }}>{Object.keys(customFiles).length || 4} arquivos</span>
          <span style={{ color: '#f5f5f5' }}>● Workspace Pronto</span>
        </div>
      </div>

      {/* Main Code Editor View */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1a1a1a] overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        {/* Editor Tab Bar & Actions */}
        <div className="h-9 border-b border-white/10 px-4 flex items-center justify-between shrink-0" style={{ backgroundColor: '#1a1a1a', color: '#f5f5f5' }}>
          <div className="flex items-center gap-2 font-mono text-xs truncate" style={{ color: '#f5f5f5' }}>
            <FileCode size={15} className="shrink-0" style={{ color: '#f5f5f5' }} />
            <span className="font-semibold" style={{ color: '#f5f5f5' }}>{activeFile}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-sans tracking-wide select-none">
              Apenas o agente pode gerar, editar e executar código
            </span>
            {!isSaved && (
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" title="Alterações não salvas" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                !isSaved 
                  ? 'bg-white hover:bg-slate-200 text-black shadow-white/5' 
                  : 'bg-white/10 hover:bg-white/15'
              }`}
              style={{ color: !isSaved ? '#000000' : '#f5f5f5' }}
              title="Salvar arquivo e sincronizar runtime (Ctrl+S)"
            >
              <FloppyDisk size={13} weight="bold" />
              <span>{isSaved ? 'Salvo' : 'Salvar'}</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(editorContent);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              style={{ color: '#f5f5f5' }}
              title="Copiar código"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Code size={14} style={{ color: '#f5f5f5' }} />}
            </button>

            <button
              onClick={() => {
                const blob = new Blob([editorContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = activeFile.split('/').pop() || 'file.tsx';
                a.click();
              }}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              style={{ color: '#f5f5f5' }}
              title="Baixar arquivo"
            >
              <Download size={14} style={{ color: '#f5f5f5' }} />
            </button>

            {activeFile !== 'client/src/App.tsx' && (
              <button
                onClick={handleDeleteActiveFile}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                title="Excluir arquivo"
              >
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Real Code Editor CodeMirror Surface (Apenas Leitura do Usuário) */}
        <div className="flex-1 overflow-auto relative bg-[#1a1a1a] h-full flex flex-col font-mono text-xs select-text" style={{ backgroundColor: '#1a1a1a' }}>
          <CodeMirror
            value={editorContent}
            height="100%"
            theme={vscodeDark}
            extensions={[javascript({ jsx: true, typescript: true })]}
            readOnly={true}
            editable={false}
            className="flex-1 w-full text-xs font-mono select-text"
          />
        </div>

        {/* Editor Bottom Status Bar */}
        <div className="h-6 bg-[#1a1a1a] border-t border-white/5 px-3 flex items-center justify-between text-[10px] font-mono shrink-0 select-none" style={{ color: '#f5f5f5' }}>
          <div className="flex items-center gap-3" style={{ color: '#f5f5f5' }}>
            <span style={{ color: '#f5f5f5' }}>{detectLanguage(activeFile, editorContent).toUpperCase()}</span>
            <span style={{ color: '#f5f5f5' }}>UTF-8</span>
            <span style={{ color: '#f5f5f5' }}>{lineCount} linhas</span>
          </div>
          <div className="flex items-center gap-2" style={{ color: '#f5f5f5' }}>
            <span style={{ color: '#f5f5f5' }}>Sincronização em Tempo Real Ativa</span>
          </div>
        </div>
      </div>

      {/* Modal: Novo Arquivo */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#13151F] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FilePlus size={16} className="text-slate-300" />
                Criar Novo Arquivo no Workspace
              </h3>
              <button onClick={() => setIsNewFileModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateNewFile} className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1">Caminho ou Nome do Arquivo</label>
                <input 
                  type="text" 
                  required 
                  value={newFilePath} 
                  onChange={e => setNewFilePath(e.target.value)} 
                  placeholder="ex: client/src/components/Header.tsx ou utils/format.ts"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsNewFileModalOpen(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold">Criar Arquivo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Pasta */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#13151F] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FolderPlus size={16} className="text-slate-300" />
                Criar Nova Pasta no Workspace
              </h3>
              <button onClick={() => setIsNewFolderModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateNewFolder} className="space-y-3">
              <div>
                <label className="text-slate-300 block mb-1">Nome ou Caminho da Pasta</label>
                <input 
                  type="text" 
                  required 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)} 
                  placeholder="ex: client/src/components ou src/services"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/20"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsNewFolderModalOpen(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-200 text-black font-semibold">Criar Pasta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function renderFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (ext === 'tsx' || ext === 'jsx') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
        <ellipse cx="12" cy="12" rx="3.5" ry="8.5" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="3.5" ry="8.5" transform="rotate(90 12 12)" />
        <ellipse cx="12" cy="12" rx="3.5" ry="8.5" transform="rotate(150 12 12)" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (ext === 'ts') {
    return (
      <span className="font-bold font-mono px-1 rounded border border-current shrink-0" style={{ fontSize: '10px' }}>
        TS
      </span>
    );
  }
  if (ext === 'js') {
    return (
      <span className="font-bold font-mono px-1 rounded border border-current shrink-0" style={{ fontSize: '10px' }}>
        JS
      </span>
    );
  }
  if (ext === 'css') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M4 3l2 14.5L12 19l6-1.5L20 3H4z" />
        <path d="M9 7h8l-1 4H8l.5 3 3.5 1 3.5-1 .3-2" />
      </svg>
    );
  }
  if (ext === 'html') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (ext === 'json') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
        <path d="M8 3v3a2 2 0 0 1-2 2H4v2h2a2 2 0 0 1 2 2v3" />
        <path d="M16 3v3a2 2 0 0 0 2 2h2v2h-2a2 2 0 0 0-2 2v3" />
      </svg>
    );
  }
  if (ext === 'md') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return <FileCode size={18} className="shrink-0" />;
}

// Tree Node Recursive Renderer
function DynamicFileTreeNode({ node, level, activeFile, onFileChange, searchTerm }: {
  node: TreeNode;
  level: number;
  activeFile: string;
  onFileChange: (path: string) => void;
  searchTerm?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === 'folder';
  const isActive = node.path === activeFile || node.name === activeFile;

  // Filter search
  if (searchTerm && !node.path.toLowerCase().includes(searchTerm.toLowerCase())) {
    if (!node.children || !node.children.some(c => c.path.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return null;
    }
  }

  return (
    <div>
      <div 
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-all ${
          isActive 
            ? 'font-medium border rounded-[6px]' 
            : 'hover:bg-white/5'
        }`}
        style={{ 
          paddingLeft: `${level * 12 + 6}px`,
          color: isActive ? '#f5f5f5' : '#8a8a8a',
          ...(isActive ? { backgroundColor: '#252525', borderColor: '#202020', borderRadius: '6px', borderWidth: '1px', borderStyle: 'solid' } : {})
        }}
        onClick={() => isFolder ? setIsOpen(!isOpen) : onFileChange(node.path)}
      >
        {isFolder ? (
          <CaretRight size={11} className={`transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} style={{ color: isActive ? '#f5f5f5' : '#8a8a8a' }} />
        ) : (
          renderFileIcon(node.name)
        )}
        
        {isFolder && (
          <Folder size={13} className="shrink-0" style={{ color: isActive ? '#f5f5f5' : '#8a8a8a' }} />
        )}

        <span className="text-[11px] truncate font-mono">{node.name}</span>
      </div>

      {isFolder && isOpen && node.children && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <DynamicFileTreeNode 
              key={child.path} 
              node={child} 
              level={level + 1} 
              activeFile={activeFile} 
              onFileChange={onFileChange}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Subview Components for Projects, Automations & Settings
function ProjectsView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileDiff, setFileDiff] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('viewer');
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) return;
      const payload = await response.json();
      setProjects(payload.projects || []);
      if (!selected && payload.projects?.[0]) await selectProject(payload.projects[0].id);
    } catch {}
  };

  const selectProject = async (id: string) => {
    try {
      const [projectResponse, versionsResponse, filesResponse, membersResponse, auditResponse] = await Promise.all([
        fetch(`/api/projects/${encodeURIComponent(id)}`),
        fetch(`/api/projects/${encodeURIComponent(id)}/versions`),
        fetch(`/api/projects/${encodeURIComponent(id)}/files`),
        fetch(`/api/projects/${encodeURIComponent(id)}/members`),
        fetch(`/api/projects/${encodeURIComponent(id)}/audit`)
      ]);
      if (projectResponse.ok) setSelected(await projectResponse.json());
      if (versionsResponse.ok) {
        const v = await versionsResponse.json();
        setVersions(v.versions || []);
      }
      if (filesResponse.ok) {
        const f = await filesResponse.json();
        setFiles(f.files || []);
      }
      if (membersResponse.ok) {
        const m = await membersResponse.json();
        setMembers(m.members || []);
      }
      if (auditResponse.ok) {
        const a = await auditResponse.json();
        setAuditEntries(a.entries || []);
      }
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-bg-canvas-main p-6 text-xs text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Projetos & Controle de Versão Git</h2>
            <p className="text-[11px] text-slate-400">Controle de branches, snapshots e integridade de arquivos do projeto.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#12131A] border border-white/10 space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Branch Ativa</span>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>main / workspace</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#12131A] border border-white/10 space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Status de Sync</span>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <Check size={14} weight="bold" />
              <span>Sincronizado</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#12131A] border border-white/10 space-y-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Total de Versões</span>
            <div className="text-sm font-bold text-white font-mono">{versions.length || 1} checkpoints</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationsView() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/jobs').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.jobs) setJobs(data.jobs);
    }).catch(() => {});
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-bg-canvas-main p-6 text-xs text-white">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-sm font-bold text-white">Execuções e Automações em Segundo Plano</h2>
        <p className="text-[11px] text-slate-400">Histórico de jobs assíncronos e pipelines do agente.</p>
        
        <div className="p-4 rounded-xl bg-[#12131A] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">WebDev Hot Reload & Compile Worker</span>
            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ATIVO</span>
          </div>
          <p className="text-[11px] text-slate-400">Sincronização reativa contínua entre o editor de código e o preview de runtime.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-bg-canvas-main p-6 text-xs text-white">
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-sm font-bold text-white">Configurações do Workspace</h2>
        <div className="p-4 rounded-xl bg-[#12131A] border border-white/10 space-y-3">
          <div className="font-semibold text-white">Ambiente de Execução</div>
          <div className="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Runtime: Node.js 22.x / Vite React 19</div>
            <div>Babel Compiler: Standalone TSX + JSX</div>
            <div>CSS Framework: Tailwind CSS v4</div>
          </div>
        </div>
      </div>
    </div>
  );
}
