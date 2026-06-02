import React, { forwardRef, useState } from "react";
import { useEditorStore } from "../store";
import { LucideIcon } from "./LucideIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Type, Hash, Tag, Palette, PaintBucket, Move, MoreHorizontal, Copy, Trash2, Ban, Search,
  AlignLeft, AlignCenter, AlignRight, Rows3, Columns3, Grid3x3, Bold, Maximize2, Square as SquareIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import type { FieldNode, LayoutMode } from "../types";

const COMMON_ICONS = [
  "User", "Hash", "Tag", "Gauge", "CheckCircle", "AlertTriangle", "Wallet", "TrendingUp", "TrendingDown",
  "FileText", "FileSearch", "Calendar", "Mail", "Phone", "MapPin", "Building", "Star", "Shield", "Award",
  "BarChart", "PieChart", "Activity", "Layers", "Square", "Circle", "Image", "Type", "Minus", "Table",
];
const TAGS = ["text", "value", "label", "icon", "image", "divider", "container", "table", "speedometer"] as const;

interface HotbarProps {
  sectionId: string;
  fieldId: string;
  fieldOverride?: FieldNode;
  onFieldChange?: (patch: Partial<FieldNode>) => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
}

export function ItemHotbar({ sectionId, fieldId, fieldOverride, onFieldChange, onDuplicate, onRemove }: HotbarProps) {
  const storeSec = useEditorStore((s) => s.templates.find((t) => t.id === s.activeTemplateId)?.sections.find((x) => x.id === sectionId));
  const storeField = storeSec?.fields.find((f) => f.id === fieldId);
  const update = useEditorStore((s) => s.updateField);
  const remove = useEditorStore((s) => s.removeField);
  const dup = useEditorStore((s) => s.duplicateField);
  const field = fieldOverride ?? storeField;
  if (!field) return null;

  const set = (patch: Partial<FieldNode>) => {
    if (onFieldChange) onFieldChange(patch);
    else update(sectionId, fieldId, patch);
  };
  const doDup = () => onDuplicate ? onDuplicate() : dup(sectionId, fieldId);
  const doRemove = () => onRemove ? onRemove() : remove(sectionId, fieldId);

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-background px-1 py-1 shadow-lg"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <HotPop trigger={<HotBtn icon={Type} title="Label">{field.label?.slice(0, 8) || "Label"}</HotBtn>}>
        <Mini label="Label"><Input value={field.label ?? ""} onChange={(e) => set({ label: e.target.value })} className="h-7 text-xs" /></Mini>
      </HotPop>

      <HotPop trigger={<HotBtn icon={Hash} title="Valor / Expressão">Valor</HotBtn>}>
        <Mini label="Valor ou expressão">
          <Input value={field.value ?? ""} onChange={(e) => set({ value: e.target.value })} className="h-7 font-mono text-xs" placeholder="{$path.sub}" />
        </Mini>
      </HotPop>

      <HotPop trigger={<HotBtn icon={Tag} title="Tag">{field.tag}</HotBtn>}>
        <Mini label="Tag">
          <Select value={field.tag} onValueChange={(v) => set({ tag: v as FieldNode["tag"] })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TAGS.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
          </Select>
        </Mini>
      </HotPop>

      <HotPop trigger={<IconBtn name={field.icon} />}>
        <IconPicker value={field.icon} onChange={(name) => set({ icon: name })} />
      </HotPop>

      <Sep />

      <HotPop trigger={<HotBtn icon={Type} title="Fonte">{field.fontSize ?? "—"}</HotBtn>}>
        <Mini label="Tamanho da fonte (px)">
          <Input type="number" value={field.fontSize ?? ""} onChange={(e) => set({ fontSize: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
        </Mini>
        <Mini label="Peso">
          <Select value={field.fontWeight ?? ""} onValueChange={(v) => set({ fontWeight: v || undefined })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="auto" /></SelectTrigger>
            <SelectContent>
              {["300", "400", "500", "600", "700", "800"].map((w) => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </Mini>
      </HotPop>

      <HotPop trigger={<HotBtn icon={Move} title="Espaçamento">{field.spacing ?? "—"}</HotBtn>}>
        <Mini label="Margem vertical (px)">
          <Input type="number" value={field.spacing ?? ""} onChange={(e) => set({ spacing: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
        </Mini>
        <Mini label="Padding interno (px)">
          <Input type="number" value={field.padding ?? ""} onChange={(e) => set({ padding: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
        </Mini>
      </HotPop>

      <HotPop trigger={<HotBtn icon={Maximize2} title="Largura">{field.width ?? "auto"}</HotBtn>}>
        <Mini label="Largura">
          <div className="flex flex-wrap gap-1">
            {["auto", "100%", "1/2", "1/3", "2/3", "1/4"].map((w) => (
              <button key={w} onClick={() => set({ width: w === "auto" ? undefined : w })}
                className={["rounded border px-1.5 py-0.5 text-[10px]", field.width === w ? "border-accent bg-accent/10" : "border-border"].join(" ")}>{w}</button>
            ))}
          </div>
          <Input value={field.width ?? ""} onChange={(e) => set({ width: e.target.value || undefined })} placeholder="ex: 200px" className="mt-1 h-7 text-xs" />
        </Mini>
        <Mini label="Alinhamento">
          <div className="flex gap-1">
            {[
              { v: "left", I: AlignLeft },
              { v: "center", I: AlignCenter },
              { v: "right", I: AlignRight },
            ].map(({ v, I }) => (
              <button key={v} onClick={() => set({ align: v as FieldNode["align"] })}
                className={["grid h-7 w-7 place-items-center rounded border", field.align === v ? "border-accent bg-accent/10" : "border-border"].join(" ")}>
                <I className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </Mini>
      </HotPop>

      <HotPop trigger={<HotBtn icon={layoutIcon(field.layout)} title="Layout dos filhos">{field.layout ?? "—"}</HotBtn>}>
        <Mini label="Layout (container)">
          <div className="flex gap-1">
            {([
              { v: "row", I: Rows3 },
              { v: "column", I: Columns3 },
              { v: "grid", I: Grid3x3 },
            ] as { v: LayoutMode; I: typeof Rows3 }[]).map(({ v, I }) => (
              <button key={v} onClick={() => set({ layout: v })}
                className={["grid h-7 w-7 place-items-center rounded border", field.layout === v ? "border-accent bg-accent/10" : "border-border"].join(" ")} title={v}>
                <I className="h-3.5 w-3.5" />
              </button>
            ))}
            <button onClick={() => set({ layout: undefined })} className="grid h-7 w-7 place-items-center rounded border border-border text-[10px]" title="auto">—</button>
          </div>
        </Mini>
        {field.layout === "grid" && (
          <Mini label="Colunas">
            <Input type="number" min={1} max={8} value={field.columns ?? 2} onChange={(e) => set({ columns: Number(e.target.value) })} className="h-7 text-xs" />
          </Mini>
        )}
        <Mini label="Gap (px)">
          <Input type="number" value={field.gap ?? ""} onChange={(e) => set({ gap: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
        </Mini>
      </HotPop>

      <HotPop trigger={<ColorBtn icon={Palette} value={field.color} />}>
        <Mini label="Cor"><ColorRow value={field.color} onChange={(c) => set({ color: c })} /></Mini>
      </HotPop>

      <HotPop trigger={<ColorBtn icon={PaintBucket} value={field.background} />}>
        <Mini label="Fundo"><ColorRow value={field.background} onChange={(c) => set({ background: c })} /></Mini>
      </HotPop>

      <HotPop trigger={
        <HotBtn icon={SquareIcon} title="Borda">
          {field.borderWidth ?? 0}px
        </HotBtn>
      }>
        <Mini label="Largura (px)">
          <Input type="number" min={0} max={8} value={field.borderWidth ?? ""} onChange={(e) => set({ borderWidth: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-7 text-xs" />
        </Mini>
        <Mini label="Estilo">
          <Select value={field.borderStyle ?? ""} onValueChange={(v) => set({ borderStyle: (v || undefined) as FieldNode["borderStyle"] })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="solid" /></SelectTrigger>
            <SelectContent>
              {["solid", "dashed", "dotted", "none"].map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Mini>
        <Mini label="Cor da borda">
          <ColorRow value={field.borderColor} onChange={(c) => set({ borderColor: c })} />
        </Mini>
        <Mini label="Raio (px)">
          <Input type="number" min={0} max={32} value={field.borderRadius ?? ""} onChange={(e) => set({ borderRadius: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-7 text-xs" />
        </Mini>
      </HotPop>

      <Sep />

      <Popover>
        <PopoverTrigger asChild>
          <button className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-muted">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <button onClick={doDup} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"><Copy className="h-3 w-3" /> Duplicar</button>
          <button onClick={() => navigator.clipboard?.writeText(field.value ?? "")} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"><Hash className="h-3 w-3" /> Copiar expressão</button>
          <button onClick={doRemove} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Remover</button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function layoutIcon(m?: LayoutMode) {
  if (m === "row") return Rows3;
  if (m === "column") return Columns3;
  if (m === "grid") return Grid3x3;
  return Bold;
}

/* ---------- ref-forwarding trigger buttons (so Radix PopoverTrigger asChild works) ---------- */

const HotBtn = forwardRef<HTMLButtonElement, { icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function HotBtn({ icon: Icon, title, children, ...props }, ref) {
    return (
      <button ref={ref} type="button" title={title} {...props}
        className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground">
        <Icon className="h-3.5 w-3.5" />
        {children && <span className="max-w-[60px] truncate">{children}</span>}
      </button>
    );
  }
);

const IconBtn = forwardRef<HTMLButtonElement, { name?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconBtn({ name, ...props }, ref) {
    return (
      <button ref={ref} type="button" title="Ícone" {...props}
        className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
        {name ? <LucideIcon name={name} className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
      </button>
    );
  }
);

const ColorBtn = forwardRef<HTMLButtonElement, { icon: React.ComponentType<{ className?: string }>; value?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function ColorBtn({ icon: Icon, value, ...props }, ref) {
    return (
      <button ref={ref} type="button" {...props}
        className="flex h-7 items-center gap-1.5 rounded px-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="h-3 w-3 rounded border border-border" style={{ background: value || "transparent" }} />
      </button>
    );
  }
);

function Sep() { return <span className="mx-0.5 h-5 w-px bg-border" />; }

function HotPop({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side="top" className="w-60 space-y-2 p-2">{children}</PopoverContent>
    </Popover>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ColorRow({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const swatches = ["#0f172a", "#64748b", "#2563eb", "#16a34a", "#dc2626", "#ca8a04", "#7c3aed", "#0891b2", "transparent"];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {swatches.map((s) => (
          <button key={s} onClick={() => onChange(s)} className="h-5 w-5 rounded border border-border" style={{ background: s }} title={s} />
        ))}
      </div>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#000000 ou var(--…)" className="h-7 font-mono text-xs" />
    </div>
  );
}

function IconPicker({ value, onChange }: { value?: string; onChange: (name: string | undefined) => void }) {
  const [q, setQ] = useState("");
  const all = Object.keys(Icons).filter((k) => /^[A-Z]/.test(k) && !["LucideIcon", "Icon", "createLucideIcon"].includes(k));
  const items = (q ? all.filter((n) => n.toLowerCase().includes(q.toLowerCase())) : COMMON_ICONS).slice(0, 80);
  return (
    <div className="w-64 space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ícone…" className="h-7 pl-7 text-xs" />
      </div>
      <button onClick={() => onChange(undefined)} className={["flex w-full items-center gap-2 rounded border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted", !value && "ring-1 ring-accent"].filter(Boolean).join(" ")}>
        <Ban className="h-3 w-3" /> Sem ícone
      </button>
      <div className="tp-scroll grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
        {items.map((name) => (
          <button key={name} title={name} onClick={() => onChange(name)} className={["grid h-7 w-7 place-items-center rounded hover:bg-muted", value === name && "bg-accent/15 text-accent"].filter(Boolean).join(" ")}>
            <LucideIcon name={name} className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
