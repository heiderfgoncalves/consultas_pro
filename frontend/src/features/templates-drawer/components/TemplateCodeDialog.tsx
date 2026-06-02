import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEditorStore, useEvaluationContext } from "../store/editor.store";
import { parseTemplateXml, serializeTemplateXml } from "../engine/xml";
import { renderTemplateToHtml } from "../engine/renderTemplateToHtml";
import { cn } from "@/lib/utils";

type Tab = "html" | "xml" | "json";

export function TemplateCodeDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("xml");
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const replaceTemplate = useEditorStore((s) => s.replaceTemplate);
  const activeFrameId = useEditorStore((s) => s.activeFrameId);

  const [xmlDraft, setXmlDraft] = useState("");
  const [jsonDraft, setJsonDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setXmlDraft(serializeTemplateXml(template));
      setJsonDraft(JSON.stringify(template, null, 2));
      setError(null);
    }
  }, [open, template]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("rd:open-code-dialog", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("rd:open-code-dialog", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const html = useMemo(() => {
    const frame =
      template.frames.find((f) => f.id === activeFrameId) ?? template.frames[0];
    if (!frame) return "";
    return renderTemplateToHtml(template, frame.id, data).html;
  }, [template, data, activeFrameId]);

  function applyXml() {
    try {
      const t = parseTemplateXml(xmlDraft);
      replaceTemplate(t);
      setError(null);
    } catch (e) {
      setError(String((e as Error).message));
    }
  }
  function applyJson() {
    try {
      const t = JSON.parse(jsonDraft);
      replaceTemplate(t);
      setError(null);
    } catch (e) {
      setError(String((e as Error).message));
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "html", label: "HTML (preview)" },
    { id: "xml", label: "XML (editável)" },
    { id: "json", label: "JSON (editável)" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl w-[90vw] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle>Inspecionar template</DialogTitle>
          <DialogDescription className="sr-only">Visualize ou edite a estrutura em formato HTML, XML ou JSON bruto deste template de relatório</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-1 px-3 border-b bg-slate-50">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 h-8 text-xs text-slate-600 hover:text-slate-900",
                tab === t.id && "bg-white border-l border-r border-t -mb-px font-medium text-slate-900",
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {tab === "xml" && (
              <button
                onClick={applyXml}
                className="h-7 px-3 text-xs rounded bg-slate-900 text-white hover:bg-slate-700"
              >
                Aplicar XML
              </button>
            )}
            {tab === "json" && (
              <button
                onClick={applyJson}
                className="h-7 px-3 text-xs rounded bg-slate-900 text-white hover:bg-slate-700"
              >
                Aplicar JSON
              </button>
            )}
            <button
              onClick={() => {
                const text = tab === "html" ? html : tab === "xml" ? xmlDraft : jsonDraft;
                navigator.clipboard.writeText(text);
              }}
              className="h-7 px-3 text-xs rounded border hover:bg-slate-100"
            >
              Copiar
            </button>
          </div>
        </div>
        {error && (
          <div className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b">
            {error}
          </div>
        )}
        <div className="flex-1 min-h-0 w-full h-full relative">
          {tab === "html" && (
            <Editor
              height="100%"
              language="html"
              value={html}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, wordWrap: "on" }}
            />
          )}
          {tab === "xml" && (
            <Editor
              height="100%"
              language="xml"
              value={xmlDraft}
              onChange={(v) => setXmlDraft(v ?? "")}
              options={{ minimap: { enabled: false }, fontSize: 12, wordWrap: "on" }}
            />
          )}
          {tab === "json" && (
            <Editor
              height="100%"
              language="json"
              value={jsonDraft}
              onChange={(v) => setJsonDraft(v ?? "")}
              options={{ minimap: { enabled: false }, fontSize: 12 }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}