import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useEditorStore, useActiveQuery, useActiveTemplate, buildContext } from "../store";
import { serializeSection, parseTemplate, formatXml } from "../xml";
import { XmlEditor } from "./XmlEditor";
import { SectionRenderer } from "./SectionRenderer";
import { LucideIcon } from "./LucideIcon";
import { LayoutDashboard, Eye } from "lucide-react";
import { fixedBlocks, customBlocks } from "../mocks";
import { useDraggable, DndContext, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SectionNode, FieldNode } from "../types";
import { nanoid } from "@/lib/id";

export function BlockEditorModal() {
  const editing = useEditorStore((s) => s.editingSection);
  const close = useEditorStore((s) => s.closeEditor);
  const commit = useEditorStore((s) => s.commitEditor);
  const query = useActiveQuery();
  const tpl = useActiveTemplate();
  const ctx = buildContext(query, tpl);

  const [local, setLocal] = useState<SectionNode | null>(editing);
  const [xml, setXml] = useState(() => (editing ? serializeSection(editing) : ""));
  const [mode, setMode] = useState<"skeleton" | "preview">("preview");
  const [name, setName] = useState(editing?.name ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLocal(editing);
    setXml(editing ? serializeSection(editing) : "");
    setName(editing?.name ?? "");
    setDirty(false);
  }, [editing?.id]);

  const initial = useMemo(() => (editing ? serializeSection(editing) : ""), [editing?.id]);

  if (!editing || !local) return null;

  const tryClose = () => {
    if (dirty || xml !== initial || name !== editing.name) {
      if (!window.confirm("Descartar alterações?")) return;
    }
    close();
  };

  const onXmlChange = (v: string) => {
    setXml(v);
    setDirty(true);
    try {
      const parsed = parseTemplate(v);
      if (parsed[0]) setLocal({ ...parsed[0], id: local.id, name });
    } catch { /* keep last valid */ }
  };

  const save = () => {
    commit({ ...local, name });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && tryClose()}>
      <DialogContent showClose={false} className="flex h-[95vh] max-h-[1100px] w-[98vw] max-w-[1800px] flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">Editor de Bloco · {name}</DialogTitle>
        {/* header */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-chrome px-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="grid h-8 w-8 place-items-center rounded-md border border-border bg-background hover:bg-muted">
                <LucideIcon name={local.icon} className="h-4 w-4 text-accent" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2"><IconQuick value={local.icon} onChange={(i) => { setLocal({ ...local, icon: i }); setDirty(true); }} /></PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Editor de Bloco</span>
            <Input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} className="h-8 w-[220px] text-xs" />
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{query.name}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={tryClose}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={!dirty && xml === initial && name === editing.name}>Salvar</Button>
          </div>
        </div>

        {/* 3 resizable columns */}
        <div className="flex min-h-0 flex-1">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={18} minSize={12} maxSize={35} className="border-r border-border">
              <div className="tp-scroll h-full overflow-y-auto p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocos disponíveis</div>
                <div className="mt-2 space-y-1.5">
                  {[...fixedBlocks, ...customBlocks].map((b) => <BlockDraggable key={b.id} id={b.id} label={b.name} icon={b.icon} desc={b.description} />)}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={52} minSize={30} className="min-w-0">
              <div className="flex h-full min-w-0 flex-col">
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-4">
                  <span className="text-[11px] font-semibold">Layout do bloco</span>
                  <div className="flex items-center gap-1 rounded-md border border-border bg-chrome p-0.5">
                    <button onClick={() => setMode("skeleton")} className={["flex items-center gap-1 rounded px-2 py-0.5 text-[10px]", mode === "skeleton" ? "bg-background shadow-sm" : "text-muted-foreground"].join(" ")}><LayoutDashboard className="h-3 w-3" /> Esqueleto</button>
                    <button onClick={() => setMode("preview")} className={["flex items-center gap-1 rounded px-2 py-0.5 text-[10px]", mode === "preview" ? "bg-background shadow-sm" : "text-muted-foreground"].join(" ")}><Eye className="h-3 w-3" /> Preview</button>
                  </div>
                </div>
                <div className="tp-scroll flex-1 overflow-auto bg-chrome p-6">
                  <div className="rounded-md border border-border bg-canvas p-4 shadow-sm">
                    <ModalSectionEditor section={local} mode={mode} context={ctx} onChange={(s) => { setLocal(s); setXml(serializeSection(s)); setDirty(true); }} />
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={55} className="min-w-0">
              <div className="flex h-full flex-col border-l border-border">
                <div className="flex h-10 items-center justify-between border-b border-border bg-background px-3">
                  <span className="text-[11px] font-semibold">{"</> "}XML / Template</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setXml(formatXml(xml))}>Formatar XML</Button>
                </div>
                <div className="min-h-0 flex-1">
                  <XmlEditor value={xml} onChange={onXmlChange} />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlockDraggable({ id, label, icon, desc }: { id: string; label: string; icon: string; desc: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `modal-block-${id}`, data: { type: "library-block", id, label } });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="cursor-grab rounded-md border border-border bg-background p-2 hover:border-accent/40">
      <div className="flex items-center gap-2">
        <LucideIcon name={icon} className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}

function IconQuick({ value, onChange }: { value?: string; onChange: (n: string) => void }) {
  const names = ["FileText", "User", "Wallet", "Gauge", "Table", "Star", "Shield", "Activity", "BarChart", "Layers"];
  return (
    <div className="grid grid-cols-5 gap-1">
      {names.map((n) => (
        <button key={n} onClick={() => onChange(n)} className={["grid h-8 w-8 place-items-center rounded hover:bg-muted", value === n && "bg-accent/15 text-accent"].filter(Boolean).join(" ")}>
          <LucideIcon name={n} className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function ModalSectionEditor({ section, mode, context, onChange }: { section: SectionNode; mode: "skeleton" | "preview"; context: Record<string, unknown>; onChange: (s: SectionNode) => void }) {
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  const { setNodeRef, isOver } = useDroppable({ id: `modal-section-drop-${section.id}` });

  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as { type?: string; id?: string } | undefined;
    if (!data?.type) return;
    if (data.type === "library-block" && data.id) {
      const blk = [...fixedBlocks, ...customBlocks].find((b) => b.id === data.id);
      if (!blk) return;
      const node = blk.make();
      const newFields: FieldNode[] = node.fields.map((f) => ({ ...f, id: nanoid() }));
      onChange({ ...section, fields: [...section.fields, ...newFields] });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div
        ref={setNodeRef}
        className={[
          "relative rounded-md transition-all",
          isOver ? "outline outline-2 outline-accent outline-offset-4 bg-accent/5" : "",
        ].join(" ")}
      >
        <SectionRenderer
          section={section}
          mode={mode}
          context={context}
          selectedFieldId={selectedField}
          onSelectField={setSelectedField}
          onFieldChange={(fid: string, patch: Partial<FieldNode>) => onChange({ ...section, fields: section.fields.map((f) => f.id === fid ? { ...f, ...patch } : f) })}
        />
        {isOver && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-accent">
            Soltar para adicionar campos ao bloco
          </div>
        )}
      </div>
    </DndContext>
  );
}
