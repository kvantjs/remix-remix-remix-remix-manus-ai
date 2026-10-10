import { useEffect, useRef, useState } from "react";
import { ArrowUp, Microphone, Paperclip, Stop, X } from "@phosphor-icons/react";

const COMMANDS = [
  { key: "/context", description: "Definir contexto e preferências para esta tarefa" },
];

const ACCEPTED_EXTENSIONS = new Set([
  "txt", "md", "csv", "tsv", "json", "yaml", "yml", "xml", "html", "htm",
  "css", "js", "jsx", "ts", "tsx", "py", "sql", "log",
]);
const MAX_FILES = 4;
const MAX_FILE_BYTES = 512 * 1024;

function isSupportedTextFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXTENSIONS.has(extension) || file.type.startsWith("text/");
}

export interface PromptBarProps {
  variant?: "Rounded" | "Pill" | string;
  tall?: boolean;
  placeholder?: string;
  onSend?: (text: string, attachments?: File[]) => void;
  onStop?: () => void;
  isThinking?: boolean;
  className?: string;
}

export default function PromptBar({
  variant = "Rounded",
  tall = false,
  placeholder = "Pergunte ao Manus ou descreva uma tarefa...",
  onSend,
  onStop,
  isThinking = false,
  className = "",
}: PromptBarProps) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [activeCommand, setActiveCommand] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const pill = variant === "Pill";
  const commandMatch = /^\/([\w-]*)$/.exec(draft.trim());
  const commandQuery = commandMatch?.[1]?.toLowerCase() ?? "";
  const matchingCommands = commandMatch
    ? COMMANDS.filter((command) => command.key.slice(1).startsWith(commandQuery))
    : [];
  const canSend = Boolean(draft.trim() || attachments.length);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "0px";
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 28), 144)}px`;
    input.style.overflowY = input.scrollHeight > 144 ? "auto" : "hidden";
  }, [draft, attachments.length]);

  useEffect(() => {
    if (!listening) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("O ditado por voz não é compatível com este navegador.");
      setListening(false);
      return;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) setDraft((current) => `${current}${current ? " " : ""}${transcript}`);
        setVoiceError("");
        setListening(false);
        inputRef.current?.focus();
      };
      recognition.onerror = (event: any) => {
        setVoiceError(event.error === "not-allowed"
          ? "Permita o acesso ao microfone para usar o ditado."
          : "Não foi possível reconhecer a fala. Tente novamente.");
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognition.start();
    } catch {
      setVoiceError("Não foi possível iniciar o ditado neste navegador.");
      setListening(false);
    }

    return () => {
      try { recognition?.stop?.(); } catch { /* já encerrado */ }
      recognitionRef.current = null;
    };
  }, [listening]);

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const supported = selected.filter(isSupportedTextFile);
    const tooLarge = supported.filter((file) => file.size > MAX_FILE_BYTES);
    const sizeOk = supported.filter((file) => file.size <= MAX_FILE_BYTES);
    const remaining = Math.max(0, MAX_FILES - attachments.length);
    let bytesRemaining = Math.max(0, 1024 * 1024 - attachments.reduce((total, file) => total + file.size, 0));
    const accepted: File[] = [];
    for (const file of sizeOk.slice(0, remaining)) {
      if (file.size > bytesRemaining) continue;
      accepted.push(file);
      bytesRemaining -= file.size;
    }
    const errors: string[] = [];
    if (supported.length !== selected.length) errors.push("Aceitos apenas arquivos de texto e código; PDF e imagens ainda não são processados pelo runtime.");
    if (tooLarge.length) errors.push("Cada arquivo deve ter até 512 KB.");
    if (sizeOk.length > remaining) errors.push(`É possível anexar até ${MAX_FILES} arquivos por mensagem.`);
    if (accepted.length < Math.min(sizeOk.length, remaining)) errors.push("Os arquivos anexados devem somar até 1 MB.");
    setAttachmentError(errors.join(" "));
    setAttachments((current) => [...current, ...accepted]);
    inputRef.current?.focus();
  };

  const send = () => {
    if (isThinking) {
      onStop?.();
      return;
    }
    if (!canSend) return;
    onSend?.(draft.trim() || "Analise os arquivos anexados.", attachments);
    setDraft("");
    setAttachments([]);
    setAttachmentError("");
    setVoiceError("");
  };

  const chooseCommand = (command: string) => {
    setDraft(command);
    setActiveCommand(0);
    inputRef.current?.focus();
  };

  return (
    <div data-promptbar className={`relative w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...ACCEPTED_EXTENSIONS].map((extension) => `.${extension}`).join(",")}
        className="hidden"
        onChange={addFiles}
        aria-label="Selecionar arquivos de texto ou código"
      />

      {matchingCommands.length > 0 && (
        <div className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-xl border border-white/10 bg-[#242424] p-1 shadow-2xl">
          {matchingCommands.map((command, index) => (
            <button
              key={command.key}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseCommand(command.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${index === activeCommand ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              <span className="font-mono text-xs text-white/80">{command.key}</span>
              <span className="text-xs text-white/50">{command.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className={`relative flex flex-col gap-2 border border-white/10 bg-[#202020] p-2.5 shadow-[0_8px_32px_rgba(0,0,0,.18)] transition-colors focus-within:border-white/20 ${pill ? "rounded-[24px]" : tall ? "rounded-[22px]" : "rounded-[18px]"}`}>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 pt-0.5" aria-label="Arquivos anexados">
            {attachments.map((file, index) => (
              <span key={`${file.name}-${index}`} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] pl-2 pr-1 text-[11px] text-white/70">
                <Paperclip size={12} aria-hidden="true" />
                <span className="max-w-48 truncate">{file.name}</span>
                <button type="button" aria-label={`Remover ${file.name}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="ml-0.5 rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setActiveCommand(0);
            setAttachmentError("");
            setVoiceError("");
          }}
          onKeyDown={(event) => {
            if (matchingCommands.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              event.preventDefault();
              setActiveCommand((index) => (index + (event.key === "ArrowDown" ? 1 : matchingCommands.length - 1)) % matchingCommands.length);
              return;
            }
            if (matchingCommands.length && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              chooseCommand(matchingCommands[activeCommand]?.key ?? matchingCommands[0].key);
              return;
            }
            if (event.key === "Enter" && !event.shiftKey && !isThinking && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={isThinking ? "O agente está trabalhando…" : placeholder}
          aria-label="Mensagem para o agente"
          className={`min-h-7 w-full resize-none bg-transparent px-2 py-1 text-[13px] leading-5 text-white outline-none placeholder:text-white/35 ${tall ? "min-h-16 text-sm" : ""}`}
        />

        <div className="flex items-center justify-between gap-2 px-0.5">
          <button
            type="button"
            aria-label="Anexar arquivo de texto ou código"
            onClick={() => fileInputRef.current?.click()}
            disabled={isThinking || attachments.length >= MAX_FILES}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            title="Anexar arquivo de texto ou código"
          >
            <Paperclip size={17} aria-hidden="true" />
          </button>
          <span className="flex-1 text-[10px] text-white/35">Digite <kbd className="rounded border border-white/10 px-1 py-0.5 font-mono">/</kbd> para comandos</span>
          <button
            type="button"
            aria-label={listening ? "Encerrar ditado" : "Ditado por voz"}
            aria-pressed={listening}
            onClick={() => {
              setVoiceError("");
              setListening((current) => !current);
            }}
            disabled={isThinking}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-35 ${listening ? "bg-blue-500/15 text-blue-300" : "text-white/50 hover:bg-white/[0.07] hover:text-white"}`}
            title="Ditado por voz"
          >
            <Microphone size={16} weight={listening ? "fill" : "regular"} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={isThinking ? "Interromper agente" : "Enviar mensagem"}
            disabled={!isThinking && !canSend}
            onClick={send}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${isThinking ? "bg-white/10 text-white hover:bg-white/15" : canSend ? "bg-white text-[#171717] hover:bg-white/90" : "cursor-not-allowed bg-white/[0.07] text-white/30"}`}
            title={isThinking ? "Interromper" : "Enviar (Enter)"}
          >
            {isThinking ? <Stop size={14} weight="fill" aria-hidden="true" /> : <ArrowUp size={17} weight="bold" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {(attachmentError || voiceError) && (
        <p role="status" className="mt-2 px-2 text-[11px] leading-relaxed text-amber-300/90">{attachmentError || voiceError}</p>
      )}
    </div>
  );
}
