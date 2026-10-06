"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkle,
  PencilSimpleLine,
  Terminal,
  FileCode,
  Globe,
  GitDiff,
  CheckCircle,
  FileText,
  CaretDown,
  CaretRight,
  Code,
  Cpu,
  ArrowsClockwise,
  Compass,
  CursorClick,
  Keyboard,
  Camera,
  MagnifyingGlass,
  ArrowsDownUp,
  Trash,
  FolderOpen,
  Hammer,
  Package,
  Database,
  PlugsConnected,
  BracketsCurly,
  Palette,
  Image,
  TreeStructure,
  Browser
} from "@phosphor-icons/react";

/* ─────────────────────────────────────────────────────────
 * TOOL CHIPS
 * An agent run as compact rows: tool calls with inline
 * chips, then file-diff chips summarizing the edits.
 * Hover a row to reveal its chevron; every row expands
 * to show what the tool actually did.
 * ───────────────────────────────────────────────────────── */

const STEP_MS = 1200;

export type ToolDetailLine = { text: string; tone?: "add" };

export type ToolStep = {
  icon: string;
  label: string;
  chip: string;
  mono: boolean;
  detailMono: boolean;
  detail: ToolDetailLine[];
};

export type ToolDiff = { file: string; add: number; del: number };

export type ToolDiffLine = { text: string; tone: "add" | "del" | "ctx" };

export type ToolChipsLabels = {
  header: string;
  more: string;
};

const DEFAULT_LABELS: ToolChipsLabels = {
  header: "4 ferramentas executadas",
  more: "+2 mais",
};

/**
 * Retorna o ícone profissional específico e contextual de acordo com o nome da ação/ferramenta (Monocromático / Cinza)
 */
export function getContextualToolIcon(iconKey: string, label: string = "", chip: string = ""): React.ReactNode {
  const k = (iconKey || "").toLowerCase();
  const l = (label || "").toLowerCase();
  const c = (chip || "").toLowerCase();
  const combined = `${k} ${l} ${c}`;
  const iconClass = "text-text-content-secondary shrink-0";

  // 0. MCP Specific Labels
  if (l.includes("webdev mcp")) return <Code size={13} weight="bold" className="text-cyan-400 shrink-0" />;
  if (l.includes("computer mcp")) return <Browser size={13} weight="bold" className="text-blue-400 shrink-0" />;
  if (l.includes("terminal bash mcp")) return <Terminal size={13} weight="bold" className="text-emerald-400 shrink-0" />;

  // 1. Browser & Web Navigations
  if (combined.includes("navigate") || combined.includes("goto") || combined.includes("open url") || combined.includes("acessar")) {
    return <Compass size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("click") || combined.includes("clicar") || combined.includes("press") || combined.includes("pressionar")) {
    return <CursorClick size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("type") || combined.includes("fill") || combined.includes("digitar") || combined.includes("preencher") || combined.includes("keyboard")) {
    return <Keyboard size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("screenshot") || combined.includes("capture") || combined.includes("print") || combined.includes("camera")) {
    return <Camera size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("scroll") || combined.includes("rolar")) {
    return <ArrowsDownUp size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("search") || combined.includes("pesquis") || combined.includes("procur") || combined.includes("google")) {
    return <MagnifyingGlass size={13} weight="bold" className={iconClass} />;
  }

  // 2. File & Workspace Operations
  if (combined.includes("write") || combined.includes("create") || combined.includes("escrever") || combined.includes("criar arquivo") || combined.includes("fs.write")) {
    return <PencilSimpleLine size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("read") || combined.includes("ler") || combined.includes("view_file") || combined.includes("fs.read")) {
    return <FileCode size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("delete") || combined.includes("remove") || combined.includes("deletar") || combined.includes("excluir") || combined.includes("rm ")) {
    return <Trash size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("list") || combined.includes("dir") || combined.includes("listar") || combined.includes("ls ") || combined.includes("folder")) {
    return <FolderOpen size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("edit") || combined.includes("patch") || combined.includes("editar") || combined.includes("modify")) {
    return <FileText size={13} weight="bold" className={iconClass} />;
  }

  // 3. Command, Build & Terminal Operations
  if (combined.includes("build") || combined.includes("compile") || combined.includes("compilar") || combined.includes("vite build")) {
    return <Hammer size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("package") || combined.includes("install") || combined.includes("npm") || combined.includes("yarn") || combined.includes("bun") || combined.includes("dependenc")) {
    return <Package size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("lint") || combined.includes("tsc") || combined.includes("check") || combined.includes("test") || combined.includes("verify") || combined.includes("valid")) {
    return <CheckCircle size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("restart") || combined.includes("reload") || combined.includes("reboot")) {
    return <ArrowsClockwise size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("run") || combined.includes("exec") || combined.includes("shell") || combined.includes("bash") || combined.includes("terminal") || combined.includes("cmd")) {
    return <Terminal size={13} weight="bold" className={iconClass} />;
  }

  // 4. Integrations, Database & Version Control
  if (combined.includes("git") || combined.includes("diff") || combined.includes("commit") || combined.includes("branch") || combined.includes("merge")) {
    return <GitDiff size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("db") || combined.includes("sql") || combined.includes("query") || combined.includes("schema") || combined.includes("database")) {
    return <Database size={13} weight="bold" className={iconClass} />;
  }
  if (combined.includes("api") || combined.includes("http") || combined.includes("fetch") || combined.includes("curl") || combined.includes("rest") || combined.includes("endpoint")) {
    return <PlugsConnected size={13} weight="bold" className={iconClass} />;
  }

  // 5. Reasoning, Thinking & Planning
  if (combined.includes("think") || combined.includes("reason") || combined.includes("plan") || combined.includes("pens") || combined.includes("raciocin")) {
    return <Sparkle size={13} weight="fill" className={iconClass} />;
  }

  return <Code size={13} weight="bold" className={iconClass} />;
}

/**
 * Retorna o ícone do tipo de arquivo específico para cada chip de diff (Monocromático / Cinza)
 */
export function getContextualFileIcon(fileName: string): React.ReactNode {
  const f = (fileName || "").toLowerCase();
  const fileIconClass = "text-text-content-secondary/80 shrink-0";

  if (f.endsWith(".tsx") || f.endsWith(".jsx") || f.endsWith(".ts") || f.endsWith(".js")) {
    return <Code size={12} weight="bold" className={fileIconClass} />;
  }
  if (f.endsWith(".css") || f.endsWith(".scss") || f.endsWith(".sass") || f.includes("tailwind")) {
    return <Palette size={12} weight="bold" className={fileIconClass} />;
  }
  if (f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml") || f.endsWith(".env") || f.endsWith(".toml")) {
    return <BracketsCurly size={12} weight="bold" className={fileIconClass} />;
  }
  if (f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".doc")) {
    return <FileText size={12} weight="bold" className={fileIconClass} />;
  }
  if (f.endsWith(".html") || f.endsWith(".htm")) {
    return <Globe size={12} weight="bold" className={fileIconClass} />;
  }
  if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".svg") || f.endsWith(".webp") || f.endsWith(".ico")) {
    return <Image size={12} weight="bold" className={fileIconClass} />;
  }

  return <FileCode size={12} weight="bold" className={fileIconClass} />;
}

const ROWS: ToolStep[] = [
  {
    icon: "think",
    label: "Thinking",
    chip: "Planejando arquitetura e fluxos de execução...",
    mono: false,
    detailMono: false,
    detail: [
      { text: "Mapeando requisitos e dependências do ambiente." },
      { text: "Definindo estratégia de código com estados reativos." },
    ],
  },
  {
    icon: "write",
    label: "Write 204 lines",
    chip: "App.tsx",
    mono: true,
    detailMono: true,
    detail: [
      { text: "+ const [activeTab, setActiveTab] = useState('overview');", tone: "add" },
      { text: "+ return <InteractiveDashboard tabs={tabs} />", tone: "add" },
    ],
  },
  {
    icon: "run",
    label: "Rebuild and verify",
    chip: "npm run build",
    mono: true,
    detailMono: true,
    detail: [
      { text: "✓ Build succeeded in 1.1s" },
      { text: "✓ Zero errors found (tsc --noEmit)" },
    ],
  },
  {
    icon: "read",
    label: "Read source",
    chip: "schema.ts",
    mono: true,
    detailMono: false,
    detail: [
      { text: "128 linhas analisadas com tipagem estrita." },
      { text: "Definição de modelos Drizzle & SQLite mapeados." },
    ],
  },
];

const DIFFS: ToolDiff[] = [
  { file: "App.tsx", add: 74, del: 12 },
  { file: "server.ts", add: 38, del: 4 },
  { file: "types.ts", add: 14, del: 0 },
];

/* hovering a file chip opens its diff — green added, red removed */
const DIFF_LINES: Record<string, ToolDiffLine[]> = {
  "App.tsx": [
    { text: "export default function App() {", tone: "ctx" },
    { text: "  const [data, setData] = useState([]);", tone: "add" },
    { text: "  return <DashboardLayout />;", tone: "add" },
    { text: "}", tone: "ctx" },
  ],
  "server.ts": [
    { text: "app.post('/api/tools/execute', async (req, res) => {", tone: "ctx" },
    { text: "  const result = await runExecutor(req.body);", tone: "add" },
    { text: "  return res.json(result);", tone: "add" },
    { text: "});", tone: "ctx" },
  ],
  "types.ts": [
    { text: "export interface ToolState {", tone: "add" },
    { text: "  status: 'idle' | 'running' | 'success';", tone: "add" },
    { text: "}", tone: "add" },
  ],
};

export default function ToolChips({
  steps = [],
  diffs = [],
  diffLines = {},
  labels,
  className,
  onOpenChange,
  onToggleRow,
  initialOpen = true,
}: {
  /** Accepted for gallery/registry parity; ToolChips has no visual variants. */
  variant?: string;
  steps?: ToolStep[];
  diffs?: ToolDiff[];
  diffLines?: Record<string, ToolDiffLine[]>;
  labels?: Partial<ToolChipsLabels>;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  onToggleRow?: (label: string, open: boolean) => void;
  initialOpen?: boolean;
} = {}) {
  const DEFAULT_DYNAMIC_LABELS: ToolChipsLabels = {
    header: `${steps.length} ferramentas executadas`,
    more: `+${Math.max(0, steps.length - 4)} mais`,
  };
  const copy = { ...DEFAULT_DYNAMIC_LABELS, ...labels };
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(initialOpen);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  // Sync open state with initialOpen prop to allow external control (e.g. auto-collapse)
  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  const [preview, setPreview] = useState<{
    file: string;
    x: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  const openPreview = (file: string) => (event: React.SyntheticEvent) => {
    const el = (event.currentTarget as Element)?.closest?.("[data-diffchip]");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const previewHeight = 38 + (diffLines[file]?.length ?? 0) * 19;
    const fitsBelow = rect.bottom + 6 + previewHeight <= window.innerHeight - 12;
    setPreview({
      file,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 330)),
      ...(fitsBelow
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  };

  const closePreview = (file: string) => () =>
    setPreview((current) => (current?.file === file ? null : current));
  const total = steps.length + 1;

  useEffect(() => {
    if (step >= total) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [step, total]);

  const toggleRow = (label: string) =>
    setOpenRows((current) => {
      const next = new Set(current);
      next.has(label) ? next.delete(label) : next.add(label);
      onToggleRow?.(label, next.has(label));
      return next;
    });

  return (
    <div className={`w-full max-w-[780px] pb-1${className ? ` ${className}` : ""}`}>
      {/* collapsed run header */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() =>
          setOpen((current) => {
            onOpenChange?.(!current);
            return !current;
          })
        }
        className="-mx-1.5 flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-text-content-secondary transition-colors duration-150 hover:bg-white/5 hover:text-text-content-primary cursor-pointer"
      >
        <CaretDown
          size={12}
          weight="bold"
          className="transition-transform duration-200 text-text-content-secondary"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
        <span className="tabular-nums">{copy.header}</span>
      </button>

      {/* tool call rows */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="-mx-1 overflow-hidden px-1.5 pb-1">
          <div className="mt-1.5 flex flex-col gap-1">
            {steps.map((row, rowIdx) => {
              const rowOpen = openRows.has(row.label);
              return (
                <div key={`${row.label}_${rowIdx}`} style={{ animation: `fade-up 400ms cubic-bezier(0.23,1,0.32,1) ${rowIdx * 150}ms both` }}>
                  <button
                    type="button"
                    aria-expanded={rowOpen}
                    onClick={() => toggleRow(row.label)}
                    className="group/row -mx-[3px] flex min-h-7 w-[calc(100%+6px)] min-w-0 items-start gap-2 rounded-lg px-2 py-1 text-left transition-all duration-150 hover:bg-white/5 cursor-pointer"
                  >
                    <span className="relative flex size-5 shrink-0 items-center justify-center">
                      <span className={`transition-opacity duration-100 flex size-5 items-center justify-center rounded-[3px] bg-cover bg-center border border-white/10 shadow-xs ${rowOpen ? "opacity-0" : "group-hover/row:opacity-0"}`} style={{ backgroundImage: `url('https://imgdb.io/i/axsNhBY.png')` }}>
                        {getContextualToolIcon(row.icon, row.label, row.chip)}
                      </span>
                      <CaretRight
                        size={11}
                        weight="bold"
                        className={`absolute text-text-content-secondary transition-all duration-150 ${rowOpen ? "opacity-100 rotate-90" : "opacity-0 group-hover/row:opacity-100"}`}
                      />
                    </span>
                    <span className="min-w-0 max-w-[42%] shrink-0 break-words text-[12.5px] font-medium text-text-content-primary">{row.label}</span>
                    <span
                      className={`inline-flex min-h-5.5 min-w-0 flex-1 items-start rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5
                        break-words [overflow-wrap:anywhere] whitespace-pre-wrap text-[11px] text-text-content-secondary transition-colors duration-100 group-hover/row:bg-white/[0.08] group-hover/row:text-text-content-primary
                        ${row.mono ? "font-mono" : ""}`}
                    >
                      {row.chip}
                    </span>
                  </button>

                  {/* expanded detail */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-300"
                    style={{
                      gridTemplateRows: rowOpen ? "1fr" : "0fr",
                      opacity: rowOpen ? 1 : 0,
                      transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-0.5 mb-1 ml-3 flex flex-col gap-0.5 border-l border-border-divider-subtle/50 py-0.5 pl-3.5">
                        {row.detail.map((line, lineIdx) => (
                          <span
                            key={`${line.text}_${lineIdx}`}
                            className={`break-words [overflow-wrap:anywhere] whitespace-pre-wrap text-[11px] leading-[1.6] ${row.detailMono ? "font-mono" : ""} ${line.tone === "add" ? "text-emerald-400" : "text-text-content-secondary/80"}`}
                          >
                            {line.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* file-diff chips with contextual file icons */}
          {diffs && diffs.length > 0 && (
            <div className="mt-2.5 flex max-w-full flex-wrap gap-1.5 border-t border-border-divider-subtle/40 pt-2.5">
              {diffs.map((d, i) => (
                <span
                  key={`${d.file}_${i}`}
                  data-diffchip
                  className="relative"
                  onMouseEnter={openPreview(d.file)}
                  onMouseLeave={closePreview(d.file)}
                >
                  <button
                    type="button"
                    aria-expanded={preview?.file === d.file}
                    aria-label={`Show diff for ${d.file}`}
                    onFocus={openPreview(d.file)}
                    onBlur={closePreview(d.file)}
                    className="inline-flex h-6.5 max-w-full items-center gap-1.5 rounded-md
                      bg-white/[0.04] border border-white/[0.08] px-2 font-mono text-[11px] text-text-content-primary shadow-xs
                      transition-all duration-150 hover:bg-white/[0.08] hover:border-white/15 cursor-pointer"
                    style={{ animation: `pop-in 250ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both` }}
                  >
                    <span className="inline-flex size-4 items-center justify-center rounded-[3px] bg-cover bg-center border border-white/10 overflow-hidden" style={{ backgroundImage: `url('https://imgdb.io/i/axsNhBY.png')` }}>
                      {getContextualFileIcon(d.file)}
                    </span>
                    <span className="min-w-0 truncate">{d.file}</span>
                    <span className="shrink-0 text-emerald-400 tabular-nums">+{d.add}</span>
                    {d.del > 0 && <span className="shrink-0 text-rose-400 tabular-nums">−{d.del}</span>}
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="inline-flex h-6.5 items-center rounded-md px-1.5 font-mono text-[11px] text-text-content-secondary/60
                  underline decoration-transparent underline-offset-2 transition-colors duration-100
                  hover:text-text-content-primary hover:decoration-current cursor-pointer"
                style={{ animation: `fade-in 300ms ease-out ${diffs.length * 80}ms both` }}
              >
                {copy.more}
              </button>
            </div>
          )}
        </div>
      </div>

      {preview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-50 w-80 overflow-hidden rounded-xl bg-[#141416] border border-white/10 shadow-2xl backdrop-blur-md"
          style={{
            left: preview.x,
            top: preview.top,
            bottom: preview.bottom,
            animation: "pop-in 160ms cubic-bezier(0.23,1,0.32,1) both",
            transformOrigin: preview.top === undefined ? "bottom left" : "top left",
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              {getContextualFileIcon(preview.file)}
              <span className="min-w-0 truncate text-text-content-primary font-semibold">{preview.file}</span>
            </div>
            <span className="shrink-0 tabular-nums text-[10px]">
              <span className="text-emerald-400">+{diffs.find((diff) => diff.file === preview.file)?.add}</span>
              {(diffs.find((diff) => diff.file === preview.file)?.del ?? 0) > 0 && (
                <span className="text-rose-400"> −{diffs.find((diff) => diff.file === preview.file)?.del}</span>
              )}
            </span>
          </div>
          <div className="py-1.5 font-mono text-[10.5px] leading-[1.8] bg-[#0a0a0c]">
            {(diffLines[preview.file] ?? []).map((line, index) => (
              <div
                key={index}
                className={`flex gap-2 px-3 whitespace-pre ${
                  line.tone === "add"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : line.tone === "del"
                      ? "bg-rose-500/10 text-rose-300"
                      : "text-text-content-secondary/80"
                }`}
              >
                <span className="w-3 shrink-0 select-none text-[10px] font-bold">
                  {line.tone === "add" ? "+" : line.tone === "del" ? "−" : " "}
                </span>
                <span className="min-w-0 truncate">{line.text}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
