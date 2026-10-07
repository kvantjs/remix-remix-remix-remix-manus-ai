"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

/* ─────────────────────────────────────────────────────────
 * STREAMING TEXT
 * Words resolve out of blur, inline citations appear in
 * context, then actions and follow-up prompts become usable.
 * ───────────────────────────────────────────────────────── */

const WORD_MS = 60;

export type StreamingToken = { text: string; cite?: boolean; sourceIndex?: number };

export type StreamingSource = { name: string; domain: string; href: string; image?: string };

function sourceImage(source: StreamingSource) {
  if (source.image) return source.image;
  const domain = source.domain || "google.com";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function SourceChip({ source }: { source?: StreamingSource }) {
  if (!source) return null;
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="ml-0 mr-1 inline-flex h-4.5 translate-y-[-1px] items-center gap-1 rounded-[5px]
        bg-black/30 dark:bg-white/10 pr-[4px] pl-[4px] align-middle font-mono text-[10.5px] text-slate-300 border border-white/10
        transition-colors  hover:bg-white/15 hover:text-white cursor-pointer"
      style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      <img src={sourceImage(source)} alt="" className="source-avatar size-3 rounded-[3px]" />
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
  sources: "Fontes consultadas",
  followUps: "Sugestões de acompanhamento",
};

export interface StreamingTextProps {
  variant?: string;
  /** the streamed tokens or raw string; supports full markdown rendering */
  content?: StreamingToken[] | string;
  /** cited sources shown in the chip, avatar stack, and expanded list */
  sources?: StreamingSource[];
  /** prominent copy strings */
  labels?: Partial<StreamingLabels>;
  /** restart the stream after a hold; default false */
  loop?: boolean;
  /** fill the parent width */
  fill?: boolean;
  /** stream animation speed per token in milliseconds */
  speedMs?: number;
  /** when true, immediately shows full content without streaming animation */
  initialDone?: boolean;
  /** whether the message is actively streaming right now */
  isStreaming?: boolean;
  onDone?: () => void;
  children?: React.ReactNode;
}

export default function StreamingText({
  content = "",
  sources,
  labels,
  loop = false,
  fill = true,
  speedMs = WORD_MS,
  initialDone = false,
  isStreaming = false,
  onDone,
  children,
}: StreamingTextProps = {}) {
  const l = { ...DEFAULT_LABELS, ...labels };

  const rawString = useMemo(() => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((t) => t.text).join(" ");
    }
    return "";
  }, [content]);

  // Tokenize by words and punctuation for smooth progressive streaming
  const tokens = useMemo(() => {
    if (!rawString) return [];
    return rawString.split(/(\s+)/).filter(Boolean);
  }, [rawString]);

  // If not explicitly streaming or initialDone is set, mark as done immediately
  const shouldStream = isStreaming && !initialDone && tokens.length > 0;
  const [count, setCount] = useState<number>(() => (shouldStream ? 1 : tokens.length));
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const done = count >= tokens.length;
  const hasCalledDoneRef = useRef(false);

  useEffect(() => {
    if (!shouldStream) {
      setCount(tokens.length);
      return;
    }
    setCount(1);
    hasCalledDoneRef.current = false;
  }, [tokens.length, shouldStream]);

  useEffect(() => {
    if (done) {
      if (!hasCalledDoneRef.current) {
        hasCalledDoneRef.current = true;
        onDone?.();
      }
      return;
    }

    const interval = setTimeout(() => {
      setCount((c) => {
        const next = Math.min(tokens.length, c + 1); // advance 1 token for progressive word-by-word stream
        return next;
      });
    }, speedMs);

    return () => clearTimeout(interval);
  }, [count, done, tokens.length, speedMs, onDone]);

  // Progressive text string during streaming
  const currentDisplayedText = useMemo(() => {
    if (done || !shouldStream) return rawString;
    return tokens.slice(0, count).join("");
  }, [done, shouldStream, rawString, tokens, count]);

  return (
    <div className={fill ? "w-full" : "min-h-[15.5rem] w-full max-w-95"}>
      {children ? (
        <div className="relative">{children}</div>
      ) : (
        <div className="text-[15px] leading-relaxed text-[#f4f4f5]">
          <MarkdownRenderer content={currentDisplayedText} />
        </div>
      )}

      {/* action icons row (when sources available) */}
      {sources && sources.length > 0 && (
        <div
          className="mt-2.5 flex items-center gap-0.5 transition-opacity "
          style={{ opacity: done ? 1 : 0.6, pointerEvents: done ? "auto" : "none" }}
        >
          {ACTION_ICONS.map((icon, i) => (
            <button
              key={i}
              type="button"
              aria-label="Action"
              className="flex size-6 items-center justify-center rounded-[6px] text-slate-400
                transition-colors  hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
            </button>
          ))}
          <button
            type="button"
            aria-expanded={sourcesOpen}
            onClick={() => setSourcesOpen((current) => !current)}
            className="ml-1.5 flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-left transition-colors  hover:bg-white/5 cursor-pointer"
          >
            <span className="flex -space-x-1">
              {sources.slice(0, 3).map((source, idx) => (
                <img
                  key={idx}
                  src={sourceImage(source)}
                  alt=""
                  className="source-avatar size-3.5 rounded-full bg-slate-900 shadow-[0_0_0_1.5px_rgba(255,255,255,0.1)]"
                />
              ))}
            </span>
            <span className="text-[11.5px] text-slate-300">{sources.length} {l.sources}</span>
          </button>
        </div>
      )}

      {/* Collapsible Sources Box */}
      {sources && sources.length > 0 && (
        <div
          className="grid transition-[grid-template-rows,opacity] "
          style={{
            gridTemplateRows: done && sourcesOpen ? "1fr" : "0fr",
            opacity: done && sourcesOpen ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <div className="overflow-hidden">
            <div className="mt-1.5 flex flex-col rounded-[10px] bg-black/40 border border-white/10 p-1.5 shadow-sm max-w-lg">
              {sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[12px] text-slate-300 transition-colors  hover:bg-white/5 hover:text-white"
                >
                  <img src={sourceImage(source)} alt="" className="source-avatar size-4 rounded-[4px]" />
                  <span className="hover:underline font-medium text-white">{source.name}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-slate-500">{source.domain}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
