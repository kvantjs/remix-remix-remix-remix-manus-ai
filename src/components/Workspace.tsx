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
  Browsers
} from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { RuntimePreview } from './RuntimePreview';
import { TerminalView } from './TerminalView';
import { detectLanguage } from './SyntaxCodeView';
import { KvantComputer } from './KvantComputer';
import { ToolCallTrace } from '../types/project';
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block";

export type TopLevelTab = 'computer' | 'home_code' | 'website' | 'workspace' | 'terminal_tab';
export type WorkspaceSubTab = 'preview' | 'code' | 'terminal' | 'settings';

interface WorkspaceProps {
  onClose: () => void;
  customFiles?: Record<string, string>;
  onSendPrompt?: (prompt: string) => void;
  toolCalls?: ToolCallTrace[];
  isWorking?: boolean;
  statusText?: string;
  contextText?: string;
  initialTab?: string;
}

interface TabItem {
  id: TopLevelTab;
  label: string;
  closable: boolean;
}

export function Workspace({ 
  onClose, 
  customFiles, 
  onSendPrompt,
  toolCalls,
  isWorking = false,
  statusText,
  contextText,
  initialTab
}: WorkspaceProps) {
  // Top Level Application Tabs: Computador de l... | Home.tsx
  const [openTabs, setOpenTabs] = useState<TabItem[]>([
    { id: 'computer', label: 'Computador de l...', closable: false },
    { id: 'home_code', label: 'Home.tsx', closable: true }
  ]);
  const [activeTopTab, setActiveTopTab] = useState<TopLevelTab>((initialTab as TopLevelTab) || 'computer');
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (initialTab && (initialTab === 'computer' || initialTab === 'home_code' || initialTab === 'workspace')) {
      setActiveTopTab(prev => prev !== initialTab ? (initialTab as TopLevelTab) : prev);
    }
  }, [initialTab]);

  // Sub-tabs for the Workspace (Preview, Código, Terminal, Configurações)
  const [workspaceSubTab, setWorkspaceSubTab] = useState<WorkspaceSubTab>('preview');
  const [activeFile, setActiveFile] = useState('Home.tsx');
  const [copied, setCopied] = useState(false);

  const activeCodeContent = 
    customFiles?.[activeFile] || 
    customFiles?.['Home.tsx'] || 
    customFiles?.['App.tsx'] || 
    customFiles?.['client/src/App.tsx'] ||
    (customFiles && Object.keys(customFiles).length > 0 ? Object.values(customFiles)[0] : undefined);

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
    <div className={`${isMaximized ? 'w-full absolute inset-0 z-30' : 'w-[54%] min-w-[440px]'} border-l border-[#252525] bg-[#1c1c1c] flex flex-col h-full animate-in duration-200 select-none`}>
      
      {/* Top Application Tab Bar: Computador de l... | Home.tsx */}
      <div className="h-10 flex items-center px-3 bg-[#171717] border-b border-[#252525] shrink-0 relative select-none">
        
        {/* Tabs list of the application */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {openTabs.map((tab) => {
            const isActive = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTopTab(tab.id);
                  if (tab.id === 'home_code') setActiveFile('Home.tsx');
                }}
                className={`h-7 px-2.5 rounded-t-md text-xs font-normal transition-all flex items-center gap-2 group relative border-t border-x cursor-pointer ${
                  isActive 
                    ? 'bg-[#222222] text-white border-[#333333]/50 shadow-xs' 
                    : 'text-[#888888] hover:text-[#cccccc] hover:bg-white/[0.03] border-transparent'
                }`}
              >
                {tab.id === 'computer' && (
                  <Desktop size={13} weight={isActive ? "fill" : "regular"} className={isActive ? "text-zinc-200" : "text-[#777777]"} />
                )}
                {tab.id === 'home_code' && (
                  <FileCode size={13} weight="fill" className="text-[#3b82f6]" />
                )}
                {tab.id === 'website' && (
                  <Browsers size={13} className={isActive ? "text-zinc-200" : "text-[#777777]"} />
                )}
                {tab.id === 'workspace' && (
                  <FileCode size={13} className="text-cyan-400" />
                )}
                {tab.id === 'terminal_tab' && (
                  <Terminal size={13} className="text-emerald-400" />
                )}

                <span className="truncate max-w-[130px] text-[11.5px]">{tab.label}</span>

                {tab.closable && (
                  <X 
                    size={11}
                    className="ml-0.5 text-zinc-400 hover:text-white p-0.5 rounded transition-all cursor-pointer"
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
          <div className="flex items-center text-[#777777] hover:text-white px-0.5">
            <button 
              onClick={() => setShowNewTabMenu(!showNewTabMenu)}
              className="p-1 hover:bg-white/5 rounded cursor-pointer transition-colors"
              title="Nova aba na aplicação"
            >
              <Plus size={13} />
            </button>
            <button 
              onClick={() => setShowNewTabMenu(!showNewTabMenu)}
              className="p-0.5 hover:bg-white/5 rounded cursor-pointer transition-colors"
            >
              <CaretDown size={11} />
            </button>
          </div>
        </div>

        {/* Dropdown Menu for New Application Tab */}
        {showNewTabMenu && (
          <div className="absolute top-9 left-28 z-50 w-60 bg-[#222222] border border-white/10 rounded-lg shadow-2xl p-1.5 space-y-1 text-xs text-white/80 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => handleAddTab('computer', 'Computador de l...')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/10 text-left transition-colors cursor-pointer"
            >
              <Desktop size={14} className="text-blue-400" />
              <div>
                <div className="font-medium text-white">Computador na Nuvem</div>
                <div className="text-[10px] text-white/40">Ambiente do agente com navegador</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('home_code', 'Home.tsx')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/10 text-left transition-colors cursor-pointer"
            >
              <FileCode size={14} className="text-[#3b82f6]" />
              <div>
                <div className="font-medium text-white">Home.tsx</div>
                <div className="text-[10px] text-white/40">Editor de código do projeto</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('workspace', 'Espaço de Trabalho')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/10 text-left transition-colors cursor-pointer"
            >
              <Code size={14} className="text-cyan-400" />
              <div>
                <div className="font-medium text-white">Espaço de Trabalho</div>
                <div className="text-[10px] text-white/40">Preview, terminal e configurações</div>
              </div>
            </button>

            <button
              onClick={() => handleAddTab('terminal_tab', 'Terminal Bash')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-white/10 text-left transition-colors cursor-pointer"
            >
              <Terminal size={14} className="text-emerald-400" />
              <div>
                <div className="font-medium text-white">Terminal Bash</div>
                <div className="text-[10px] text-white/40">Shell do container Linux</div>
              </div>
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Top Right Window Controls: Fullscreen expand and Sidebar dock toggle */}
        <div className="flex items-center gap-1.5 text-[#888888]">
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restaurar tamanho" : "Tela cheia"} 
            className="cursor-pointer hover:text-white transition-colors p-1"
          >
            <ArrowsOut size={14} />
          </button>
          <button 
            onClick={onClose}
            title="Alternar painel lateral" 
            className="cursor-pointer hover:text-white transition-colors p-1"
          >
            <div className="size-3.5 border border-current rounded-xs flex overflow-hidden">
              <div className="w-1/2 border-r border-current bg-current/20" />
            </div>
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
            statusText={statusText}
            contextText={contextText}
            customFiles={customFiles}
            onRunTestTool={(prompt) => onSendPrompt && onSendPrompt(prompt)}
          />
        </div>
      )}

      {/* 2. Home.tsx Dedicated Code View */}
      {activeTopTab === 'home_code' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141414]">
          <CodeView 
            activeFile={activeFile} 
            onFileChange={setActiveFile} 
            customFiles={customFiles}
            copied={copied} 
            onCopy={() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }} 
          />
        </div>
      )}

      {/* 3. Terminal Tab */}
      {activeTopTab === 'terminal_tab' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#141414]">
          <TerminalView activeCode={activeCodeContent} />
        </div>
      )}

      {/* 4. Full Espaço de Trabalho (Sub-tabs: Preview, Código, Terminal, Configurações) */}
      {activeTopTab === 'workspace' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1c1c1c]">
          {/* Internal Navigation Bar for Workspace */}
          <div style={{ backgroundColor: '#1a1a1a' }} className="h-11 flex items-center justify-between px-4 border-b border-white/5 shrink-0 bg-[#1a1a1a]">
            <div className="flex items-center gap-1 p-0.5 border border-white/5 rounded-lg bg-[#141414]">
              <NavButton 
                active={workspaceSubTab === 'preview'} 
                onClick={() => setWorkspaceSubTab('preview')}
                icon={<Desktop size={13} />} 
                label="Pré-visualizar" 
              />
              <NavButton 
                active={workspaceSubTab === 'code'} 
                onClick={() => setWorkspaceSubTab('code')}
                icon={<Code size={13} />} 
                label="Código" 
              />
              <NavButton 
                active={workspaceSubTab === 'terminal'} 
                onClick={() => setWorkspaceSubTab('terminal')}
                icon={<Terminal size={13} />} 
                label="Terminal" 
              />
              <NavButton 
                active={workspaceSubTab === 'settings'} 
                onClick={() => setWorkspaceSubTab('settings')}
                icon={<Gear size={13} />} 
                label="Configurações" 
              />
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                onClick={() => {
                  alert('Projeto sincronizado com sucesso no cluster Kvant!');
                }}
                className="bg-[#dcdcdc] text-black px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 hover:bg-[#c0c0c0] transition-colors shadow-xs cursor-pointer"
               >
                  <ArrowUp size={13} />
                  Publicar
               </button>
            </div>
          </div>

          {/* Sub-tab content */}
          <div className="flex-1 overflow-hidden relative">
            {workspaceSubTab === 'preview' && (
              <RuntimePreview 
                activeCode={activeCodeContent} 
                onSendPrompt={onSendPrompt}
              />
            )}
            {workspaceSubTab === 'code' && (
              <CodeView 
                activeFile={activeFile} 
                onFileChange={setActiveFile} 
                customFiles={customFiles}
                copied={copied} 
                onCopy={() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }} 
              />
            )}
            {workspaceSubTab === 'terminal' && (
              <TerminalView activeCode={activeCodeContent} />
            )}
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
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
        active ? 'bg-white/10 text-white shadow-xs' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const FILE_CONTENTS: Record<string, { lang: string; code: string }> = {
  'Home.tsx': {
    lang: 'typescript',
    code: `import React, { useState } from 'react';
import { Star, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="min-h-screen bg-[#08080a] text-white selection:bg-purple-500/30">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-2 font-bold tracking-tight text-white">
          <span className="text-white text-xs">▲</span>
          <span className="tracking-wider text-sm font-black">RYVAX.</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Build on the edge.
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
          Framework reativo de alta performance integrado ao Manus AI.
        </p>
      </main>
    </div>
  );
}
`,
  },
  'App.tsx': {
    lang: 'typescript',
    code: `export default function App() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <h1 className="text-2xl font-bold">Aplicação Principal</h1>
    </div>
  );
}`
  },
  'package.json': {
    lang: 'json',
    code: `{
  "name": "kvant-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}`
  }
};

function CodeView({ activeFile, onFileChange, customFiles, copied, onCopy }: any) {
  const files = [
    { name: 'client', type: 'folder', children: [
      { name: 'src', type: 'folder', children: [
        { name: 'Home.tsx', type: 'file' },
        { name: 'App.tsx', type: 'file' },
      ]},
    ]},
    { name: 'package.json', type: 'file' },
  ];

  const defaultFileData = FILE_CONTENTS[activeFile] || {
    lang: 'typescript',
    code: `// ${activeFile}\nexport default {};`
  };

  const customContent = customFiles 
    ? (customFiles[activeFile] || customFiles[`client/src/${activeFile}`] || customFiles[`src/${activeFile}`]) 
    : null;

  const currentFileData = {
    lang: defaultFileData.lang,
    code: customContent !== undefined && customContent !== null ? customContent : defaultFileData.code
  };

  const resolvedLang = detectLanguage(activeFile, currentFileData.code);

  return (
    <div className="h-full flex">
      {/* File Tree */}
      <div style={{ backgroundColor: '#1a1a1a' }} className="w-48 border-r border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar bg-[#1a1a1a]">
        <div className="p-3 flex flex-col gap-1">
          {files.map(file => (
            <FileTreeNode key={file.name} node={file} level={0} activeFile={activeFile} onFileChange={onFileChange} />
          ))}
        </div>
      </div>

      {/* Editor Surface */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#141414] overflow-hidden">
        <CodeBlock 
          code={currentFileData.code} 
          language={resolvedLang} 
          showLineNumbers
          className="h-full rounded-none border-0 bg-[#121212] flex flex-col min-h-0"
        >
          <CodeBlockHeader className="h-9 bg-[#1a1a1a] border-b border-white/5 px-4 shrink-0 flex items-center">
            <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-mono">
              <span>client</span>
              <span>/</span>
              <span>src</span>
              <span>/</span>
            </div>
            <CodeBlockTitle className="text-white/90 font-mono text-[11px] font-semibold">
              {activeFile}
            </CodeBlockTitle>
            <CodeBlockLanguage className="ml-2.5 bg-white/5 border border-white/10 text-white/70" />
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={() => {
                  const blob = new Blob([currentFileData.code], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = activeFile;
                  a.click();
                }}
                title="Download arquivo"
                className="text-white hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <Download size={13} style={{ color: '#ffffff' }} />
              </button>
              <CodeBlockCopyButton className="text-white cursor-pointer" style={{ color: '#ffffff' }} />
            </div>
          </CodeBlockHeader>
        </CodeBlock>
      </div>
    </div>
  );
}

function FileTreeNode({ node, level, activeFile, onFileChange }: any) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = node.type === 'folder';
  const isActive = node.name === activeFile;

  return (
    <div>
      <div 
        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer transition-colors ${
          isActive ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
        }`}
        style={{ paddingLeft: `${level * 12 + 6}px` }}
        onClick={() => isFolder ? setIsOpen(!isOpen) : onFileChange(node.name)}
      >
        {isFolder ? (
          <CaretRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        ) : (
          <FileCode size={12} className={isActive ? "text-blue-400" : "text-white/40"} />
        )}
        {isFolder && (isOpen ? <Folder size={12} className="text-white/60" /> : <Folder size={12} />)}
        <span className="text-[11px] truncate">{node.name}</span>
      </div>
      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child: any) => (
            <FileTreeNode key={child.name} node={child} level={level + 1} activeFile={activeFile} onFileChange={onFileChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsView() {
  const [activeSubTab, setActiveSubTab] = useState('Geral');
  const [config, setConfig] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const menuItems = [
    { label: 'Geral', icon: <Gear size={14} /> },
    { label: 'Domínios', icon: <Globe size={14} /> },
    { label: 'Segredos', icon: <Lock size={14} /> },
  ];

  const refresh = async () => {
    const [configResponse, overviewResponse] = await Promise.all([
      fetch('/api/platform/config'),
      fetch('/api/platform/infra/overview')
    ]);
    if (configResponse.ok) setConfig(await configResponse.json());
    if (overviewResponse.ok) setOverview(await overviewResponse.json());
  };

  useEffect(() => {
    refresh().catch(() => setMessage('Não foi possível carregar o estado do projeto.'));
  }, []);

  const updateConfig = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setMessage('Salvando…');
    try {
      const response = await fetch('/api/platform/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar');
      setConfig(payload.config);
      setMessage(`Salvo na revisão ${payload.revision}.`);
      await refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex bg-[#141414]">
       <div className="w-44 border-r border-white/5 flex flex-col shrink-0 p-3 gap-1 bg-[#1c1c1c]">
          {menuItems.map(item => (
            <button 
              key={item.label}
              onClick={() => setActiveSubTab(item.label)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === item.label ? 'bg-white/10 text-[#dcdcdc]' : 'text-white/40 hover:bg-white/5 hover:text-white/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <h2 className="text-lg font-semibold mb-6 text-[#dcdcdc]">{activeSubTab}</h2>
          
          {activeSubTab === 'Geral' && (
            <div className="space-y-5 max-w-2xl">
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-9 bg-[#242424] rounded-lg border border-white/5 flex items-center justify-center">
                    <FileCode size={18} className="text-[#b6b6b6]" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[#dcdcdc]">Configuração do projeto</div>
                    <div className="text-[11px] text-white/40">Estado persistido no control plane local</div>
                  </div>
                </div>
                <label className="block text-[11px] text-white/50 mb-1">Nome</label>
                <input
                  className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-400/60"
                  value={config?.project?.name || ''}
                  onChange={(event) => setConfig((current: any) => ({ ...current, project: { ...current?.project, name: event.target.value } }))}
                />
                <label className="block text-[11px] text-white/50 mb-1 mt-3">Descrição</label>
                <textarea
                  className="w-full min-h-20 bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-400/60 resize-y"
                  value={config?.project?.description || ''}
                  onChange={(event) => setConfig((current: any) => ({ ...current, project: { ...current?.project, description: event.target.value } }))}
                />
                <button
                  disabled={saving || !config}
                  onClick={() => updateConfig({ project: config.project })}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs text-white transition-colors"
                >Salvar projeto</button>
              </div>
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Capacidades</div>
                    <div className="text-[11px] text-white/40">Ative apenas recursos que a aplicação realmente usa.</div>
                  </div>
                  <button onClick={() => refresh()} className="text-white/50 hover:text-white"><ArrowsCounterClockwise size={15} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config?.features || {}).map(([key, value]) => (
                    <button
                      key={key}
                      disabled={saving}
                      onClick={() => updateConfig({ features: { [key]: !value } })}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-[#181818] px-3 py-2 text-left hover:border-white/15 disabled:opacity-50"
                    >
                      <span className="text-xs text-white/70">{key}</span>
                      <span className={`text-[10px] ${value ? 'text-emerald-400' : 'text-white/30'}`}>{value ? 'ativo' : 'inativo'}</span>
                    </button>
                  ))}
                </div>
              </div>
              {message && <div className="text-[11px] text-white/50">{message}</div>}
            </div>
          )}

          {activeSubTab === 'Domínios' && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
                <span className="text-sm font-semibold text-white block">Preview atual</span>
                <span className="text-xs text-white/40 font-mono break-all">{window.location.origin}</span>
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" />Runtime conectado na porta {config?.runtime?.port || 3000}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
                <div className="text-sm font-semibold text-white mb-2">Infraestrutura</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
                  <span>Host: <b className="text-white/80">{overview?.runtime?.hostname || '—'}</b></span>
                  <span>Node: <b className="text-white/80">{overview?.runtime?.nodeVersion || '—'}</b></span>
                  <span>Uptime: <b className="text-white/80">{overview?.runtime?.uptimeSeconds || 0}s</b></span>
                  <span>Memória RSS: <b className="text-white/80">{overview?.runtime?.memory?.rssMb || 0} MB</b></span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'Segredos' && (
            <div className="space-y-3 max-w-2xl">
              <div className="text-[11px] text-white/40 mb-3">Os valores nunca são retornados pela API; apenas o estado de configuração é exibido.</div>
              {(overview?.secrets || []).map((secret: any) => (
                <div key={secret.key} className="flex items-center justify-between p-3 bg-[#202020] rounded-lg border border-white/5 font-mono text-xs">
                  <span className="text-[#afafaf]">{secret.key}</span>
                  <span className={secret.configured ? 'text-emerald-400' : 'text-amber-400'}>{secret.configured ? 'configurado' : 'ausente'}</span>
                </div>
              ))}
            </div>
          )}
       </div>
    </div>
  );
}
