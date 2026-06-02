import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEditorStore, useActiveQuery, useActiveTemplate, buildContext } from "../store";
import { SectionCard } from "./SectionCard";
import { Eye, LayoutDashboard, Plus, PanelLeft, PanelRight } from "lucide-react";

interface CanvasColumnProps {
  leftOpen: boolean;
  setLeftOpen: (o: boolean) => void;
  rightOpen: boolean;
  setRightOpen: (o: boolean) => void;
}

export function CanvasColumn({ leftOpen, setLeftOpen, rightOpen, setRightOpen }: CanvasColumnProps) {
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
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-background px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className={[
              "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chrome border border-transparent transition-colors",
              !leftOpen ? "bg-muted text-accent border-border" : "",
            ].join(" ")}
            title={leftOpen ? "Recolher Biblioteca" : "Expandir Biblioteca"}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold">Layout do Template</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {template.sections.length} seções
          </span>
        </div>
        <div className="flex items-center gap-2">
          {experience === "admin" && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-chrome p-0.5">
              <button
                onClick={() => setMode("skeleton")}
                className={[
                  "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors",
                  mode === "skeleton" ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
                ].join(" ")}
              >
                <LayoutDashboard className="h-3 w-3" /> Esqueleto
              </button>
              <button
                onClick={() => setMode("preview")}
                className={[
                  "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors",
                  mode === "preview" ? "bg-background shadow-sm font-medium" : "text-muted-foreground",
                ].join(" ")}
              >
                <Eye className="h-3 w-3" /> Preview
              </button>
            </div>
          )}
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className={[
              "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-chrome border border-transparent transition-colors",
              !rightOpen ? "bg-muted text-accent border-border" : "",
            ].join(" ")}
            title={rightOpen ? "Recolher Resumo" : "Expandir Resumo"}
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
        className={[
          "tp-scroll min-w-0 flex-1 overflow-auto p-4 transition-colors",
          isOver && "bg-accent/5",
        ].filter(Boolean).join(" ")}
      >
        <div
          className="w-full max-w-6xl mx-auto rounded-lg border border-border bg-canvas p-4 sm:p-6 shadow-sm transition-all duration-200"
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
