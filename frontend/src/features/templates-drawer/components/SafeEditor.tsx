import { useEffect, useState, useRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { Copy, Check, WrapText } from "lucide-react";
import { toast } from "sonner";
import CustomCodeEditor from "./CustomCodeEditor";
import { useEditorStore } from "../store/editor.store";
import { SAMPLE_DATA } from "../utils/sample-data";

let globalMonacoStatus: "loading" | "loaded" | "failed" = "loading";
const globalMonacoListeners = new Set<(status: "loading" | "loaded" | "failed") => void>();

function setGlobalStatus(status: "loading" | "loaded" | "failed") {
  if (globalMonacoStatus === status) return;
  globalMonacoStatus = status;
  globalMonacoListeners.forEach((l) => l(status));
}

function extractPaths(obj: any, currentPath = ""): string[] {
  if (obj === null || typeof obj !== "object") {
    return currentPath ? [currentPath] : [];
  }
  if (Array.isArray(obj)) {
    const paths = [currentPath];
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      paths.push(...extractPaths(obj[0], currentPath ? `${currentPath}[0]` : ""));
    }
    return paths;
  }
  const paths: string[] = [];
  if (currentPath) {
    paths.push(currentPath);
  }
  for (const key of Object.keys(obj)) {
    paths.push(...extractPaths(obj[key], currentPath ? `${currentPath}.${key}` : key));
  }
  return paths;
}

const FALLBACK_VARS = extractPaths(SAMPLE_DATA).sort();
const MATH_FUNCTIONS = ["sum", "count", "avg", "min", "max"];
const HELPERS = ["formatCurrency", "formatBacenCurrency", "formatCpfCnpj", "math", "calc", "dedup", "round"];
const SYSTEM_VARS = ["template.protocol", "template.date", "template.company"];

let monacoCompletionsRegistered = false;

function registerGlobalMonacoCompletions(monaco: any) {
  if (monacoCompletionsRegistered) return;
  monacoCompletionsRegistered = true;

  const languages = ["html", "javascript"];

  languages.forEach((lang) => {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ["{", "$", "."],
      provideCompletionItems: (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const lastDoubleCurly = textUntilPosition.lastIndexOf("{{");
        const lastCloseCurly = textUntilPosition.lastIndexOf("}}");
        
        let insideExpression = false;
        if (lastDoubleCurly !== -1 && (lastCloseCurly === -1 || lastCloseCurly < lastDoubleCurly)) {
          insideExpression = true;
        }

        const textBefore = textUntilPosition.trim();
        const endsWithDollar = textBefore.endsWith("$");
        const endsWithOpenCurly = textBefore.endsWith("{");

        if (!insideExpression && !endsWithDollar && !endsWithOpenCurly) {
          return { suggestions: [] };
        }

        const storeVars = useEditorStore.getState().availableVariables;
        const activeVars = storeVars && storeVars.length > 0 ? storeVars : FALLBACK_VARS;

        const suggestions: any[] = [];

        // 1. Variáveis do sistema
        SYSTEM_VARS.forEach((v) => {
          const systemVar = `$${v}`;
          suggestions.push({
            label: systemVar,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: insideExpression ? systemVar : `{{ ${systemVar} }}`,
            detail: "Variável de Sistema",
            documentation: `Retorna o valor do sistema para $${v}`,
          });
        });

        // 2. Variáveis de dados
        activeVars.forEach((v) => {
          const dataVar = `$${v}`;
          suggestions.push({
            label: dataVar,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: insideExpression ? dataVar : `{{ ${dataVar} }}`,
            detail: "Variável de Consulta",
            documentation: `Caminho do dado: $${v}`,
          });
        });

        // 3. Funções Matemáticas
        MATH_FUNCTIONS.forEach((f) => {
          suggestions.push({
            label: f,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: insideExpression ? `${f}($1)` : `{{ ${f}($1) }}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Função Matemática",
            documentation: `Executa cálculo sobre expressão: ${f}(expressao)`,
          });
        });

        // 4. Funções Auxiliares (Helpers)
        HELPERS.forEach((h) => {
          suggestions.push({
            label: h,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: insideExpression ? `${h}($1)` : `{{ ${h}($1) }}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Função Auxiliar",
            documentation: `Formata ou processa dado: ${h}(expressao)`,
          });
        });

        return { suggestions };
      },
    });
  });
}

if (typeof window !== "undefined") {
  loader.init()
    .then((monaco) => {
      setGlobalStatus("loaded");
      registerGlobalMonacoCompletions(monaco);
    })
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
  onMount?: (editor: any, monaco: any) => void;
  hideHeader?: boolean;
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
  onMount,
  hideHeader = false,
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
      {!hideHeader && (
        <div className="flex items-center justify-between px-3.5 h-9 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 select-none">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
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
      )}

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
              onMount={onMount}
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
