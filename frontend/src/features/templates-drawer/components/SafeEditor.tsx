import { useEffect, useState, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { cn } from "@/lib/utils";

let globalMonacoStatus: "loading" | "loaded" | "failed" = "loading";
const globalMonacoListeners = new Set<(status: "loading" | "loaded" | "failed") => void>();

function setGlobalStatus(status: "loading" | "loaded" | "failed") {
  if (globalMonacoStatus === status) return;
  globalMonacoStatus = status;
  globalMonacoListeners.forEach((l) => l(status));
}

// Inicializa a tentativa de carregar o Monaco da CDN de forma global
if (typeof window !== "undefined") {
  loader.init()
    .then(() => setGlobalStatus("loaded"))
    .catch(() => setGlobalStatus("failed"));

  // Se demorar mais de 1200ms para carregar da CDN, aciona fallback para melhor UX
  setTimeout(() => {
    if (globalMonacoStatus === "loading") {
      setGlobalStatus("failed");
    }
  }, 1200);
}

interface SafeEditorProps {
  height?: string | number;
  language?: string;
  theme?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  options?: Record<string, any>;
  className?: string;
}

export function SafeEditor({
  height = "100%",
  language = "html",
  theme = "vs-dark",
  value = "",
  onChange,
  options = {},
  className,
}: SafeEditorProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(globalMonacoStatus);
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("templates-drawer:editor-simple-mode") === "true";
    }
    return false;
  });

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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

  const toggleSimpleMode = () => {
    const newValue = !isSimpleMode;
    setIsSimpleMode(newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem("templates-drawer:editor-simple-mode", String(newValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textAreaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const spaces = "  "; // 2 espaços para indentação do código

      const newValue =
        value.substring(0, selectionStart) +
        spaces +
        value.substring(selectionEnd);

      onChange?.(newValue);

      // Restaura o cursor após a atualização do valor
      requestAnimationFrame(() => {
        if (textarea) {
          const newCursorPos = selectionStart + spaces.length;
          textarea.selectionStart = newCursorPos;
          textarea.selectionEnd = newCursorPos;
        }
      });
    }
  };

  const renderModeToggle = () => {
    return (
      <div className="absolute top-1.5 right-1.5 z-50 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={toggleSimpleMode}
          className={cn(
            "h-5 px-1.5 text-[9px] font-medium rounded shadow-sm border cursor-pointer transition-all flex items-center justify-center gap-1 backdrop-blur-md",
            isSimpleMode
              ? "bg-indigo-650 border-indigo-650 text-white hover:bg-indigo-700"
              : "bg-slate-100/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
          )}
          title={isSimpleMode ? "Alternar para Editor Completo (Monaco)" : "Alternar para Editor Simples (Texto)"}
        >
          <span>{isSimpleMode ? "Editor: Simples" : "Editor: Código"}</span>
        </button>
      </div>
    );
  };

  // Se o usuário selecionou o modo simples ou o Monaco falhou em carregar de forma definitiva
  if (isSimpleMode || status === "failed") {
    const isDark = theme === "vs-dark";
    return (
      <div style={{ height }} className={cn("w-full h-full relative group", className)}>
        <textarea
          ref={textAreaRef}
          className={cn(
            "w-full h-full p-3 font-mono text-xs border-none outline-none resize-none focus:ring-0 focus:outline-none leading-normal",
            isDark
              ? "bg-slate-950 text-slate-250 selection:bg-blue-500/30"
              : "bg-white text-slate-800 selection:bg-blue-200/50",
            className
          )}
          readOnly={isReadOnly}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isReadOnly ? "Sem conteúdo" : "Insira o código aqui..."}
        />
        {renderModeToggle()}
      </div>
    );
  }

  // Se o Monaco ainda estiver carregando, damos a opção de pular direto pro modo simples
  if (status === "loading") {
    const isDark = theme === "vs-dark";
    return (
      <div
        className={cn(
          "w-full flex flex-col items-center justify-center gap-2 font-sans text-xs relative",
          isDark ? "bg-slate-950 text-slate-400" : "bg-white text-slate-500",
          className
        )}
        style={{ height }}
      >
        <div className="size-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span>Iniciando editor...</span>
        <button
          type="button"
          onClick={() => {
            setIsSimpleMode(true);
            if (typeof window !== "undefined") {
              localStorage.setItem("templates-drawer:editor-simple-mode", "true");
            }
          }}
          className="px-2 py-0.5 mt-1 text-[9px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
        >
          Usar editor simples
        </button>
      </div>
    );
  }

  // Caso padrão: Monaco carregou perfeitamente
  return (
    <div style={{ height }} className={cn("w-full h-full relative group", className)}>
      <Editor
        height="100%"
        language={language}
        theme={theme}
        value={value}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          wordWrap: "on",
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
          },
          ...options,
        }}
      />
      {renderModeToggle()}
    </div>
  );
}

export default SafeEditor;
