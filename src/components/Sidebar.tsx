import { 
  MagnifyingGlass, 
  Plus, 
  Desktop, 
  Users, 
  FolderSimple, 
  Sparkle, 
  Lightning, 
  PuzzlePiece, 
  DotsThree,
  CaretRight,
  ChatCircleText,
  Globe,
  Gear,
  X,
  Sun,
  Moon
} from '@phosphor-icons/react';

export function Sidebar({ theme, toggleTheme, onNewTask }: { theme: 'light' | 'dark'; toggleTheme: () => void; onNewTask?: () => void }) {
  return (
    <aside className="w-64 bg-bg-surface-panel/95 border-r border-border-divider-subtle flex flex-col h-full shrink-0 shadow-[12px_0_40px_rgba(0,0,0,0.12)]">
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent opacity-80" />
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img 
            src="https://imgdb.io/i/civJWXo.png" 
            alt="Logotipo da Aplicação" 
            className="size-6 object-contain rounded-md" 
          />
          <span className="font-semibold text-sm tracking-tight text-text-content-primary">kvant</span>
        </div>
        <div className="flex gap-2 text-text-content-secondary/40">
          <MagnifyingGlass size={16} className="cursor-pointer hover:text-text-content-primary transition-colors" />
          <Desktop size={16} className="cursor-pointer hover:text-text-content-primary transition-colors" />
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <button onClick={onNewTask} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-content-primary/90 hover:bg-bg-action-hover rounded-lg transition-colors group border border-transparent hover:border-border-divider-subtle" aria-label="Criar nova tarefa">
          <span className="size-7 rounded-md bg-white/[0.08] flex items-center justify-center group-hover:bg-white/[0.14] transition-colors">
            <Plus size={16} className="text-text-content-primary/60 group-hover:text-text-content-primary" />
          </span>
          <span className="font-medium">Nova tarefa</span>
          <span className="ml-auto text-[10px] text-text-content-secondary/50 font-mono">⌘ K</span>
        </button>

        <div className="pt-2 pb-1">
          <NavItem icon={<Desktop size={18} />} label="Computadores" />
          <NavItem icon={<Users size={18} />} label="Agents" badge="Cue!" />
          <NavItem icon={<FolderSimple size={18} />} label="Biblioteca" />
          <NavItem icon={<Sparkle size={18} />} label="Criações" />
          <NavItem icon={<Lightning size={18} />} label="Automações" />
          <NavItem icon={<PuzzlePiece size={18} />} label="Plugins" />
          <NavItem icon={<DotsThree size={18} />} label="Mais" />
        </div>

        {/* Projects */}
        <div className="pt-6">
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-bold text-text-content-secondary uppercase tracking-wider">
            <span>Projetos</span>
            <div className="flex gap-1">
              <DotsThree size={12} className="cursor-pointer hover:text-text-content-primary" />
              <Plus size={12} className="cursor-pointer hover:text-text-content-primary" />
            </div>
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-content-primary/60 hover:bg-bg-action-hover rounded-lg transition-colors">
            <div className="size-4 border border-border-divider-subtle rounded flex items-center justify-center">
              <Plus size={10} />
            </div>
            <span>Novo projeto</span>
          </button>
        </div>

        {/* Tasks */}
        <div className="pt-6">
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-bold text-text-content-secondary uppercase tracking-wider">
            <span>Tarefas</span>
            <div className="flex gap-1">
              <DotsThree size={12} className="cursor-pointer hover:text-text-content-primary" />
              <MagnifyingGlass size={12} className="cursor-pointer hover:text-text-content-primary" />
              <Plus size={12} className="cursor-pointer hover:text-text-content-primary" />
            </div>
          </div>
          <TaskItem label="Testar o conector Nao e resumir suas capacidades" active />
          <TaskItem label="Converter o site para React + Vite e remover arquivos desnecessários" />
          <TaskItem label="Aplicação completa na infraestrutura de teste" />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 mt-auto space-y-4">
        {/* Explore Box */}
        <div className="bg-bg-canvas-main/40 border border-border-divider-subtle rounded-xl p-3 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
               <Sparkle size={14} className="text-blue-400/80" />
               <span className="text-xs font-medium text-text-content-primary/80">Kvant (Versão de Desenvolvimento)</span>
            </div>
            <X size={14} className="text-text-content-secondary/20 cursor-pointer hover:text-text-content-primary" />
          </div>
          <button className="mt-3 w-full bg-interactive-cta-bg text-bg-canvas-main py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity">
            Ver o que há de novo
            <CaretRight size={14} />
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center justify-between group cursor-pointer p-1 rounded-lg hover:bg-bg-action-hover transition-colors">
          <div className="flex items-center gap-2">
            <div className="size-7 bg-teal-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">L</div>
            <span className="text-xs font-medium text-text-content-primary">levergucci XPTO</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-content-secondary">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTheme();
              }}
              title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              className="p-1 hover:bg-bg-action-hover hover:text-text-content-primary rounded transition-all cursor-pointer flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Globe size={15} className="hover:text-text-content-primary transition-colors" />
            <Gear size={15} className="hover:text-text-content-primary transition-colors" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-content-secondary hover:bg-bg-action-hover hover:text-text-content-primary rounded-lg transition-all group">
      <div className="flex items-center gap-3">
        <span className="text-text-content-secondary/40 group-hover:text-text-content-primary transition-colors">{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-white/5 text-[9px] px-1.5 py-0.5 rounded font-bold text-text-content-secondary">
          {badge}
        </span>
      )}
    </button>
  );
}

function TaskItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-start gap-3 px-3 py-2 text-xs text-left rounded-lg transition-colors ${active ? 'bg-bg-action-hover text-text-content-primary' : 'text-text-content-secondary hover:bg-bg-action-hover hover:text-text-content-primary/60'}`}>
      <ChatCircleText size={14} className="shrink-0 mt-0.5 opacity-40" />
      <span className="line-clamp-2 leading-relaxed">{label}</span>
    </button>
  );
}
