import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEditorStore, useActiveQuery, useActiveTemplate, buildContext } from "../store";
import { SectionCard } from "./SectionCard";
import { Eye, LayoutDashboard, Plus } from "lucide-react";

export function CanvasColumn() {
  const mode = useEditorStore((s) => s.canvasMode);
  const setMode = useEditorStore((s) => s.setCanvasMode);
  const experience = useEditorStore((s) => s.experience);
  const template = useActiveTemplate();
  const query = useActiveQuery();
  const ctx = buildContext(query, template);
  const select = useEditorStore((s) => s.selectSection);

  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop" });
  const top = useDroppable({ id: "canvas-drop-top" });
  const bottom = useDroppable({ id: "canvas-drop-bottom" });

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold">Layout do Template</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {template.sections.length} seções
          </span>
        </div>
        {experience === "admin" && (
          <div className="flex items-center gap-1 rounded-md border border-border bg-chrome p-0.5">
            <button
              onClick={() => setMode("skeleton")}
              className={["flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors", mode === "skeleton" ? "bg-background shadow-sm" : "text-muted-foreground"].join(" ")}
            >
              <LayoutDashboard className="h-3 w-3" /> Esqueleto
            </button>
            <button
              onClick={() => setMode("preview")}
              className={["flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors", mode === "preview" ? "bg-background shadow-sm" : "text-muted-foreground"].join(" ")}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
        className={[
          "tp-scroll min-w-0 flex-1 overflow-auto p-6 transition-colors",
          isOver && "bg-accent/5",
        ].filter(Boolean).join(" ")}
      >
        <div
          className="mx-auto max-w-[860px] rounded-lg border border-border bg-canvas p-8 shadow-sm"
          onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
        >
          {template.sections.length === 0 ? (
            <EmptyCanvas />
          ) : (
            <>
              <div
                ref={top.setNodeRef}
                className={["mb-2 h-2 rounded-full transition-colors", top.isOver ? "bg-accent" : "bg-transparent"].join(" ")}
              />
              <SortableContext items={template.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-6">
                  {template.sections.map((sec, i) => (
                    <SectionCard key={sec.id} section={sec} index={i} mode={mode} context={ctx} />
                  ))}
                </div>
              </SortableContext>
              <div
                ref={bottom.setNodeRef}
                className={["mt-2 h-2 rounded-full transition-colors", bottom.isOver ? "bg-accent" : "bg-transparent"].join(" ")}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-20 text-center text-muted-foreground">
      <Plus className="h-8 w-8 opacity-50" />
      <p className="text-sm font-medium">Arraste blocos da biblioteca</p>
      <p className="text-xs">Solte aqui para compor o layout do relatório.</p>
    </div>
  );
}
