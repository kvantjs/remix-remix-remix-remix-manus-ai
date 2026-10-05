"use client";

import { useEffect, useState } from "react";
import { Favicon } from "@/lib/favicon";

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT
 * Words resolve out of blur, inline citations appear in
 * context, then actions and follow-up prompts become usable.
 * ───────────────────────────────────────────────────────── */

const WORD_MS = 55;
const HOLD_MS = 3400;

/* one streamed word, or a `cite` placeholder that renders an inline source chip */
export type StreamingToken = { text: string; cite?: boolean };

const TOKENS: StreamingToken[] = [
  ..."Pistachio is your fastest-growing flavor — sales are up 23% this month and margins beat vanilla by 8 points."
    .split(" ")
    .map((text) => ({ text })),
  { text: "", cite: true },
  ..."Stone-fruit flavors are trending in the same range."
    .split(" ")
    .map((text) => ({ text })),
];

const FOLLOW_UPS = [
  "Which flavors sell best in winter",
  "Compare gelato and soft serve margins",
];

const SOURCE_IMAGES = {
  scoop:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%231f7a5f'/%3E%3Cpath d='M20 36c0 7 5.4 12 12 12s12-5 12-12H20Z' fill='%23fff'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23bff3dd'/%3E%3Cpath d='M24 24c4-7 13-7 17 0' fill='none' stroke='%231f7a5f' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
  trends:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232f6fec'/%3E%3Cpath d='M15 43 27 31l8 7 14-18' fill='none' stroke='%23fff' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='49' cy='20' r='5' fill='%23bfe0ff'/%3E%3C/svg%3E",
  market:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23e56d24'/%3E%3Cpath d='M17 45V25h8v20h-8Zm11 0V16h8v29h-8Zm11 0V30h8v15h-8Z' fill='%23fff'/%3E%3Cpath d='M16 49h32' stroke='%23ffd6b8' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E",
};

/* one cited source rendered as an inline chip and in the sources list */
export type StreamingSource = { name: string; domain: string; href: string; image: string };

const SOURCES: StreamingSource[] = [
  { name: "Scoop Data", domain: "scoopdata.io", href: "https://scoopdata.io/", image: SOURCE_IMAGES.scoop },
  { name: "Trends Index", domain: "trends.google.com", href: "https://trends.google.com/trends/", image: SOURCE_IMAGES.trends },
  { name: "Market Basket", domain: "marketbasket.io", href: "https://marketbasket.io/", image: SOURCE_IMAGES.market },
];

function SourceChip({ source }: { source?: StreamingSource }) {
  if (!source) return null;
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="ml-0.5 mr-1 inline-flex h-5 items-center gap-1.5 rounded-[5px]
        bg-[var(--hover-2)] pr-[6px] pl-[5px] align-middle font-mono text-[10.5px] text-[var(--ink-2)] border border-[var(--line)]
        transition-colors duration-150 hover:bg-[var(--hover)] hover:text-[var(--ink)] cursor-pointer"
      style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      <Favicon urlOrDomain={source.domain || source.href} size={11} className="rounded-[2px]" />
      <span>{source.domain}</span>
    </a>
  );
}

const ACTION_ICONS: React.ReactNode[] = [
  <g key="copy"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></g>,
  <path key="retry" d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />,
  <path key="up" d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />,
  <path key="down" d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />,
];

export type StreamingLabels = {
  /** label on the collapsed sources toggle */
  sources: string;
  /** heading above the follow-up prompts */
  followUps: string;
};

const DEFAULT_LABELS: StreamingLabels = {
  sources: "3 sources",
  followUps: "Sugestões de acompanhamento",
};

export default function StreamingText({
  content = TOKENS,
  sources = SOURCES,
  followUps = FOLLOW_UPS,
  labels,
  loop = false,
  fill = true,
  onDone,
  onFollowUp,
}: {
  variant?: string;
  /** the streamed tokens; `cite` tokens render an inline source chip */
  content?: StreamingToken[];
  /** cited sources shown in the chip, avatar stack, and expanded list */
  sources?: StreamingSource[];
  /** follow-up prompt suggestions shown once the stream completes */
  followUps?: string[];
  /** prominent copy strings */
  labels?: Partial<StreamingLabels>;
  /** restart the stream after a hold; turn off when embedding in a real thread */
  loop?: boolean;
  /** fill the parent width instead of the gallery's fixed measure */
  fill?: boolean;
  onDone?: () => void;
  /** fired when a follow-up prompt is chosen */
  onFollowUp?: (text: string, index: number) => void;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [count, setCount] = useState(content.length); // Full length initially for real chat messages
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const done = count >= content.length;

  useEffect(() => {
    // If we want actual streaming animation on mount, we initialize count at 0
    if (!loop) {
      setCount(content.length);
      return;
    }
    setCount(0);
    const interval = setInterval(() => {
      setCount((c) => {
        if (c >= content.length) {
          clearInterval(interval);
          onDone?.();
          return c;
        }
        return c + 1;
      });
    }, WORD_MS);
    return () => clearInterval(interval);
  }, [content, loop]);

  return (
    <div className={fill ? "w-full" : "min-h-[15rem] w-full max-w-95"}>
      <div className="text-[13px] leading-relaxed text-[var(--ink)]">
        {content.slice(0, count).map((token, i) =>
          token.cite ? (
            <SourceChip key={i} source={sources[i % sources.length]} />
          ) : (
            <span key={i} className="inline">
              {token.text}{" "}
            </span>
          ),
        )}
        {!done && (
          <span
            className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-[var(--ink)]"
            style={{ animation: "fade-in 150ms ease-out both" }}
          />
        )}
      </div>

      {/* action icons row */}
      {done && (
        <div
          className="mt-3 flex items-center gap-0.5 animate-in fade-in duration-300"
        >
          {ACTION_ICONS.map((icon, i) => (
            <button
              key={i}
              type="button"
              aria-label="Action"
              className="flex size-6 items-center justify-center rounded-[6px] text-[var(--ink-3)]
                transition-colors duration-100 hover:bg-[var(--hover-2)] hover:text-[var(--ink-2)] cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
            </button>
          ))}
          {sources.length > 0 && (
            <button
              type="button"
              aria-expanded={sourcesOpen}
              onClick={() => setSourcesOpen((current) => !current)}
              className="ml-2 flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-left transition-colors duration-150 hover:bg-[var(--hover)] cursor-pointer"
            >
              <span className="flex -space-x-1 items-center">
                {sources.slice(0, 3).map((source) => (
                  <Favicon
                    key={source.domain}
                    urlOrDomain={source.domain || source.href}
                    size={14}
                    containerClassName="rounded-full bg-[var(--canvas)] border border-[var(--line)] shadow-sm"
                  />
                ))}
              </span>
              <span className="text-[11.5px] text-[var(--ink-2)] font-medium">{sources.length} sources</span>
            </button>
          )}
        </div>
      )}

      {/* Expanded Sources Panel */}
      {done && sourcesOpen && sources.length > 0 && (
        <div
          className="mt-2 grid animate-in fade-in duration-300"
        >
          <div className="flex flex-col rounded-[10px] bg-black/5 dark:bg-white/[0.02] p-1 border border-[var(--line)] max-w-lg">
            {sources.map((source) => (
              <a
                key={source.domain}
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12px] text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--hover)] hover:text-[var(--ink)]"
              >
                <Favicon urlOrDomain={source.domain || source.href} size={16} containerClassName="rounded-[4px] border border-[var(--line)]" />
                <span className="hover:underline font-medium">{source.name}</span>
                <span className="ml-auto font-mono text-[10.5px] text-[var(--ink-3)]">{source.domain}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* follow-ups */}
      {done && followUps && followUps.length > 0 && (
        <div
          className="mt-4 pt-3 border-t border-[var(--line)] animate-in fade-in duration-500"
        >
          <p className="text-[12px] font-semibold text-[var(--ink-2)] mb-1">{l.followUps}</p>
          <div className="flex flex-col gap-1">
            {followUps.map((text, i) => (
              <button
                key={text}
                onClick={() => onFollowUp?.(text, i)}
                className="-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-[var(--line)] last:border-0
                  px-2.5 py-1.5 text-left text-[12.5px] text-[var(--ink)] transition-colors
                  duration-100 hover:bg-[var(--hover-2)] cursor-pointer"
                style={{ animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 90}ms both` }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--ink-3)]">
                  <path d="M9 10l-5 5 5 5" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
                <span>{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
