"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Favicon, extractCleanDomain } from "@/lib/favicon";
import { getContextualToolIcon } from "./ToolChips";
import { WorkingDot } from "./WorkingLoader";

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

export type ThinkingPhase = "Pensando" | "Raciocinando" | "Trabalhando";

export function AnimatedThinkingStatus({
  livePhase,
  elapsedSeconds = 1,
  className = "",
}: {
  livePhase?: "Pensando" | "Raciocinando" | "Trabalhando" | string;
  elapsedSeconds?: number;
  className?: string;
}) {
  const [currentPhase, setCurrentPhase] = useState<ThinkingPhase>(() => {
    if (livePhase) {
      const norm = String(livePhase).toLowerCase();
      if (norm.includes("racioc") || norm.includes("analis") || norm.includes("deliber")) return "Raciocinando";
      if (norm.includes("trab") || norm.includes("execut") || norm.includes("cod") || norm.includes("tool") || norm.includes("bash") || norm.includes("terminal") || norm.includes("browser")) return "Trabalhando";
    }
    return "Pensando";
  });

  // Synchronize instantly whenever real agent live events update
  useEffect(() => {
    if (livePhase) {
      const norm = String(livePhase).toLowerCase();
      if (norm.includes("racioc") || norm.includes("analis") || norm.includes("deliber")) {
        setCurrentPhase("Raciocinando");
      } else if (norm.includes("trab") || norm.includes("execut") || norm.includes("cod") || norm.includes("tool") || norm.includes("bash") || norm.includes("terminal") || norm.includes("browser")) {
        setCurrentPhase("Trabalhando");
      } else if (norm.includes("pens") || norm.includes("compreend") || norm.includes("inici")) {
        setCurrentPhase("Pensando");
      }
    }
  }, [livePhase]);



  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentPhase}
          initial={{ opacity: 0, y: 5, filter: "blur(1.5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -5, filter: "blur(1.5px)" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="thinking-shimmer font-semibold whitespace-nowrap inline-block"
        >
          {currentPhase}
        </motion.span>
      </AnimatePresence>
      <span className="text-text-content-secondary/80 font-normal">
        · {elapsedSeconds || 1}s
      </span>
    </span>
  );
}

type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
  icon?: string;
};

const VARIANTS: Record<string, { active: string; done: string; rows: Row[]; query?: string }> = {
  Steps: { active: "Em andamento", done: "Etapa concluída", rows: [] },
  Planning: { active: "Planejando", done: "Plano registrado", rows: [] },
  Reasoning: { active: "Analisando", done: "Etapa concluída", rows: [] },
  Verification: { active: "Verificando", done: "Verificação registrada", rows: [] },
  Search: { active: "Pesquisando na web", done: "Pesquisa registrada", rows: [] },
  Coding: { active: "Executando ferramentas", done: "Etapas registradas", rows: [] },
};

export function ThinkingStateGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 w-full my-1.5">{children}</div>;
}

export default function ThinkingState({
  variant = "Coding",
  onSettled,
  rows,
  active,
  done,
  icon,
  elapsedSeconds = 1,
  working: propWorking,
  livePhase,
  notes,
}: {
  variant?: string;
  onSettled?: () => void;
  /** override the built-in trace content (keeps the primitive reusable) */
  rows?: Row[];
  active?: string;
  done?: string;
  /** override the header glyph */
  icon?: ReactNode;
  elapsedSeconds?: number;
  /** whether the trace is actively working in real-time */
  working?: boolean;
  /** live synchronized phase for the motion alternating text */
  livePhase?: "Pensando" | "Raciocinando" | "Trabalhando" | string;
  /** notes and thinking content placed above the tool trace */
  notes?: ReactNode;
}) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const base = VARIANTS[variant] ?? VARIANTS.Coding ?? VARIANTS.Steps;
  const v = {
    ...base,
    rows: rows !== undefined ? rows : base.rows,
    active: active ?? base.active,
    done: done ?? base.done,
  };
  const expanded = manualExpanded ?? true;
  const working = propWorking ?? false;

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
        className="flex w-fit items-center gap-1.5 py-0.5 text-left transition-colors hover:opacity-85 cursor-pointer"
      >
        {icon ? (
          <span className="flex shrink-0 items-center justify-center">
            {icon}
          </span>
        ) : working ? (
          <span className="flex shrink-0 items-center justify-center mr-0.5">
            <WorkingDot size={11} />
          </span>
        ) : null}
        <span role="status" className="text-xs font-medium text-text-content-primary flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[500px]">
          {working ? (
            <AnimatedThinkingStatus
              livePhase={livePhase}
              elapsedSeconds={elapsedSeconds}
            />
          ) : (
            <span className="text-text-content-secondary font-medium whitespace-nowrap truncate max-w-[420px]">
              {v.done.length > 65 ? `${v.done.slice(0, 65)}…` : v.done} em {elapsedSeconds}s
            </span>
          )}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-text-content-secondary transition-transform duration-300 ml-0.5"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* expandable trace content */}
      {expanded && (
        <div className="mt-2 w-full animate-in fade-in duration-300 flex flex-col gap-2">
          {notes && (
            <div className="w-full">
              {notes}
            </div>
          )}
          {variant === "Reasoning" ? (
            /* Frameless Transparent AI Reasoning Trace - Left-aligned */
            v.rows.length > 0 && (
              <div className="space-y-1.5 w-full text-xs">
                <div className="font-mono text-[10px] text-text-content-secondary uppercase tracking-wider">
                  Análise e Diretrizes
                </div>
                <div className="space-y-1.5 text-text-content-primary/90 font-normal leading-relaxed text-[12.5px]">
                  {v.rows.map((row, i) => {
                    const cleanP = String(row.primary || '').replace(/\r?\n+/g, ' ').trim();
                    const truncatedP = cleanP.length > 80 ? `${cleanP.slice(0, 80)}…` : cleanP;
                    return (
                      <p key={`reasoning_${row.primary}_${i}`} className="flex items-center gap-2 min-w-0 whitespace-nowrap overflow-hidden">
                        <span className="text-text-content-secondary/50 font-mono text-[11px] shrink-0">›</span>
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap leading-snug">{truncatedP}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )
          ) : variant === "Search" ? (
            /* Frameless Transparent Web Search Trace - Left-aligned with notes */
            v.rows.length > 0 && (
              <div className="space-y-2 w-full text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] text-text-content-secondary whitespace-nowrap overflow-hidden">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 shrink-0">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  {(() => {
                    const cleanQ = String(v.query || "Consultando informações na web...").replace(/\r?\n+/g, ' ').trim();
                    return (
                      <span className="min-w-0 flex-1 truncate whitespace-nowrap font-mono text-[11px] text-text-content-secondary">
                        {cleanQ.length > 75 ? `${cleanQ.slice(0, 75)}…` : cleanQ}
                      </span>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  {v.rows.map((row, i) => {
                    const hasHref = Boolean(row.href && row.href !== "#");
                    const cleanPrimary = String(row.primary || '').replace(/\r?\n+/g, ' ').trim();
                    const truncatedPrimary = cleanPrimary.length > 70 ? `${cleanPrimary.slice(0, 70)}…` : cleanPrimary;
                    const cleanSecondary = row.secondary ? String(row.secondary).replace(/\r?\n+/g, ' ').trim() : undefined;
                    const truncatedSecondary = cleanSecondary && cleanSecondary.length > 35 ? `${cleanSecondary.slice(0, 35)}…` : cleanSecondary;

                    const content = (
                      <>
                        <div className="min-w-0 flex items-center gap-2 overflow-hidden">
                          <Favicon urlOrDomain={row.href || cleanSecondary || ""} size={14} />
                          <span className={`font-medium text-text-content-primary/90 text-[12.5px] truncate whitespace-nowrap ${hasHref ? 'group-hover:underline' : ''}`}>
                            {truncatedPrimary}
                          </span>
                        </div>
                        {truncatedSecondary && (
                          <span className="text-[10px] font-mono text-text-content-secondary/60 shrink-0 ml-2 truncate max-w-[180px] whitespace-nowrap">
                            {truncatedSecondary}
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
                        className="flex items-center justify-between py-1 text-xs hover:text-text-content-primary transition-colors group cursor-pointer whitespace-nowrap overflow-hidden"
                      >
                        {content}
                      </a>
                    ) : (
                      <div
                        key={`search_${row.primary}_${i}`}
                        className="flex items-center justify-between py-1 text-xs text-text-content-primary/90 whitespace-nowrap overflow-hidden"
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* Frameless Transparent Standard Step Trace - Left-aligned with notes */
            v.rows.length > 0 && (
              <div className="space-y-1 w-full">
                {v.rows.map((row, i) => {
                  const isActive = working && i === v.rows.length - 1;
                  const cleanPrimary = String(row.primary || '').replace(/\r?\n+/g, ' ').trim();
                  const truncatedPrimary = cleanPrimary.length > 70 ? `${cleanPrimary.slice(0, 70)}…` : cleanPrimary;
                  const cleanSecondary = row.secondary ? String(row.secondary).replace(/\r?\n+/g, ' ').trim() : undefined;
                  const truncatedSecondary = cleanSecondary && cleanSecondary.length > 40 ? `${cleanSecondary.slice(0, 40)}…` : cleanSecondary;

                  return (
                    <div key={`step_${row.primary}_${i}`} className="min-w-0 w-full flex items-center gap-2.5 py-1 text-xs text-text-content-primary/80 transition-colors whitespace-nowrap overflow-hidden">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-white/5 border border-white/10 shadow-xs">
                        {getContextualToolIcon(row.icon || cleanPrimary, cleanPrimary, cleanSecondary || '')}
                      </span>
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-2 overflow-hidden whitespace-nowrap">
                        <span className={`min-w-0 truncate whitespace-nowrap font-medium text-[12.5px] text-text-content-primary ${isActive ? 'text-white' : ''}`}>
                          {truncatedPrimary}
                        </span>
                        {truncatedSecondary && (
                          <span className="text-[11px] font-mono text-text-content-secondary/70 shrink-0 bg-white/5 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap truncate max-w-[200px]">
                            {truncatedSecondary}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      )}
    </div>
  );
}
