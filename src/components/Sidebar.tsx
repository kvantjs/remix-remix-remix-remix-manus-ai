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

export function Sidebar({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
  return (
    <aside className="w-[292px] bg-[#1f1f1f] border-r border-border-divider-subtle flex flex-col h-full shrink-0">
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
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-content-primary/90 hover:bg-bg-action-hover rounded-lg transition-colors group">
          <Plus size={18} className="text-text-content-primary/40 group-hover:text-text-content-primary" />
          <span>Nova tarefa</span>
        </button>

        <div className="pt-2 pb-1">
          <NavItem icon={<Desktop size={18} />} label="Computadores" color="#ffffff" />
          <NavItem icon={<Users size={18} />} label="Agents" badge="Cue!" color="#ffffff" />
          <NavItem icon={<FolderSimple size={18} />} label="Biblioteca" color="#d1d1d1" />
          <NavItem icon={<Sparkle size={18} />} label="Criações" color="#f3f3f3" />
          <NavItem icon={<Lightning size={18} />} label="Automações" color="#e2e2e2" />
          <NavItem icon={<PuzzlePiece size={18} />} label="Plugins" color="#cccccc" />
          <NavItem icon={<DotsThree size={18} />} label="Mais" color="#d6d6d6" />
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

function NavItem({ icon, label, badge, color }: { icon: React.ReactNode; label: string; badge?: string; color?: string }) {
  return (
    <button 
      className="w-full flex items-center justify-between px-3 py-2 text-sm text-text-content-secondary hover:bg-bg-action-hover hover:text-text-content-primary rounded-lg transition-all group"
      style={color ? { color } : undefined}
    >
      <div className="flex items-center gap-3">
        <span className="text-text-content-secondary/40 group-hover:text-text-content-primary transition-colors" style={color ? { color } : undefined}>{icon}</span>
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
  const displayLabel = label.length > 32 ? label.substring(0, 32) + '...' : label;
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-left rounded-lg transition-colors ${active ? 'bg-bg-action-hover text-text-content-primary' : 'text-text-content-secondary hover:bg-bg-action-hover hover:text-text-content-primary/60'}`} title={label}>
      <ChatCircleText size={14} className="shrink-0 opacity-40" />
      <span className="truncate">{displayLabel}</span>
    </button>
  );
}
