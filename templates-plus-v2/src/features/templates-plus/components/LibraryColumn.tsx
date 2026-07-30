import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fixedBlocks, customBlocks, queryTypes } from "../mocks";
import { useEditorStore, useActiveQuery } from "../store";
import { LucideIcon } from "./LucideIcon";
import { listPaths } from "../expr";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "restricoes", label: "Restrições" },
  { id: "score", label: "Score & Rating" },
  { id: "analise", label: "Análise" },
  { id: "bacen", label: "Bacen" },
  { id: "cadastral", label: "Cadastral" },
] as const;

export function LibraryColumn() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("todos");
  const experience = useEditorStore((s) => s.experience);

  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const filteredQueries = queryTypes.filter((qt) => match(qt.name) && (filter === "todos" || filter === qt.category));

  return (
    <div className="tp-scroll flex h-full flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 space-y-2 border-b border-border bg-background p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar blocos..." className="h-8 pl-7 text-xs" />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={[
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                filter === f.id ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Section title="Tipos de Consulta" defaultOpen>
        {filteredQueries.map((qt) => (
          <DraggableLib key={qt.id} id={qt.id} type="query-type" label={qt.name}>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-muted">
                <LucideIcon name={qt.icon} className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{qt.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{qt.description}</div>
              </div>
              <div className="text-[10px] font-semibold text-accent">R$ {qt.price.toFixed(2)}</div>
            </div>
          </DraggableLib>
        ))}
      </Section>

      <Section title="Primitivos" defaultOpen>
        {([
          { id: "container-row",    name: "Linha",     icon: "Rows3"     },
          { id: "container-column", name: "Coluna",    icon: "Columns3"  },
          { id: "container-grid",   name: "Grade",     icon: "Grid3x3"   },
          { id: "text",             name: "Texto",     icon: "Type"     },
          { id: "value",            name: "Valor",     icon: "Hash"     },
          { id: "label",            name: "Rótulo",    icon: "Tag"      },
          { id: "icon",             name: "Ícone",     icon: "Star"     },
          { id: "image",            name: "Imagem",    icon: "Image"    },
          { id: "divider",          name: "Divisória", icon: "Minus"    },
        ] as const).filter((p) => match(p.name)).map((p) => (
          <DraggableLib key={p.id} id={p.id} type="primitive" label={p.name}>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-muted">
                <LucideIcon name={p.icon} className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="truncate text-xs font-medium">{p.name}</div>
            </div>
          </DraggableLib>
        ))}
      </Section>

      <Section title="Blocos de Layout" defaultOpen>
        {[...fixedBlocks, ...customBlocks].filter((b) => match(b.name)).map((b) => (
          <DraggableLib key={b.id} id={b.id} type="library-block" label={b.name}>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-muted">
                <LucideIcon name={b.icon} className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{b.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{b.description}</div>
              </div>
            </div>
          </DraggableLib>
        ))}
      </Section>

      {experience === "admin" && <VariablesSection />}
    </div>
  );
}

function VariablesSection() {
  const query = useActiveQuery();
  const template = useEditorStore((s) => s.templates.find((t) => t.id === s.activeTemplateId)!);
  const paths = listPaths({ ...query.sample, template: { protocol: "", date: "", company: "" } });
  return (
    <Section title="Variáveis Dinâmicas">
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sistêmicas</div>
        {["$template.protocol", "$template.date", "$template.company"].map((p) => (
          <code key={p} className="block rounded border border-border bg-chrome px-2 py-1 font-mono text-[11px] text-muted-foreground">{`{${p}}`}</code>
        ))}
        <div className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipos e Campos</div>
        {paths.slice(0, 40).map((p) => (
          <code key={p} className="block truncate rounded border border-border bg-chrome px-2 py-1 font-mono text-[11px] text-muted-foreground" title={p}>{`{${p}}`}</code>
        ))}
        <div className="pt-1 text-[10px] text-muted-foreground">Contexto: {template.name}</div>
      </div>
    </Section>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
      </button>
      {open && <div className="space-y-1.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

function DraggableLib({ id, type, label, children }: { id: string; type: "library-block" | "query-type" | "primitive"; label: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${type}-${id}`, data: { type, id, label } });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={[
        "group relative cursor-grab rounded-md border border-border bg-background p-2 active:cursor-grabbing",
        "transition-colors hover:border-accent/40 hover:bg-chrome",
        isDragging && "opacity-40",
      ].filter(Boolean).join(" ")}
    >
      <GripVertical className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
      {children}
    </div>
  );
}
