import { useEffect, useRef, useState } from 'react';
import {
  MagnifyingGlass,
  Plus,
  Desktop,
  Users,
  FolderSimple,
  Sparkle,
  Lightning,
  PuzzlePiece,
  ChatCircleText,
  Gear,
  Sun,
  Moon,
  X,
} from '@phosphor-icons/react';
import Loader from './Loader';
import ManusMark from './ManusMark';

export type SidebarRoute = 'chat' | 'computer' | 'projects' | 'preview' | 'automations' | 'settings';

const NAV_ITEMS: Array<{ label: string; route: SidebarRoute; icon: typeof Desktop }> = [
  { label: 'Computadores', route: 'computer', icon: Desktop },
  { label: 'Agente', route: 'chat', icon: Users },
  { label: 'Biblioteca', route: 'projects', icon: FolderSimple },
  { label: 'Criações', route: 'preview', icon: Sparkle },
  { label: 'Automações', route: 'automations', icon: Lightning },
  { label: 'Integrações', route: 'settings', icon: PuzzlePiece },
];

export function Sidebar({
  theme,
  toggleTheme,
  isWorking = false,
  activeRoute = 'chat',
  activeTaskLabel,
  onNewTask,
  onNavigate,
  mobileOpen = false,
  onClose,
}: {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isWorking?: boolean;
  activeRoute?: SidebarRoute;
  activeTaskLabel?: string | null;
  onNewTask?: () => void;
  onNavigate?: (route: SidebarRoute) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setSearch('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const openRoute = (route: SidebarRoute) => {
    setSearchOpen(false);
    setSearch('');
    onNavigate?.(route);
    onClose?.();
  };

  const handleNewTask = () => {
    onNewTask?.();
    onClose?.();
  };

  const filteredItems = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
    {mobileOpen && <button type="button" aria-label="Fechar navegação" onClick={onClose} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] lg:hidden" />}
    <aside className={`${mobileOpen ? 'fixed inset-y-0 left-0 z-50 flex w-[264px] shadow-2xl lg:static lg:z-auto lg:shadow-none' : 'hidden lg:flex w-[264px]'} bg-[#1d1d1d] border-r border-white/[0.07] flex-col h-full shrink-0`}>
      <div className="h-14 px-4 flex items-center justify-between shrink-0">
        <button type="button" onClick={handleNewTask} className="flex items-center gap-2.5 rounded-lg text-left" aria-label="Ir para nova tarefa">
          <ManusMark className="size-6 rounded-md" />
          <span className="font-semibold text-[14px] tracking-tight text-white/90">manus</span>
        </button>
        <div className="flex items-center gap-1 text-white/45">
          <button type="button" onClick={() => setSearchOpen((open) => !open)} aria-label="Pesquisar navegação" title="Pesquisar (⌘K)" className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white/90 transition-colors">
            {searchOpen ? <X size={17} /> : <MagnifyingGlass size={17} />}
          </button>
          <button type="button" onClick={() => openRoute('computer')} aria-label="Abrir computador do agente" title="Computador do agente" className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white/90 transition-colors">
            <Desktop size={17} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#252525] px-2.5">
            <MagnifyingGlass size={15} className="shrink-0 text-white/40" />
            <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar" aria-label="Pesquisar seções" className="h-9 min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35" />
            <kbd className="rounded border border-white/10 px-1 text-[9px] text-white/35">ESC</kbd>
          </div>
          <div className="mt-1 rounded-lg bg-[#252525] p-1">
            {filteredItems.length ? filteredItems.map((item) => {
              const Icon = item.icon;
              return <button key={item.label} type="button" onClick={() => openRoute(item.route)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-white/70 hover:bg-white/[0.07] hover:text-white"><Icon size={15} />{item.label}</button>;
            }) : <p className="px-2 py-2 text-[11px] text-white/40">Nenhuma seção encontrada.</p>}
          </div>
        </div>
      )}

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
        <button type="button" onClick={handleNewTask} disabled={isWorking} title={isWorking ? 'Interrompa a tarefa atual antes de iniciar outra' : 'Nova tarefa'} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/90 hover:bg-white/[0.06] rounded-lg transition-colors group disabled:cursor-not-allowed disabled:opacity-40">
          <Plus size={18} className="text-white/55 group-hover:text-white" />
          <span>Nova tarefa</span>
        </button>

        <div className="pt-3 pb-1 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.label} icon={<item.icon size={18} />} label={item.label} active={activeRoute === item.route} onClick={() => openRoute(item.route)} />
          ))}
        </div>

        <div className="pt-6">
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            <span>Projetos</span>
            <button type="button" onClick={() => openRoute('projects')} aria-label="Abrir projetos" title="Abrir projetos" className="flex size-6 items-center justify-center rounded hover:bg-white/[0.06] hover:text-white/80"><Plus size={13} /></button>
          </div>
          <button type="button" onClick={() => openRoute('projects')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white/85 rounded-lg transition-colors">
            <span className="size-4 border border-white/20 rounded flex items-center justify-center"><Plus size={10} /></span>
            <span>Novo projeto</span>
          </button>
        </div>

        <div className="pt-6">
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            <span>Tarefas</span>
            {activeTaskLabel && <ChatCircleText size={13} />}
          </div>
          {activeTaskLabel ? (
            <button type="button" onClick={() => openRoute('computer')} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left rounded-lg bg-white/[0.06] text-white/85 hover:bg-white/[0.09] transition-colors" title={activeTaskLabel}>
              {isWorking ? <Loader size={14} className="shrink-0" /> : <ChatCircleText size={14} className="shrink-0 text-white/45" />}
              <span className="truncate">{activeTaskLabel}</span>
            </button>
          ) : (
            <p className="px-3 py-2 text-[11px] leading-relaxed text-white/35">Suas tarefas recentes aparecerão aqui.</p>
          )}
        </div>
      </nav>

      <div className="mt-auto border-t border-white/[0.07] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-white/75">M</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/75">Manus</p>
              <p className="text-[10px] text-white/35">Espaço de trabalho</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/45">
            <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white/90 transition-colors">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" onClick={() => openRoute('settings')} aria-label="Abrir configurações" title="Configurações" className="flex size-8 items-center justify-center rounded-lg hover:bg-white/[0.06] hover:text-white/90 transition-colors"><Gear size={16} /></button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors group ${active ? 'bg-white/[0.07] text-white/90' : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'}`}>
      <span className={`transition-colors ${active ? 'text-white/80' : 'text-white/40 group-hover:text-white/75'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
