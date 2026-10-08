import React from 'react';
import { ProfessionalCodeBlock } from './ProfessionalCodeBlock';
import { InlineCodeSnippet } from './SyntaxCodeView';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { Favicon, extractCleanDomain } from '@/lib/favicon';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Robust, high-fidelity Markdown parser and renderer.
 * Handles headings, tables, blockquotes, ordered/unordered lists, code blocks,
 * inline styles (bold, italic, strikethrough, inline code, links), and line breaks.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const elements = parseMarkdownToReact(normalizeMarkdownContent(content));

  return (
    <div className={`min-w-0 max-w-full space-y-2 break-words [overflow-wrap:anywhere] text-text-content-primary/90 ${className}`}>
      {elements}
    </div>
  );
}


/** Normaliza respostas vindas de modelos antes da análise estrutural. */
export function normalizeMarkdownContent(content: string): string {
  let normalized = String(content || '')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // Alguns provedores devolvem quebras escapadas como texto literal.
  if (!normalized.includes('\n') && normalized.includes('\\n')) {
    normalized = normalized.replace(/\\n/g, '\n');
  }

  // Evita que uma cerca de código aberta faça o restante da resposta desaparecer.
  const fenceCount = (normalized.match(/^\s*```/gm) || []).length;
  if (fenceCount % 2 === 1) normalized += '\n```';
  return normalized.trim();
}

/**
 * Parses inline Markdown: bold, italic, bold-italic, strikethrough, inline code, links.
 */
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  type InlineToken = 
    | { type: 'text'; text: string }
    | { type: 'bold'; text: string }
    | { type: 'italic'; text: string }
    | { type: 'bold-italic'; text: string }
    | { type: 'strike'; text: string }
    | { type: 'highlight'; text: string }
    | { type: 'code'; text: string }
    | { type: 'link'; text: string; url: string };

  const tokens: InlineToken[] = [];
  let i = 0;

  while (i < text.length) {
    // Check for inline code `...`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Check for bold-italic ***...***
    if (text.startsWith('***', i)) {
      const end = text.indexOf('***', i + 3);
      if (end !== -1) {
        tokens.push({ type: 'bold-italic', text: text.slice(i + 3, end) });
        i = end + 3;
        continue;
      }
    }

    // Check for bold **...** or __...__
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', text: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text.startsWith('__', i)) {
      const end = text.indexOf('__', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', text: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Check for strikethrough ~~...~~
    if (text.startsWith('~~', i)) {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'strike', text: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Check for highlight ==...==
    if (text.startsWith('==', i)) {
      const end = text.indexOf('==', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'highlight', text: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Check for italic *...* or _..._ (avoid matching inside words if preceded/followed by alphanumeric)
    if (text[i] === '*' && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '(' || text[i - 1] === '\n')) {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && text[end + 1] !== '*') {
        tokens.push({ type: 'italic', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Check for links [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const linkUrl = text.slice(closeBracket + 2, closeParen);
          tokens.push({ type: 'link', text: linkText, url: linkUrl });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Append regular character
    const lastToken = tokens[tokens.length - 1];
    if (lastToken && lastToken.type === 'text') {
      lastToken.text += text[i];
    } else {
      tokens.push({ type: 'text', text: text[i] });
    }
    i++;
  }

  return tokens.map((token, idx) => {
    const key = `inline-${idx}-${token.text.slice(0, 10)}`;
    switch (token.type) {
      case 'bold':
        return (
          <strong key={key} className="font-semibold text-white">
            {parseInlineMarkdown(token.text)}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic text-white/90">
            {token.text}
          </em>
        );
      case 'bold-italic':
        return (
          <strong key={key} className="font-bold italic text-white">
            {token.text}
          </strong>
        );
      case 'strike':
        return (
          <del key={key} className="line-through text-text-content-secondary/70">
            {token.text}
          </del>
        );
      case 'highlight':
        return (
          <mark key={key} className="bg-neutral-800 text-neutral-100 px-1.5 py-0.5 rounded text-[12.5px] font-medium not-italic border border-neutral-700/60 selection:bg-neutral-700 shadow-xs">
            {token.text}
          </mark>
        );
      case 'code':
        return <InlineCodeSnippet key={key} code={token.text} />;
      case 'link': {
        const linkHref = token.url.startsWith('http://') || token.url.startsWith('https://') ? token.url : `https://${token.url}`;
        return (
          <a
            key={key}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium inline-flex items-center gap-1 cursor-pointer align-baseline"
          >
            <Favicon urlOrDomain={token.url || token.text} size={14} className="shrink-0 inline-block align-middle" />
            <span>{token.text}</span>
          </a>
        );
      }
      case 'text':
      default:
        return <React.Fragment key={key}>{renderTextWithDomainFavicons(token.text, key)}</React.Fragment>;
    }
  });
}

/**
 * Detects domain and URL mentions in text and renders them with the site's Favicon on the left
 * without any background container.
 */
export function renderTextWithDomainFavicons(rawText: string, keyPrefix: string): React.ReactNode {
  if (!rawText) return null;

  // Regex that captures URLs and domain names (e.g., https://..., www...., or domain.tld)
  const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"'()[\]{}]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.(?:com|org|net|edu|gov|io|ai|tech|co|app|br|uk|de|fr|es|it|me|info|tv|xyz|dev|cloud|page|link|shop|store|online|site|space|top|club|pro|cc|to|is|gg|live|news|world|agency|studio|global|fm|social|blog|directory|guru|solutions|design|center|life)(?:\/[^\s<>"'()[\]{}]*)?)/gi;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(rawText)) !== null) {
    const matchStart = match.index;
    let matchStr = match[0];

    // Push preceding regular text
    if (matchStart > lastIndex) {
      parts.push(rawText.slice(lastIndex, matchStart));
    }

    // Strip trailing punctuation (e.g. dots, commas, colons, brackets) so they don't break the domain
    let trailingPunct = '';
    const punctMatch = matchStr.match(/([.,;:!?)\]}>]+)$/);
    if (punctMatch) {
      trailingPunct = punctMatch[1];
      matchStr = matchStr.slice(0, -trailingPunct.length);
    }

    const domain = extractCleanDomain(matchStr);
    if (domain && domain.includes('.')) {
      const targetHref = matchStr.startsWith('http://') || matchStr.startsWith('https://') 
        ? matchStr 
        : `https://${matchStr}`;

      parts.push(
        <a
          key={`${keyPrefix}-dom-${matchStart}`}
          href={targetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium inline-flex items-center gap-1 cursor-pointer align-baseline"
        >
          <Favicon urlOrDomain={matchStr} size={14} className="shrink-0 inline-block align-middle" />
          <span>{matchStr}</span>
        </a>
      );
    } else {
      parts.push(matchStr);
    }

    if (trailingPunct) {
      parts.push(trailingPunct);
    }

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < rawText.length) {
    parts.push(rawText.slice(lastIndex));
  }

  return parts.length === 0 ? rawText : parts;
}

/**
 * Parses full multi-line Markdown text into structured React nodes.
 */
function parseMarkdownToReact(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let inUnorderedList = false;
  let unorderedListItems: React.ReactNode[] = [];

  let inOrderedList = false;
  let orderedListItems: Array<{ num: string; content: React.ReactNode }> = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushCodeBlock = (key: string | number) => {
    if (inCodeBlock) {
      const code = codeBlockLines.join('\n');
      elements.push(
        <ProfessionalCodeBlock
          key={`code-block-${key}`}
          code={code}
          language={codeBlockLang || undefined}
        />
      );
      codeBlockLines = [];
      codeBlockLang = '';
      inCodeBlock = false;
    }
  };

  const flushUnorderedList = (key: string | number) => {
    if (unorderedListItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="space-y-1.5 my-2.5 pl-1">
          {unorderedListItems}
        </ul>
      );
      unorderedListItems = [];
      inUnorderedList = false;
    }
  };

  const flushOrderedList = (key: string | number) => {
    if (orderedListItems.length > 0) {
      elements.push(
        <ol key={`ol-${key}`} className="space-y-2 my-2.5 pl-1">
          {orderedListItems.map((item, idx) => (
            <li key={`ol-item-${idx}`} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text-content-primary/90">
              <span className="text-[13px] font-semibold text-text-content-primary shrink-0 mt-0.5 min-w-[18px] text-start">
                {item.num}.
              </span>
              <div className="flex-1 min-w-0">
                {item.content}
              </div>
            </li>
          ))}
        </ol>
      );
      orderedListItems = [];
      inOrderedList = false;
    }
  };

  const flushTable = (key: string | number) => {
    if (inTable && (tableHeaders.length > 0 || tableRows.length > 0)) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="my-3 overflow-x-auto rounded-xl border border-border-divider-subtle bg-bg-surface-panel shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            {tableHeaders.length > 0 && (
              <thead className="bg-bg-action-hover/60 border-b border-border-divider-subtle">
                <tr>
                  {tableHeaders.map((th, thIdx) => (
                    <th key={thIdx} className="px-3.5 py-2.5 font-semibold text-text-content-primary font-mono text-[11px] uppercase tracking-wider">
                      {parseInlineMarkdown(th.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-border-divider-subtle/50">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-bg-action-hover/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-text-content-primary/90 text-xs">
                      {parseInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const flushAll = (key: string | number) => {
    flushCodeBlock(key);
    flushUnorderedList(key);
    flushOrderedList(key);
    flushTable(key);
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // 1. Code Block Fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(idx);
        continue;
      } else {
        flushAll(idx);
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Table row detection (| col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      // Check if this is divider row (|---|---|)
      const isDivider = /^\|(\s*:?-+:?\s*\|)+$/.test(trimmed);
      if (isDivider) {
        continue; // divider row handled
      }

      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      if (!inTable) {
        flushAll(idx);
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(idx);
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    if (trimmed.startsWith('#### ')) {
      flushAll(idx);
      elements.push(
        <h4 key={`h4-${idx}`} className="text-xs font-bold text-text-content-primary mt-3 mb-1 tracking-tight">
          {parseInlineMarkdown(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushAll(idx);
      elements.push(
        <h3 key={`h3-${idx}`} className="text-[13.5px] font-bold text-text-content-primary mt-4 mb-1.5 tracking-tight border-b border-white/5 pb-1 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-white shrink-0" />
          <span>{parseInlineMarkdown(trimmed.slice(4))}</span>
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushAll(idx);
      elements.push(
        <h2 key={`h2-${idx}`} className="text-sm font-extrabold text-white mt-4 mb-2 tracking-tight">
          {parseInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushAll(idx);
      elements.push(
        <h1 key={`h1-${idx}`} className="text-base font-black text-white mt-5 mb-2.5 tracking-tight">
          {parseInlineMarkdown(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // 4. Horizontal Rule (--- or ***)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushAll(idx);
      elements.push(<hr key={`hr-${idx}`} className="border-border-divider-subtle my-3" />);
      continue;
    }

    // 5. Blockquotes (> ...)
    if (trimmed.startsWith('> ')) {
      flushAll(idx);
      elements.push(
        <blockquote
          key={`quote-${idx}`}
          className="border-l-2 border-white/20 bg-white/5 pl-3 py-1.5 my-2 text-xs italic text-text-content-primary/80 rounded-r"
        >
          {parseInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // 6. Ordered list (1. item, 2. item, etc.)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushUnorderedList(idx);
      flushTable(idx);
      inOrderedList = true;
      orderedListItems.push({
        num: orderedMatch[1],
        content: parseInlineMarkdown(orderedMatch[2])
      });
      continue;
    }

    // 7. Unordered list (- item, * item, + item)
    const unorderedMatch = trimmed.match(/^(?:[-*+]|•)\s+(.*)$/);
    if (unorderedMatch) {
      flushOrderedList(idx);
      flushTable(idx);
      inUnorderedList = true;
      unorderedListItems.push(
        <li key={`ul-li-${idx}`} className="flex items-start gap-2 text-[13px] leading-relaxed text-text-content-primary/90">
          <span className="size-1.5 rounded-full bg-white/80 shrink-0 mt-2" />
          <div className="flex-1 min-w-0">{parseInlineMarkdown(unorderedMatch[1])}</div>
        </li>
      );
      continue;
    }

    // 8. Empty line -> paragraph separator
    if (trimmed === '') {
      flushAll(idx);
      elements.push(<div key={`spacer-${idx}`} className="h-2" />);
      continue;
    }

    // 9. Regular text paragraph
    flushAll(idx);
    elements.push(
      <p key={`p-${idx}`} className="text-[13px] md:text-[13.5px] leading-relaxed text-text-content-primary/90">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushAll('end');

  return elements;
}
