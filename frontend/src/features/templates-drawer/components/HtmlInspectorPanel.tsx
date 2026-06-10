import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SafeEditor as Editor } from "./SafeEditor";
import { useEditorStore, useEvaluationContext } from "../store/editor.store";
import { renderTemplateToHtml } from "../engine/renderTemplateToHtml";
import { parseTemplateXml, serializeTemplateXml } from "../engine/xml";
import type { TemplateElement, ReportTemplate } from "../schema/template";
import { Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type Scope = "selection" | "template";
type Format = "html" | "xml" | "json";

export function HtmlInspectorPanel() {
  const htmlInspectorOpen = useEditorStore((s) => s.htmlInspectorOpen);
  const setHtmlInspectorOpen = useEditorStore((s) => s.setHtmlInspectorOpen);
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeFrameId = useEditorStore((s) => s.activeFrameId);
  const replaceTemplate = useEditorStore((s) => s.replaceTemplate);
  const updateElement = useEditorStore((s) => s.updateElement);

  const [scope, setScope] = useState<Scope>(() => selectedIds.length > 0 ? "selection" : "template");
  const [format, setFormat] = useState<Format>("html");

  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (htmlInspectorOpen) {
      setScope(selectedIds.length > 0 ? "selection" : "template");
    }
  }, [selectedIds.length, htmlInspectorOpen]);

  const code = useMemo(() => {
    try {
      if (scope === "template") {
        if (format === "xml") return serializeTemplateXml(template);
        if (format === "json") return JSON.stringify(template, null, 2);
        const frame =
          template.frames.find((f) => f.id === activeFrameId) ?? template.frames[0];
        if (!frame) return "<!-- Nenhum frame encontrado para renderizar -->";
        return renderTemplateToHtml(template, frame.id, data).html;
      }
      const selected = template.elements.filter((e) => selectedIds.includes(e.id));
      if (selected.length === 0) return "// Selecione um ou mais elementos no canvas.";
      if (format === "json") return JSON.stringify(selected, null, 2);
      if (format === "xml") {
        const sub: ReportTemplate = { ...template, elements: selected };
        return serializeTemplateXml(sub);
      }
      return renderSelectionHtml(template, selected, data);
    } catch (err: any) {
      return `<!-- Erro ao gerar o código: ${err?.message || err} -->`;
    }
  }, [scope, format, template, data, selectedIds, activeFrameId]);

  useEffect(() => {
    setDraftText(code);
    setError(null);
  }, [code]);

  function handleApply() {
    try {
      if (scope === "template") {
        if (format === "xml") {
          const t = parseTemplateXml(draftText);
          replaceTemplate(t);
        } else if (format === "json") {
          const t = JSON.parse(draftText);
          replaceTemplate(t);
        }
      } else {
        if (format === "xml") {
          const parsedTemplate = parseTemplateXml(draftText);
          parsedTemplate.elements.forEach((el) => {
            updateElement(el.id, el);
          });
        } else if (format === "json") {
          const parsed = JSON.parse(draftText);
          const elementsToUpdate = Array.isArray(parsed) ? parsed : [parsed];
          elementsToUpdate.forEach((el) => {
            if (el && el.id) {
              updateElement(el.id, el);
            }
          });
        }
      }
      setError(null);
    } catch (e) {
      setError(String((e as Error).message));
    }
  }

  if (!htmlInspectorOpen) return null;

  const lang = format === "html" ? "html" : format === "xml" ? "xml" : "json";
  const isReadOnly = format === "html";

  return (
    <div className="h-full w-full flex flex-col border-l border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Código & Inspetor</h3>
        <button
          onClick={() => setHtmlInspectorOpen(false)}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="h-8 text-xs w-[150px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <SelectItem value="selection">Elemento selecionado</SelectItem>
            <SelectItem value="template">Template inteiro</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
          <SelectTrigger className="h-8 text-xs w-[110px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            <SelectItem value="html">HTML (preview)</SelectItem>
            <SelectItem value="xml">XML (editável)</SelectItem>
            <SelectItem value="json">JSON (editável)</SelectItem>
          </SelectContent>
        </Select>
        
        {format !== "html" && (
          <button
            onClick={handleApply}
            className="ml-auto h-7 px-3 text-xs font-medium rounded bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white inline-flex items-center gap-1 transition-colors shadow-sm"
          >
            Aplicar
          </button>
        )}
        
        <button
          onClick={() => navigator.clipboard.writeText(draftText)}
          className={cn(
            "h-7 px-2.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors shadow-sm",
            format === "html" && "ml-auto"
          )}
        >
          <Copy className="size-3" /> Copiar
        </button>
      </div>
      
      {error && (
        <div className="px-4 py-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-b border-red-100 dark:border-red-900/50 font-mono whitespace-pre-wrap">
          {error}
        </div>
      )}
      
      <div className="flex-1 min-h-0 w-full h-full relative bg-white dark:bg-slate-950">
        <Editor
          height="100%"
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          language={lang}
          value={draftText}
          onChange={(v) => setDraftText(v ?? "")}
          options={{
            readOnly: isReadOnly,
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: "on",
            lineNumbers: "on",
          }}
        />
      </div>
    </div>
  );
}

export function renderSelectionHtml(
  template: ReportTemplate,
  selected: TemplateElement[],
  data: unknown,
): string {
  const minX = Math.min(...selected.map((e) => e.x));
  const minY = Math.min(...selected.map((e) => e.y));
  const maxX = Math.max(...selected.map((e) => e.x + e.width));
  const maxY = Math.max(...selected.map((e) => e.y + e.height));
  const virtFrame = {
    id: "_virt",
    name: "_virt",
    preset: "custom" as const,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
  const sub: ReportTemplate = {
    ...template,
    frames: [virtFrame],
    elements: selected.map((e) => ({ ...e, frameId: virtFrame.id })),
  };
  return renderTemplateToHtml(sub, virtFrame.id, data).html;
}