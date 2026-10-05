"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
    active: "Pensando",
    done: "Pensamento concluído",
    rows: [
      { primary: "Analisando solicitação e contexto do projeto" },
      { primary: "Mapeando arquivos e estrutura de código" },
      { primary: "Avaliando estratégia de execução e regras" },
      { primary: "Preparando plano de ação do agente" },
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

function Dot({ tone }: { tone: string }) {
  return (
    <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-full text-white ${tone}`}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    </span>
  );
}

function getCleanDomain(urlOrDomain: string): string {
  if (!urlOrDomain) return "";
  try {
    let cleaned = urlOrDomain.trim().toLowerCase();
    cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, "");
    cleaned = cleaned.split("/")[0];
    return cleaned;
  } catch (e) {
    return "";
  }
}

function Favicon({ urlOrDomain, tone }: { urlOrDomain: string; tone: string }) {
  const domain = getCleanDomain(urlOrDomain);
  const [imgSrc, setImgSrc] = useState(`https://vemetric.com/${domain}`);
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return <Dot tone={tone} />;
  }

  return (
    <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-full bg-white/10 overflow-hidden ${tone}`}>
      <img
        src={imgSrc}
        alt=""
        className="size-2.5 object-contain"
        onError={() => {
          if (imgSrc.includes("vemetric.com")) {
            setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
          } else {
            setFailed(true);
          }
        }}
      />
    </span>
  );
}

const TONES = ["bg-accent", "bg-orange", "bg-green"];

export default function ThinkingState({
  variant = "Steps",
  onSettled,
  rows,
  active,
  done,
  icon,
  elapsedSeconds = 1,
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
  const working = stage < 3;

  /* let embedders sequence content after the trace settles */
  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [working, onSettled]);

  return (
    <div className="flex w-full max-w-[780px] flex-col select-none">
      {/* header — shared across variants */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? true))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/5"
      >
        {icon ? (
          <span className="flex shrink-0 transition-colors text-text-content-secondary">
            {icon}
          </span>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-content-secondary animate-pulse">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        )}
        <span role="status" className="text-xs font-medium text-text-content-primary flex items-center gap-1.5">
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
      </button>

      {/* expandable trace content */}
      {expanded && (
        <div className="mt-2 w-full animate-in fade-in duration-300">
          {variant === "Reasoning" ? (
            /* Frameless Transparent AI Reasoning Trace */
            <div className="space-y-1.5 pl-3 border-l border-border-divider-subtle/40 ml-1 text-xs">
              <div className="flex items-center gap-2 font-mono text-[10px] text-text-content-secondary uppercase tracking-wider">
                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                Raciocínio do Agente
              </div>
              <div className="space-y-1.5 text-text-content-primary/90 font-normal leading-relaxed text-[12.5px]">
                {v.rows.map((row, i) => (
                  <p key={`reasoning_${row.primary}_${i}`} className="flex items-start gap-2">
                    <span className="text-text-content-secondary/50 font-mono text-[11px] shrink-0">›</span>
                    <span>{row.primary}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : variant === "Search" ? (
            /* Frameless Transparent Web Search Trace */
            <div className="space-y-2 pl-3 border-l border-border-divider-subtle/40 ml-1 text-xs">
              <div className="flex items-center gap-2 font-mono text-[11px] text-text-content-secondary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-content-secondary shrink-0">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <span className="truncate">{v.query || "Consultando informações na web..."}</span>
              </div>
              <div className="space-y-1">
                {v.rows.map((row, i) => (
                  <a
                    key={`search_${row.primary}_${i}`}
                    href={row.href || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between py-1 text-xs hover:text-text-content-primary transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Favicon urlOrDomain={row.href || row.secondary || ""} tone={TONES[i % 3]} />
                      <span className="font-medium text-text-content-primary/90 text-[12px] truncate group-hover:underline">
                        {row.primary}
                      </span>
                    </div>
                    {row.secondary && (
                      <span className="text-[10px] font-mono text-text-content-secondary/60 shrink-0 ml-2">
                        {row.secondary}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            /* Frameless Transparent Standard Step Trace */
            <div className="space-y-1 pl-3 border-l border-border-divider-subtle/40 ml-1">
              {v.rows.map((row, i) => (
                <div key={`step_${row.primary}_${i}`} className="flex items-center gap-2.5 py-1 text-xs text-text-content-primary/80 transition-colors">
                  <span className="size-1.5 rounded-full bg-text-content-secondary/60 animate-pulse shrink-0" />
                  <span className="font-medium text-[12px] truncate">{row.primary}</span>
                  {row.secondary && (
                    <span className="text-[11px] font-mono text-text-content-secondary/60 shrink-0 ml-auto">{row.secondary}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
