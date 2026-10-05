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
export type WorkspaceSubTab = 'preview' | 'code' | 'terminal' | 'projects' | 'automations' | 'settings';

interface WorkspaceProps {
  onClose: () => void;
  customFiles?: Record<string, string>;
  onSendPrompt?: (prompt: string) => void;
  toolCalls?: ToolCallTrace[];
  isWorking?: boolean;
  workingTime?: string;
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
  workingTime,
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
            workingTime={workingTime}
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
                active={workspaceSubTab === 'automations'} 
                onClick={() => setWorkspaceSubTab('automations')}
                icon={<Calendar size={13} />} 
                label="Execuções" 
              />
              <NavButton 
                active={workspaceSubTab === 'projects'} 
                onClick={() => setWorkspaceSubTab('projects')}
                icon={<Folder size={13} />} 
                label="Projetos" 
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
                onClick={() => setWorkspaceSubTab('automations')}
                className="bg-[#dcdcdc] text-black px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 hover:bg-[#c0c0c0] transition-colors shadow-xs cursor-pointer"
               >
                  <ArrowUp size={13} />
                  Executar tarefa
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
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Não foi possível carregar os projetos.');
    const payload = await response.json();
    setProjects(payload.projects || []);
    if (!selected && payload.projects?.[0]) await selectProject(payload.projects[0].id);
  };

  const selectProject = async (id: string) => {
    const [projectResponse, versionsResponse, filesResponse, membersResponse, auditResponse] = await Promise.all([
      fetch(`/api/projects/${encodeURIComponent(id)}`),
      fetch(`/api/projects/${encodeURIComponent(id)}/versions`),
      fetch(`/api/projects/${encodeURIComponent(id)}/files`),
      fetch(`/api/projects/${encodeURIComponent(id)}/members`),
      fetch(`/api/projects/${encodeURIComponent(id)}/audit`)
    ]);
    if (!projectResponse.ok || !versionsResponse.ok || !filesResponse.ok || !membersResponse.ok || !auditResponse.ok) throw new Error('Não foi possível carregar o projeto.');
    const projectPayload = await projectResponse.json();
    const versionsPayload = await versionsResponse.json();
    const filesPayload = await filesResponse.json();
    const membersPayload = await membersResponse.json();
    const auditPayload = await auditResponse.json();
    setSelected(projectPayload);
    setVersions(versionsPayload.versions || []);
    setFiles(filesPayload.files || []);
    setMembers(membersPayload.members || []);
    setAuditEntries(auditPayload.entries || []);
    setSelectedFile('');
    setFileContent('');
    setFileDiff('');
  };

  useEffect(() => { refresh().catch((error) => setMessage(error?.message || 'Falha ao carregar projetos.')); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error || 'Falha ao criar projeto.');
    setNewName(''); setMessage('Projeto criado.'); await refresh(); await selectProject(payload.project.id);
  };

  const snapshot = async () => {
    if (!selected?.project?.id) return;
    const response = await fetch(`/api/projects/${selected.project.id}/snapshots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Snapshot do Workspace — ${new Date().toLocaleString('pt-BR')}` }) });
    const payload = await response.json();
    setMessage(payload.created ? `Snapshot ${payload.version?.shortSha || ''} criado.` : payload.reason || payload.error || 'Nenhuma alteração.');
    await selectProject(selected.project.id);
  };

  const sync = async () => {
    if (!selected?.project?.id) return;
    const response = await fetch(`/api/projects/${selected.project.id}/sync-github`, { method: 'POST' });
    const payload = await response.json();
    setMessage(response.ok ? 'Sincronizado com o GitHub privado.' : (payload.error || 'Falha no sync GitHub.'));
    await selectProject(selected.project.id);
  };

  const openFile = async (filePath: string) => {
    const response = await fetch(`/api/projects/${selected.project.id}/files/read?path=${encodeURIComponent(filePath)}`);
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error || 'Falha ao ler arquivo.');
    setSelectedFile(filePath); setFileContent(payload.content || ''); setFileDiff('');
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    const response = await fetch(`/api/projects/${selected.project.id}/files`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: selectedFile, content: fileContent }) });
    const payload = await response.json();
    setMessage(response.ok ? `Arquivo ${selectedFile} salvo.` : (payload.error || 'Falha ao salvar arquivo.'));
    if (response.ok) await selectProject(selected.project.id);
  };

  const showDiff = async () => {
    if (!selectedFile) return;
    const response = await fetch(`/api/projects/${selected.project.id}/diff?path=${encodeURIComponent(selectedFile)}`);
    const payload = await response.json();
    setFileDiff(response.ok ? payload.diff || '(sem alterações)' : (payload.error || 'Falha ao gerar diff.'));
  };

  const saveMember = async () => {
    if (!newMemberId.trim()) return;
    const response = await fetch(`/api/projects/${selected.project.id}/members`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openId: newMemberId.trim(), name: newMemberId.trim(), role: newMemberRole }) });
    const payload = await response.json();
    setMessage(response.ok ? 'Permissão atualizada.' : (payload.error || 'Falha ao atualizar permissão.'));
    if (response.ok) { setNewMemberId(''); await selectProject(selected.project.id); }
  };

  const removeMember = async (openId: string) => {
    const response = await fetch(`/api/projects/${selected.project.id}/members/${encodeURIComponent(openId)}`, { method: 'DELETE' });
    const payload = await response.json();
    setMessage(response.ok ? 'Membro removido.' : (payload.error || 'Falha ao remover membro.'));
    if (response.ok) await selectProject(selected.project.id);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#141414] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div><h2 className="text-lg font-semibold text-white">Projetos e versões</h2><p className="text-xs text-white/45 mt-1">Registro local com histórico Git e sincronização privada.</p></div>
          <div className="flex gap-2"><input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} placeholder="Nome do novo projeto" className="w-44 rounded-lg bg-[#202020] border border-white/10 px-3 py-2 text-xs text-white outline-none" /><button onClick={create} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-medium">Criar</button></div>
        </div>
        {message && <div className="mb-4 text-xs text-white/50">{message}</div>}
        <div className="grid grid-cols-[220px_1fr] gap-4">
          <div className="space-y-2">{projects.map((project) => <button key={project.id} onClick={() => selectProject(project.id)} className={`w-full text-left rounded-lg border px-3 py-3 ${selected?.project?.id === project.id ? 'border-blue-400/50 bg-blue-400/10' : 'border-white/7 bg-[#1c1c1c] hover:border-white/15'}`}><div className="text-xs text-white truncate">{project.name}</div><div className="text-[10px] text-white/35 mt-1">{project.branch} · {project.slug}</div></button>)}</div>
          {selected ? <div className="rounded-xl border border-white/7 bg-[#1c1c1c] p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-white">{selected.project.name}</div><div className="text-[11px] text-white/35 font-mono mt-1 break-all">{selected.project.path}</div><div className="text-[11px] text-emerald-400 mt-2">HEAD {selected.status?.head?.slice(0, 12)} · {selected.status?.branch}</div></div><div className="flex gap-2"><button onClick={snapshot} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs text-white hover:bg-white/15">Snapshot</button><button onClick={sync} className="px-2.5 py-1.5 rounded-lg bg-white text-black text-xs hover:bg-white/80">Sync GitHub</button></div></div>
            <div className="mt-5 text-xs font-semibold text-white/70">Histórico de versões</div>
            <div className="mt-2 space-y-2">{versions.map((version) => <div key={version.sha} className="border-l-2 border-blue-400/50 pl-3 py-1"><div className="text-xs text-white">{version.message}</div><div className="text-[10px] text-white/35 font-mono mt-1">{version.shortSha} · {version.author} · {new Date(version.date).toLocaleString('pt-BR')}</div></div>)}</div>
            <div className="mt-6 border-t border-white/7 pt-4">
              <div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold text-white/70">Arquivos do projeto</div><div className="text-[10px] text-white/35">Somente arquivos fora de .git e node_modules</div></div>
              <div className="grid grid-cols-[180px_1fr] gap-3">
                <div className="max-h-52 overflow-y-auto space-y-1">{files.filter((file) => file.type === 'file').map((file) => <button key={file.path} onClick={() => openFile(file.path)} className={`w-full text-left rounded px-2 py-1.5 text-[11px] truncate ${selectedFile === file.path ? 'bg-blue-400/15 text-blue-200' : 'text-white/50 hover:bg-white/5'}`}>{file.path}</button>)}</div>
                <div className="min-w-0"><div className="flex items-center gap-2 mb-2"><span className="text-[11px] text-white/45 font-mono truncate flex-1">{selectedFile || 'Selecione um arquivo'}</span><button disabled={!selectedFile} onClick={showDiff} className="px-2 py-1 rounded bg-white/8 text-[10px] text-white disabled:opacity-30">Diff</button><button disabled={!selectedFile} onClick={saveFile} className="px-2 py-1 rounded bg-white text-black text-[10px] disabled:opacity-30">Salvar</button></div><textarea value={fileContent} onChange={(event) => setFileContent(event.target.value)} disabled={!selectedFile} className="w-full h-44 resize-y rounded-lg bg-[#121212] border border-white/8 p-3 text-[11px] leading-relaxed font-mono text-white/80 outline-none focus:border-blue-400/50 disabled:opacity-40" spellCheck={false} />{fileDiff && <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-[#101010] border border-white/7 p-3 text-[10px] leading-relaxed text-white/65">{fileDiff}</pre>}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/7 pt-4">
              <div><div className="text-xs font-semibold text-white/70 mb-2">Membros e papéis</div><div className="space-y-1">{members.map((member) => <div key={member.openId} className="flex items-center gap-2 rounded bg-[#151515] px-2 py-1.5"><span className="text-[11px] text-white/70 truncate flex-1">{member.name || member.openId}</span><span className="text-[10px] text-blue-300 font-mono">{member.role}</span>{member.role !== 'owner' && <button onClick={() => removeMember(member.openId)} className="text-[10px] text-red-300/70 hover:text-red-200">Remover</button>}</div>)}</div><div className="flex gap-1 mt-2"><input value={newMemberId} onChange={(event) => setNewMemberId(event.target.value)} placeholder="openId do membro" className="min-w-0 flex-1 rounded bg-[#121212] border border-white/8 px-2 py-1.5 text-[10px] text-white outline-none" /><select value={newMemberRole} onChange={(event) => setNewMemberRole(event.target.value)} className="rounded bg-[#121212] border border-white/8 px-1 text-[10px] text-white"><option value="viewer">viewer</option><option value="editor">editor</option><option value="owner">owner</option></select><button onClick={saveMember} className="rounded bg-white/10 px-2 text-[10px] text-white">Adicionar</button></div></div>
              <div><div className="text-xs font-semibold text-white/70 mb-2">Auditoria</div><div className="max-h-36 overflow-y-auto space-y-1">{auditEntries.map((entry) => <div key={entry.auditId} className="text-[10px] text-white/45"><span className="text-white/70">{entry.action}</span>{entry.targetPath ? ` · ${entry.targetPath}` : ''}<span className="text-white/25"> · {new Date(entry.createdAt).toLocaleString('pt-BR')}</span></div>)}</div></div>
            </div>
          </div> : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/40">Selecione um projeto.</div>}
        </div>
      </div>
    </div>
  );
}

function AutomationsView() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const response = await fetch('/api/jobs');
    if (!response.ok) throw new Error('Não foi possível carregar as execuções.');
    const payload = await response.json();
    setJobs(payload.jobs || []);
    setLoading(false);
  };

  useEffect(() => {
    refresh().catch((error) => {
      setMessage(error?.message || 'Falha ao carregar execuções.');
      setLoading(false);
    });
    const timer = window.setInterval(() => refresh().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const createExecution = async () => {
    setMessage('Criando execução…');
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Tarefa manual do Workspace', type: 'workspace_task' })
    });
    if (!response.ok) {
      setMessage('Não foi possível criar a execução.');
      return;
    }
    setMessage('Execução criada e persistida.');
    await refresh();
  };

  const cancelExecution = async (id: string) => {
    await fetch(`/api/jobs/${encodeURIComponent(id)}/cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Cancelado no Workspace' })
    });
    await refresh();
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#141414] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Execuções e automações</h2>
            <p className="text-xs text-white/45 mt-1">Jobs do agente persistidos e recuperáveis entre reinícios.</p>
          </div>
          <button onClick={createExecution} className="px-3 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-white/80">Nova execução</button>
        </div>
        {message && <div className="mb-4 text-xs text-white/50">{message}</div>}
        {loading ? <div className="text-xs text-white/40">Carregando execuções…</div> : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-white/40">Nenhuma execução registrada.</div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-white/7 bg-[#1c1c1c] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{job.title}</div>
                    <div className="text-[11px] text-white/35 mt-1 font-mono">{job.type} · {job.id}</div>
                  </div>
                  <span className={`text-[11px] ${job.status === 'succeeded' ? 'text-emerald-400' : job.status === 'failed' ? 'text-red-400' : job.status === 'cancelled' ? 'text-white/35' : 'text-amber-300'}`}>{job.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
                  <span>{job.currentStep}</span>
                  {!['succeeded', 'failed', 'cancelled'].includes(job.status) && <button onClick={() => cancelExecution(job.id)} className="text-red-300 hover:text-red-200">Cancelar</button>}
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-blue-400 transition-all" style={{ width: `${job.progressPercent || 0}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  const [activeSubTab, setActiveSubTab] = useState('Geral');
  const [config, setConfig] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
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
    Promise.all([
      refresh(),
      fetch('/api/auth/me').then((response) => response.ok ? response.json() : null).then((payload) => setAuthUser(payload?.user || null))
    ]).catch(() => setMessage('Não foi possível carregar o estado do projeto.'));
  }, []);

  const startLogin = () => {
    const origin = encodeURIComponent(window.location.origin);
    window.location.assign(`/api/auth/login?origin=${origin}`);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthUser(null);
  };

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
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Conta da aplicação</div>
                  <div className="text-[11px] text-white/40 mt-1">Autenticação Manus OAuth com sessão validada no servidor.</div>
                  {authUser && <div className="text-[11px] text-emerald-400 mt-2">Conectado como {authUser.name || authUser.email || authUser.openId}</div>}
                </div>
                {authUser ? (
                  <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white">Sair</button>
                ) : (
                  <button onClick={startLogin} className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/80 text-xs font-medium">Entrar com Manus</button>
                )}
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
