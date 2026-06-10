import { useEffect, useState, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { Copy, Check, WrapText } from "lucide-react";
import { toast } from "sonner";
import CustomCodeEditor from "./CustomCodeEditor";

let globalMonacoStatus: "loading" | "loaded" | "failed" = "loading";
const globalMonacoListeners = new Set<(status: "loading" | "loaded" | "failed") => void>();

function setGlobalStatus(status: "loading" | "loaded" | "failed") {
  if (globalMonacoStatus === status) return;
  globalMonacoStatus = status;
  globalMonacoListeners.forEach((l) => l(status));
}

if (typeof window !== "undefined") {
  loader.init()
    .then(() => setGlobalStatus("loaded"))
    .catch(() => setGlobalStatus("failed"));

  setTimeout(() => {
    if (globalMonacoStatus === "loading") {
      setGlobalStatus("failed");
    }
  }, 5000);
}

import React from "react";

class MonacoErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface SafeEditorProps {
  height?: string | number;
  language?: string;
  theme?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  options?: Record<string, any>;
  className?: string;
  path?: string;
}

export function SafeEditor({
  height = "100%",
  language = "html",
  theme = "vs-dark",
  value = "",
  onChange,
  options = {},
  className,
  path,
}: SafeEditorProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(globalMonacoStatus);
  const activeLang = language.toLowerCase();
  
  // HTML inicia com quebra de linha ligada por padrão, outros iniciam desligada
  const [wordWrap, setWordWrap] = useState<boolean>(activeLang === "html");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStatus(globalMonacoStatus);
    const listener = (newStatus: "loading" | "loaded" | "failed") => {
      setStatus(newStatus);
    };
    globalMonacoListeners.add(listener);
    return () => {
      globalMonacoListeners.delete(listener);
    };
  }, []);

  const isReadOnly = options.readOnly === true;
  const isDark = theme === "vs-dark";

  const handleCopy = () => {
    if (!value) {
      toast.info("Não há código para copiar!");
      return;
    }
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Código copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackEditor = (
    <CustomCodeEditor
      value={value}
      onChange={(v) => onChange?.(v)}
      language={language}
      theme={theme}
      height="100%"
      readOnly={isReadOnly}
    />
  );

  // Determina a altura em formato utilizável
  const containerHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      style={{ height: containerHeight }}
      className={cn(
        "flex flex-col w-full h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-md select-none group",
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-800",
        className
      )}
    >
      {/* Barra de título do editor */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 select-none">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Editor Premium de Código ({activeLang.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Botão de Quebra de Linha (Word Wrap) */}
          <button
            type="button"
            onClick={() => setWordWrap(!wordWrap)}
            className={cn(
              "h-6 w-6 rounded flex items-center justify-center cursor-pointer transition-all border border-transparent",
              wordWrap 
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/20" 
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700/50"
            )}
            title={`Alternar Quebra de Linha (Word Wrap - Ativo: ${wordWrap ? "Sim" : "Não"})`}
          >
            <WrapText className="size-3.5" />
          </button>

          {/* Botão de Copiar */}
          <button
            type="button"
            onClick={handleCopy}
            className="h-6 w-6 rounded flex items-center justify-center cursor-pointer transition-all border border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700/50"
            title="Copiar tudo para área de transferência"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Corpo do Editor */}
      <div className="flex-1 min-h-0 relative select-text">
        {status === "failed" ? (
          fallbackEditor
        ) : status === "loading" ? (
          <div
            className={cn(
              "w-full h-full flex flex-col items-center justify-center gap-2 font-sans text-xs",
              isDark ? "bg-slate-950 text-slate-400" : "bg-white text-slate-500"
            )}
          >
            <div className="size-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>Iniciando editor de código...</span>
          </div>
        ) : (
          <MonacoErrorBoundary fallback={fallbackEditor}>
            <Editor
              height="100%"
              language={language}
              theme={theme}
              value={value}
              onChange={onChange}
              path={path}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                },
                ...options,
                wordWrap: wordWrap ? "on" : "off", // Sobrescreve com precedência garantida no final
              }}
            />
          </MonacoErrorBoundary>
        )}
      </div>
    </div>
  );
}

export default SafeEditor;
