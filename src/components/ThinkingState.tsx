"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Favicon, extractCleanDomain } from "@/lib/favicon";

/* ─────────────────────────────────────────────────────────
 * THINKING — expandable agent trace, four variants
 *
 *   Steps      step list with spinner → muted checks
 *   Reasoning  prose reasoning that expands, then settles
 *   Search     web-search trace: query + sources read
 *   Coding     tool trace: files read, edits, commands
 *
 * The trace runs once, settles, and remains expandable.
 * ───────────────────────────────────────────────────────── */

const STAGES = [800, 600, 1800, 2600, 1600];

function useSequence(steps: number[]) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps]);
  return stage;
}

type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};

const VARIANTS: Record<
  string,
  { active: string; done: string; rows: Row[]; query?: string }
> = {
  Steps: {
    active: "Processando",
    done: "Processamento concluído",
    rows: [
      { primary: "Analisando solicitação e contexto do projeto" },
      { primary: "Mapeando arquivos e estrutura de código" },
      { primary: "Avaliando estratégia de execução e regras" },
      { primary: "Preparando plano de ação do agente" },
    ],
  },
  Planning: {
    active: "Planejando",
    done: "Plano estruturado",
    rows: [
      { primary: "Definindo fluxo de engenharia de ponta" },
      { primary: "Mapeando dependências e ferramentas MCP" },
      { primary: "Estruturando componentes e lógica de estado" },
    ],
  },
  Reasoning: {
    active: "Raciocinando",
    done: "Raciocínio concluído",
    rows: [
      { primary: "Avaliando dependências do sistema e verificando regras no ambiente..." },
      { primary: "Garantindo compatibilidade de código e otimizando a solução antes da execução." },
    ],
  },
  Verification: {
    active: "Verificando",
    done: "Verificação concluída",
    rows: [
      { primary: "Validando integridade do código gerado" },
      { primary: "Checando conformidade com as diretrizes de design" },
      { primary: "Testando fluxos de interatividade e estados" },
    ],
  },
  Search: {
    active: "Pesquisando na web",
    done: "Pesquisa na web concluída",
    query: "consultando fontes na web",
    rows: [
      { primary: "Google Search", secondary: "google.com", href: "https://www.google.com" },
      { primary: "Documentação Oficial", secondary: "docs.dev", href: "https://github.com" },
      { primary: "Repositório de Código", secondary: "github.com", href: "https://github.com" },
    ],
  },
  Coding: {
    active: "Executando ferramentas",
    done: "Ferramentas executadas",
    rows: [
      { primary: "Ler", secondary: "App.tsx", mono: true },
      { primary: "Editar", secondary: "server.ts", mono: true, add: 24, del: 8 },
      { primary: "Executar", secondary: "npm run check", mono: true },
    ],
  },
};

export function ThinkingStateGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 w-full my-1.5">{children}</div>;
}

export default function ThinkingState({
  variant = "Steps",
  onSettled,
  rows,
  active,
  done,
  icon,
  elapsedSeconds = 1,
  working: propWorking,
}: {
  variant?: string;
  onSettled?: () => void;
  /** override the built-in trace content (keeps the primitive reusable) */
  rows?: Row[];
  active?: string;
  done?: string;
  /** override the header glyph (defaults to the sparkle) */
  icon?: ReactNode;
  elapsedSeconds?: number;
  /** whether the trace is actively working in real-time */
  working?: boolean;
}) {
  const stage = useSequence(STAGES);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const base = VARIANTS[variant] ?? VARIANTS.Steps;
  const v = {
    ...base,
    rows: rows && rows.length > 0 ? rows : base.rows,
    active: active ?? base.active,
    done: done ?? base.done,
  };
  const expanded = manualExpanded ?? true;
  const working = propWorking !== undefined ? propWorking : stage < 3;

  /* let embedders sequence content after the trace settles */
  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [working, onSettled]);

  return (
    <div className="flex w-full min-w-0 max-w-full overflow-hidden flex-col select-none">
      {/* header — shared across variants */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? true))}
        className="-mx-1.5 flex min-w-0 max-w-full items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/5 cursor-pointer"
      >
        <div className="size-5 rounded-[3px] bg-cover bg-center overflow-hidden flex items-center justify-center shadow-xs border border-white/10" style={{ backgroundImage: `url('https://imgdb.io/i/axsNhBY.png')` }}>
          {icon ? (
            <span className={`flex shrink-0 transition-colors text-text-content-secondary ${working ? 'animate-pulse' : ''}`}>
              {icon}
            </span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-text-content-secondary ${working ? 'animate-spin-slow text-text-content-primary' : ''}`}>
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          )}
        </div>
        <span role="status" className="min-w-0 max-w-full break-words whitespace-normal text-xs font-medium text-text-content-primary flex items-center gap-1.5">
          {working ? (
            <span className="thinking-shimmer font-semibold">{v.active} · {elapsedSeconds}s</span>
          ) : (
            <span className="text-text-content-secondary font-medium">{v.done} em {elapsedSeconds}s</span>
          )}
        </span>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-text-content-secondary transition-transform duration-300"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>

        {working && (
          <div className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-white/5 overflow-hidden rounded-full">
            <div className="h-full bg-linear-to-r from-transparent via-white/40 to-transparent animate-execution-sheen w-full" />
          </div>
        )}
      </button>

      {/* expandable trace content */}
      {expanded && (
        <div className="mt-2 w-full animate-in fade-in duration-300">
          {variant === "Reasoning" ? (
            /* Frameless Transparent AI Reasoning Trace */
            <div className="space-y-1.5 pl-3 border-l border-border-divider-subtle/40 ml-1 text-xs">
              <div className="flex items-center gap-2 font-mono text-[10px] text-text-content-secondary uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-text-content-secondary animate-pulse" />
                Raciocínio do Agente
              </div>
              <div className="space-y-1.5 text-text-content-primary/90 font-normal leading-relaxed text-[12.5px]">
                {v.rows.map((row, i) => (
                  <p key={`reasoning_${row.primary}_${i}`} className="flex items-start gap-2">
                    <span className="text-text-content-secondary/50 font-mono text-[11px] shrink-0">›</span>
                    <span className="min-w-0 break-words">{row.primary}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : variant === "Search" ? (
            /* Frameless Transparent Web Search Trace */
            <div className="min-w-0 max-w-full space-y-2 pl-3 border-l border-border-divider-subtle/40 ml-1 text-xs">
              <div className="flex items-center gap-2 font-mono text-[11px] text-text-content-secondary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 shrink-0">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <span className="min-w-0 truncate">{v.query || "Consultando informações na web..."}</span>
              </div>
              <div className="space-y-1">
                {v.rows.map((row, i) => {
                  const hasHref = Boolean(row.href && row.href !== "#");
                  const content = (
                    <>
                      <div className="min-w-0 flex items-center gap-2 truncate">
                        <Favicon urlOrDomain={row.href || row.secondary || ""} size={14} />
                      <span className={`min-w-0 truncate font-medium text-text-content-primary/90 text-[12px] ${hasHref ? 'group-hover:underline' : ''}`}>
                          {row.primary}
                        </span>
                      </div>
                      {row.secondary && (
                        <span className="text-[10px] font-mono text-text-content-secondary/60 shrink-0 ml-2">
                          {row.secondary}
                        </span>
                      )}
                    </>
                  );

                  return hasHref ? (
                    <a
                      key={`search_${row.primary}_${i}`}
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between py-1 text-xs hover:text-text-content-primary transition-colors group cursor-pointer"
                    >
                      {content}
                    </a>
                  ) : (
                    <div
                      key={`search_${row.primary}_${i}`}
                      className="flex items-center justify-between py-1 text-xs text-text-content-primary/90"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Frameless Transparent Standard Step Trace */
            <div className="min-w-0 max-w-full space-y-1 pl-3 border-l border-border-divider-subtle/40 ml-1">
              {v.rows.map((row, i) => {
                const isActive = working && i === v.rows.length - 1;
                return (
                  <div key={`step_${row.primary}_${i}`} className="flex min-w-0 max-w-full items-center gap-2.5 py-1 text-xs text-text-content-primary/80 transition-colors">
                    <span className={`size-1.5 rounded-full ${isActive ? 'bg-zinc-400 animate-pulse shadow-[0_0_8px_rgba(161,161,170,0.5)]' : 'bg-text-content-secondary/60'} shrink-0`} />
                    <span className={`min-w-0 flex-1 font-medium text-[12px] truncate ${isActive ? 'text-text-content-primary' : ''}`}>{row.primary}</span>
                    {row.secondary && (
                      <span className="max-w-[38%] truncate text-[11px] font-mono text-text-content-secondary/60 shrink-0 ml-auto">{row.secondary}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
