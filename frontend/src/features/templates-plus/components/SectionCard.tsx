import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "../store";
import type { SectionNode, FieldNode } from "../types";
import { LucideIcon } from "./LucideIcon";
import { GripVertical, Pencil, Trash2, MoreHorizontal, Copy } from "lucide-react";
import { SectionRenderer } from "./SectionRenderer";
import { EditableText } from "./inline";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDropPos } from "./EditorScreen";
import { ContainerProvider, useObservedWidth } from "./ContainerRenderer";


interface Props {
  section: SectionNode;
  index: number;
  mode: "skeleton" | "preview";
  context: Record<string, unknown>;
}

export function SectionCard({ section, index, mode, context }: Props) {
  const open = useEditorStore((s) => s.openEditor);
  const remove = useEditorStore((s) => s.removeSection);
  const duplicate = useEditorStore((s) => s.duplicateSection);
  const rename = useEditorStore((s) => s.renameSection);
  const updateField = useEditorStore((s) => s.updateField);
  const select = useEditorStore((s) => s.selectSection);
  const selectField = useEditorStore((s) => s.selectField);
  const selectedSection = useEditorStore((s) => s.selectedSectionId);
  const selectedField = useEditorStore((s) => s.selectedFieldId);
  const experience = useEditorStore((s) => s.experience);
  const [hover, setHover] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [bodyRef, bodyW] = useObservedWidth<HTMLDivElement>();

  const isSelected = selectedSection === section.id;
  const editable = experience === "admin";

  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } =
    useSortable({ id: section.id, data: { type: "section", id: section.id } });
  const style = { transform: CSS.Transform.toString(transform), transition };
  void index;
  const dropPos = useDropPos();
  const showBefore = isOver && dropPos?.overId === section.id && dropPos.side === "before";
  const showAfter  = isOver && dropPos?.overId === section.id && dropPos.side === "after";

  // keyboard: undo/redo + delete selected
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const removeField = useEditorStore((s) => s.removeField);
  useEffect(() => {
    if (!isSelected || !editable) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedField) {
        const tgt = e.target as HTMLElement | null;
        if (tgt && (tgt.isContentEditable || ["INPUT", "TEXTAREA"].includes(tgt.tagName))) return;
        e.preventDefault();
        removeField(section.id, selectedField);
        selectField(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSelected, editable, undo, redo, selectedField, removeField, section.id, selectField]);

  return (
    <div className="relative">
      {showBefore && <div className="pointer-events-none absolute -top-3 left-0 right-0 h-1 rounded-full bg-accent shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" />}
      {showAfter  && <div className="pointer-events-none absolute -bottom-3 left-0 right-0 h-1 rounded-full bg-accent shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" />}
      <div
        ref={setNodeRef}
        style={style}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => { e.stopPropagation(); select(section.id); }}
        className={[
          "group relative rounded-md border bg-background p-4 transition-all",
          isSelected ? "border-accent ring-1 ring-accent/30" : "border-border",
          isDragging && "opacity-40",
        ].filter(Boolean).join(" ")}
      >
      {/* Hover overlay controls */}
      <div className={["absolute -top-3 left-3 flex items-center gap-1 transition-opacity", hover || isSelected || popoverOpen ? "opacity-100" : "opacity-0"].join(" ")}>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 shadow-sm">
          <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" title="Arrastar">
            <GripVertical className="h-3 w-3" />
          </button>
          <div className="flex items-center gap-1 border-l border-border pl-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <LucideIcon name={section.icon} className="h-3 w-3" />
            <EditableText
              value={section.name}
              onChange={(name) => name.trim() && rename(section.id, name.trim())}
              className="text-[10px] uppercase tracking-wider"
            />
          </div>
        </div>
      </div>
      <div className={["absolute -top-3 right-3 flex items-center gap-1 transition-opacity", hover || isSelected || popoverOpen ? "opacity-100" : "opacity-0"].join(" ")}>
        {experience === "admin" && (
          <button
            onClick={(e) => { e.stopPropagation(); open(section.id); }}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium shadow-sm hover:bg-chrome"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="rounded-md border border-border bg-background p-1 shadow-sm hover:bg-chrome">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            <button onClick={() => { duplicate(section.id); setPopoverOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted">
              <Copy className="h-3 w-3" /> Duplicar
            </button>
            <button onClick={() => { remove(section.id); setPopoverOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3 w-3" /> Remover
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <div ref={bodyRef}>
        <ContainerProvider
          sectionId={section.id}
          context={context}
          mode={mode}
          editable={editable}
          containerWidth={bodyW}
        >
          <SectionRenderer
            section={section}
            mode={mode}
            context={context}
            selectedFieldId={selectedField}
            onSelectField={(fid) => { select(section.id); selectField(fid); }}
            onFieldChange={editable ? (fid: string, patch: Partial<FieldNode>) => updateField(section.id, fid, patch) : undefined}
          />
        </ContainerProvider>
      </div>
      </div>
    </div>
  );
}
