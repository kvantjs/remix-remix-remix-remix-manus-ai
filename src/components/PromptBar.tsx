"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createShader, playSweep, accentChain, ACCENTS } from "glimm";

/* The built-in "prism" palette is only cyan→indigo→magenta, so a sweep
 * reads as blue/purple. Build a true full-spectrum rainbow instead. */
const RAINBOW_COLORS = [
  "#FF3D7F", // red
  "#FF7A1A", // orange
  "#FFD600", // yellow
  "#C2FF3D", // green
  "#1FC8FF", // cyan
  "#2E70FF", // blue
  "#D33CFF", // purple
];
const RAINBOW = accentChain(RAINBOW_COLORS);

/* ─────────────────────────────────────────────────────────
 * PROMPT BAR
 * A composer with real controls: attach, @ data sources,
 * / commands, a model picker, dictation, and send.
 * Type @ or / to open the menus; ↑↓ + Enter to pick.
 * Variants: Rounded (card radius) · Pill (full radius).
 * ───────────────────────────────────────────────────────── */

function Icon({ children, size = 15, strokeWidth = 1.8 }: { children: React.ReactNode; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPHS: Record<string, React.ReactNode> = {
  clip: <path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  layers: <g><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></g>,
  globe: <g><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></g>,
  code: <g><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></g>,
  terminal: <g><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></g>,
};

/* real product marks, inline so the component stays self-contained */
const BRANDS: Record<string, React.ReactNode> = {
  figma: (
    <svg width="11" height="16" viewBox="0 0 38 57" aria-hidden="true">
      <path d="M9.5 57A9.5 9.5 0 0 0 19 47.5V38H9.5a9.5 9.5 0 0 0 0 19z" fill="#0ACF83" />
      <path d="M0 28.5A9.5 9.5 0 0 1 9.5 19H19v19H9.5A9.5 9.5 0 0 1 0 28.5z" fill="#A259FF" />
      <path d="M0 9.5A9.5 9.5 0 0 1 9.5 0H19v19H9.5A9.5 9.5 0 0 1 0 9.5z" fill="#F24E1E" />
      <path d="M19 0h9.5a9.5 9.5 0 1 1 0 19H19V0z" fill="#FF7262" />
      <path d="M38 28.5a9.5 9.5 0 1 1-19 0 9.5 9.5 0 0 1 19 0z" fill="#1ABCFE" />
    </svg>
  ),
  slack: (
    <svg width="15" height="15" viewBox="0 0 127 127" aria-hidden="true">
      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A" />
      <path d="M47 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.7 39.7.8 47 .8c7.3 0 13.2 5.9 13.2 13.2v13.2H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.3.7 54.4.7 47.1c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0" />
      <path d="M99.9 47.1c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V47.1zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.9C66.9 6.6 72.8.7 80.1.7c7.3 0 13.2 5.9 13.2 13.2v33.2z" fill="#2EB67D" />
      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E" />
    </svg>
  ),
  gmail: (
    <svg width="15" height="12" viewBox="0 0 256 193" aria-hidden="true">
      <path d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z" fill="#4285F4" />
      <path d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798v98.91Z" fill="#34A853" />
      <path d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.669 34.992-4.669 40.644L128 145.504 58.182 93.14Z" fill="#EA4335" />
      <path d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945l-16.292 12.218Z" fill="#FBBC04" />
      <path d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23v23.273Z" fill="#C5221F" />
    </svg>
  ),
  github: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  ),
};

export type Source = {
  key: string;
  name: string;
  desc: string;
  glyph?: string;
  brand?: string;
  attach?: boolean;
  connect?: boolean;
};

export const SOURCES: Source[] = [
  { key: "attach", name: "Add photos & files", desc: "Upload from your computer", glyph: "clip", attach: true },
  { key: "scoop", name: "Scoop Data", desc: "Sales & churn metrics", glyph: "chart" },
  { key: "flavors", name: "Flavor records", desc: "26 makers, tags, links", glyph: "layers" },
  { key: "web", name: "Web search", desc: "Real-time news and info", glyph: "globe" },
  { key: "figma", name: "Figma", desc: "Design-to-code workflows", brand: "figma" },
  { key: "slack", name: "Slack", desc: "Read and manage Slack", brand: "slack" },
  { key: "gmail", name: "Gmail", desc: "Read and manage Gmail", brand: "gmail", connect: true },
  { key: "github", name: "GitHub", desc: "Repository & code context", brand: "github" },
];

export const COMMANDS = [
  { key: "context", name: "/context", desc: "Abrir questionário de preferências e contexto" },
  { key: "compare", name: "/compare", desc: "Flavor vs. last summer & code diffs" },
  { key: "churn-plan", name: "/churn-plan", desc: "Draft an autonomous execution plan" },
  { key: "restock", name: "/restock", desc: "Build a reorder list & install packages" },
  { key: "draft-email", name: "/draft-email", desc: "Write a supplier email or tech spec" },
  { key: "summarize", name: "/summarize", desc: "Digest the thread & workspace so far" },
  { key: "fix", name: "/fix", desc: "Diagnose and fix codebase errors" },
  { key: "terminal", name: "/terminal", desc: "Run bash command in cloud sandbox" },
];

export const MODELS = [
  { key: "qwen3-local", name: "Qwen3:4b · local", tag: "Sem custo" },
];

const FILES = ["flavor-chart.png", "summer-menu.pdf", "pos-export.csv", "workspace-config.json", "architecture-diagram.svg"];
const DICTATION = "Compare pistachio weekends to last summer";

/* self-running demo: walk the @ menu, then the / menu, and repeat.
 * Any pointer or key interaction hands control to the user. */
const AUTO_STEPS: {
  draft: string;
  active?: number;
  connect?: boolean;
  modelOpen?: boolean;
  model?: string;
  hold: number;
}[] = [
  { draft: "", connect: false, model: "qwen3-local", hold: 1100 },
  { draft: "@", active: 0, hold: 900 },
  { draft: "@", active: 1, hold: 620 },
  { draft: "@", active: 4, hold: 620 },
  { draft: "@", active: 6, hold: 700 },
  { draft: "@", active: 6, connect: true, hold: 1000 },
  { draft: "", hold: 700 },
  { draft: "/", active: 0, hold: 900 },
  { draft: "/", active: 1, hold: 620 },
  { draft: "/", active: 3, hold: 1000 },
  { draft: "", hold: 800 },
  // open the model picker and highlight the installed local model
  { draft: "", modelOpen: true, hold: 1200 },
  { draft: "", model: "qwen3-local", hold: 2400 },
  { draft: "", hold: 900 },
];

/* the last @word or /word being typed, if any */
function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}

export interface PromptBarProps {
  variant?: "Rounded" | "Pill" | string;
  /** the self-running walkthrough; turn off when embedding in a real surface */
  demo?: boolean;
  /** hero sizing: a multi-line input with controls on their own row */
  tall?: boolean;
  placeholder?: string;
  onSend?: (text: string, attachments?: string[]) => void;
  onStop?: () => void;
  isThinking?: boolean;
  className?: string;
}

export default function PromptBar({
  variant = "Rounded",
  demo = false,
  tall = false,
  placeholder,
  onSend,
  onStop,
  isThinking = false,
  className = "",
}: PromptBarProps) {
  const pill = variant === "Pill";
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [model, setModel] = useState(MODELS[0]); // default to Sprinkles 5 / Flagship
  const [attachments, setAttachments] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [auto, setAuto] = useState(demo);
  const [autoStep, setAutoStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const wide = expanded || tall;
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null);
  const [modelHovered, setModelHovered] = useState<number | null>(null);
  const [modelMenuLeft, setModelMenuLeft] = useState(0);
  const [modelMenuBottom, setModelMenuBottom] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const glimmRef = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef<ReturnType<typeof createShader> | null>(null);
  const sweepingRef = useRef(false);

  /* hand control to the user: stop the demo loop, and when they aim at
   * the input itself, clear the demo's leftover draft for a clean start */
  const takeOver = (event: { target: EventTarget | null }) => {
    if (auto) {
      setAuto(false);
      if (event.target === inputRef.current) setDraft("");
    }
  };

  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";

  const rows: { key: string; name: string; desc: string }[] =
    menu === "at"
      ? SOURCES.filter((s) => s.name.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query))
      : menu === "slash"
        ? COMMANDS.filter((c) => c.name.slice(1).startsWith(query) || c.desc.toLowerCase().includes(query))
        : [];

  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [menu, query]);

  /* a single highlight glides to the active row instead of each row
   * toggling its own background — matches the gliding pill in the nav */
  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, connected, rows.length]);

  /* same gliding highlight in the model menu — floats to the hovered
   * row, falling back to the currently-selected model */
  const modelIndex = MODELS.findIndex((m) => m.key === model.key);
  useLayoutEffect(() => {
    if (!modelOpen) return;
    const target = modelRowRefs.current[modelHovered ?? modelIndex];
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [modelOpen, modelHovered, modelIndex]);

  /* The menu is outside the clipped composer, so align it to the model
   * trigger by measurement instead of pinning it to the far-right edge. */
  useLayoutEffect(() => {
    if (!modelOpen || !composerAnchorRef.current || !modelRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = modelRef.current.getBoundingClientRect();
    setModelMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 190)));
    setModelMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [modelOpen, wide, model.name]);

  useEffect(() => {
    if (!modelOpen) setModelHovered(null);
  }, [modelOpen]);

  /* Build the shader with a pinned hue phase. createShader seeds its
   * internal hueShift from Math.random(), which made the sweep a different
   * colour on every reload — pin it so the rainbow is identical each time. */
  const makeShader = useCallback(() => {
    const canvas = glimmRef.current;
    if (!canvas) return null;
    const random = Math.random;
    Math.random = () => 0;
    try {
      return createShader({
        canvas,
        palette: RAINBOW,
        direction: "ltr",
        bandTight: 10,
        swellAmount: 0.85,
      });
    } catch {
      return null;
    } finally {
      Math.random = random;
    }
  }, []);

  /* Glimm shader lives inside the composer, invisible at rest. Selecting
   * the flagship model fires a one-shot rainbow sweep across the interior. */
  useEffect(() => {
    shaderRef.current = makeShader();
    return () => {
      shaderRef.current?.destroy();
      shaderRef.current = null;
    };
  }, [makeShader]);

  const celebrate = useCallback(() => {
    if (sweepingRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      shaderRef.current?.destroy();
      const shader = makeShader();
      shaderRef.current = shader;
      if (!shader) return;
      sweepingRef.current = true;
      const sweep = playSweep(shader, {
        palette: RAINBOW,
        direction: "ltr",
        sweepMs: 570,
        outroMs: 80,
        peakAlpha: 1.3,
        bandTight: 10,
        brightness: 1.4,
        swellAmount: 1,
        waveSpeed: 1.8,
        easing: "easeOutExpo",
      });
      sweep.done.finally(() => {
        sweepingRef.current = false;
      });
    } catch {
      sweepingRef.current = false;
    }
  }, [makeShader]);

  const selectModel = (next: (typeof MODELS)[number]) => {
    setModel(next);
    setModelOpen(false);
    if (next.key === "qwen3-local") celebrate();
  };

  /* autoplay: apply the current step, then advance after its hold */
  useEffect(() => {
    if (!auto) return;
    const step = AUTO_STEPS[autoStep % AUTO_STEPS.length];
    setDraft(step.draft);
    if (step.active !== undefined) setActive(step.active);
    if (step.connect !== undefined) setConnected(step.connect);
    if (step.modelOpen !== undefined) setModelOpen(step.modelOpen);
    if (step.model) {
      const next = MODELS.find((m) => m.key === step.model);
      if (next) selectModel(next);
    }
    const t = setTimeout(() => setAutoStep((s) => s + 1), step.hold);
    return () => clearTimeout(t);
  }, [auto, autoStep]);

  /* dictation with speech recognition support or simulated transcript landing */
  useEffect(() => {
    if (!listening) return;

    let recognition: any = null;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "pt-BR";

        recognition.onresult = (e: any) => {
          const text = e.results?.[0]?.[0]?.transcript;
          if (text) {
            setDraft((curr) => (curr ? `${curr.trimEnd()} ${text}` : text));
          }
          setListening(false);
          inputRef.current?.focus();
        };

        recognition.onerror = () => {
          // fallback to simulated
          setDraft((curr) => (curr ? `${curr.trimEnd()} ${DICTATION}` : DICTATION));
          setListening(false);
          inputRef.current?.focus();
        };

        recognition.onend = () => {
          setListening(false);
        };

        recognition.start();
      } catch {
        recognition = null;
      }
    }

    if (!recognition) {
      const t = setTimeout(() => {
        setDraft((current) => (current ? `${current.trimEnd()} ${DICTATION}` : DICTATION));
        setListening(false);
        inputRef.current?.focus();
      }, 2200);
      return () => clearTimeout(t);
    }

    return () => {
      try {
        recognition?.stop?.();
      } catch {}
    };
  }, [listening]);

  /* Move wrapped text above the controls, then grow to a compact maximum. */
  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;
    if (!input || !controls || !measure || !modelButton) return;

    const fixedControlsWidth = 28 * 3 + modelButton.offsetWidth;
    const inlineGaps = 4 * 4;
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth = draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }

    const minHeight = 28;
    const maxHeight = 120;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft, expanded]);

  /* clicking anywhere outside the composer closes the open menus */
  useEffect(() => {
    if (!modelOpen && !plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) {
        setModelOpen(false);
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen]);

  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileNames = Array.from(files).map((f) => f.name);
    setAttachments((curr) => [...curr, ...fileNames]);
    e.target.value = "";
    closeMenus();
    inputRef.current?.focus();
  };

  const pick = (row: { key: string; name: string }) => {
    const source = SOURCES.find((s) => s.key === row.key);
    if (source?.attach) {
      // Trigger native file picker if present, or add sample
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        setAttachments((current) => [...current, FILES[current.length % FILES.length]]);
      }
      if (token) setDraft(draft.slice(0, token.start));
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };

  const canSend = draft.trim().length > 0 || attachments.length > 0;
  const send = () => {
    if (isThinking) {
      onStop?.();
      return;
    }
    if (!canSend) return;
    
    // Construct final prompt with attachment notes if present
    let finalPrompt = draft.trim();
    if (attachments.length > 0) {
      finalPrompt = `${finalPrompt}\n\n[Anexos anexados: ${attachments.join(", ")}]`;
    }

    onSend?.(finalPrompt, attachments);
    setDraft("");
    setAttachments([]);
    closeMenus();
  };

  return (
    <div
      data-promptbar
      className={`relative w-full ${demo ? "flex min-h-[384px] max-w-105 flex-col justify-end pb-8" : ""} ${className}`}
      onPointerDownCapture={takeOver}
      onKeyDownCapture={takeOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* composer is the anchor — menus grow up from its top edge */}
      <div ref={composerAnchorRef} className="relative w-full">
        {/* ── @ / slash menu ─────────────────────────────── */}
        {menu && (
          <div
            onMouseLeave={() => setEngaged(false)}
            className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-[12px] border border-line bg-surface p-1 shadow-raised backdrop-blur-xl"
            style={{ animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom center" }}
          >
            {/* single gliding highlight — appears once a row is hovered */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[8px] bg-hover"
              style={{
                top: rowBox?.top ?? 0,
                height: rowBox?.height ?? 0,
                opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
                transition:
                  "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {rows.map((row, i) => {
                const source = menu === "at" ? SOURCES.find((s) => s.key === row.key) : undefined;
                return (
                  <button
                    key={row.key}
                    type="button"
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => {
                      setActive(i);
                      setEngaged(true);
                    }}
                    onClick={() => pick(row)}
                    className="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left transition-colors cursor-pointer"
                  >
                    {source && (
                      <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                        {source.brand ? BRANDS[source.brand] : <Icon size={15}>{GLYPHS[source.glyph ?? "clip"]}</Icon>}
                      </span>
                    )}
                    {!source && (
                      <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2 font-mono text-[11px]">
                        /
                      </span>
                    )}
                    <span className="shrink-0 text-[12.5px] font-medium text-ink">
                      {row.name}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{row.desc}</span>
                    {source?.connect && (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(event) => {
                          event.stopPropagation();
                          setConnected((current) => !current);
                        }}
                        className={`shrink-0 text-[12px] font-medium transition-colors duration-100 px-2 py-0.5 rounded ${
                          connected ? "text-green bg-green-500/10 border border-green-500/20" : "text-blue-400 hover:text-blue-300 hover:underline"
                        }`}
                      >
                        {connected ? "Connected" : "Connect"}
                      </span>
                    )}
                  </button>
                );
              })}
              {rows.length === 0 && (
                <div className="flex h-9 items-center px-3 text-[12px] text-ink-3">
                  Nenhum resultado para “{query}”
                </div>
              )}
            </div>
            <div className="mt-1 border-t border-line px-3 pt-1.5 pb-1 text-[11px] text-ink-3 flex items-center justify-between">
              <span>{menu === "at" ? "Digite para pesquisar fontes & arquivos" : "Digite para pesquisar comandos rápidos"}</span>
              <span className="font-mono text-[10px] opacity-60">↑↓ + Enter</span>
            </div>
          </div>
        )}

        {/* ── model menu ─────────────────────────────────── */}
        {modelOpen && (
          <div
            onMouseLeave={() => setModelHovered(null)}
            className="absolute z-30 w-52 rounded-[12px] border border-line bg-surface p-1 shadow-raised backdrop-blur-xl"
            style={{ left: modelMenuLeft, bottom: modelMenuBottom, animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom left" }}
          >
            {/* single gliding highlight — floats to the hovered / selected row */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: modelBox?.top ?? 0,
                height: modelBox?.height ?? 0,
                opacity: modelBox && modelHovered !== null ? 1 : 0,
                transition:
                  "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            <div className="space-y-0.5">
              {MODELS.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  ref={(el) => {
                    modelRowRefs.current[i] = el;
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setModelHovered(i)}
                  onClick={() => {
                    selectModel(m);
                    inputRef.current?.focus();
                  }}
                  className="relative z-10 flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left cursor-pointer"
                >
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{m.name}</span>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    m.tag === 'Flagship' ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30' :
                    m.tag === 'Ultra-fast' ? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20' :
                    'bg-white/5 text-ink-3'
                  }`}>{m.tag}</span>
                  <span className={`shrink-0 text-ink ${m.key === model.key ? "" : "invisible"}`}>
                    <Icon size={13} strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></Icon>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── composer ───────────────────────────────────── */}
        <div
          className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-card transition-[border-color,border-radius,box-shadow] duration-200 focus-within:border-line-strong focus-within:shadow-raised ${
            tall ? "gap-2.5 p-3.5" : "gap-1.5 p-2"
          } ${
            pill ? (attachments.length > 0 || wide ? "rounded-[24px]" : "rounded-full") : tall ? "rounded-[22px]" : "rounded-[16px]"
          }`}
        >
          {/* rainbow glimm sweep — plays across the interior on model change.
              explicit w/h: a <canvas> is a replaced element and won't stretch
              to inset-0 alone, which feeds back into the shader's ResizeObserver. */}
          <canvas
            ref={glimmRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
            style={{ borderRadius: "inherit" }}
          />
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-[18px]"
          >
            {draft}
          </span>

          {attachments.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 pt-0.5 ${pill ? "px-1" : "px-0.5"}`}>
              {attachments.map((file, i) => (
                <span
                  key={`${file}-${i}`}
                  className={`flex h-6.5 items-center gap-1.5 bg-field py-1 pr-1 pl-1.5 text-[11.5px] text-ink-2 shadow-hairline ${
                    pill ? "rounded-full" : "rounded-chip"
                  }`}
                  style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  <Icon size={12}><g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></g></Icon>
                  <span className="max-w-36 truncate">{file}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${file}`}
                    onClick={() => setAttachments((current) => current.filter((_, j) => j !== i))}
                    className={`-my-1 flex size-6 items-center justify-center text-ink-3 transition-colors duration-100 hover:bg-line/70 hover:text-ink cursor-pointer ${
                      pill ? "rounded-full" : "rounded-[5px]"
                    }`}
                  >
                    <Icon size={10} strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></Icon>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            ref={controlsRef}
            className={`grid items-end gap-x-1.5 gap-y-1.5 ${
              wide
                ? "grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]"
                : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"
            } max-sm:grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]`}
          >
            <button
              type="button"
              aria-label="Adicionar anexos e fontes"
              aria-expanded={plusOpen}
              onClick={() => {
                setModelOpen(false);
                setPlusOpen((current) => !current);
                inputRef.current?.focus();
              }}
              className={`flex size-7 shrink-0 items-center justify-center justify-self-start text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] cursor-pointer ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${plusOpen ? "bg-hover text-ink" : ""} ${wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1"} max-sm:col-start-1 max-sm:row-start-2`}
            >
              <Icon size={16} strokeWidth={2}><path d="M12 5v14M5 12h14" /></Icon>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setDismissed(false);
                setPlusOpen(false);
              }}
              onKeyDown={(event) => {
                if (menu && rows.length > 0) {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setEngaged(true);
                    setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
                    return;
                  }
                  if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                    event.preventDefault();
                    pick(rows[active]);
                    return;
                  }
                }
                if (event.key === "Escape") {
                  setDismissed(true);
                  closeMenus();
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={listening ? "Ouvindo microfone…" : isThinking ? "Agente operando..." : placeholder ?? "Escreva uma mensagem para o agente ou use @ e /..."}
              aria-label="Prompt"
              className={`${tall ? "min-h-[68px] px-2 py-2 text-[14px] leading-5" : "min-h-7 px-1.5 py-[5px] text-[13px] leading-[18px]"} min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${
                wide ? "col-span-full col-start-1 row-start-1" : "col-start-2 row-start-1"
              } max-sm:col-span-full max-sm:col-start-1 max-sm:row-start-1`}
            />

            {/* model picker */}
            <button
              ref={modelRef}
              type="button"
              aria-expanded={modelOpen}
              aria-label="Escolher modelo"
              onClick={() => {
                setPlusOpen(false);
                setModelOpen((current) => !current);
              }}
              className={`flex h-7 shrink-0 items-center gap-1.5 px-2 text-[12px] font-medium text-ink-2 bg-field/60 border border-line/60 transition-all duration-150 hover:bg-hover hover:text-ink active:scale-[0.97] cursor-pointer ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${wide ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"} max-sm:col-start-2 max-sm:row-start-2`}
            >
              <span>{model.name}</span>
              <span className="text-ink-3">
                <Icon size={11} strokeWidth={2.4}><path d="M6 9l6 6 6-6" /></Icon>
              </span>
            </button>

            {/* dictation */}
            <button
              type="button"
              aria-label={listening ? "Parar ditado" : "Iniciar ditado por voz"}
              aria-pressed={listening}
              onClick={() => setListening((current) => !current)}
              className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.94] cursor-pointer ${
                pill ? "rounded-full" : "rounded-[8px]"
                } ${listening ? "bg-accent-tint text-accent-ink" : "text-ink-3 hover:bg-hover hover:text-ink"} ${wide ? "col-start-4 row-start-2" : "col-start-4 row-start-1"} max-sm:col-start-4 max-sm:row-start-2`}
            >
              {listening ? (
                <span className="flex h-3.5 items-center gap-[2.5px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-current"
                      style={{ height: "100%", animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
                    />
                  ))}
                </span>
              ) : (
                <Icon size={15} strokeWidth={2}><g><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></g></Icon>
              )}
            </button>

            {/* send or stop — tactile button */}
            {isThinking ? (
              <button
                type="button"
                aria-label="Interromper agente"
                onClick={onStop}
                className={`flex size-7 shrink-0 items-center justify-center bg-red-500/20 text-red-400 border border-red-500/30 transition-all duration-150 hover:bg-red-500/30 active:scale-[0.94] cursor-pointer ${
                  pill ? "rounded-full" : "rounded-[8px]"
                } ${wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"} max-sm:col-start-5 max-sm:row-start-2`}
                title="Interromper agente"
              >
                <Icon size={14} strokeWidth={2.4}>
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                </Icon>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Enviar prompt"
                disabled={!canSend}
                onClick={send}
                className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform,opacity] duration-200 enabled:active:scale-[0.94] cursor-pointer ${
                  pill ? "rounded-full" : "rounded-[8px]"
                } ${wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"} max-sm:col-start-5 max-sm:row-start-2 ${
                  canSend ? "bg-white text-black hover:bg-white/90 shadow-xs" : "bg-line text-ink-3/40 cursor-not-allowed opacity-50"
                }`}
                title="Enviar comando (Enter)"
              >
                <Icon size={15} strokeWidth={2.4}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
