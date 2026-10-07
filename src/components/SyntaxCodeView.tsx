import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block";

export interface SyntaxCodeViewProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  compact?: boolean;
  className?: string;
  maxHeight?: string;
  variant?: 'default' | 'bare';
}

/**
 * Intelligent language detection based on extension, alias or code content analysis.
 * Supports React, Next.js, Vue, JSON, TypeScript, JavaScript, CSS, HTML, Bash, Python, SQL, YAML, etc.
 */
export function detectLanguage(langOrFilename?: string, codeContent?: string): string {
  if (langOrFilename) {
    const raw = langOrFilename.trim().toLowerCase();
    const ext = raw.includes('.') ? raw.split('.').pop() || '' : raw;

    switch (ext) {
      case 'vue':
      case 'vuejs':
        return 'vue';
      case 'json':
      case 'json5':
      case 'jsonc':
        return 'json';
      case 'tsx':
      case 'react':
      case 'react-ts':
      case 'next':
      case 'nextjs':
        return 'tsx';
      case 'jsx':
      case 'reactjs':
        return 'jsx';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'js':
      case 'javascript':
      case 'mjs':
      case 'cjs':
      case 'node':
        return 'javascript';
      case 'html':
      case 'htm':
      case 'svg':
      case 'xml':
        return 'html';
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return 'css';
      case 'sh':
      case 'bash':
      case 'zsh':
      case 'shell':
      case 'terminal':
      case 'console':
        return 'bash';
      case 'py':
      case 'python':
        return 'python';
      case 'sql':
      case 'psql':
      case 'mysql':
        return 'sql';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'md':
      case 'markdown':
      case 'mdx':
        return 'markdown';
      case 'gitignore':
      case 'env':
        return 'bash';
    }
  }

  // Content-based heuristic detection
  if (codeContent) {
    const trimmed = codeContent.trim();
    if (!trimmed) return 'typescript';

    // JSON detection
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        if (/^[\s\n]*["{[]/.test(trimmed)) return 'json';
      }
    }

    // Vue detection
    if (trimmed.includes('<template>') || trimmed.includes('<script setup') || trimmed.includes('<style scoped>')) {
      return 'vue';
    }

    // HTML detection
    if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
      return 'html';
    }

    // CSS detection
    if (/^@(?:import|media|keyframes|theme|custom-variant)/.test(trimmed) || /\{\s*[\w-]+:\s*[^;]+;\s*\}/.test(trimmed)) {
      return 'css';
    }

    // Bash detection
    if (/^#!\/bin\//.test(trimmed) || /^(?:curl|npm|npx|pnpm|yarn|git|cd|cat|echo|mkdir|rm)\s+/m.test(trimmed)) {
      return 'bash';
    }

    // React / Next / TSX detection
    if (trimmed.includes('import React') || trimmed.includes('export default function') || /<[A-Z][A-Za-z0-9]*[\s/>]/.test(trimmed) || /className=/.test(trimmed)) {
      return 'tsx';
    }

    // SQL detection
    if (/^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/im.test(trimmed)) {
      return 'sql';
    }

    // Python detection
    if (/^(?:def\s+\w+|import\s+\w+|from\s+\w+\s+import|class\s+\w+:)/m.test(trimmed)) {
      return 'python';
    }
  }

  return 'typescript';
}

/**
 * Friendly badge info for language (name + badge styling)
 */
export function getLanguageBadge(lang: string, filename?: string): { label: string; color: string; bg: string; border: string } {
  const normalized = (filename ? filename.split('.').pop() || lang : lang).toLowerCase();

  switch (normalized) {
    case 'vue':
      return { label: 'Vue 3', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    case 'react':
    case 'tsx':
    case 'jsx':
      return { label: 'React / TSX', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
    case 'next':
    case 'nextjs':
      return { label: 'Next.js', color: 'text-white', bg: 'bg-white/10', border: 'border-white/20' };
    case 'json':
      return { label: 'JSON', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    case 'typescript':
    case 'ts':
      return { label: 'TypeScript', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    case 'javascript':
    case 'js':
      return { label: 'JavaScript', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    case 'css':
    case 'scss':
      return { label: 'CSS / Tailwind', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' };
    case 'html':
    case 'markup':
      return { label: 'HTML', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    case 'bash':
    case 'shell':
    case 'sh':
      return { label: 'Bash / Shell', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
    case 'python':
    case 'py':
      return { label: 'Python', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    case 'sql':
      return { label: 'SQL', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    case 'yaml':
    case 'yml':
      return { label: 'YAML', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    default:
      return { label: lang.toUpperCase(), color: 'text-white/70', bg: 'bg-white/5', border: 'border-white/10' };
  }
}

/**
 * Universal Code Block structured with @reui/c-code-block-1:
 * CodeBlock, CodeBlockHeader, CodeBlockTitle, CodeBlockLanguage, CodeBlockCopyButton
 */
export function SyntaxCodeView({
  code,
  language,
  filename,
  showLineNumbers = true,
  compact = false,
  className = '',
  maxHeight = '500px',
  variant = 'default'
}: SyntaxCodeViewProps) {
  const resolvedLanguage = useMemo(() => {
    return detectLanguage(language || filename, code);
  }, [language, filename, code]);

  const title = filename || `snippet.${language || resolvedLanguage}`;

  if (variant === 'bare') {
    return (
      <CodeBlock
        code={code}
        language={resolvedLanguage}
        showLineNumbers={false}
        className={cn("bg-transparent border-0 text-[12px]", className)}
        variant="ghost"
      />
    );
  }

  return (
    <div className={`rounded-xl border border-border-divider-subtle bg-bg-surface-panel overflow-hidden shadow-2xl my-2.5 ${className}`}>
      <CodeBlock
        code={code}
        language={resolvedLanguage}
        showLineNumbers={showLineNumbers && !compact}
        className="rounded-xl border-0 bg-bg-surface-panel"
      >
        <CodeBlockHeader className="bg-bg-surface-panel border-b border-border-divider-subtle px-3 py-1.5 flex items-center">
          <CodeBlockTitle className="text-text-content-primary/80 text-[11px] font-mono font-medium truncate max-w-[280px]">
            {title}
          </CodeBlockTitle>
          <CodeBlockLanguage className="ml-2.5 bg-white/5 border border-border-divider-subtle text-text-content-primary/70 text-[10px]" />
          <CodeBlockCopyButton className="ml-auto text-text-content-primary/40 hover:text-text-content-primary" />
        </CodeBlockHeader>
      </CodeBlock>
    </div>
  );
}

/**
 * Inline code snippet with subtle syntax highlighting tokens
 */
export function InlineCodeSnippet({ code }: { code: string }) {
  // If code is multi-line or looks like a JSON object / block, render a compact block
  if (code.includes('\n') || (code.length > 60 && (code.startsWith('{') || code.startsWith('<')))) {
    return <SyntaxCodeView code={code} compact showLineNumbers={false} maxHeight="200px" />;
  }

  // Clean inline code badge
  const isTag = /<[A-Za-z0-9]+.*>/.test(code);
  const isJson = /^\{.*\}$/.test(code);
  const isKeyword = /^(?:import|export|const|let|var|function|return|if|else|interface|type)\b/.test(code);

  return (
    <code className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[11px] border border-border-divider-subtle shadow-xs mx-0.5 ${
      isTag 
        ? 'bg-cyan-950/30 text-cyan-300 border-cyan-500/20' 
        : isJson 
        ? 'bg-amber-950/30 text-amber-300 border-amber-500/20'
        : isKeyword 
        ? 'bg-purple-950/30 text-purple-300 border-purple-500/20'
        : 'bg-bg-action-hover text-white/90'
    }`}>
      {code}
    </code>
  );
}
