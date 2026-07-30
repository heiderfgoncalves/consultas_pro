/**
 * Inline editing primitives + per-field hover hotbar.
 */

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FieldNode, LayoutMode } from "../types";
import { ItemHotbar } from "./ItemHotbar";

interface RendererCtx {
  sectionId?: string;
  selectedFieldId?: string | null;
  onSelectField?: (id: string) => void;
  onFieldChange?: (fieldId: string, patch: Partial<FieldNode>) => void;
  readOnly?: boolean;
  forceEditable?: boolean;
  /** disable hover hotbar (e.g. in pure preview) */
  hideHotbar?: boolean;
}

const Ctx = createContext<RendererCtx>({});
export const RendererProvider = Ctx.Provider;
export const useRendererCtx = () => useContext(Ctx);

/* -------- style helpers -------- */

export function fieldStyle(
  f?: Pick<
    FieldNode,
    "fontSize" | "fontWeight" | "color" | "background" | "borderWidth" | "borderStyle" | "borderColor" | "borderRadius"
  > | null,
): React.CSSProperties {
  if (!f) return {};
  const s: React.CSSProperties = {};
  if (f.fontSize) s.fontSize = `${f.fontSize}px`;
  if (f.fontWeight) s.fontWeight = f.fontWeight as React.CSSProperties["fontWeight"];
  if (f.color) s.color = f.color;
  if (f.background && f.background !== "transparent") {
    s.background = f.background;
    s.padding = "2px 6px";
    s.borderRadius = "4px";
  }
  if (typeof f.borderWidth === "number" && f.borderWidth > 0) {
    s.borderWidth = `${f.borderWidth}px`;
    s.borderStyle = f.borderStyle ?? "solid";
    if (f.borderColor) s.borderColor = f.borderColor;
  } else if (f.borderStyle && f.borderStyle !== "none") {
    s.borderStyle = f.borderStyle;
    s.borderWidth = s.borderWidth ?? "1px";
    if (f.borderColor) s.borderColor = f.borderColor;
  }
  if (typeof f.borderRadius === "number") s.borderRadius = `${f.borderRadius}px`;
  return s;
}

export function layoutStyle(f?: Pick<FieldNode, "width" | "align" | "padding" | "spacing"> | null): React.CSSProperties {
  if (!f) return {};
  const s: React.CSSProperties = {};
  if (f.width) {
    if (/^\d+(\.\d+)?$/.test(f.width)) s.width = `${f.width}px`;
    else if (f.width === "1/2") s.width = "50%";
    else if (f.width === "1/3") s.width = "33.333%";
    else if (f.width === "2/3") s.width = "66.666%";
    else if (f.width === "1/4") s.width = "25%";
    else s.width = f.width;
  }
  if (f.align) s.textAlign = f.align;
  if (typeof f.padding === "number") s.padding = `${f.padding}px`;
  if (typeof f.spacing === "number") s.margin = `${f.spacing}px 0`;
  return s;
}

export function containerStyle(layout?: LayoutMode, columns?: number, gap?: number): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (layout === "row") {
    s.display = "flex"; s.flexDirection = "row"; s.flexWrap = "wrap";
  } else if (layout === "column") {
    s.display = "flex"; s.flexDirection = "column";
  } else if (layout === "grid") {
    s.display = "grid";
    s.gridTemplateColumns = `repeat(${columns ?? 2}, minmax(0, 1fr))`;
  }
  if (typeof gap === "number") s.gap = `${gap}px`;
  return s;
}

/* -------- Hotbar portal anchored above the hovered/selected field -------- */

function HotbarPortal({
  rect, sectionId, fieldId,
}: {
  rect: DOMRect; sectionId: string; fieldId: string;
}) {
  if (typeof document === "undefined") return null;
  const top = Math.min(window.innerHeight - 56, rect.bottom + 8);
  const left = Math.min(
    window.innerWidth - 16,
    Math.max(160, rect.left + rect.width / 2),
  );
  return createPortal(
    <div
      style={{ position: "fixed", top, left, transform: "translateX(-50%)", zIndex: 70 }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto"
    >
      <ItemHotbar sectionId={sectionId} fieldId={fieldId} />
    </div>,
    document.body,
  );
}

/* -------- Selectable -------- */

export function Selectable({
  field, fieldId, children, className = "",
  selectedFieldId: selOverride, onSelectField: onSelOverride,
}: {
  field?: FieldNode;
  fieldId?: string;
  children: React.ReactNode;
  className?: string;
  selectedFieldId?: string | null;
  onSelectField?: (id: string) => void;
}) {
  const ctx = useContext(Ctx);
  const selectedFieldId = selOverride ?? ctx.selectedFieldId;
  const onSelectField = onSelOverride ?? ctx.onSelectField;
  const id = fieldId ?? field?.id;

  const elRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const sel = !!id && selectedFieldId === id;
  const show = !!id && !ctx.hideHotbar && !!ctx.sectionId && sel;

  useLayoutEffect(() => {
    if (!show || !elRef.current) return;
    const update = () => { if (elRef.current) setRect(elRef.current.getBoundingClientRect()); };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [show]);

  if (!id) return <>{children}</>;

  return (
    <>
      <div
        ref={elRef}
        onMouseDown={(e) => { e.stopPropagation(); onSelectField?.(id); }}
        className={[
          "rounded-sm transition-shadow cursor-pointer hover:outline hover:outline-1 hover:outline-accent/40",
          sel ? "outline outline-2 outline-accent" : "",
          className,
        ].filter(Boolean).join(" ")}
        style={{ ...fieldStyle(field), ...layoutStyle(field) }}
      >
        {children}
      </div>
      {show && rect && ctx.sectionId && (
        <HotbarPortal rect={rect} sectionId={ctx.sectionId} fieldId={id} />
      )}
    </>
  );
}

/* -------- EditableText -------- */

export function EditableText({
  value, onChange, placeholder, as = "span", className = "", multiline = false, disabled = false,
}: {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  as?: "span" | "div" | "p" | "h3" | "h4";
  className?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      if (ref.current.innerText !== value) ref.current.innerText = value;
    }
  }, [value]);

  const editable = !!onChange && !disabled;

  const commit = () => {
    if (!editable || !ref.current) return;
    const next = ref.current.innerText;
    if (next !== value) onChange!(next);
  };

  const common: React.HTMLAttributes<HTMLElement> & Record<string, unknown> = {
    contentEditable: editable,
    suppressContentEditableWarning: true,
    spellCheck: false,
    "data-empty": value === "" ? "true" : "false",
    "data-placeholder": placeholder ?? "",
    className: ["tp-inline", className].filter(Boolean).join(" "),
    onMouseDown: (e: React.MouseEvent) => { if (editable) e.stopPropagation(); },
    onClick: (e: React.MouseEvent) => { if (editable) e.stopPropagation(); },
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!multiline && e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); }
      if (e.key === "Escape") {
        if (ref.current) ref.current.innerText = value;
        (e.target as HTMLElement).blur();
      }
    },
    children: value,
  };

  if (as === "div") return <div {...common} ref={ref as React.Ref<HTMLDivElement>} />;
  if (as === "p")   return <p {...common} ref={ref as React.Ref<HTMLParagraphElement>} />;
  if (as === "h3")  return <h3 {...common} ref={ref as React.Ref<HTMLHeadingElement>} />;
  if (as === "h4")  return <h4 {...common} ref={ref as React.Ref<HTMLHeadingElement>} />;
  return <span {...common} ref={ref as React.Ref<HTMLSpanElement>} />;
}

/* -------- InlineEdit -------- */

export function InlineEdit({
  field, prop, placeholder, as = "span", className = "", multiline = false,
}: {
  field?: FieldNode;
  prop: keyof Pick<FieldNode, "label" | "value">;
  placeholder?: string;
  as?: "span" | "div" | "p" | "h3" | "h4";
  className?: string;
  multiline?: boolean;
}) {
  const { onFieldChange, readOnly } = useRendererCtx();
  const initial = (field?.[prop] as string | undefined) ?? "";
  return (
    <EditableText
      value={initial}
      onChange={(next) => field && onFieldChange?.(field.id, { [prop]: next } as Partial<FieldNode>)}
      placeholder={placeholder ?? (prop === "label" ? "label" : "valor")}
      as={as}
      className={className}
      multiline={multiline}
      disabled={!field || !onFieldChange || readOnly}
    />
  );
}

export function EditableValue({
  field, interpolated, as = "span", className = "",
}: {
  field?: FieldNode;
  interpolated: string;
  as?: "span" | "div" | "p" | "h3" | "h4";
  className?: string;
}) {
  if (!field) return null;
  const raw = field.value ?? "";
  const isExpr = /\{\$|\$[A-Z_]/i.test(raw);
  if (isExpr) {
    const Tag = (as as "span");
    return <Tag className={className} style={fieldStyle(field)}>{interpolated}</Tag>;
  }
  return <InlineEdit field={field} prop="value" as={as} className={className} />;
}
