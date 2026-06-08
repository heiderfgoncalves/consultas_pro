import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEditorStore, useEvaluationContext } from "../store/editor.store";
import { renderTemplateToHtml } from "../engine/renderTemplateToHtml";
import { Printer, Download, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PreviewWindow() {
  const [open, setOpen] = useState(false);
  const template = useEditorStore((s) => s.template);
  const data = useEvaluationContext();
  const dataText = useEditorStore((s) => s.dataJsonText);
  const setDataText = useEditorStore((s) => s.setDataJsonText);
  const [margin, setMargin] = useState<"0" | "5mm" | "10mm">("0");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const openEvt = () => setOpen(true);
    const printEvt = () => {
      setOpen(true);
      // Wait a tick for iframe content to mount before calling print.
      setTimeout(() => doPrint(), 350);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        printEvt();
      }
    };
    window.addEventListener("rd:open-preview", openEvt);
    window.addEventListener("rd:print", printEvt);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("rd:open-preview", openEvt);
      window.removeEventListener("rd:print", printEvt);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const fullHtml = useMemo(() => {
    if (!open) return "";
    const pages = template.frames
      .map((f) => {
        const { html } = renderTemplateToHtml(template, f.id, data);
        const orient = f.preset.endsWith("-l") ? "landscape" : "portrait";
        return `<section class="page" data-orient="${orient}" style="width:${f.width}px;height:${f.height}px;${f.background ? `background:${f.background};` : ""}">${html}</section>`;
      })
      .join("\n");
    return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(template.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #e2e8f0; font-family: 'Geist', 'Inter', sans-serif; color: #0f172a; }
  .stage { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px; }
  .page { background: #fff; box-shadow: 0 8px 28px rgba(15,23,42,0.18); position: relative; overflow: hidden; }
  i[data-lucide] svg, svg.lucide { width: 100%; height: 100%; }
  @media print {
    body { background: #fff; }
    .stage { padding: 0; gap: 0; }
    .page { box-shadow: none; page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; }
  }
  @page { margin: ${margin}; }
</style></head><body><div class="stage">${pages}</div><script>if (typeof lucide !== "undefined") { lucide.createIcons(); }</script></body></html>`;
  }, [open, template, data, margin]);

  function doPrint() {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  }

  function downloadHtml() {
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name || "template"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[92vh] p-0 gap-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Visualização do Relatório</DialogTitle>
        <DialogDescription className="sr-only">Visualização prévia do template preenchido com dados para impressão</DialogDescription>
        <div className="flex items-center gap-2 px-3 h-10 border-b bg-slate-50">
          <span className="text-sm font-medium">Preview · {template.name}</span>
          <span className="text-xs text-slate-500">
            {template.frames.length} página{template.frames.length === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1">Margens:</span>
            <Select value={margin} onValueChange={(v) => setMargin(v as typeof margin)}>
              <SelectTrigger className="h-7 text-xs w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="5mm">5 mm</SelectItem>
                <SelectItem value="10mm">10 mm</SelectItem>
              </SelectContent>
            </Select>
            <DatasetButton dataText={dataText} setDataText={setDataText} />
            <button
              onClick={downloadHtml}
              className="h-7 px-2 text-xs rounded border hover:bg-slate-100 inline-flex items-center gap-1"
            >
              <Download className="size-3.5" /> Baixar HTML
            </button>
            <button
              onClick={doPrint}
              className="h-7 px-3 text-xs rounded bg-slate-900 text-white hover:bg-slate-700 inline-flex items-center gap-1"
            >
              <Printer className="size-3.5" /> Imprimir / Salvar PDF
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-slate-200 text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-slate-200">
          <iframe
            ref={iframeRef}
            title="preview"
            srcDoc={fullHtml}
            className="w-full h-full border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DatasetButton({
  dataText,
  setDataText,
}: {
  dataText: string;
  setDataText: (s: string) => void;
}) {
  function pick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          JSON.parse(String(r.result));
          setDataText(String(r.result));
        } catch {
          alert("JSON inválido");
        }
      };
      r.readAsText(f);
    };
    input.click();
  }
  return (
    <button
      onClick={pick}
      title="Trocar dataset (.json)"
      className="h-7 px-2 text-xs rounded border hover:bg-slate-100 inline-flex items-center gap-1"
    >
      Dataset
      <span className="text-[10px] text-slate-400">
        {Math.min(99, Math.round(dataText.length / 1024))}KB
      </span>
    </button>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}