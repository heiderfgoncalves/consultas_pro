import { useMemo, useEffect, useRef, useState } from "react";
import { SafeEditor as Editor } from "./SafeEditor";
import { useTheme } from "next-themes";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  Code2, 
  Grid3x3, 
  X, 
  RefreshCcw, 
  Copy, 
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Compass,
  Sparkles,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Eye,
  Settings2,
  Check,
  FileSpreadsheet,
  Database,
  TrendingUp,
  Workflow,
  GitBranch,
  Percent,
  Info,
  ShieldCheck,
  ShieldAlert,
  Palette,
  Users
} from "lucide-react";
import { toast } from "sonner";
import {
  useEditorStore,
  useEvaluationContext,
  type ConsoleView,
  type ConsolePanelMode,
} from "../store/editor.store";
import { renderTemplateToHtml } from "../engine/renderTemplateToHtml";
import { resolveExpression } from "../engine/resolveExpression";
import { serializeTemplateXml } from "../engine/xml";
import { getSuggestions, insertSuggestionAt } from "../utils/suggestions";

const VIEW_OPTIONS: { value: ConsoleView; label: string }[] = [
  { value: "data", label: "Dados (JSON)" },
  { value: "model", label: "Modelo de Relações (BI)" },
  { value: "templateJson", label: "Template (JSON)" },
  { value: "templateXml", label: "Template (XML)" },
  { value: "html", label: "HTML gerado" },
  { value: "logs", label: "Logs de bindings" },
  { value: "elementProps", label: "Propriedades do elemento" },
  { value: "auditor", label: "Auditor de Fórmulas (BI)" },
];

export function BottomConsole() {
  const layout = useEditorStore((s) => s.consoleLayout);
  const setLayout = useEditorStore((s) => s.setConsoleLayout);
  const toggle = useEditorStore((s) => s.toggleConsole);
  const groupRef = useRef<any>(null);

  // Fallback robusto no mount para garantir que as duas colunas apareçam (auto-recuperação/reset se colapsado)
  useEffect(() => {
    const ratio = layout.splitRatio;
    if (isNaN(ratio) || ratio < 0.15 || ratio > 0.85) {
      setLayout({ splitRatio: 0.5 });
      if (groupRef.current) {
        groupRef.current.setLayout([50, 50]);
      }
    }
  }, [layout.splitRatio, setLayout]);

  const rightSupportsGrid =
    layout.rightView === "data" ||
    layout.rightView === "logs" ||
    layout.rightView === "elementProps" ||
    layout.rightView === "expression";
  const rightEffectiveMode = rightSupportsGrid ? layout.rightMode : "code";

  return (
    <div className="h-full w-full flex flex-col border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-0 select-none">
      {/* Header Unificado com Controles de Visualização e Toggle */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-slate-200 dark:border-slate-800 bg-slate-100/85 dark:bg-[#1e293b]/50 text-xs shrink-0">
        {/* Painel Esquerdo Controls */}
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="text-indigo-500 font-bold font-mono">&gt;_</span> Console de Expressões
          </span>
        </div>

        {/* Controles da Direita e Fechamento no Topo */}
        <div className="flex items-center gap-2">
          {/* Seletor de visualização (sem label) */}
          <Select value={layout.rightView} onValueChange={(v) => setLayout({ rightView: v as ConsoleView })}>
            <SelectTrigger className="h-5.5 text-[10px] py-0 px-2 w-[125px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-850 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-850 dark:text-slate-200">
              {VIEW_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-[10px] focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-white">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botões Grid/Code se aplicável */}
          {rightSupportsGrid && (
            <div className="flex border border-slate-200 dark:border-slate-700 rounded overflow-hidden h-5.5">
              <button
                onClick={() => setLayout({ rightMode: "grid" })}
                className={cn(
                  "px-1.5 py-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center",
                  rightEffectiveMode === "grid" && "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white",
                )}
                title="Visualizar em Tabela"
              >
                <Grid3x3 className="size-2.8" />
              </button>
              <button
                onClick={() => setLayout({ rightMode: "code" })}
                className={cn(
                  "px-1.5 py-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-l border-slate-200 dark:border-slate-700 transition-colors flex items-center",
                  rightEffectiveMode === "code" && "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white",
                )}
                title="Visualizar em Código"
              >
                <Code2 className="size-2.8" />
              </button>
            </div>
          )}

          {/* Divisor vertical discreto */}
          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-850 mx-1 shrink-0" />

          {/* Botão de Fechar/Ocultar com Setinha */}
          <button
            onClick={toggle}
            title="Ocultar console"
            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center shrink-0"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo do Console com Redimensionamento Lateral */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-950">
        <ResizablePanelGroup
          ref={groupRef}
          direction="horizontal"
          autoSaveId="templates-drawer-console-horizontal"
          onLayout={(sizes) => {
            if (sizes.length < 2) return;
            setLayout({ splitRatio: sizes[0] / 100 });
          }}
        >
          <ResizablePanel
            id="console-left"
            defaultSize={Math.round(layout.splitRatio * 100)}
            minSize={15}
          >
            <div className="h-full flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-0">
              <div className="flex-1 min-h-0 h-full w-full relative">
                <BrowserConsole />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-750" />
          <ResizablePanel
            id="console-right"
            defaultSize={Math.round((1 - layout.splitRatio) * 100)}
            minSize={15}
          >
            <div className="h-full flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-0">
              <div className="flex-1 min-h-0 h-full w-full relative">
                <ViewBody view={layout.rightView} mode={rightEffectiveMode} />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function ViewBody({ view, mode }: { view: ConsoleView; mode: ConsolePanelMode }) {
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const dataJsonText = useEditorStore((s) => s.dataJsonText);
  const setDataJsonText = useEditorStore((s) => s.setDataJsonText);
  const testExpression = useEditorStore((s) => s.testExpression);
  const setTestExpression = useEditorStore((s) => s.setTestExpression);
  const activeFrameId = useEditorStore((s) => s.activeFrameId);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const editorMode = useEditorStore((s) => s.mode);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "light";

  const targetFrame =
    template.frames.find((f) => f.id === activeFrameId) ?? template.frames[0];

  const r = useMemo(() => {
    if (!targetFrame) return { html: "", logs: [] as { reason: string; expression: string; resolved?: unknown }[] };
    return renderTemplateToHtml(template, targetFrame.id, data, editorMode);
  }, [template, data, targetFrame, editorMode]);

  if (view === "data") {
    if (mode === "grid") {
      return <DataGridWrapper value={data} />;
    }
    return (
      <Editor
        height="100%"
        theme={theme}
        language="json"
        value={dataJsonText}
        onChange={(v) => setDataJsonText(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          automaticLayout: true,
          lineNumbers: "on",
        }}
      />
    );
  }
  if (view === "templateJson") {
    return (
      <Editor
        height="100%"
        theme={theme}
        language="json"
        value={JSON.stringify(template, null, 2)}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          readOnly: true,
          automaticLayout: true,
          lineNumbers: "on",
        }}
      />
    );
  }
  if (view === "templateXml") {
    return (
      <Editor
        height="100%"
        theme={theme}
        language="xml"
        value={serializeTemplateXml(template)}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          readOnly: true,
          wordWrap: "on",
          automaticLayout: true,
          lineNumbers: "on",
        }}
      />
    );
  }
  if (view === "html") {
    return (
      <Editor
        height="100%"
        theme={theme}
        language="html"
        value={r.html}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          readOnly: true,
          wordWrap: "on",
          automaticLayout: true,
          lineNumbers: "on",
        }}
      />
    );
  }
  if (view === "expression") {
    let result = "";
    try {
      const v = resolveExpression(testExpression, data);
      result = v === undefined ? "(não resolvido)" : JSON.stringify(v, null, 2);
    } catch (e) {
      result = String(e);
    }
    if (mode === "grid") {
      return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
          <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
            <input
              value={testExpression}
              onChange={(e) => setTestExpression(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded font-mono outline-none focus:border-indigo-500 transition-colors animate-fade-in"
              placeholder="cliente.nome"
            />
          </div>
          <pre className="flex-1 m-0 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 overflow-auto select-all">
            {result}
          </pre>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
          <input
            value={testExpression}
            onChange={(e) => setTestExpression(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded font-mono outline-none focus:border-indigo-500 transition-colors"
            placeholder="cliente.nome"
          />
        </div>
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            theme={theme}
            language="json"
            value={result}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              readOnly: true,
              automaticLayout: true,
              lineNumbers: "on",
            }}
          />
        </div>
      </div>
    );
  }
  if (view === "logs") {
    if (mode === "grid") {
      return (
        <div className="h-full overflow-auto text-xs bg-white dark:bg-slate-950">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-150 dark:bg-[#1e293b] text-slate-750 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="text-left px-3 py-1.5 w-24 font-semibold">Status</th>
                <th className="text-left px-3 py-1.5 font-semibold">Expressão</th>
                <th className="text-left px-3 py-1.5 font-semibold">Resolvido</th>
              </tr>
            </thead>
            <tbody>
              {r.logs.map((l, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-slate-150 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors",
                    l.reason === "missing" ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/10" : "text-slate-800 dark:text-slate-100",
                  )}
                >
                  <td className="px-3 py-1.5 uppercase text-[10px] font-bold">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider",
                      l.reason === "missing" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    )}>
                      {l.reason}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-indigo-600 dark:text-indigo-400 select-all">{l.expression}</td>
                  <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-300 whitespace-pre-wrap break-all select-all">
                    {l.reason === "ok" ? JSON.stringify(l.resolved) : "—"}
                  </td>
                </tr>
              ))}
              {r.logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-slate-500 text-center">
                    Nenhum binding avaliado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <Editor
        height="100%"
        theme={theme}
        language="json"
        value={JSON.stringify(r.logs, null, 2)}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          readOnly: true,
          automaticLayout: true,
          lineNumbers: "on",
        }}
      />
    );
  }
  if (view === "elementProps") {
    const el = template.elements.find((e) => selectedIds[0] === e.id);
    if (!el) {
      return (
        <div className="p-4 text-xs text-slate-500 bg-white dark:bg-slate-950 h-full flex items-center justify-center">
          Selecione um elemento para inspecionar suas propriedades.
        </div>
      );
    }
    if (mode === "grid") {
      return <KeyValueGrid value={el} />;
    }
    return (
      <Editor
        height="100%"
        theme={theme}
        language="json"
        value={JSON.stringify(el, null, 2)}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          readOnly: true,
          automaticLayout: true,
          lineNumbers: "on",
        }}
      />
    );
  }
  if (view === "auditor") {
    return <FormulaAuditor />;
  }
  if (view === "model") {
    return <DataRelationshipDiagram />;
  }
  return null;
}

function KeyValueGrid({ value }: { value: unknown }) {
  const rows = useMemo(() => flatten(value), [value]);
  return (
    <div className="h-full overflow-auto text-xs bg-white dark:bg-slate-950">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-slate-150 dark:bg-[#1e293b] text-slate-750 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="text-left px-3 py-1.5 w-1/3 font-semibold">Chave</th>
            <th className="text-left px-3 py-1.5 font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-slate-150 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors">
              <td className="px-3 py-1.5 font-mono text-indigo-600 dark:text-indigo-400 select-all">{k}</td>
              <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-all select-all">
                {String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function flatten(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (value === null || value === undefined) return [[prefix || "(root)", value]];
  if (typeof value !== "object") return [[prefix || "(root)", value]];
  const out: Array<[string, unknown]> = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flatten(v, key));
    } else if (Array.isArray(v)) {
      out.push([key, `[${v.length} itens]`]);
    } else {
      out.push([key, v]);
    }
  }
  return out;
}

// --- CONSOLE INTERATIVO ESTILO BROWSER ---

interface ConsoleLine {
  id: string;
  type: "command" | "result" | "error" | "info" | "binding-log";
  text: string;
  value?: any; // Para inspecionar objetos
  isError?: boolean;
}

let consoleHistoryBuffer: ConsoleLine[] = [];

function splitExpressions(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let inTemplateLiteral = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"' && !inSingleQuote && !inTemplateLiteral) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote && !inTemplateLiteral) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '`' && !inDoubleQuote && !inSingleQuote) {
      inTemplateLiteral = !inTemplateLiteral;
    }

    if (char === ';' && !inDoubleQuote && !inSingleQuote && !inTemplateLiteral) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
}



function evaluateConsoleExpression(inputExpr: string, data: any, template: any): any {
  const context = {
    ...data,
    template: {
      protocol: "PR-2026-9876",
      date: new Date().toLocaleDateString("pt-BR"),
      company: "Consultas PRO S.A.",
      ...template
    }
  };

  const parseNumber = (value: any): number => {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    if (value instanceof Date) return value.getTime();

    let s = String(value).trim();
    if (!s) return 0;

    // 1. Verificar se é percentual (ex: "15%", "0.15%")
    if (s.endsWith("%")) {
      const cleanPercent = s.replace(/%/g, "").trim();
      return parseNumber(cleanPercent) / 100;
    }

    // 2. Verificar se é data
    // Formato brasileiro: DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss
    const brDateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
    if (brDateMatch) {
      const day = Number(brDateMatch[1]);
      const month = Number(brDateMatch[2]) - 1; // 0-indexed
      const year = Number(brDateMatch[3]);
      const hour = brDateMatch[4] ? Number(brDateMatch[4]) : 0;
      const min = brDateMatch[5] ? Number(brDateMatch[5]) : 0;
      const sec = brDateMatch[6] ? Number(brDateMatch[6]) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // Formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...
    const isoDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
    if (isoDateMatch) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    // 3. Remover símbolos monetários (R$, $, etc.)
    s = s.replace(/[R$s$\s]/gi, "");

    // 4. Analisar e converter pontuação de milhar e decimal
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    
    if (lastComma > lastDot) {
      // Padrão brasileiro (ex: 1.500,20). Remove pontos de milhar, substitui vírgula por ponto.
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (lastDot > lastComma) {
      // Padrão internacional (ex: 1,500.20). Remove vírgulas.
      s = s.replace(/,/g, "");
    } else if (lastComma !== -1) {
      // Apenas vírgula existe (ex: 123,45)
      s = s.replace(",", ".");
    }

    const num = Number(s);
    return Number.isNaN(num) ? 0 : num;
  };

  const getArrayItems = (arr: any, field?: string): number[] => {
    const items: any[] = Array.isArray(arr) ? arr : (arr != null ? [arr] : []);
    return items.map(item => {
      if (item && typeof item === "object" && field) {
        return parseNumber(resolveExpression(field, item));
      }
      return parseNumber(item);
    });
  };

  const sum = (arr: any, field?: string) => {
    const nums = getArrayItems(arr, field);
    return nums.reduce((acc, v) => acc + v, 0);
  };

  const avg = (arr: any, field?: string) => {
    const nums = getArrayItems(arr, field);
    if (nums.length === 0) return 0;
    return sum(arr, field) / nums.length;
  };

  const min = (arr: any, field?: string) => {
    const nums = getArrayItems(arr, field);
    return nums.length > 0 ? Math.min(...nums) : 0;
  };

  const max = (arr: any, field?: string) => {
    const nums = getArrayItems(arr, field);
    return nums.length > 0 ? Math.max(...nums) : 0;
  };

  const count = (arr: any) => {
    if (arr == null) return 0;
    return Array.isArray(arr) ? arr.length : 1;
  };

  let expr = inputExpr.trim();
  if (!expr) return undefined;

  // Preprocessamento do dedup, idêntico ao do engine de interpolação
  expr = expr.replace(/\$?(dedup)\s*\(\s*(sum|avg|min|max|count)\s*\(\s*([^)]+?)\s*\)\s*,\s*(.+?)\s*\)/g, (match, fnName, aggFn, aggArgsStr, dedupKeysStr) => {
    let baseArrayPath = "";
    let aggField = "";
    const commaIndex = aggArgsStr.indexOf(",");
    if (commaIndex !== -1) {
      baseArrayPath = aggArgsStr.substring(0, commaIndex).trim();
      aggField = aggArgsStr.substring(commaIndex + 1).trim().replace(/['"]/g, '');
    } else {
      const lastDot = aggArgsStr.lastIndexOf(".");
      if (lastDot !== -1 && !aggArgsStr.endsWith(']')) {
        baseArrayPath = aggArgsStr.substring(0, lastDot).trim();
        aggField = aggArgsStr.substring(lastDot + 1).trim();
      } else {
        baseArrayPath = aggArgsStr.trim();
      }
    }

    const rawArray = resolveExpression(baseArrayPath, context);
    let arr: any[] = [];
    if (rawArray != null) {
      if (Array.isArray(rawArray)) {
        arr = rawArray;
      } else if (typeof rawArray === "object" && "linhas" in rawArray && Array.isArray((rawArray as any).linhas)) {
        arr = (rawArray as any).linhas;
      } else {
        arr = [rawArray];
      }
    }

    const flatArr = arr.reduce((acc, val) => {
      if (Array.isArray(val)) {
        return acc.concat(val);
      }
      acc.push(val);
      return acc;
    }, []);

    const keys = dedupKeysStr.split(',').map(k => k.trim().replace(/['"]/g, ''));
    
    const seen = new Set<string>();
    const dedupedArr = [];
    for (const item of flatArr) {
      if (!item || typeof item !== 'object') {
        dedupedArr.push(item);
        continue;
      }
      const keyValues = keys.map(k => {
        const val = resolveExpression(k, item);
        return val === undefined ? '' : String(val);
      });
      
      const hasValidKey = keyValues.some(v => v !== '');
      if (!hasValidKey) {
        dedupedArr.push(item);
        continue;
      }

      const hash = keyValues.join('|~|');
      if (!seen.has(hash)) {
        seen.add(hash);
        dedupedArr.push(item);
      }
    }

    let total = 0;
    if (aggFn === "sum") total = sum(dedupedArr, aggField);
    else if (aggFn === "avg") total = avg(dedupedArr, aggField);
    else if (aggFn === "min") total = min(dedupedArr, aggField);
    else if (aggFn === "max") total = max(dedupedArr, aggField);
    else if (aggFn === "count") total = count(dedupedArr);

    return String(total);
  });

  const consoleHelpers = [
    "sum", "avg", "min", "max", "count", "dedup",
    "formatCurrency", "formatBacenCurrency", "formatCpfCnpj", "json",
    "toNumber", "asNumber", "toPercent", "asPercent", "toCurrency", "asCurrency", "toDate", "asDate", "toText", "asText"
  ];

  const varRegex = /\$(?:\[\d+\]|\[\*\]|[a-zA-Z0-9_]+)(?:(?:\.[a-zA-Z0-9_]+)|(?:\[\d+\])|(?:\[\*\]))*/g;
  const matches = (expr.match(varRegex) || []).filter(v => {
    const name = v.substring(1);
    return !consoleHelpers.includes(name);
  });

  const uniqueVars = Array.from(new Set(matches)).sort((a, b) => b.length - a.length);

  const varMap: Record<string, any> = {};
  let compiledExpr = expr;

  uniqueVars.forEach((v, idx) => {
    const varName = `_v${idx}`;
    const path = v.substring(1); 
    
    const resolvedValue = resolveExpression(path, context);

    varMap[varName] = resolvedValue;

    const escapedV = v.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    compiledExpr = compiledExpr.replace(new RegExp(escapedV, 'g'), varName);
  });

  const formatCurrency = (val: any) => {
    const n = parseNumber(val);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };
  
  const formatBacenCurrency = (value: any) => {
    const n = parseNumber(value);
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toNumber = parseNumber;

  const toPercent = (val: any): number => {
    if (val == null) return 0;
    if (typeof val === "number") {
      return val > 1 ? val / 100 : val;
    }
    let s = String(val).trim();
    if (s.endsWith("%")) {
      return toNumber(s.slice(0, -1).trim()) / 100;
    }
    const num = toNumber(s);
    return num > 1 ? num / 100 : num;
  };

  const toCurrency = (val: any): string => {
    const num = toNumber(val);
    return "R$ " + num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toDate = (val: any): number => {
    if (val instanceof Date) return val.getTime();
    
    let s = String(val).trim();
    if (!s) return 0;

    const brDateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
    if (brDateMatch) {
      const day = Number(brDateMatch[1]);
      const month = Number(brDateMatch[2]) - 1;
      const year = Number(brDateMatch[3]);
      const hour = brDateMatch[4] ? Number(brDateMatch[4]) : 0;
      const min = brDateMatch[5] ? Number(brDateMatch[5]) : 0;
      const sec = brDateMatch[6] ? Number(brDateMatch[6]) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    const isoDateMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
    if (isoDateMatch) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getTime();
    }

    const num = toNumber(s);
    if (num > 1000000000) {
      return num;
    }
    return 0;
  };

  const toText = (val: any): string => {
    if (val == null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const formatCpfCnpj = (value: any) => {
    if (value == null) return "";
    const s = String(value).replace(/\D/g, "");
    if (s.length <= 11) {
      const pad = s.padStart(11, "0");
      return pad.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
    } else {
      const pad = s.padStart(14, "0");
      return pad.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
    }
  };

  const json = (val: any) => {
    return JSON.stringify(val, null, 2);
  };

  try {
    const keys = [
      "sum", "avg", "min", "max", "count", 
      "formatCurrency", "formatBacenCurrency", "formatCpfCnpj", "json",
      "$sum", "$avg", "$min", "$max", "$count", 
      "$formatCurrency", "$formatBacenCurrency", "$formatCpfCnpj", "$json",
      "toNumber", "asNumber", "toPercent", "asPercent", "toCurrency", "asCurrency", "toDate", "asDate", "toText", "asText",
      "$toNumber", "$asNumber", "$toPercent", "$asPercent", "$toCurrency", "$asCurrency", "$toDate", "$asDate", "$toText", "$asText",
      ...Object.keys(varMap)
    ];
    const args = [
      sum, avg, min, max, count, 
      formatCurrency, formatBacenCurrency, formatCpfCnpj, json,
      sum, avg, min, max, count, 
      formatCurrency, formatBacenCurrency, formatCpfCnpj, json,
      toNumber, toNumber, toPercent, toPercent, toCurrency, toCurrency, toDate, toDate, toText, toText,
      toNumber, toNumber, toPercent, toPercent, toCurrency, toCurrency, toDate, toDate, toText, toText,
      ...Object.values(varMap)
    ];
    const runner = new Function(...keys, `return (${compiledExpr});`);
    return runner(...args);
  } catch (e: any) {
    throw new Error(`Erro de sintaxe ou execução: ${e.message}`);
  }
}

function BrowserConsole() {
  const template = useEditorStore((s) => s.template);
  const dataJson = useEvaluationContext();
  const activeFrameId = useEditorStore((s) => s.activeFrameId);
  const editorMode = useEditorStore((s) => s.mode);

  const targetFrame =
    template.frames.find((f) => f.id === activeFrameId) ?? template.frames[0];

  const renderingResult = useMemo(() => {
    if (!targetFrame) return { logs: [] };
    try {
      return renderTemplateToHtml(template, targetFrame.id, dataJson, editorMode);
    } catch (e) {
      return { logs: [] };
    }
  }, [template, dataJson, targetFrame, editorMode]);

  const bindingLogs = renderingResult.logs;

  const [history, setHistory] = useState<ConsoleLine[]>(consoleHistoryBuffer);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionMetadata, setSuggestionMetadata] = useState<{ matchStart: number; matchEnd: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showBindingLogs, setShowBindingLogs] = useState(true);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Pilhas locais para desfazer/refazer (Undo/Redo)
  const undoStackRef = useRef<{ value: string; cursor: number }[]>([]);
  const redoStackRef = useRef<{ value: string; cursor: number }[]>([]);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef("");

  const saveToUndo = (val: string, cursor: number) => {
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    if (last && last.value === val) return;
    undoStackRef.current.push({ value: val, cursor });
    redoStackRef.current = [];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? newValue.length;

    const lastChar = newValue.slice(-1);
    const isDelimiter = /[\s+\-*/()$,.]/.test(lastChar);

    if (isDelimiter) {
      saveToUndo(inputValue, inputRef.current?.selectionStart ?? inputValue.length);
      lastSavedValueRef.current = newValue;
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        saveToUndo(inputValue, inputRef.current?.selectionStart ?? inputValue.length);
        lastSavedValueRef.current = newValue;
      }, 500);
    }

    setInputValue(newValue);
  };

  useEffect(() => {
    const handleFocusChange = () => {
      setFocusTrigger((p) => p + 1);
    };
    document.addEventListener("focusin", handleFocusChange);
    document.addEventListener("focusout", handleFocusChange);
    return () => {
      document.removeEventListener("focusin", handleFocusChange);
      document.removeEventListener("focusout", handleFocusChange);
    };
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justCompletedRef = useRef(false);

  const prevModeRef = useRef(editorMode);
  const loggedBindingsRef = useRef<Map<string, { ok: boolean; valHash: string }>>(new Map());

  const visibleHistory = useMemo(() => {
    if (showBindingLogs) return history;
    return history.filter((line) => {
      if (line.type === "binding-log" && !line.isError) {
        return false;
      }
      return true;
    });
  }, [history, showBindingLogs]);

  useEffect(() => {
    consoleHistoryBuffer = history;
  }, [history]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const availableVariables = useEditorStore((s) => s.availableVariables);

  // Efeito de Autocomplete Unificado
  useEffect(() => {
    if (justCompletedRef.current) {
      justCompletedRef.current = false;
      setIsOpen(false);
      return;
    }

    const selectionStart = inputRef.current?.selectionStart ?? inputValue.length;
    const res = getSuggestions(inputValue, selectionStart, true, availableVariables);
    
    setSuggestions(res.suggestions);
    setSuggestionMetadata({ matchStart: res.matchStart, matchEnd: res.matchEnd });
    setIsOpen(res.isOpen);
    setActiveIndex(0);
  }, [inputValue, availableVariables]);

  // Scroll automático no dropdown de autocomplete ao mover as setas
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

  const completeSuggestion = (suggestion: string) => {
    justCompletedRef.current = true;
    
    saveToUndo(inputValue, inputRef.current?.selectionStart ?? inputValue.length);

    const matchStart = suggestionMetadata?.matchStart ?? (inputRef.current?.selectionStart ?? inputValue.length);
    const matchEnd = suggestionMetadata?.matchEnd ?? (inputRef.current?.selectionStart ?? inputValue.length);

    const { newValue, newCursorPos } = insertSuggestionAt(inputValue, suggestion, matchStart, matchEnd);

    setInputValue(newValue);
    setIsOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursorPos;
        inputRef.current.selectionEnd = newCursorPos;
      }
    }, 10);
  };

  useEffect(() => {
    if (editorMode === "preview" && prevModeRef.current !== "preview") {
      loggedBindingsRef.current.clear();
    }
    prevModeRef.current = editorMode;

    if (bindingLogs.length === 0) return;

    const isTyping =
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA" ||
      (document.activeElement as HTMLElement | null)?.isContentEditable;

    if (isTyping) {
      return;
    }

    const newLines: ConsoleLine[] = [];
    
    bindingLogs.forEach((l) => {
      const isOk = l.reason === "ok";
      const valHash = JSON.stringify(isOk ? l.resolved : null);
      const existing = loggedBindingsRef.current.get(l.expression);

      if (!existing || existing.ok !== isOk || existing.valHash !== valHash) {
        loggedBindingsRef.current.set(l.expression, { ok: isOk, valHash });

        const idBase = `binding-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        newLines.push({
          id: idBase,
          type: "binding-log",
          isError: !isOk,
          text: l.expression,
          value: isOk ? l.resolved : new Error(`Variável ausente: ${l.expression}`)
        });
      }
    });

    if (newLines.length > 0) {
      setHistory(prev => {
        const combined = [...prev, ...newLines];
        if (combined.length > 250) {
          return combined.slice(combined.length - 250);
        }
        return combined;
      });
    }
  }, [bindingLogs, editorMode, focusTrigger]);

  function isObjectOrArray(v: any) {
    return typeof v === "object" && v !== null;
  }

  const handleExecute = () => {
    const command = inputValue.trim();
    if (!command) return;

    if (command.toLowerCase() === "clear" || command.toLowerCase() === "cls") {
      setHistory([]);
      setInputValue("");
      setIsOpen(false);
      return;
    }

    const expressions = splitExpressions(command);
    const newLines: ConsoleLine[] = [];

    expressions.forEach((expr, idx) => {
      const idBase = `user-cmd-${Date.now()}-${idx}`;
      
      newLines.push({
        id: `${idBase}-cmd`,
        type: "command",
        text: expr
      });

      let result: any;
      let isError = false;
      try {
        result = evaluateConsoleExpression(expr, dataJson, template);
      } catch (e: any) {
        result = e?.message || String(e);
        isError = true;
      }

      newLines.push({
        id: `${idBase}-res`,
        type: isError ? "error" : "result",
        text: expr,
        value: result
      });
    });

    setHistory(prev => [...prev, ...newLines]);
    setInputValue("");
    setIsOpen(false);
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Interceptação de desfazer/refazer (Undo/Redo) com suporte a Ctrl+Z e Ctrl+Y / Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const last = undoStackRef.current.pop();
      if (last) {
        redoStackRef.current.push({ value: inputValue, cursor: inputRef.current?.selectionStart ?? inputValue.length });
        justCompletedRef.current = true;
        setInputValue(last.value);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = last.cursor;
          }
        }, 0);
      }
      return;
    }

    const isRedo = (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"));
    if (isRedo) {
      e.preventDefault();
      const next = redoStackRef.current.pop();
      if (next) {
        undoStackRef.current.push({ value: inputValue, cursor: inputRef.current?.selectionStart ?? inputValue.length });
        justCompletedRef.current = true;
        setInputValue(next.value);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = inputRef.current.selectionEnd = next.cursor;
          }
        }, 0);
      }
      return;
    }

    if (isOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (suggestions[activeIndex]) {
          completeSuggestion(suggestions[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    } else {
      if (e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      } else if (e.key === "ArrowUp") {
        const commandHistory = history.filter(line => line.type === "command").map(line => line.text);
        if (commandHistory.length > 0) {
          e.preventDefault();
          const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(nextIdx);
          justCompletedRef.current = true;
          saveToUndo(inputValue, inputRef.current?.selectionStart ?? inputValue.length);
          setInputValue(commandHistory[nextIdx]);
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.selectionStart = inputRef.current.selectionEnd = commandHistory[nextIdx].length;
            }
          }, 0);
        }
      } else if (e.key === "ArrowDown") {
        const commandHistory = history.filter(line => line.type === "command").map(line => line.text);
        if (commandHistory.length > 0 && historyIndex !== -1) {
          e.preventDefault();
          const nextIdx = historyIndex + 1;
          justCompletedRef.current = true;
          saveToUndo(inputValue, inputRef.current?.selectionStart ?? inputValue.length);
          if (nextIdx >= commandHistory.length) {
            setHistoryIndex(-1);
            setInputValue("");
          } else {
            setHistoryIndex(nextIdx);
            setInputValue(commandHistory[nextIdx]);
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.selectionStart = inputRef.current.selectionEnd = commandHistory[nextIdx].length;
              }
            }, 0);
          }
        }
      }
    }
  };

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono text-xs select-text min-h-0 relative">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/70 dark:bg-slate-900/60 shrink-0 select-none border-b border-slate-200/50 dark:border-slate-800/50">
        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span className="text-indigo-500 dark:text-indigo-400 font-bold">&gt;_</span> Console
        </span>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <input 
              type="checkbox" 
              checked={showBindingLogs} 
              onChange={(e) => setShowBindingLogs(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-650 dark:text-indigo-400 focus:ring-indigo-500 size-3 cursor-pointer"
            />
            <span className="font-semibold uppercase tracking-wider text-[9px]">Bindings</span>
          </label>

          <button 
            onClick={() => setHistory([])}
            className="text-[10px] text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-455 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-850 font-semibold uppercase tracking-wider text-[9px]"
            title="Limpar histórico"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {visibleHistory.length === 0 && (
          <div className="text-slate-400 dark:text-slate-550 leading-normal italic py-1 pl-1">
            Console de Expressões inicializado. Digite variáveis como $cliente ou $template para avaliar.
          </div>
        )}

        <div className="space-y-2">
          {visibleHistory.map((line) => {
            if (line.type === "command") {
              return (
                <div key={line.id} className="flex items-start gap-1.5 text-indigo-650 dark:text-indigo-455 font-semibold select-none">
                  <span className="text-slate-400 dark:text-slate-655">&gt;</span>
                  <span className="font-mono">{line.text}</span>
                </div>
              );
            }
            if (line.type === "error") {
              const errStr = line.value instanceof Error ? line.value.message : String(line.value);
              return (
                <div key={line.id} className="text-rose-600 dark:text-rose-400 pl-3 py-1 border-l-2 border-rose-500 bg-rose-500/5 dark:bg-rose-500/3 rounded-r animate-fade-in text-[11px]">
                  {errStr}
                </div>
              );
            }
            if (line.type === "binding-log") {
              if (line.isError) {
                const errStr = line.value instanceof Error ? line.value.message : String(line.value);
                return (
                  <div key={line.id} className="text-rose-600 dark:text-rose-400 pl-3 py-1 border-l-2 border-rose-500 bg-rose-500/5 dark:bg-rose-500/3 rounded-r animate-fade-in text-[11px] font-mono">
                    [binding] {line.text}: {errStr}
                  </div>
                );
              }
              return (
                <div key={line.id} className="pl-4 py-0.5 border-b border-slate-100 dark:border-slate-900/40 last:border-0 flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-455 dark:text-slate-500 select-none">[binding] {line.text} =</span>
                  <ObjectInspector value={line.value} />
                </div>
              );
            }
            return (
              <div key={line.id} className="pl-4 py-0.5 border-b border-slate-100 dark:border-slate-900/40 last:border-0">
                <ObjectInspector value={line.value} />
              </div>
            );
          })}
        </div>
        <div ref={historyEndRef} />
      </div>

      <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-205 dark:border-slate-800 shrink-0 relative select-none">
        <span className="text-indigo-500 dark:text-indigo-400 font-bold ml-1 font-mono">&gt;</span>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Expressão matemática ou variável... (ex: $cliente.nome + ' ' + sum($dividas[*].valor))"
            className="w-full bg-transparent border-none outline-none font-mono text-slate-800 dark:text-slate-200 text-xs py-0.5 focus:ring-0 placeholder:text-slate-405 dark:placeholder:text-slate-600"
          />

          {isOpen && suggestions.length > 0 && (
            <div 
              ref={dropdownRef}
              className="absolute bottom-full left-0 mb-2 max-h-32 w-64 overflow-y-auto rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 shadow-2xl z-50 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
              <div className="px-2 py-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-900/60 mb-1 flex items-center justify-between">
                <span>Sugestões</span>
                <span className="text-[8px] opacity-60 lowercase italic">[tab] autocompletar</span>
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  data-active={index === activeIndex}
                  onClick={() => completeSuggestion(suggestion)}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded transition-colors flex items-center gap-1.5 truncate text-[11px]",
                    index === activeIndex
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <span className="text-[10px] opacity-40 font-semibold font-mono">{"{}"}</span>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ObjectInspector({ value, name }: { value: any; name?: string }) {
  const [expanded, setExpanded] = useState(false);
  const isObject = typeof value === "object" && value !== null;
  const isArray = Array.isArray(value);

  if (!isObject) {
    let displayValue = String(value);
    let colorClass = "text-slate-850 dark:text-slate-200";

    if (value === null) {
      displayValue = "null";
      colorClass = "text-slate-400 dark:text-slate-500 font-bold font-mono";
    } else if (value === undefined) {
      displayValue = "undefined";
      colorClass = "text-slate-400 dark:text-slate-500 italic font-mono";
    } else if (typeof value === "string") {
      displayValue = `"${value}"`;
      colorClass = "text-emerald-600 dark:text-emerald-400 font-mono";
    } else if (typeof value === "number") {
      displayValue = String(value);
      colorClass = "text-blue-600 dark:text-cyan-400";
    } else if (typeof value === "boolean") {
      displayValue = String(value);
      colorClass = "text-amber-600 dark:text-amber-500 font-semibold";
    }

    return (
      <div className="inline-flex items-center gap-1 font-mono text-xs">
        {name && <span className="text-slate-500 dark:text-slate-400 font-semibold">{name}:</span>}
        <span className={colorClass}>{displayValue}</span>
      </div>
    );
  }

  const keys = isArray ? [] : Object.keys(value);
  const length = isArray ? value.length : keys.length;

  const renderSummary = () => {
    if (isArray) {
      return `Array(${length})`;
    }
    const previewKeys = keys.slice(0, 3);
    const parts = previewKeys.map(k => {
      const v = value[k];
      const valStr = typeof v === "object" && v !== null 
        ? (Array.isArray(v) ? "[...]" : "{...}") 
        : String(v);
      const truncated = valStr.length > 25 ? valStr.slice(0, 22) + "..." : valStr;
      return `${k}: ${typeof v === "string" ? `"${truncated}"` : truncated}`;
    });
    const suffix = keys.length > 3 ? ", ..." : "";
    return `Object { ${parts.join(", ")}${suffix} }`;
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="flex flex-col font-mono text-xs">
      <div 
        onClick={handleToggle}
        className="flex items-center gap-1 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded py-0.5 px-1 -ml-1 transition-colors"
      >
        <span className="text-slate-400 dark:text-slate-655 shrink-0 text-[10px] font-mono">
          {expanded ? "▼" : "▶"}
        </span>
        {name && <span className="text-slate-500 dark:text-slate-400 font-semibold">{name}:</span>}
        <span className="text-slate-600 dark:text-slate-350">{renderSummary()}</span>
      </div>

      {expanded && (
        <div className="pl-4 border-l border-slate-200 dark:border-slate-800 ml-1.5 mt-0.5 space-y-1">
          {isArray ? (
            value.map((item, idx) => (
              <ObjectInspector key={idx} name={String(idx)} value={item} />
            ))
          ) : (
            keys.map(key => (
              <ObjectInspector key={key} name={key} value={value[key]} />
            ))
          )}
          <div className="text-[10px] text-slate-455 dark:text-slate-550 font-mono italic">
            [[Prototype]]: {isArray ? "Array" : "Object"}
          </div>
        </div>
      )}
    </div>
  );
}

function getFlatPaths(obj: any, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object") return [];

  let paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        paths.push(path);
        if (value.length > 0 && typeof value[0] === "object") {
          const subPaths = getFlatPaths(value[0], `${path}[*]`);
          paths.push(...subPaths);
        }
      } else {
        paths.push(path);
        paths.push(...getFlatPaths(value, path));
      }
    } else {
      paths.push(path);
    }
  }
  return paths;
}

// ==========================================
// UPGRADE ULTRA-ROBUSTO: VISUALIZAÇÃO DE TABELAS DE DADOS
// ==========================================

function findTableArrays(obj: unknown, path = ""): Array<{ path: string; data: any[] }> {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object") return [];

  const results: Array<{ path: string; data: any[] }> = [];

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      results.push({ path, data: obj });
    }
    obj.forEach((item, idx) => {
      results.push(...findTableArrays(item, `${path}[${idx}]`));
    });
    return results;
  }

  for (const [key, value] of Object.entries(obj)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
          results.push({ path: nextPath, data: value });
        }
        value.forEach((item, idx) => {
          results.push(...findTableArrays(item, `${nextPath}[${idx}]`));
        });
      } else {
        results.push(...findTableArrays(value, nextPath));
      }
    }
  }

  return results;
}

function cleanAndParseNumber(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val !== "string") return null;
  let clean = val.replace(/R\$\s?/, "").replace(/\s/g, "");
  if (clean.includes(",") && clean.includes(".")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : parsed;
}

function calculateAggregation(data: any[], colKey: string, type: 'sum' | 'avg' | 'min' | 'max' | 'count'): string {
  const numbers = data
    .map(item => cleanAndParseNumber(item[colKey]))
    .filter((n): n is number => n !== null);

  if (type === 'count') {
    return String(data.length);
  }

  if (numbers.length === 0) return "—";

  switch (type) {
    case 'sum':
      const sumVal = numbers.reduce((acc, n) => acc + n, 0);
      return sumVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'avg':
      const avgVal = numbers.reduce((acc, n) => acc + n, 0) / numbers.length;
      return avgVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'min':
      const minVal = Math.min(...numbers);
      return minVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'max':
      const maxVal = Math.max(...numbers);
      return maxVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    default:
      return "—";
  }
}

interface StressTestPortfolioSandboxProps {
  biTheme: "classic" | "cyberpunk" | "oceanic" | "dark";
}

function StressTestPortfolioSandbox({ biTheme }: StressTestPortfolioSandboxProps) {
  const [portfolioScore, setPortfolioScore] = useState<number>(650);

  // Distribuição da carteira de 100 clientes baseada em funções de aproximação
  const excelenteCount = Math.round(Math.pow(portfolioScore / 1000, 2.2) * 100);
  const criticoCount = Math.round(Math.pow((1000 - portfolioScore) / 1000, 1.8) * 100);
  const regularCount = Math.max(0, 100 - excelenteCount - criticoCount);

  // Métricas analíticas simuladas em tempo real
  const approvalRate = Math.min(100, Math.round(excelenteCount * 1.0 + regularCount * 0.65 + criticoCount * 0.08));
  const defaultRate = parseFloat(Math.min(100, (criticoCount * 0.42 + regularCount * 0.09 + excelenteCount * 0.005)).toFixed(1));
  const totalLimit = excelenteCount * 45000 + regularCount * 12000 + criticoCount * 800;

  const getColors = () => {
    switch (biTheme) {
      case "cyberpunk":
        return { 
          excelente: "#06b6d4", 
          regular: "#d946ef", 
          critico: "#a855f7", 
          text: "text-purple-300", 
          cardBg: "bg-slate-950/90 border-purple-500/25 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.08)]",
          barColor: "bg-purple-500"
        };
      case "oceanic":
        return { 
          excelente: "#10b981", 
          regular: "#06b6d4", 
          critico: "#f43f5e", 
          text: "text-teal-900 dark:text-teal-100", 
          cardBg: "bg-white dark:bg-slate-950 border-teal-500/15 dark:border-teal-500/25 text-teal-950 dark:text-teal-200",
          barColor: "bg-teal-500"
        };
      case "dark":
        return { 
          excelente: "#b45309", 
          regular: "#94a3b8", 
          critico: "#475569", 
          text: "text-slate-200", 
          cardBg: "bg-slate-900 border-slate-800 text-slate-300 shadow-none",
          barColor: "bg-slate-700"
        };
      case "classic":
      default:
        return { 
          excelente: "#10b981", 
          regular: "#ca8a04", 
          critico: "#f43f5e", 
          text: "text-slate-800 dark:text-slate-200", 
          cardBg: "bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 text-slate-800 dark:text-slate-200",
          barColor: "bg-indigo-600"
        };
    }
  };

  const colors = getColors();

  // Cálculos do Donut Chart (Perímetro = 251.2)
  const r = 40;
  const circ = 2 * Math.PI * r; 
  
  const excelentePct = excelenteCount;
  const regularPct = regularCount;
  const criticoPct = criticoCount;

  const strokeExcelente = (excelentePct / 100) * circ;
  const strokeRegular = (regularPct / 100) * circ;
  const strokeCritico = (criticoPct / 100) * circ;

  const offsetExcelente = 0;
  const offsetRegular = strokeExcelente;
  const offsetCritico = strokeExcelente + strokeRegular;

  return (
    <div className={cn(
      "flex flex-col h-full p-4 overflow-y-auto scrollbar-thin select-none",
      biTheme === "cyberpunk" ? "bg-purple-950/15 text-purple-200 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]" :
      biTheme === "oceanic" ? "bg-teal-50/20 dark:bg-teal-950/10" :
      biTheme === "dark" ? "bg-slate-900" : "bg-slate-50 dark:bg-slate-900/10"
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 shrink-0">
        <div>
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <Workflow className={cn("size-3.5 animate-pulse", biTheme === "cyberpunk" ? "text-fuchsia-400" : biTheme === "oceanic" ? "text-teal-400" : "text-indigo-500")} />
            <span>Simulador de Carteira & Stress Test de Lote (Portfolio BI)</span>
            <span className="text-[9px] font-black bg-violet-600 text-white px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide">
              Simulação de 100 CPFs
            </span>
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            Aplicação em lote de regras de concessão e estimativas macro-financeiras da carteira.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-850">
          <Users className="size-3 text-indigo-500" />
          <span>Lote Ativo: 100 Clientes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        <div className={cn(
          "lg:col-span-5 p-4 rounded-xl border flex flex-col items-center justify-between min-h-[300px] transition-all duration-300",
          colors.cardBg
        )}>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider self-start">Risco e Distribuição do Lote</span>
          
          <div className="relative size-40 my-3 flex items-center justify-center">
            <svg className="size-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke="#e2e8f0"
                className="dark:stroke-slate-850"
                strokeWidth="12"
              />
              {excelentePct > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={colors.excelente}
                  strokeWidth="12"
                  strokeDasharray={`${strokeExcelente} ${circ}`}
                  strokeDashoffset={-offsetExcelente}
                  className="transition-all duration-700 ease-out"
                />
              )}
              {regularPct > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={colors.regular}
                  strokeWidth="12"
                  strokeDasharray={`${strokeRegular} ${circ}`}
                  strokeDashoffset={-offsetRegular}
                  className="transition-all duration-700 ease-out"
                />
              )}
              {criticoPct > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={colors.critico}
                  strokeWidth="12"
                  strokeDasharray={`${strokeCritico} ${circ}`}
                  strokeDashoffset={-offsetCritico}
                  className="transition-all duration-700 ease-out"
                />
              )}
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <p className="font-mono text-2xl font-black text-slate-800 dark:text-slate-100">{portfolioScore}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Score Médio</p>
            </div>
          </div>

          <div className="w-full flex items-center justify-between text-[10px] font-bold px-1.5 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: colors.excelente }} />
              <span className="text-slate-400 dark:text-slate-500 font-normal">Excelente:</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">{excelentePct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: colors.regular }} />
              <span className="text-slate-400 dark:text-slate-500 font-normal">Regular:</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">{regularPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: colors.critico }} />
              <span className="text-slate-400 dark:text-slate-500 font-normal">Crítico:</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">{criticoPct}%</span>
            </div>
          </div>

          <div className="w-full mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 space-y-1.5">
            <div className="flex items-center justify-between text-[8.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Ajuste de Stress de Score</span>
              <span className="font-mono text-violet-500 font-bold bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.2 rounded">
                Score Médio: {portfolioScore}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="900"
              value={portfolioScore}
              onChange={(e) => setPortfolioScore(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:accent-violet-500"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className={cn("p-4 rounded-xl border flex flex-col justify-between shadow-xs transition-all duration-300", colors.cardBg)}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Taxa de Aprovação de Crédito</span>
              </div>
              <div className="my-2">
                <p className="font-mono text-3xl font-black text-slate-800 dark:text-slate-50">{approvalRate}%</p>
                <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                  Percentual estimado de clientes que atendem aos requisitos mínimos de score pré-aprovado.
                </p>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${approvalRate}%`, backgroundColor: colors.excelente }}
                  className="h-full rounded-full transition-all duration-500 ease-out"
                />
              </div>
            </div>

            <div className={cn("p-4 rounded-xl border flex flex-col justify-between shadow-xs transition-all duration-300", colors.cardBg)}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-rose-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Inadimplência Projetada</span>
              </div>
              <div className="my-2">
                <p className="font-mono text-3xl font-black text-slate-800 dark:text-slate-50">{defaultRate}%</p>
                <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                  Taxa projetada de quebra de pagamentos ou atrasos críticos baseada na composição do lote.
                </p>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${defaultRate}%`, backgroundColor: colors.critico }}
                  className="h-full rounded-full transition-all duration-500 ease-out"
                />
              </div>
            </div>
          </div>

          <div className={cn("p-4 rounded-xl border flex flex-col justify-between shadow-xs flex-1 transition-all duration-300", colors.cardBg)}>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-indigo-500 shrink-0" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Volume de Limite Pré-Aprovado</span>
            </div>
            <div className="my-3">
              <p className="font-mono text-3xl font-black text-violet-600 dark:text-violet-400">
                {totalLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-[9px] text-slate-500 leading-relaxed mt-1">
                Volume financeiro total estimado para liberação de limite com base nos presets individuais de cada faixa de score simulada.
              </p>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 grid grid-cols-3 gap-2 text-center text-[9px] font-bold text-slate-400 dark:text-slate-500">
              <div className="space-y-0.5">
                <p className="uppercase">Excelente</p>
                <p className="font-mono text-slate-700 dark:text-slate-300">R$ 45.000</p>
              </div>
              <div className="space-y-0.5 border-x border-slate-100 dark:border-slate-850">
                <p className="uppercase">Regular</p>
                <p className="font-mono text-slate-700 dark:text-slate-300">R$ 12.000</p>
              </div>
              <div className="space-y-0.5">
                <p className="uppercase">Crítico</p>
                <p className="font-mono text-slate-700 dark:text-slate-300 font-bold text-rose-500 dark:text-rose-400">R$ 800</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataGridWrapper({ value }: { value: unknown }) {
  const tables = useMemo(() => findTableArrays(value), [value]);
  const [activeTab, setActiveTab] = useState<string>("insights_bi");
  const [biTheme, setBiTheme] = useState<"classic" | "cyberpunk" | "oceanic" | "dark">("classic");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/10 shrink-0 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("insights_bi")}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded transition-all shrink-0 border border-transparent cursor-pointer",
            activeTab === "insights_bi"
              ? "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/50 dark:border-violet-900/50 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Sparkles className="size-3 text-violet-500 animate-pulse" />
          <span>Insights & KPIs de BI</span>
        </button>

        <button
          onClick={() => setActiveTab("portfolio_stress")}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded transition-all shrink-0 border border-transparent cursor-pointer",
            activeTab === "portfolio_stress"
              ? "bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200/50 dark:border-fuchsia-900/50 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
          )}
        >
          <Workflow className="size-3 text-fuchsia-500 animate-pulse" />
          <span>Stress Test de Carteira</span>
        </button>



        {tables.map((t) => (
          <button
            key={t.path}
            onClick={() => setActiveTab(t.path)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded transition-all shrink-0 border border-transparent cursor-pointer",
              activeTab === t.path
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/40 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <FileSpreadsheet className="size-3 text-emerald-500" />
            <span>{t.path}</span>
            <span className="text-[8px] font-normal opacity-70 bg-slate-200/50 dark:bg-slate-800 px-1 rounded-xs">
              {t.data.length} lin
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "insights_bi" ? (
          <QuickInsightsDashboard value={value} biTheme={biTheme} setBiTheme={setBiTheme} />
        ) : activeTab === "portfolio_stress" ? (
          <StressTestPortfolioSandbox biTheme={biTheme} />
        ) : (
          (() => {
            const table = tables.find((t) => t.path === activeTab);
            if (!table) return null;
            return <AnalyticalDataGrid path={table.path} data={table.data} />;
          })()
        )}
      </div>
    </div>
  );
}

function AnalyticalDataGrid({ path, data }: { path: string; data: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [aggregators, setAggregators] = useState<Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>>({});

  const columns = useMemo(() => {
    const keysSet = new Set<string>();
    data.slice(0, 10).forEach((item) => {
      if (item && typeof item === "object") {
        Object.keys(item).forEach((k) => keysSet.add(k));
      }
    });
    return Array.from(keysSet);
  }, [data]);

  const colTypes = useMemo(() => {
    const types: Record<string, { label: string; icon: string; align: "left" | "right" }> = {};
    columns.forEach((col) => {
      const sampleItem = data.find((item) => item && item[col] !== undefined && item[col] !== null);
      const val = sampleItem ? sampleItem[col] : null;

      if (typeof val === "number" || (typeof val === "string" && cleanAndParseNumber(val) !== null)) {
        types[col] = {
          label: typeof val === "number" ? "123" : "BRL",
          icon: "Σ",
          align: "right",
        };
      } else if (typeof val === "boolean") {
        types[col] = {
          label: "bool",
          icon: "☑",
          align: "left",
        };
      } else if (typeof val === "string" && /\d{4}-\d{2}-\d{2}/.test(val)) {
        types[col] = {
          label: "data",
          icon: "📅",
          align: "left",
        };
      } else {
        types[col] = {
          label: "abc",
          icon: "abc",
          align: "left",
        };
      }
    });
    return types;
  }, [columns, data]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) => {
      if (!item || typeof item !== "object") return false;
      return Object.values(item).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    if (!sortCol || !sortDir) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let valA = a ? a[sortCol] : undefined;
      let valB = b ? b[sortCol] : undefined;

      const numA = cleanAndParseNumber(valA);
      const numB = cleanAndParseNumber(valB);

      if (numA !== null && numB !== null) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }

      const strA = String(valA ?? "").toLowerCase();
      const strB = String(valB ?? "").toLowerCase();

      if (strA < strB) return sortDir === "asc" ? -1 : 1;
      if (strA > strB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir(null);
      }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const csvRows = [columns.join(",")];
    sortedData.forEach((row) => {
      const values = columns.map((col) => {
        const val = row[col] === undefined || row[col] === null ? "" : String(row[col]);
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `planilha_${path.replace(/\./g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-[11px] text-slate-800 dark:text-slate-200">
      <div className="flex items-center justify-between p-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 max-w-[200px] relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 dark:text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-6 pr-5 py-0.5 text-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded outline-none focus:border-indigo-500 transition-colors"
            placeholder={`Filtrar ${sortedData.length} linhas...`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="size-2.5" />
            </button>
          )}
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 px-2 py-0.5 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded bg-white dark:bg-slate-950 text-[9px] font-bold text-slate-600 dark:text-slate-400 transition-colors shrink-0 animate-fade-in"
        >
          <Download className="size-2.8" />
          <span>Exportar</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto min-h-0 select-text scrollbar-thin">
        <table className="w-full border-collapse table-fixed min-w-max">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1e293b] border-b border-slate-250 dark:border-slate-850">
            <tr>
              {columns.map((col) => {
                const info = colTypes[col] || { label: "abc", icon: "abc", align: "left" };
                const isSorted = sortCol === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="group select-none px-2 py-1.5 text-left font-semibold border-r border-slate-200 dark:border-slate-800 hover:bg-slate-150 dark:hover:bg-slate-800/80 cursor-pointer transition-colors w-40 text-[10px] text-slate-700 dark:text-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={cn(
                          "px-1 py-0.2 rounded text-[7px] font-mono font-bold tracking-wider shrink-0 select-none",
                          info.label === "123" || info.label === "BRL" ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" :
                          info.label === "bool" ? "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" :
                          info.label === "data" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" :
                          "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                        )}>
                          {info.icon}
                        </span>
                        <span className="truncate" title={col}>{col}</span>
                      </div>
                      <span className="shrink-0 flex items-center">
                        {isSorted ? (
                          sortDir === "asc" ? <ArrowUp className="size-2.5 text-indigo-500" /> : <ArrowDown className="size-2.5 text-indigo-500" />
                        ) : (
                          <ArrowUpDown className="size-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                        )}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-col gap-0.2 pointer-events-none select-none">
                      <div className="flex h-0.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 w-full">
                        <div className="bg-emerald-500 h-full" style={{ width: "95%" }} />
                        <div className="bg-slate-400/40 h-full" style={{ width: "5%" }} />
                      </div>
                      <div className="flex items-center justify-between text-[6.5px] text-slate-400 tracking-wider">
                        <span>válido 95%</span>
                        <span>vazio 5%</span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-slate-150 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors odd:bg-slate-50/20 dark:odd:bg-slate-950/10"
              >
                {columns.map((col) => {
                  const info = colTypes[col] || { align: "left" };
                  const cellVal = row[col];
                  let displayVal = cellVal === undefined || cellVal === null ? "—" : String(cellVal);
                  return (
                    <td
                      key={col}
                      className={cn(
                        "px-2 py-1 border-r border-slate-150 dark:border-slate-900 font-mono text-[10px] truncate whitespace-nowrap",
                        info.align === "right" ? "text-right text-indigo-600 dark:text-cyan-400" : "text-left text-slate-800 dark:text-slate-300",
                        cellVal === null || cellVal === undefined ? "text-slate-400/50 italic" : ""
                      )}
                      title={displayVal}
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {sortedData.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-slate-900 border-t border-slate-250 dark:border-slate-850 font-mono text-[10px]">
              <tr>
                {columns.map((col) => {
                  const info = colTypes[col] || { label: "abc", align: "left" };
                  const isNumeric = info.label === "123" || info.label === "BRL";
                  const selectedAgg = aggregators[col] || (isNumeric ? "sum" : "count");
                  const result = calculateAggregation(sortedData, col, selectedAgg);

                  return (
                    <td
                      key={col}
                      className={cn(
                        "px-2 py-1.5 border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200",
                        info.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      <div className={cn(
                        "flex flex-col gap-0.2",
                        info.align === "right" ? "items-end" : "items-start"
                      )}>
                        <select
                          value={selectedAgg}
                          onChange={(e) => setAggregators({ ...aggregators, [col]: e.target.value as any })}
                          className="font-sans text-[7.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border-none outline-none bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 rounded px-1 -ml-1 py-0 cursor-pointer"
                        >
                          <option value="count">Contagem</option>
                          {isNumeric && (
                            <>
                              <option value="sum">Soma (Σ)</option>
                              <option value="avg">Média (μ)</option>
                              <option value="min">Mínimo</option>
                              <option value="max">Máximo</option>
                            </>
                          )}
                        </select>
                        <span className={cn(
                          "truncate text-[10px] font-bold",
                          isNumeric ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"
                        )}>
                          {result}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ==========================================
// UPGRADE ULTRA-ROBUSTO: AUDITOR DE FÓRMULAS
// ==========================================

interface AuditIssue {
  id: string;
  elementId: string;
  elementName: string;
  elementType: string;
  field: string;
  expression: string;
  status: "error" | "warning";
  message: string;
  solution?: string;
  autoFixValue?: string;
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function findClosestVariable(invalidVar: string, availableVars: string[]): string | null {
  const cleanVar = invalidVar.replace(/^\$/, "").trim();
  if (availableVars.length === 0) return null;

  let closest: string | null = null;
  let minDistance = Infinity;

  for (const v of availableVars) {
    const dist = getLevenshteinDistance(cleanVar, v);
    if (dist < minDistance && dist <= 5) {
      minDistance = dist;
      closest = v;
    }
  }
  return closest ? `$${closest}` : null;
}

function performAudit(elements: any[], data: any, availableVars: string[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const checkExpression = (el: any, field: string, expr: string, rawText = "") => {
    if (!expr || !expr.trim()) return;

    const varRegex = /\$((?:\[\*\]|[a-zA-Z0-9_]+)(?:(?:\.[a-zA-Z0-9_]+)|(?:\[\d+\])|(?:\[\*\]))*)/g;
    let match;
    const foundVars: string[] = [];
    while ((match = varRegex.exec(expr)) !== null) {
      foundVars.push(match[0]);
    }

    const measureRegex = /\bmedida(?:s)?\.([a-zA-Z0-9_]+)/g;
    while ((match = measureRegex.exec(expr)) !== null) {
      foundVars.push(`medida.${match[1]}`);
    }

    if (foundVars.length === 0) {
      try {
        const val = resolveExpression(expr, data);
        if (val === undefined) {
          issues.push({
            id: `${el.id}-${field}-undef`,
            elementId: el.id,
            elementName: el.name || `Elemento (${el.type})`,
            elementType: el.type,
            field,
            expression: expr,
            status: "warning",
            message: `A expressão "${expr}" retornou indefinida.`,
            solution: "Verifique se a propriedade ou caminho existe no dataset."
          });
        }
      } catch (e: any) {
        issues.push({
          id: `${el.id}-${field}-error`,
          elementId: el.id,
          elementName: el.name || `Elemento (${el.type})`,
          elementType: el.type,
          field,
          expression: expr,
          status: "error",
          message: `Erro ao avaliar "${expr}": ${e.message}`,
        });
      }
      return;
    }

    for (const rawVar of foundVars) {
      const cleanVar = rawVar.replace(/^\$/, "");
      try {
        const val = resolveExpression(cleanVar, data);

        if (val === undefined) {
          const closest = findClosestVariable(rawVar, availableVars);
          let solution = "Verifique a ortografia ou certifique-se de que a fonte de dados está ativa.";
          let autoFixValue = undefined;

          if (closest) {
            solution = `Você quis dizer "${closest}"?`;
            if (rawText) {
              autoFixValue = rawText.replace(rawVar, closest);
            } else {
              autoFixValue = closest;
            }
          }

          issues.push({
            id: `${el.id}-${field}-${rawVar}-missing`,
            elementId: el.id,
            elementName: el.name || `Elemento (${el.type})`,
            elementType: el.type,
            field,
            expression: rawVar,
            status: "error",
            message: `A variável "${rawVar}" não existe no dataset de simulação ativo.`,
            solution,
            autoFixValue
          });
        } else if (typeof val === "string" && (val.includes("[Erro:") || val.includes("Dependência Circular"))) {
          issues.push({
            id: `${el.id}-${field}-${rawVar}-err-val`,
            elementId: el.id,
            elementName: el.name || `Elemento (${el.type})`,
            elementType: el.type,
            field,
            expression: rawVar,
            status: "error",
            message: `A medida calculada "${rawVar}" retornou um erro interno: ${val}`,
            solution: "Ajuste a fórmula da medida para evitar loops de dependência ou caminhos nulos."
          });
        }
      } catch (e: any) {
        issues.push({
          id: `${el.id}-${field}-${rawVar}-eval-error`,
          elementId: el.id,
          elementName: el.name || `Elemento (${el.type})`,
          elementType: el.type,
          field,
          expression: rawVar,
          status: "error",
          message: `Erro na validação da variável "${rawVar}": ${e.message}`,
        });
      }
    }
  };

  for (const el of elements) {
    if (el.binding?.mode === "expression" && el.binding.expression) {
      checkExpression(el, "binding.expression", el.binding.expression);
    }

    if (el.type === "text" && typeof el.data?.text === "string") {
      const textVal = el.data.text;
      const mustacheRegex = /\{\{([\s\S]*?)\}\}/g;
      let m;
      while ((m = mustacheRegex.exec(textVal)) !== null) {
        const bindingExpr = m[1].trim();
        if (!bindingExpr.startsWith("#") && !bindingExpr.startsWith("/") && !bindingExpr.startsWith("else")) {
          checkExpression(el, "text", bindingExpr, textVal);
        }
      }
    }

    if (el.type === "card") {
      if (typeof el.data?.title === "string") {
        const titleVal = el.data.title;
        const mustacheRegex = /\{\{([\s\S]*?)\}\}/g;
        let m;
        while ((m = mustacheRegex.exec(titleVal)) !== null) {
          const bindingExpr = m[1].trim();
          if (!bindingExpr.startsWith("#") && !bindingExpr.startsWith("/")) {
            checkExpression(el, "title", bindingExpr, titleVal);
          }
        }
      }
      if (typeof el.data?.subtitle === "string") {
        const subVal = el.data.subtitle;
        const mustacheRegex = /\{\{([\s\S]*?)\}\}/g;
        let m;
        while ((m = mustacheRegex.exec(subVal)) !== null) {
          const bindingExpr = m[1].trim();
          if (!bindingExpr.startsWith("#") && !bindingExpr.startsWith("/")) {
            checkExpression(el, "subtitle", bindingExpr, subVal);
          }
        }
      }
    }
  }

  return issues;
}

function FormulaAuditor() {
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const availableVariables = useEditorStore((s) => s.availableVariables);
  const setSelected = useEditorStore((s) => s.setSelected);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateElementData = useEditorStore((s) => s.updateElementData);

  const issues = useMemo(() => {
    return performAudit(template.elements, data, availableVariables);
  }, [template.elements, data, availableVariables]);

  const errors = issues.filter((i) => i.status === "error");
  const warnings = issues.filter((i) => i.status === "warning");

  const handleFocus = (elementId: string) => {
    setSelected([elementId]);
    window.dispatchEvent(
      new CustomEvent("rd:focus-element", {
        detail: { elementId }
      })
    );
    toast.success("Elemento selecionado no Canvas!");
  };

  const handleAutoFix = (issue: AuditIssue) => {
    if (!issue.autoFixValue) return;

    if (issue.field === "binding.expression") {
      const el = template.elements.find((e) => e.id === issue.elementId);
      if (el && el.binding) {
        const cleanFix = issue.autoFixValue.replace(/^\$/, "");
        updateElement(issue.elementId, {
          binding: {
            ...el.binding,
            expression: cleanFix,
          },
        });
        toast.success(`Fórmula corrigida para "${cleanFix}"!`);
      }
    } else if (issue.field === "text") {
      updateElementData(issue.elementId, { text: issue.autoFixValue });
      toast.success("Conteúdo do texto corrigido!");
    } else if (issue.field === "title") {
      updateElementData(issue.elementId, { title: issue.autoFixValue });
      toast.success("Título do cartão corrigido!");
    } else if (issue.field === "subtitle") {
      updateElementData(issue.elementId, { subtitle: issue.autoFixValue });
      toast.success("Subtítulo do cartão corrigido!");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200">
      <div className="flex items-center gap-3 p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 shrink-0 select-none">
        <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-2.5 py-1.5 rounded-lg">
          <Compass className="size-4 text-indigo-500" />
          <div>
            <p className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Varredura</p>
            <p className="font-mono text-[12px] font-bold text-indigo-700 dark:text-indigo-400">{template.elements.length} elementos</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 px-2.5 py-1.5 rounded-lg">
          <XCircle className="size-4 text-rose-500" />
          <div>
            <p className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Erros</p>
            <p className="font-mono text-[12px] font-bold text-rose-700 dark:text-rose-400">{errors.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2.5 py-1.5 rounded-lg">
          <AlertTriangle className="size-4 text-amber-500" />
          <div>
            <p className="font-bold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alertas</p>
            <p className="font-mono text-[12px] font-bold text-amber-700 dark:text-amber-400">{warnings.length}</p>
          </div>
        </div>

        {issues.length === 0 && (
          <div className="flex-1 flex items-center justify-end text-emerald-600 dark:text-emerald-400 font-bold gap-1 text-[11px] animate-pulse">
            <CheckCircle2 className="size-4" />
            <span>Nenhum erro de integridade!</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 scrollbar-thin">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className={cn(
              "p-2.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs transition-all animate-fade-in",
              issue.status === "error"
                ? "bg-rose-50/15 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/30"
                : "bg-amber-50/10 dark:bg-amber-950/5 border-amber-100/40 dark:border-amber-900/20"
            )}
          >
            <div className="flex gap-2 items-start">
              {issue.status === "error" ? (
                <XCircle className="size-3.8 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="size-3.8 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[9.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {issue.elementType} • {issue.elementName}
                  </span>
                  <span className="text-[8.5px] text-slate-400 bg-slate-100 dark:bg-slate-900 px-1 py-0.2 rounded font-mono">
                    campo: {issue.field}
                  </span>
                </div>
                <p className="text-[10.5px] font-semibold text-slate-800 dark:text-slate-200">
                  {issue.message}
                </p>
                <p className="font-mono text-[9.5px] text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-150 dark:border-slate-850 select-all">
                  Expressão original: <span className="text-rose-500 dark:text-rose-400 font-bold">{issue.expression}</span>
                </p>
                {issue.solution && (
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium bg-indigo-50/30 dark:bg-indigo-950/10 py-0.5 px-1.5 rounded w-fit">
                    <Sparkles className="size-2.8 shrink-0" />
                    <span>Sugestão: {issue.solution}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-6 md:ml-0">
              <button
                onClick={() => handleFocus(issue.elementId)}
                className="flex items-center gap-1 px-2 py-1 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-[9.5px] text-slate-600 dark:text-slate-400 transition-colors"
                title="Localizar no Canvas"
              >
                <Maximize2 className="size-2.8" />
                <span>Localizar</span>
              </button>

              {issue.autoFixValue && (
                <button
                  onClick={() => handleAutoFix(issue)}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded font-bold text-[9.5px] shadow-sm transition-all"
                  title="Auto-corrigir ortografia"
                >
                  <Sparkles className="size-2.8" />
                  <span>Auto-corrigir</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- DIAGRAMA DE MODELAGEM DE RELAÇÕES DE BI (MODEL VIEW) ---

function DataRelationshipDiagram() {
  const [hoveredRelation, setHoveredRelation] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const tables = [
    {
      id: "dados_cadastrais",
      title: "cliente (dados_cadastrais)",
      color: "border-t-4 border-t-indigo-500",
      iconColor: "text-indigo-500",
      bgColor: "bg-indigo-50/10 dark:bg-indigo-950/5",
      x: 30,
      y: 110,
      fields: [
        { name: "id", type: "id", label: "🔑 ID" },
        { name: "clientName", type: "string", label: "abc clientName" },
        { name: "clientCpf", type: "string", label: "abc clientCpf" },
        { name: "consultationDate", type: "date", label: "📅 consultationDate" },
      ],
    },
    {
      id: "credit_score",
      title: "score (credit_score)",
      color: "border-t-4 border-t-amber-500",
      iconColor: "text-amber-500",
      bgColor: "bg-amber-50/10 dark:bg-amber-950/5",
      x: 460,
      y: 15,
      fields: [
        { name: "cliente_id", type: "id", label: "🔑 cliente_id" },
        { name: "pontuacao", type: "number", label: "Σ pontuacao" },
        { name: "faixa", type: "string", label: "abc faixa" },
        { name: "probabilidade_pagamento", type: "number", label: "Σ probabilidade_pagamento" },
      ],
    },
    {
      id: "scpc_restricoes",
      title: "scpc (scpc_restricoes)",
      color: "border-t-4 border-t-rose-500",
      iconColor: "text-rose-500",
      bgColor: "bg-rose-50/10 dark:bg-rose-950/5",
      x: 460,
      y: 175,
      fields: [
        { name: "cliente_id", type: "id", label: "🔑 cliente_id" },
        { name: "Vr_Divida", type: "number", label: "Σ Vr Dívida" },
        { name: "Dt_Ocorr", type: "date", label: "📅 Dt Ocorr" },
        { name: "Nome", type: "string", label: "abc Nome (Credor)" },
      ],
    },
    {
      id: "serasa_restricoes",
      title: "serasaPremium (serasa_restricoes)",
      color: "border-t-4 border-t-emerald-500",
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-50/10 dark:bg-emerald-950/5",
      x: 460,
      y: 335,
      fields: [
        { name: "cliente_id", type: "id", label: "🔑 cliente_id" },
        { name: "Vr_Divida", type: "number", label: "Σ Vr Dívida" },
        { name: "Data_Inclusao", type: "date", label: "📅 Data Inclusão" },
        { name: "Contrato", type: "string", label: "abc Contrato" },
      ],
    },
  ];

  const relationships = [
    {
      id: "rel_cliente_score",
      from: "dados_cadastrais",
      to: "credit_score",
      fromY: 110 + 75,
      toY: 15 + 40,
      label: "cliente.id → score.cliente_id",
      desc: "Relação 1:1 (Simulada para pontuação de crédito)"
    },
    {
      id: "rel_cliente_scpc",
      from: "dados_cadastrais",
      to: "scpc_restricoes",
      fromY: 110 + 75,
      toY: 175 + 40,
      label: "cliente.id → scpc.cliente_id",
      desc: "Relação 1:N (Histórico de pendências no SCPC)"
    },
    {
      id: "rel_cliente_serasa",
      from: "dados_cadastrais",
      to: "serasa_restricoes",
      fromY: 110 + 75,
      toY: 335 + 40,
      label: "cliente.id → serasa.cliente_id",
      desc: "Relação 1:N (Restrições financeiras registradas)"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/40 p-4 overflow-auto select-none">
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>

      <div className="mb-3 shrink-0 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Workflow className="size-3.5 text-indigo-500 animate-pulse" />
            <span>Diagrama de Modelagem de Relações de BI</span>
          </h4>
          <p className="text-[10px] text-slate-500">Mapeamento visual de chaves primárias e chaves estrangeiras no cenário de dados simulados (Estilo Relacional Analítico).</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950 px-2.5 py-1 border border-slate-200/50 dark:border-slate-800/60 rounded text-[9px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-indigo-500"></span> 1 : Pai</span>
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-rose-500"></span> * : Filho (Muitos)</span>
        </div>
      </div>

      <div className="flex-1 min-h-[440px] relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-inner overflow-hidden">
        {/* Camada SVG para as Conexões */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="grad-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="grad-inactive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {relationships.map((rel) => {
            const startX = 30 + 220;
            const startY = rel.fromY;
            const endX = 460;
            const endY = rel.toY;

            const cp1X = startX + 80;
            const cp1Y = startY;
            const cp2X = endX - 80;
            const cp2Y = endY;

            const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
            const isActive = hoveredRelation === rel.id || activeCard === rel.from || activeCard === rel.to;

            return (
              <g key={rel.id} className="cursor-pointer pointer-events-auto">
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  onMouseEnter={() => setHoveredRelation(rel.id)}
                  onMouseLeave={() => setHoveredRelation(null)}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={isActive ? "url(#grad-active)" : "url(#grad-inactive)"}
                  strokeWidth={isActive ? "3.5" : "1.8"}
                  className="transition-all duration-300"
                />
                
                {isActive && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                    className="animate-[dash_10s_linear_infinite]"
                    style={{ strokeDashoffset: -100 }}
                  />
                )}

                <circle
                  cx={startX}
                  cy={startY}
                  r="4"
                  fill={isActive ? "#6366f1" : "#94a3b8"}
                  className="transition-all duration-300"
                />
                <g transform={`translate(${startX + 10}, ${startY - 10})`}>
                  <rect width="10" height="10" rx="2" fill="#e2e8f0" className="dark:fill-slate-800" stroke="#94a3b8" strokeWidth="0.5" />
                  <text x="5" y="8" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#475569" className="dark:fill-slate-300 font-mono">1</text>
                </g>

                <circle
                  cx={endX}
                  cy={endY}
                  r="4"
                  fill={isActive ? "#a855f7" : "#cbd5e1"}
                  className="transition-all duration-300"
                />
                <g transform={`translate(${endX - 20}, ${endY - 10})`}>
                  <rect width="10" height="10" rx="2" fill="#fbcfe8" className="dark:fill-slate-900" stroke="#f472b6" strokeWidth="0.5" />
                  <text x="5" y="9" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#db2777" className="dark:fill-pink-400 font-mono">*</text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Camada HTML para os Cards de Tabelas */}
        <div className="absolute inset-0 z-20 pointer-events-none p-4">
          {tables.map((t) => {
            const isActive = activeCard === t.id || (hoveredRelation && relationships.find(r => r.id === hoveredRelation && (r.from === t.id || r.to === t.id)));
            return (
              <div
                key={t.id}
                onMouseEnter={() => setActiveCard(t.id)}
                onMouseLeave={() => setActiveCard(null)}
                style={{
                  position: "absolute",
                  left: `${t.x}px`,
                  top: `${t.y}px`,
                  width: "220px",
                }}
                className={cn(
                  "pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border text-[10.5px] transition-all duration-300",
                  isActive 
                    ? "border-indigo-500 ring-2 ring-indigo-500/10 scale-[1.02] shadow-indigo-500/5" 
                    : "border-slate-200/80 dark:border-slate-800/80"
                )}
              >
                <div className={cn("px-3 py-2 rounded-t-xl flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20", t.color)}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Database className={cn("size-3.5 shrink-0", t.iconColor)} />
                    <span className="font-bold font-mono text-[10px] text-slate-800 dark:text-slate-200 truncate">
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[7.5px] font-bold bg-slate-200/60 dark:bg-slate-800 px-1 py-0.2 rounded-xs text-slate-500 uppercase">
                    mock
                  </span>
                </div>

                <div className="p-2 space-y-1">
                  {t.fields.map((f, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between font-mono text-[9px] text-slate-600 dark:text-slate-400 group"
                    >
                      <span className="truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {f.name}
                      </span>
                      <span className={cn(
                        "px-1 py-0.2 text-[7.5px] rounded-xs font-bold shrink-0",
                        f.type === "id" && "bg-slate-100 dark:bg-slate-850 text-slate-400 border border-slate-200/50 dark:border-slate-750",
                        f.type === "string" && "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30",
                        f.type === "number" && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-900/30",
                        f.type === "date" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-900/30",
                      )}>
                        {f.type === "id" ? "key" : f.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3 animate-fade-in text-[10.5px]">
          <Info className="size-4.5 text-indigo-500 shrink-0" />
          <div className="flex-1">
            {hoveredRelation ? (
              (() => {
                const rel = relationships.find(r => r.id === hoveredRelation);
                if (!rel) return null;
                return (
                  <div>
                    <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {rel.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{rel.desc}</p>
                  </div>
                );
              })()
            ) : activeCard ? (
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  Tabela: {tables.find(t => t.id === activeCard)?.title}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Passe o cursor sobre os caminhos de linha para inspecionar os relacionamentos lógicos.</p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Navegação de Relações de Dados de BI</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Os dados simulados possuem relacionamentos relacionais nativos indexados por CPF/ID. Passe o mouse sobre as linhas ou cards para ver o fluxo de bindings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuickInsightsDashboardProps {
  value: any;
  biTheme: "classic" | "cyberpunk" | "oceanic" | "dark";
  setBiTheme: (theme: "classic" | "cyberpunk" | "oceanic" | "dark") => void;
}

function QuickInsightsDashboard({ value, biTheme, setBiTheme }: QuickInsightsDashboardProps) {
  const name = value?.clientName || value?.cliente?.nome || "JULIANO CAMPOS PEREIRA";
  const cpf = value?.clientCpf || value?.cliente?.documento_cpf || "403.406.588-51";
  
  const scoreValBase = value?.score?.pontuacao || Number(value?.score) || 596;
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null);
  
  const isSimulated = simulatedScore !== null;
  const scoreVal = isSimulated ? simulatedScore : scoreValBase;

  // Calcula dinamicamente a faixa e cor para a simulação reativa
  let scoreBand = "REGULAR";
  let scoreColor = "#ca8a04";
  if (scoreVal >= 700) {
    scoreBand = "EXCELENTE";
    scoreColor = "#10b981";
  } else if (scoreVal >= 500) {
    scoreBand = "REGULAR";
    scoreColor = "#ca8a04";
  } else if (scoreVal >= 300) {
    scoreBand = "MODERADO";
    scoreColor = "#eab308";
  } else {
    scoreBand = "CRÍTICO";
    scoreColor = "#f43f5e";
  }

  const scpcList = Array.isArray(value?.scpc) ? value.scpc : [];
  const totalScpc = scpcList.reduce((acc: number, item: any) => {
    const val = item?.["Vr Dívida"] ?? item?.Vr_Divida ?? item?.VrDivida ?? item?.valor;
    return acc + (typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9,-]/g, "").replace(",", ".")) || 0);
  }, 0);

  const serasaList = Array.isArray(value?.serasaPremium) ? value.serasaPremium : [];
  const totalSerasa = serasaList.reduce((acc: number, item: any) => {
    const val = item?.["Vr Dívida"] ?? item?.Vr_Divida ?? item?.VrDivida ?? item?.valor;
    return acc + (typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9,-]/g, "").replace(",", ".")) || 0);
  }, 0);

  const totalDebits = totalScpc + totalSerasa;
  const totalCount = scpcList.length + serasaList.length;

  const angle = -180 + (Math.min(Math.max(scoreVal, 0), 1000) / 1000) * 180;

  let diagnostic = "";
  let riskLevel = "";
  let recommendation = "";
  
  if (scoreVal >= 700) {
    riskLevel = "Risco Muito Baixo (Excelente)";
    diagnostic = "O cliente possui histórico de adimplência excepcional. Excelente predisposição ao crédito.";
    recommendation = "Aprovado para taxas de juros reduzidas e concessões de limites elevados.";
  } else if (scoreVal >= 500) {
    riskLevel = "Risco Moderado (Regular)";
    diagnostic = "Score em patamar moderado. Há registros pontuais de consultas ou pendências de valor reduzido.";
    recommendation = "Recomenda-se aprovação com limite controlado e validação de renda recorrente.";
  } else if (scoreVal >= 300) {
    riskLevel = "Risco Médio (Moderado)";
    diagnostic = "Score em nível intermediário. Recomenda-se verificação de garantias acessórias e limite prudencial.";
    recommendation = "Aprovação condicionada a garantias ou análise individualizada do perfil socioeconômico.";
  } else {
    riskLevel = "Risco Alto (Crítico)";
    diagnostic = "Score reduzido devido a pendências financeiras registradas de forma recente no mercado.";
    recommendation = "Sugerida renegociação de dívidas ativas para reabilitação do CPF antes de nova liberação.";
  }

  const suggestedMeasures = [
    { name: "total_pendente", expr: "sum($scpc[*].valor) + sum($serasaPremium[*].valor)", desc: "Soma consolidada de todos os débitos no mercado." },
    { name: "percentual_adimplencia", expr: "100 - (sum($scpc[*].valor) / 5000 * 100)", desc: "Mapeamento da saúde de pagamentos do CPF." }
  ];

  const addMeasure = useEditorStore((s) => s.addMeasure);

  const handleCreateSuggestedMeasure = (m: any) => {
    addMeasure({ name: m.name, expression: m.expr, description: m.desc });
    toast.success(`Medida calculada "medida.${m.name}" criada com sucesso!`);
  };

  const getThemeAccentColor = () => {
    switch (biTheme) {
      case "cyberpunk": return "#d946ef";
      case "oceanic": return "#14b8a6";
      case "dark": return "#b45309";
      case "classic":
      default: return "#4f46e5";
    }
  };

  const accentColor = getThemeAccentColor();

  const cardClassName = cn(
    "p-4 rounded-xl border flex flex-col justify-between shadow-xs transition-all duration-300",
    biTheme === "cyberpunk" ? "bg-slate-950/90 border-purple-500/25 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.08)]" :
    biTheme === "oceanic" ? "bg-white dark:bg-slate-950 border-teal-500/15 dark:border-teal-500/25 text-teal-950 dark:text-teal-200" :
    biTheme === "dark" ? "bg-slate-900 border-slate-800 text-slate-300 shadow-none" :
    "bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 text-slate-800 dark:text-slate-200"
  );

  return (
    <div className={cn(
      "flex flex-col h-full p-4 overflow-y-auto scrollbar-thin select-none",
      biTheme === "cyberpunk" ? "bg-purple-950/15 text-purple-200 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]" :
      biTheme === "oceanic" ? "bg-teal-50/20 dark:bg-teal-950/10" :
      biTheme === "dark" ? "bg-slate-900" : "bg-slate-50 dark:bg-slate-900/20"
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 shrink-0">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-violet-500" />
            <span>Dashboard Executivo de Insights Rápidos (Quick Insights BI)</span>
            {isSimulated && (
              <span className="text-[9px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full animate-pulse tracking-wide uppercase shadow-sm">
                Simulação Ativa (What-If)
              </span>
            )}
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            Cliente: <span className="font-bold text-slate-700 dark:text-slate-300">{name}</span> • CPF: <span className="font-bold text-slate-700 dark:text-slate-300">{cpf}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-850">
          <TrendingUp className="size-3 text-emerald-500" />
          <span>Dados Atualizados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        <div className="lg:col-span-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-xs flex flex-col items-center justify-between relative overflow-hidden min-h-[300px]">
          <span className="absolute top-3 left-3 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Credit Score Gauge</span>
          
          <div className="relative size-40 mt-3 flex items-center justify-center">
            <svg className="absolute inset-0 size-40 transform -rotate-180">
              <defs>
                <linearGradient id="gauge-colors" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="30%" stopColor="#f97316" />
                  <stop offset="60%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="#e2e8f0"
                className="dark:stroke-slate-800"
                strokeWidth="12"
                strokeDasharray="201 201"
                strokeLinecap="round"
              />
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="url(#gauge-colors)"
                strokeWidth="12"
                strokeDasharray="201 201"
                strokeLinecap="round"
              />
              <line
                x1="80"
                y1="80"
                x2="80"
                y2="30"
                stroke="#4f46e5"
                strokeWidth="3.5"
                strokeLinecap="round"
                transform={`rotate(${angle}, 80, 80)`}
                style={{
                  transformOrigin: "80px 80px",
                  transition: "transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)"
                }}
              />
              <circle cx="80" cy="80" r="7" fill="#4f46e5" />
              <circle cx="80" cy="80" r="2.5" fill="#ffffff" />
            </svg>

            <div className="absolute bottom-4 flex flex-col items-center select-text">
              <p className="font-mono text-2xl font-black text-slate-800 dark:text-slate-100">{scoreVal}</p>
              <p style={{ color: scoreColor }} className="text-[9px] font-extrabold uppercase tracking-wider mt-0.5">{scoreBand}</p>
            </div>
          </div>

          <div className="text-center mt-1 w-full px-2">
            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{riskLevel}</p>
            <p className="text-[9px] text-slate-500 leading-relaxed max-w-[200px] mx-auto mt-0.5">{diagnostic}</p>
            
            {/* SIMULADOR DE SLIDER WHAT-IF DE ALTA FIDELIDADE */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-900/60 w-full space-y-1.5">
              <div className="flex items-center justify-between text-[8.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span>Simulador What-If (Score)</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">
                  {scoreVal} pts
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max="1000"
                value={scoreVal}
                onChange={(e) => setSimulatedScore(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
              />
              
              <div className="flex items-center justify-between gap-1 mt-1.5">
                <button
                  onClick={() => setSimulatedScore(950)}
                  className="px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/25 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-all border border-slate-200/50 dark:border-slate-850 cursor-pointer"
                >
                  Excelente
                </button>
                <button
                  onClick={() => setSimulatedScore(550)}
                  className="px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 dark:bg-slate-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/25 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-all border border-slate-200/50 dark:border-slate-850 cursor-pointer"
                >
                  Regular
                </button>
                <button
                  onClick={() => setSimulatedScore(180)}
                  className="px-1.5 py-0.5 text-[8px] font-bold bg-slate-50 dark:bg-slate-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/25 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-all border border-slate-200/50 dark:border-slate-850 cursor-pointer"
                >
                  Crítico
                </button>
                {isSimulated && (
                  <button
                    onClick={() => {
                      setSimulatedScore(null);
                      toast.info("Score sincronizado com os dados originais!");
                    }}
                    className="px-1.5 py-0.5 text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded transition-all cursor-pointer"
                    title="Voltar ao score original do CPF"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-3 min-h-[260px]">
          <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Perfil Recomendado de Decisão</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {recommendation}
              </p>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 mt-3 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total SCPC</p>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  {totalScpc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total Serasa</p>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  {totalSerasa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Distribuição por Provedor</span>
              <span className="text-[8px] font-extrabold text-indigo-500">{totalCount} restrições</span>
            </div>

            <div className="space-y-2.5 my-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-rose-500"></span> SCPC Boa Vista
                  </span>
                  <span className="font-mono">{totalScpc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${totalDebits > 0 ? (totalScpc / totalDebits) * 100 : 0}%` }}
                    className="h-full bg-rose-500 rounded-full transition-all duration-1000 ease-out"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500"></span> Serasa Experian
                  </span>
                  <span className="font-mono">{totalSerasa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${totalDebits > 0 ? (totalSerasa / totalDebits) * 100 : 0}%` }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-xs flex flex-col justify-between min-h-[260px]">
          <div className="space-y-3">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Compass className="size-3.5 text-violet-500" />
              <span>AI Medidas Sugeridas</span>
            </span>
            <p className="text-[9px] text-slate-500 leading-relaxed">Varremos seu modelo de dados e encontramos medidas úteis de inteligência que você pode criar agora:</p>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
              {suggestedMeasures.map((m, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleCreateSuggestedMeasure(m)}
                  className="p-2 border border-slate-150 dark:border-slate-850 rounded-lg hover:border-violet-400 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-violet-50/5 cursor-pointer transition-all flex flex-col gap-1 text-[10px] group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200 truncate max-w-[130px] group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                      medida.{m.name}
                    </span>
                    <span className="text-[7.5px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950 border border-violet-100 dark:border-violet-900 px-1 rounded-xs flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      + Criar
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 truncate font-mono">
                    {m.expr}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-850 pt-3 mt-3">
            <div className="flex items-center gap-2">
              {totalDebits > 0 ? (
                <ShieldAlert className="size-4 text-rose-500 shrink-0" />
              ) : (
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Total Restrições</p>
                <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                  {totalDebits.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}