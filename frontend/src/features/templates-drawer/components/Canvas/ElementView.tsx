import { memo, useEffect, useRef, useState } from "react";
import { icons as LucideIcons } from "lucide-react";
import type { TemplateElement } from "../../schema/template";
import { useEditorStore, useEvaluationContext } from "../../store/editor.store";
import { useIsolatedEditorStore } from "../../store/isolated-editor.store";
import { interpolate, evaluateExpressionRaw } from "../../engine/interpolate";
import { resolveExpression } from "../../engine/resolveExpression";
import { formatValue } from "../../engine/formatters";
import type { BindingFormat } from "../../schema/template";

type Props = {
  element: TemplateElement;
  selected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  isIsolated?: boolean;
};

function ElementViewImpl({ element, selected, onSelect, isIsolated = false }: Props) {
  const mode = useEditorStore((s) => s.mode);
  const data = useEvaluationContext();

  let elementData = data;
  if (element.arguments && Object.keys(element.arguments).length > 0) {
    const params: Record<string, unknown> = {};
    for (const [key, expr] of Object.entries(element.arguments)) {
      params[key] = evaluateExpressionRaw(expr, data);
    }
    if (data && typeof data === "object") {
      elementData = {
        ...data,
        ...params,
        $params: params,
      };
    } else {
      elementData = {
        $params: params,
        ...params,
      };
    }
  }

  const updateData = isIsolated
    ? useIsolatedEditorStore((s) => s.updateElementData)
    : useEditorStore((s) => s.updateElementData);
  const setHovered = isIsolated
    ? useIsolatedEditorStore((s) => s.setHovered)
    : useEditorStore((s) => s.setHovered);
  const hoveredId = isIsolated
    ? useIsolatedEditorStore((s) => s.hoveredId)
    : useEditorStore((s) => s.hoveredId);
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("rd:edit-state-change", {
        detail: { elementId: editing ? element.id : null }
      })
    );
  }, [editing, element.id]);

  useEffect(() => {
    const handleEdit = (ev: CustomEvent) => {
      if (ev.detail.elementId === element.id && element.type === "text") {
        setEditing(true);
      }
    };
    window.addEventListener("rd:edit-element" as any, handleEdit);
    return () => window.removeEventListener("rd:edit-element" as any, handleEdit);
  }, [element.id, element.type]);

  const s = element.style;
  const isText = element.type === "text";
  const isSkeleton = mode === "skeleton";
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    background: isSkeleton ? "transparent" : s.background,
    color: isSkeleton ? "#0f172a" : s.color,
    border: isSkeleton
      ? "1px dashed rgba(100,116,139,0.45)"
      : s.borderWidth
      ? `${s.borderWidth}px solid ${s.borderColor ?? "#cbd5e1"}`
      : selected
        ? undefined
        : "1px dashed rgba(100,116,139,0.25)",
    borderRadius: isSkeleton ? 4 : s.borderRadius,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    fontWeight: isSkeleton ? 400 : s.fontWeight,
    lineHeight: s.lineHeight,
    textAlign: s.textAlign,
    padding: s.padding,
    zIndex: element.zIndex,
    boxSizing: "border-box",
    overflow: "hidden",
    cursor: editing ? "text" : "move",
    whiteSpace: isText ? "pre-wrap" : undefined,
    wordBreak: isText ? "break-word" : undefined,
    overflowWrap: isText ? "break-word" : undefined,
    outline: selected ? "2px solid var(--editor-selected)" : undefined,
    outlineOffset: selected ? "0px" : undefined,
    userSelect: editing ? "text" : "none",
    opacity: (s.opacity !== undefined ? s.opacity / 100 : 1) * (element.visible === false ? 0.35 : 1),
  };

  function renderInner() {
    if (element.data?.customHtml) {
      const htmlText = element.data.customHtml as string;
      let shown = mode === "preview"
        ? interpolate(htmlText, elementData, { fallback: element.binding?.fallback })
        : htmlText;
      // Garante substituição de fallback caso as chaves de score restem sem resolução no HTML/SVG
      shown = shown
        .replace(/\{\{scorePointer\.x\}\}/g, "100")
        .replace(/\{\{scorePointer\.y\}\}/g, "90")
        .replace(/\{\{scoreBandColor\}\}/g, "#cbd5e1");
      return (
        <div
          style={{ width: "100%", height: "100%", overflow: "auto" }}
          dangerouslySetInnerHTML={{ __html: shown }}
        />
      );
    }

    switch (element.type) {
      case "text": {
        const raw = (element.data?.text as string) ?? "";
        if (editing) {
          return (
            <div
              ref={textRef}
              contentEditable
              suppressContentEditableWarning
              style={{
                outline: "none",
                minHeight: "100%",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              onKeyDown={(e) => {
                // Enter without Shift confirms; Shift+Enter inserts a newline.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).blur();
                }
              }}
              onBlur={(e) => {
                updateData(element.id, { text: e.currentTarget.innerText });
                setEditing(false);
              }}
            >
              {raw}
            </div>
          );
        }
        const shown =
          mode === "preview"
            ? interpolate(raw, elementData, { fallback: element.binding?.fallback })
            : raw;
        if (shown.startsWith("html:")) {
          let htmlContent = shown.substring(5);
          // Garante substituição de fallback caso as chaves de score restem sem resolução no HTML/SVG
          htmlContent = htmlContent
            .replace(/\{\{scorePointer\.x\}\}/g, "100")
            .replace(/\{\{scorePointer\.y\}\}/g, "90")
            .replace(/\{\{scoreBandColor\}\}/g, "#cbd5e1");
          return (
            <span
              style={{ whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        }
        return <span style={{ whiteSpace: "pre-wrap" }}>{shown}</span>;
      }
      case "card": {
        const title = (element.data?.title as string) ?? "";
        const body = (element.data?.body as string) ?? "";
        const t =
          mode === "preview" ? interpolate(title, elementData) : title;
        const b =
          mode === "preview" ? interpolate(body, elementData) : body;
        return (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{t}</div>
            <div>{b}</div>
          </div>
        );
      }
      case "image": {
        const src = (element.data?.src as string) ?? "";
        if (isSkeleton || !src)
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                fontSize: 12,
                background: isSkeleton ? "repeating-linear-gradient(45deg,#f1f5f9 0 6px,#e2e8f0 6px 12px)" : "transparent",
              }}
            >
              {isSkeleton ? "[ Imagem ]" : "Imagem"}
            </div>
          );
        return (
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: (element.data?.fit as React.CSSProperties["objectFit"]) ?? "cover",
            }}
          />
        );
      }
      case "divider":
        return null;
      case "container":
        return null;
      case "table": {
        const path = (element.data?.arrayPath as string) ?? "";
        const columns =
          (element.data?.columns as Array<{
            label: string;
            path: string;
            format?: string;
          }>) ?? [];
        const rows =
          mode === "preview"
            ? ((resolveExpression(path, elementData) as unknown[]) ?? [])
            : Array.from({ length: 2 }, () => null);
        return (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left",
                      padding: 6,
                      borderBottom: "1px solid #e2e8f0",
                      fontWeight: 600,
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c, j) => {
                    if (mode === "skeleton")
                      return (
                        <td
                          key={j}
                          style={{
                            padding: 6,
                            borderBottom: "1px solid #f1f5f9",
                            color: "#64748b",
                          }}
                        >
                          {`{{${path}[*].${c.path}}}`}
                        </td>
                      );
                    const v = resolveExpression(c.path, row);
                    return (
                      <td
                        key={j}
                        style={{
                          padding: 6,
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        {formatValue(v, c.format as BindingFormat | undefined)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      case "list": {
        const items = ((element.data?.items as string[]) ?? []).map((it) =>
          mode === "preview" ? interpolate(it, elementData) : it,
        );
        const style = (element.data?.style as string) ?? "bullet";
        const Tag = (style === "number" ? "ol" : "ul") as "ol" | "ul";
        const listStyle =
          style === "number"
            ? "decimal"
            : style === "dash"
              ? "'-  '"
              : style === "check"
                ? "'☑ '"
                : "disc";
        return (
          <Tag style={{ margin: 0, paddingLeft: 20, listStyle }}>
            {items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </Tag>
        );
      }
      case "icon": {
        const name = ((element.data?.name as string) ?? "Star") as keyof typeof LucideIcons;
        const Cmp = (LucideIcons as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>>)[name as string] ?? LucideIcons.Square;
        const sw = (element.data?.strokeWidth as number) ?? 2;
        const size = Math.min(element.width, element.height);
        return (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cmp size={size} strokeWidth={sw} color={s.color ?? "currentColor"} />
          </div>
        );
      }
    }
  }

  return (
    <div
      data-element-id={element.id}
      style={baseStyle}
      onMouseEnter={() => setHovered(element.id)}
      onMouseLeave={() => {
        if (hoveredId === element.id) setHovered(null);
      }}
      onMouseDown={(e) => {
        if (editing) return;
        onSelect(element.id, e.shiftKey);
      }}
      onDoubleClick={(e) => {
        if (element.type === "text") {
          e.stopPropagation();
          setEditing(true);
        }
      }}
    >
      {renderInner()}
    </div>
  );
}

export const ElementView = memo(ElementViewImpl);