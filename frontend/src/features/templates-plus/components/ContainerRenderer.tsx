/**
 * Recursive container renderer with nested dropzones and live resize handles.
 * Use for sections of kind="free"/"container" and for any field with tag="container".
 */
import React, { useEffect, useRef, useState } from "react";
import type { FieldNode } from "../types";
import { useEditorStore, type NodePath } from "../store";
import { useDroppable } from "@dnd-kit/core";
import { evaluate } from "../expr";
import { LucideIcon } from "./LucideIcon";
import { Selectable, fieldStyle, InlineEdit } from "./inline";

/* ============================================================================ */

interface CtxValue {
  sectionId: string;
  context: Record<string, unknown>;
  mode: "skeleton" | "preview";
  editable: boolean;
  /** width in px of the section card root, for responsive stacking */
  containerWidth: number;
}

const CRCtx = React.createContext<CtxValue | null>(null);
const useCR = () => {
  const v = React.useContext(CRCtx);
  if (!v) throw new Error("ContainerRenderer must be wrapped in ContainerProvider");
  return v;
};

export function ContainerProvider(props: CtxValue & { children: React.ReactNode }) {
  const { children, ...v } = props;
  return <CRCtx.Provider value={v}>{children}</CRCtx.Provider>;
}

/* ============================================================================ */

interface ContainerProps {
  node?: FieldNode; // undefined = section root container
  fields: FieldNode[];
  path: NodePath; // path of this container in the tree ([] for root)
  /** root section layout fallback */
  rootLayout?: { layout?: FieldNode["layout"]; columns?: number; gap?: number; padding?: number };
}

export function ContainerRenderer({ node, fields, path, rootLayout }: ContainerProps) {
  const cr = useCR();
  const insertNode = useEditorStore((s) => s.insertNodeAt);
  const updateNode = useEditorStore((s) => s.updateNodeAt);

  const layout = node?.layout ?? rootLayout?.layout ?? "column";
  const columns = node?.columns ?? rootLayout?.columns ?? 2;
  const gap = node?.gap ?? rootLayout?.gap ?? 8;
  const padding = node?.padding ?? rootLayout?.padding;

  // responsive stack-below
  const stackBelow = node?.stackBelow;
  const shouldStack = layout === "row" && stackBelow && cr.containerWidth < stackBelow;
  const effLayout = shouldStack ? "column" : layout;

  const containerStyle: React.CSSProperties = {
    display: effLayout === "grid" ? "grid" : "flex",
    flexDirection: effLayout === "row" ? "row" : "column",
    gridTemplateColumns: effLayout === "grid" ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
    gap: `${gap}px`,
    padding: padding != null ? `${padding}px` : undefined,
    flexWrap: node?.wrap === false || effLayout !== "row" ? undefined : "wrap",
    background: node?.background,
    minHeight: node?.minHeight,
    ...fieldStyle(node ?? undefined),
  };

  // root drop fallback
  const isEmpty = fields.length === 0;

  return (
    <div className="cr-container" style={containerStyle}>
      {/* leading dropzone */}
      <DropZone parentPath={path} index={0} orientation={effLayout} />

      {fields.map((child, i) => {
        const childPath = [...path, i];
        return (
          <React.Fragment key={child.id}>
            <NodeRenderer
              node={child}
              path={childPath}
              parentLayout={effLayout}
              parentFields={fields}
              indexInParent={i}
            />
            <DropZone parentPath={path} index={i + 1} orientation={effLayout} />
          </React.Fragment>
        );
      })}

      {isEmpty && (
        <EmptyHint
          onAdd={(t) => insertNode(cr.sectionId, path, 0, makePrimitive(t))}
          onToggleLayout={(L) => node && updateNode(cr.sectionId, path, { layout: L })}
          hasNode={!!node}
        />
      )}
    </div>
  );
}

/* ============================================================================ */

function NodeRenderer({
  node, path, parentLayout, parentFields, indexInParent,
}: {
  node: FieldNode;
  path: NodePath;
  parentLayout: "row" | "column" | "grid";
  parentFields: FieldNode[];
  indexInParent: number;
}) {
  const cr = useCR();
  const resize = useEditorStore((s) => s.resizeFlex);

  const isContainer = node.tag === "container";

  const flex = node.flex;
  const baseWrap: React.CSSProperties = {
    flex: parentLayout === "row" || parentLayout === "column" ? `${flex ?? 1} 1 0` : undefined,
    minWidth: node.minWidth ?? (parentLayout === "row" ? 60 : undefined),
    width: parentLayout !== "row" && node.width ? undefined : undefined,
    position: "relative",
  };

  /* ------ resize handle between this and next sibling (row/col only) ------ */
  const showHandle =
    (parentLayout === "row" || parentLayout === "column") &&
    indexInParent < parentFields.length - 1;

  const elRef = useRef<HTMLDivElement | null>(null);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parentEl = elRef.current?.parentElement as HTMLElement | null;
    if (!parentEl) return;
    const leftFlex = node.flex ?? 1;
    const rightFlex = parentFields[indexInParent + 1]?.flex ?? 1;
    const startPos = parentLayout === "row" ? e.clientX : e.clientY;
    const sumFlex = leftFlex + rightFlex;
    const parentRect = parentEl.getBoundingClientRect();
    const total = parentLayout === "row" ? parentRect.width : parentRect.height;
    const onMove = (ev: PointerEvent) => {
      const cur = parentLayout === "row" ? ev.clientX : ev.clientY;
      const delta = cur - startPos;
      const ratio = delta / total;
      const newLeft = Math.max(0.1, leftFlex + ratio * sumFlex);
      const newRight = Math.max(0.1, rightFlex - ratio * sumFlex);
      const parentPath = path.slice(0, -1);
      resize(cr.sectionId, parentPath, indexInParent, newLeft, newRight);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div ref={elRef} style={baseWrap} className="cr-node">
      {isContainer ? (
        <ContainerWrapper node={node} path={path} />
      ) : (
        <LeafRenderer node={node} path={path} />
      )}
      {showHandle && cr.editable && (
        <div
          onPointerDown={startResize}
          className={[
            "cr-handle absolute z-20 bg-transparent transition-colors hover:bg-accent/60",
            parentLayout === "row"
              ? "top-0 bottom-0 -right-1 w-2 cursor-col-resize"
              : "left-0 right-0 -bottom-1 h-2 cursor-row-resize",
          ].join(" ")}
          title="Arraste para redimensionar"
        />
      )}
    </div>
  );
}

/* ============================================================================ */

function ContainerWrapper({ node, path }: { node: FieldNode; path: NodePath }) {
  const cr = useCR();
  return (
    <Selectable field={node} fieldId={node.id} className="cr-container-frame relative">
      <>
        {cr.editable && (
          <div className="pointer-events-none absolute -top-2.5 left-2 z-10 flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground border border-border">
            <LucideIcon name={node.icon ?? layoutIconName(node.layout)} className="h-2.5 w-2.5" />
            <span>{node.label || labelForLayout(node.layout)}</span>
          </div>
        )}
        <div style={{ minHeight: node.minHeight ?? 40, padding: node.padding ?? 4 }}>
          <ContainerRenderer node={node} fields={node.children ?? []} path={path} />
        </div>
      </>
    </Selectable>
  );
}

/* ============================================================================ */

function LeafRenderer({ node, path }: { node: FieldNode; path: NodePath }) {
  void path;
  const cr = useCR();
  const t = node.tag;

  if (t === "divider") {
    return (
      <Selectable field={node} fieldId={node.id}>
        <hr className="my-1 border-t" style={{ borderColor: node.borderColor ?? "var(--color-border)", borderTopWidth: node.borderWidth ?? 1 }} />
      </Selectable>
    );
  }

  if (t === "image") {
    const src = String(evaluate(node.value ?? "", cr.context) ?? "");
    return (
      <Selectable field={node} fieldId={node.id}>
        {src && cr.mode === "preview"
          ? <img src={src} alt={node.label} className="object-contain" style={{ maxWidth: "100%", borderRadius: node.borderRadius }} />
          : <div className="grid h-12 place-items-center rounded border border-dashed border-border text-[10px] text-muted-foreground" style={{ width: node.width ?? "100%" }}>IMG</div>}
      </Selectable>
    );
  }

  if (t === "icon") {
    return (
      <Selectable field={node} fieldId={node.id}>
        <LucideIcon name={node.icon ?? "Square"} className="h-5 w-5" style={{ color: node.color }} />
      </Selectable>
    );
  }

  if (t === "label") {
    return (
      <Selectable field={node} fieldId={node.id}>
        <InlineEdit field={node} prop="label" as="span" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" />
      </Selectable>
    );
  }

  // text / value / table (table renders as compact placeholder here)
  const display = cr.mode === "skeleton"
    ? (node.value && /\{\$|\$[A-Z_]/i.test(node.value) ? node.value : (node.label ?? ""))
    : node.value && /\{\$|\$[A-Z_]/i.test(node.value)
      ? String(evaluate(node.value, cr.context) ?? "")
      : (node.value ?? "");

  return (
    <Selectable field={node} fieldId={node.id}>
      <div className="leading-snug" style={{ textAlign: node.align }}>
        {node.label && t === "value" && (
          <InlineEdit field={node} prop="label" as="span" className="mr-1 text-[10px] uppercase text-muted-foreground" />
        )}
        {node.value && /\{\$|\$[A-Z_]/i.test(node.value)
          ? <span>{display}</span>
          : <InlineEdit field={node} prop="value" as="span" />
        }
      </div>
    </Selectable>
  );
}

/* ============================================================================ */

function DropZone({
  parentPath, index, orientation,
}: { parentPath: NodePath; index: number; orientation: "row" | "column" | "grid" }) {
  const cr = useCR();
  const { setNodeRef, isOver, active } = useDroppable({
    id: `cr-${cr.sectionId}-${parentPath.join(".")}-${index}`,
    data: { type: "cr-drop", sectionId: cr.sectionId, parentPath, index },
  });
  if (!cr.editable) return null;
  const dragging = !!active;
  const horiz = orientation === "row";
  return (
    <div
      ref={setNodeRef}
      className={[
        "cr-dropzone shrink-0 transition-colors",
        horiz ? "w-1 self-stretch" : "h-1 w-full",
        isOver ? "bg-accent" : dragging ? "bg-accent/20" : "bg-transparent",
      ].join(" ")}
      style={{ borderRadius: 999 }}
    />
  );
}

/* ============================================================================ */

function EmptyHint({
  onAdd, onToggleLayout, hasNode,
}: {
  onAdd: (t: "text" | "container") => void;
  onToggleLayout: (L: "row" | "column" | "grid") => void;
  hasNode: boolean;
}) {
  const cr = useCR();
  if (!cr.editable) return null;
  return (
    <div className="grid place-items-center gap-2 rounded-md border-2 border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
      <span>Solte algo aqui</span>
      <div className="flex gap-1.5">
        <button onClick={() => onAdd("text")} className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted">+ texto</button>
        <button onClick={() => onAdd("container")} className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted">+ container</button>
        {hasNode && (
          <>
            <button onClick={() => onToggleLayout("row")} className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted">linha</button>
            <button onClick={() => onToggleLayout("column")} className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted">coluna</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================================ */
/* Helpers exported for the library */

export type PrimitiveType =
  | "container-row" | "container-column" | "container-grid"
  | "text" | "value" | "label" | "icon" | "image" | "divider";

export function makePrimitive(t: PrimitiveType | "text" | "container"): Omit<FieldNode, "id"> {
  switch (t) {
    case "container-row":    return { tag: "container", layout: "row",    label: "Linha",   gap: 8, children: [], minHeight: 48 };
    case "container-column": return { tag: "container", layout: "column", label: "Coluna",  gap: 8, children: [], minHeight: 48 };
    case "container-grid":   return { tag: "container", layout: "grid",   label: "Grade",   gap: 8, columns: 2, children: [], minHeight: 48 };
    case "container":        return { tag: "container", layout: "row",    label: "Container", gap: 8, children: [], minHeight: 48 };
    case "value":  return { tag: "value", label: "Valor", value: "Valor", fontSize: 12 };
    case "label":  return { tag: "label", label: "Rótulo" };
    case "icon":   return { tag: "icon",  icon: "Star" };
    case "image":  return { tag: "image", label: "Imagem", value: "" };
    case "divider":return { tag: "divider", label: "Divisória" };
    case "text":
    default:       return { tag: "text",  label: "Texto", value: "Digite aqui…", fontSize: 12 };
  }
}

function layoutIconName(m?: FieldNode["layout"]) {
  if (m === "row") return "Rows3";
  if (m === "grid") return "Grid3x3";
  return "Columns3";
}
function labelForLayout(m?: FieldNode["layout"]) {
  if (m === "row") return "Linha";
  if (m === "grid") return "Grade";
  return "Coluna";
}

/* ============================================================================ */
/* ResizeObserver hook for responsive root width */

export function useObservedWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
