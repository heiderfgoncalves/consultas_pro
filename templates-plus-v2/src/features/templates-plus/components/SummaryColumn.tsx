import { useRef } from "react";
import { useEditorStore } from "../store";
import { queryTypes } from "../mocks";
import { useDroppable } from "@dnd-kit/core";
import { ImagePlus, X } from "lucide-react";
import { LucideIcon } from "./LucideIcon";

export function SummaryColumn() {
  const template = useEditorStore((s) => s.templates.find((t) => t.id === s.activeTemplateId)!);
  const setLogo = useEditorStore((s) => s.setLogo);
  const removeQuery = useEditorStore((s) => s.removeQueryBlock);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodeRef, isOver } = useDroppable({ id: "summary-drop" });

  const selected = template.selectedQueryBlocks.map((id) => queryTypes.find((q) => q.id === id)).filter(Boolean) as typeof queryTypes;
  const subtotal = selected.reduce((sum, q) => sum + q.price, 0);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div ref={setNodeRef} className={["tp-scroll flex h-full flex-col overflow-y-auto p-4 transition-colors", isOver && "bg-accent/5"].filter(Boolean).join(" ")}>
      <div className="text-xs font-semibold">Resumo</div>

      <div className="mt-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Logo do relatório</div>
        <div className="mt-2 flex items-center gap-2">
          {template.logo ? (
            <div className="group relative">
              <img src={template.logo} alt="logo" className="h-12 w-24 rounded border border-border object-contain" />
              <button onClick={() => setLogo(undefined)} className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => inputRef.current?.click()} className="flex h-12 w-full items-center justify-center gap-2 rounded border border-dashed border-border text-xs text-muted-foreground hover:bg-chrome">
              <ImagePlus className="h-3.5 w-3.5" /> Carregar logo
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocos ({selected.length})</div>
        {selected.length === 0 ? (
          <div className="mt-2 rounded border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
            Nenhum selecionado. Arraste tipos de consulta da biblioteca.
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            {selected.map((q) => (
              <div key={q.id} className="group flex items-center gap-2 rounded-md border border-border p-2">
                <LucideIcon name={q.icon} className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1 truncate text-xs">{q.name}</div>
                <div className="text-[10px] font-semibold text-accent">R$ {q.price.toFixed(2)}</div>
                <button onClick={() => removeQuery(q.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
