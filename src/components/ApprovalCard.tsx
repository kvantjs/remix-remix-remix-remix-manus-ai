"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/atoms/Button";
import GlideMenu from "@/components/primitives/GlideMenu";
import { Spinner } from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────
 * APPROVAL CARD (human-in-the-loop)
 * One question at a time. The stack slides vertically as you
 * move between questions (the card's height animates to fit),
 * the step counter rolls like an odometer, and the footer uses
 * pill actions — a quiet Skip and a dark Continue with a ⏎.
 * Single-choice answers auto-advance; multi-select waits.
 * ───────────────────────────────────────────────────────── */

export type ApprovalQuestion = {
  q: string;
  type: "radio" | "check";
  options: string[];
};

const QUESTIONS: ApprovalQuestion[] = [
  {
    q: "Qual nicho / segmento da aplicação?",
    type: "radio",
    options: ["Fintech & Banking", "SaaS & Analytics", "E-Commerce & Store", "Editorial & Showcase"],
  },
  {
    q: "Qual direção visual e paleta?",
    type: "radio",
    options: ["Dark Obsidian & Esmeralda", "Dark Slate & Cyber Roxo", "Warm Bone & Serif", "High Contrast Neon"],
  },
  {
    q: "Quais recursos dinâmicos incluir?",
    type: "check",
    options: ["Simulador matemático", "Feed em tempo real", "Modais de transação"],
  },
];

export type ApprovalLabels = {
  skip: string;
  continue: string;
  send: string;
  customPlaceholder: string;
  sentMessage: string;
};

const DEFAULT_LABELS: ApprovalLabels = {
  skip: "Pular",
  continue: "Continuar",
  send: "Enviar Respostas",
  customPlaceholder: "Outra preferência…",
  sentMessage: "Respostas enviadas!",
};

const ROLL_MS = 360;
const SLIDE = "320ms cubic-bezier(0.22, 1, 0.36, 1)";

/* odometer digits — each character that changes rolls up (or down) */
function RollingDigits({ value }: { value: string }) {
  const prevRef = useRef(value);
  const [oldVal, setOldVal] = useState(value);
  const [newVal, setNewVal] = useState(value);
  const [rolling, setRolling] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [dir, setDir] = useState<"up" | "down">("up");

  useEffect(() => {
    if (prevRef.current === value) return;
    const from = prevRef.current;
    prevRef.current = value;
    const fromN = parseInt(from, 10);
    const toN = parseInt(value, 10);
    setDir(Number.isFinite(fromN) && Number.isFinite(toN) && toN < fromN ? "down" : "up");
    setOldVal(from);
    setNewVal(value);
    setRolling(true);
    setShifted(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShifted(true));
    });
    const done = setTimeout(() => {
      setRolling(false);
      setOldVal(value);
      setShifted(false);
    }, ROLL_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(done);
    };
  }, [value]);

  const chars = rolling ? newVal : oldVal;

  return (
    <>
      {Array.from({ length: chars.length }, (_, i) => {
        const o = oldVal[i] ?? "";
        const n = chars[i] ?? "";
        if (!rolling || o === n) {
          return <span key={`${i}-${n}`}>{n}</span>;
        }
        const top = dir === "down" ? n : o;
        const bottom = dir === "down" ? o : n;
        const restY = dir === "down" ? "0" : "-1em";
        const startY = dir === "down" ? "-1em" : "0";
        return (
          <span
            key={`${i}-${o}-${n}-${dir}`}
            style={{ display: "inline-block", position: "relative", overflow: "hidden", height: "1em", lineHeight: "1em", verticalAlign: "-0.05em" }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                transform: `translateY(${shifted ? restY : startY})`,
              }}
            >
              <span style={{ height: "1em", lineHeight: "1em" }}>{top}</span>
              <span style={{ height: "1em", lineHeight: "1em" }}>{bottom}</span>
            </span>
          </span>
        );
      })}
    </>
  );
}

function Ico({ path, size = 14, sw = 2 }: { path: React.ReactNode; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path}
    </svg>
  );
}

export default function ApprovalCard({
  questions = QUESTIONS,
  labels,
  onSubmitted,
  onAnswerChange,
  onClose,
  resettable = true,
}: {
  questions?: ApprovalQuestion[];
  labels?: Partial<ApprovalLabels>;
  onSubmitted?: (answers: Record<number, number[]>, customAnswers?: Record<number, string>) => void;
  onAnswerChange?: (questionIndex: number, answer: number[]) => void;
  onClose?: () => void;
  resettable?: boolean;
  variant?: string;
} = {}) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [custom, setCustom] = useState<Record<number, string>>({});
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(true);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const measured = useRef(false);
  const [viewportH, setViewportH] = useState<number | undefined>(undefined);
  const [trackY, setTrackY] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [ready, setReady] = useState(false);

  const last = qi === questions.length - 1;
  const selected = answers[qi] ?? [];
  const hasAnswer = selected.length > 0 || Boolean(custom[qi]?.trim());

  const sync = (withAnim: boolean) => {
    const item = questionRefs.current[qi];
    if (!item) return;
    const h = Math.max(item.offsetHeight, 160);
    setViewportH(h);
    setTrackY(item.offsetTop);
    setAnimate(withAnim);
  };

  useLayoutEffect(() => {
    const withAnim = measured.current;
    measured.current = true;
    sync(withAnim);
    setReady(true);
  }, [qi, answers, custom, open, sent]);

  useEffect(() => {
    const id = requestAnimationFrame(() => sync(measured.current));
    return () => cancelAnimationFrame(id);
  }, [qi]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const goTo = (next: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setQi(Math.min(Math.max(next, 0), questions.length - 1));
  };

  const send = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setSent(true);
    onSubmitted?.(answers, custom);
  };

  const advance = () => {
    if (last) send();
    else goTo(qi + 1);
  };

  const toggle = (index: number) => {
    const type = questions[qi]?.type || "radio";
    setAnswers((current) => {
      const picked = current[qi] ?? [];
      const next = type === "radio"
        ? [index]
        : picked.includes(index)
          ? picked.filter((item) => item !== index)
          : [...picked, index];
      onAnswerChange?.(qi, next);
      return { ...current, [qi]: next };
    });

    if (type === "radio") {
      setCustom((current) => ({ ...current, [qi]: "" }));
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        if (last) send();
        else setQi((current) => Math.min(questions.length - 1, current + 1));
      }, 650);
    }
  };

  const reset = () => {
    setQi(0);
    setAnswers({});
    setCustom({});
    setSent(false);
    setOpen(true);
    measured.current = false;
  };

  const handleDismiss = () => {
    setOpen(false);
    onClose?.();
  };

  if (!open) {
    return (
      <button 
        type="button" 
        onClick={() => setOpen(true)} 
        className="rounded-xl bg-[#18181b] border border-[#27272a] hover:border-zinc-500 px-3 py-2 text-xs font-medium shadow-xl transition-all  hover:bg-[#222226] flex items-center gap-2 cursor-pointer"
      >
        <Spinner size={14} className="text-zinc-400 shrink-0" />
        <span className="text-zinc-300">Configurações de Contexto ({questions.length} perguntas)</span>
      </button>
    );
  }

  if (sent) {
    return (
      <div className="flex w-full items-center justify-between gap-3 p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] shadow-2xl text-white">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 py-1 pr-3 pl-2 text-xs font-medium text-emerald-400">
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-black">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          {t.sentMessage}
        </span>
        <div className="flex items-center gap-2">
          {resettable && (
            <button type="button" onClick={reset} className="text-xs font-medium text-zinc-400 transition-colors hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/5">
              Refazer
            </button>
          )}
          <button type="button" onClick={handleDismiss} className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-white/10" aria-label="Fechar">
            <Ico size={13} path={<path d="M18 6L6 18M6 6l12 12" />} />
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[qi] || questions[0];

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl bg-[#18181b] border border-[#2c2c30] shadow-2xl text-zinc-100 backdrop-blur-md">
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-[#27272a]/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Especificação de Contexto
            </span>
          </div>
          <button
            type="button"
            aria-label="Minimizar pop-up"
            onClick={handleDismiss}
            className="flex items-center justify-center size-6 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Ico size={14} sw={2.2} path={<path d="M18 6L6 18M6 6l12 12" />} />
          </button>
        </div>

        {/* Content body with sliding questions */}
        <div className="px-3.5 py-3">
          <div
            className="overflow-hidden"
            style={{ 
              minHeight: '160px',
              height: viewportH ? `${viewportH}px` : 'auto', 
              transition: animate ? `height ${SLIDE}` : undefined 
            }}
            aria-live="polite"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                transform: `translate3d(0, ${-trackY}px, 0)`,
                transition: animate ? `transform ${SLIDE}` : undefined,
                willChange: "transform",
              }}
            >
              {questions.map((question, qIdx) => {
                const active = qIdx === qi;
                if (!ready && !active) return null;
                const picked = answers[qIdx] ?? [];
                const questionStyle: CSSProperties = {
                  opacity: active ? 1 : 0,
                  transition: animate ? `opacity ${SLIDE}` : undefined,
                  pointerEvents: active ? undefined : "none",
                };

                return (
                  <div
                    key={qIdx}
                    ref={(el) => { questionRefs.current[qIdx] = el; }}
                    aria-hidden={active ? undefined : true}
                    style={questionStyle}
                    className="flex flex-col"
                  >
                    <div className="text-[13.5px] font-semibold text-white leading-snug mb-2.5">
                      {question.q}
                    </div>

                    <GlideMenu className="flex flex-col gap-1.5" highlightClassName="inset-x-0 rounded-lg bg-white/5">
                      {question.options.map((option, i) => {
                        const on = picked.includes(i);
                        const isRadio = question.type === "radio";

                        return (
                          <button
                            key={option}
                            type="button"
                            data-menu-row
                            aria-pressed={on}
                            tabIndex={active ? 0 : -1}
                            onClick={() => { if (active) toggle(i); }}
                            className={`group relative z-10 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all  cursor-pointer border ${
                              on 
                                ? "bg-white/10 border-white/25 text-white font-medium shadow-xs" 
                                : "bg-[#202024]/70 border-[#2b2b30] hover:bg-[#25252a] hover:border-zinc-500/50 text-zinc-300 hover:text-white"
                            }`}
                          >
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center transition-all  ${
                                isRadio ? "rounded-full" : "rounded-[4px]"
                              } ${
                                on
                                  ? "bg-white text-black shadow-sm"
                                  : "border border-zinc-500 bg-transparent text-transparent group-hover:border-zinc-400"
                              }`}
                            >
                              {isRadio ? (
                                <span className={`size-1.5 rounded-full bg-black transition-transform  ${on ? "scale-100" : "scale-0"}`} />
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            <span className="text-[12.5px] leading-tight flex-1">
                              {option}
                            </span>
                          </button>
                        );
                      })}

                      {/* Custom Input Option */}
                      <label 
                        data-menu-row 
                        className={`relative z-10 flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all  border ${
                          custom[qIdx]?.trim() 
                            ? "bg-white/10 border-white/25 text-white" 
                            : "bg-[#202024]/40 border-[#27272a] hover:border-zinc-600"
                        }`}
                      >
                        <span className="text-zinc-400 text-xs shrink-0">✦</span>
                        <input
                          value={custom[qIdx] ?? ""}
                          tabIndex={active ? 0 : -1}
                          onChange={(event) => {
                            if (!active) return;
                            setCustom((cur) => ({ ...cur, [qIdx]: event.target.value }));
                            if (question.type === "radio") setAnswers((cur) => ({ ...cur, [qIdx]: [] }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && hasAnswer) {
                              event.preventDefault();
                              advance();
                            }
                          }}
                          placeholder={t.customPlaceholder}
                          aria-label="Custom answer"
                          className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-zinc-500"
                        />
                      </label>
                    </GlideMenu>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* footer — step nav (rolling counter) + pill actions */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t border-[#27272a] bg-[#141416]/80">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <button
              type="button"
              aria-label="Pergunta anterior"
              disabled={qi <= 0}
              onClick={() => goTo(qi - 1)}
              className="flex size-6 items-center justify-center rounded-md hover:bg-white/10 hover:text-white transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            >
              <Ico size={13} path={<path d="M15 18l-6-6 6-6" />} />
            </button>
            <span className="inline-flex items-center text-[11.5px] font-medium tabular-nums text-zinc-300">
              <RollingDigits value={`${qi + 1} / ${questions.length}`} />
            </span>
            <button
              type="button"
              aria-label="Próxima pergunta"
              disabled={last}
              onClick={() => goTo(qi + 1)}
              className="flex size-6 items-center justify-center rounded-md hover:bg-white/10 hover:text-white transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
            >
              <Ico size={13} path={<path d="M9 18l6-6-6-6" />} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => (last ? handleDismiss() : goTo(qi + 1))}
              className="text-zinc-400 hover:text-white text-xs h-7 px-2 cursor-pointer"
            >
              {t.skip}
            </Button>
            <Button 
              variant="accent" 
              size="sm" 
              disabled={!hasAnswer} 
              onClick={advance}
              className="bg-white hover:bg-zinc-200 text-black font-semibold text-xs h-7 px-3 rounded-lg shadow-sm disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {last ? t.send : t.continue}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
