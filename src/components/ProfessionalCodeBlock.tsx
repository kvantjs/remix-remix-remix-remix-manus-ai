import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockTitle,
} from "@/components/reui/code-block/code-block";
import { detectLanguage } from "./SyntaxCodeView";

interface ProfessionalCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  diff?: { added?: number[] | string; removed?: number[] | string };
  showLineNumbers?: boolean;
  compact?: boolean;
  className?: string;
}

export function ProfessionalCodeBlock({
  code,
  language,
  filename,
  diff,
  showLineNumbers = true,
  compact = false,
  className = ""
}: ProfessionalCodeBlockProps) {
  const resolvedLang = detectLanguage(language || filename, code);
  const title = filename || `snippet.${resolvedLang}`;

  return (
    <div className={`w-full my-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${className}`}>
      <CodeBlock
        code={code}
        language={resolvedLang}
        showLineNumbers={showLineNumbers && !compact}
        diff={diff}
        className="border border-border-divider-subtle bg-bg-surface-panel shadow-2xl rounded-xl overflow-hidden"
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
