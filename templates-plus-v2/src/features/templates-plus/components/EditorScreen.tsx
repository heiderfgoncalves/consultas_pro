import { useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent, type DragOverEvent, DragOverlay, useDraggable } from "@dnd-kit/core";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useEditorStore, useActiveTemplate } from "../store";
import { EditorHeader } from "./EditorHeader";
import { LibraryColumn } from "./LibraryColumn";
import { CanvasColumn } from "./CanvasColumn";
import { SummaryColumn } from "./SummaryColumn";
import { ExpressionConsole } from "./ExpressionConsole";
import { BlockEditorModal } from "./BlockEditorModal";
import { Toaster } from "@/components/ui/sonner";
import { fixedBlocks, customBlocks, queryTypes } from "../mocks";
import { makePrimitive, type PrimitiveType } from "./ContainerRenderer";

export type DropPos = { overId: string; side: "before" | "after" } | null;

export function EditorScreen() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));
  const [activeDrag, setActiveDrag] = useState<{ type: "block" | "query"; id: string; label: string } | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);
  const dropPosRef = useRef<DropPos>(null);
  dropPosRef.current = dropPos;

  const addSection = useEditorStore((s) => s.addSectionFromBlock);
  const addQuery = useEditorStore((s) => s.addQueryBlock);
  const reorder = useEditorStore((s) => s.reorderSections);
  const template = useActiveTemplate();
  const editing = useEditorStore((s) => s.editingSection);
  const consoleOpen = useEditorStore((s) => s.consoleOpen);
  const experience = useEditorStore((s) => s.experience);
  const insertNodeAt = useEditorStore((s) => s.insertNodeAt);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div suppressHydrationWarning className="h-full w-full bg-chrome" />;

  const onDragOver = (e: DragOverEvent) => {
    const over = e.over;
    if (!over) { setDropPos(null); return; }
    const overId = String(over.id);
    const sectionIdx = template.sections.findIndex((s) => s.id === overId);
    if (sectionIdx < 0) { setDropPos(null); return; }
    const overRect = over.rect;
    const activeRect = e.active.rect.current.translated;
    const pointerY = activeRect ? activeRect.top + activeRect.height / 2 : overRect.top + overRect.height / 2;
    const center = overRect.top + overRect.height / 2;
    setDropPos({ overId, side: pointerY < center ? "before" : "after" });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const pos = dropPosRef.current;
    setActiveDrag(null);
    setDropPos(null);
    const over = e.over;
    const data = e.active.data.current as { type?: string; id?: string } | undefined;
    if (!data?.type) return;

    // Drop a primitive into a container dropzone
    const overData = over?.data.current as { type?: string; sectionId?: string; parentPath?: number[]; index?: number } | undefined;
    if (data.type === "primitive" && overData?.type === "cr-drop" && overData.sectionId && overData.parentPath && typeof overData.index === "number") {
      const node = makePrimitive(data.id as PrimitiveType);
      insertNodeAt(overData.sectionId, overData.parentPath, overData.index, node);
      return;
    }

    if (data.type === "library-block") {
      if (!data.id) return;
      const overId = over ? String(over.id) : "";
      if (overId === "canvas-drop-top") return addSection(data.id, 0);
      if (overId === "canvas-drop-bottom" || overId === "canvas-drop") return addSection(data.id);
      const sectionIdx = overId ? template.sections.findIndex((s) => s.id === overId) : -1;
      if (sectionIdx >= 0) {
        const at = pos?.side === "before" ? sectionIdx : sectionIdx + 1;
        return addSection(data.id, at);
      }
      return addSection(data.id);
    }
    if (!over) return;
    const overId = String(over.id);
    const sectionIdx = template.sections.findIndex((s) => s.id === overId);

    if (data.type === "query-type" && data.id) {
      addQuery(data.id);
    } else if (data.type === "section" && sectionIdx >= 0) {
      const fromIdx = template.sections.findIndex((s) => s.id === data.id);
      let toIdx = sectionIdx;
      if (pos?.side === "after" && toIdx < fromIdx) toIdx += 1;
      if (pos?.side === "before" && toIdx > fromIdx) toIdx -= 1;
      if (fromIdx >= 0 && fromIdx !== toIdx) reorder(fromIdx, toIdx);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => {
        const d = e.active.data.current as { type?: string; id?: string; label?: string } | undefined;
        if (d?.type === "library-block") {
          const blk = [...fixedBlocks, ...customBlocks].find((b) => b.id === d.id);
          setActiveDrag({ type: "block", id: d.id!, label: blk?.name ?? "Bloco" });
        } else if (d?.type === "query-type") {
          const q = queryTypes.find((q) => q.id === d.id);
          setActiveDrag({ type: "query", id: d.id!, label: q?.name ?? "Consulta" });
        }
      }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => { setActiveDrag(null); setDropPos(null); }}
    >
      <DropPosContext.Provider value={dropPos}>
        <div className="flex h-full w-full flex-col bg-chrome">
          <EditorHeader />
          <div className="flex min-h-0 flex-1">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={20} minSize={14} maxSize={40} className="border-r border-border bg-background">
                <LibraryColumn />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={58} minSize={30} className="min-w-0">
                <CanvasColumn />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={22} minSize={14} maxSize={40} className="border-l border-border bg-background">
                <SummaryColumn />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
          {experience === "admin" && consoleOpen && (
            <div className="border-t border-border bg-background">
              <ExpressionConsole />
            </div>
          )}
          {experience === "admin" && !consoleOpen && <ConsoleHandle />}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="pointer-events-none rounded-md border border-accent/40 bg-background px-3 py-2 text-xs font-medium shadow-lg">
              {activeDrag.label}
            </div>
          ) : null}
        </DragOverlay>

        {editing && <BlockEditorModal />}
        <Toaster richColors position="bottom-right" />
      </DropPosContext.Provider>
    </DndContext>
  );
}

function ConsoleHandle() {
  const toggle = useEditorStore((s) => s.toggleConsole);
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 border-t border-border bg-background px-4 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-chrome"
    >
      <span className="font-mono text-accent">{">_"}</span> Console de Expressões
    </button>
  );
}

export function useLibDraggable(id: string, type: "library-block" | "query-type", label: string) {
  return useDraggable({ id: `${type}-${id}`, data: { type, id, label } });
}

import { createContext, useContext } from "react";
export const DropPosContext = createContext<DropPos>(null);
export const useDropPos = () => useContext(DropPosContext);
