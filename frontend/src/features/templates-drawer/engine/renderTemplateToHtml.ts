import type {
  BindingFormat,
  Frame,
  ReportTemplate,
  TemplateElement,
} from "../schema/template";
import { interpolate, evaluateExpressionRaw, type BindingLog } from "./interpolate";
import { resolveExpression } from "./resolveExpression";
import { formatValue } from "./formatters";

function styleToCss(el: TemplateElement, frame: Frame): string {
  const s = el.style;
  const autoHeight = el.type === "table" && el.data?.autoHeight;
  const parts: string[] = [];
  parts.push("position:absolute");
  parts.push(`left:${el.x - frame.x}px`);
  parts.push(`top:${el.y - frame.y}px`);
  parts.push(`width:${el.width}px`);
  if (autoHeight) {
    parts.push("height:auto");
    parts.push(`min-height:${el.height}px`);
  } else {
    parts.push(`height:${el.height}px`);
  }
  if (el.rotation) parts.push(`transform:rotate(${el.rotation}deg)`);
  if (s.background) parts.push(`background:${s.background}`);
  if (s.color) parts.push(`color:${s.color}`);
  if (s.opacity !== undefined) parts.push(`opacity:${s.opacity / 100}`);
  if (s.borderWidth)
    parts.push(
      `border:${s.borderWidth}px solid ${s.borderColor ?? "#cbd5e1"}`,
    );
  if (s.borderRadius) parts.push(`border-radius:${s.borderRadius}px`);
  if (s.fontFamily) parts.push(`font-family:${s.fontFamily}`);
  if (s.fontSize) parts.push(`font-size:${s.fontSize}px`);
  if (s.fontWeight) parts.push(`font-weight:${s.fontWeight}`);
  if (s.lineHeight) parts.push(`line-height:${s.lineHeight}`);
  if (s.textAlign) parts.push(`text-align:${s.textAlign}`);
  if (s.padding != null) parts.push(`padding:${s.padding}px`);
  if (el.type === "text") {
    parts.push("white-space:pre-wrap");
    parts.push("word-break:break-word");
    parts.push("overflow-wrap:break-word");
  }
  parts.push(`z-index:${el.zIndex}`);
  parts.push("box-sizing:border-box");
  parts.push(autoHeight ? "overflow:visible" : "overflow:hidden");
  return parts.join(";");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function elementBody(
  el: TemplateElement,
  data: unknown,
  logs: BindingLog[],
  mode: "skeleton" | "preview",
): string {
  if (el.data?.customHtml) {
    if (mode === "skeleton") {
      return el.data.customHtml as string;
    }
    return interpolate(el.data.customHtml as string, data, { fallback: el.binding?.fallback, logs });
  }

  const interp = (raw: string, fallback?: string) => {
    if (mode === "skeleton") {
      return escapeHtml(raw);
    }
    const val = interpolate(raw, data, { fallback, logs });
    if (val.startsWith("html:")) {
      return val.substring(5);
    }
    return escapeHtml(val);
  };

  switch (el.type) {
    case "text": {
      const raw = (el.data?.text as string) ?? "";
      return interp(raw, el.binding?.fallback);
    }
    case "card": {
      const title = (el.data?.title as string) ?? "";
      const body = (el.data?.body as string) ?? "";
      return `<div style="font-weight:600;margin-bottom:6px">${interp(title)}</div><div>${interp(body)}</div>`;
    }
    case "image": {
      const src = (el.data?.src as string) ?? "";
      const fit = (el.data?.fit as string) ?? "cover";
      if (!src)
        return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px">Imagem</div>`;
      return `<img src="${escapeHtml(src)}" style="width:100%;height:100%;object-fit:${fit}"/>`;
    }
    case "divider":
      return "";
    case "container":
      return "";
    case "table": {
      const path = (el.data?.arrayPath as string) ?? "";
      const columns =
        (el.data?.columns as Array<{
          label: string;
          path: string;
          format?: string;
          width?: string;
          emptyFallback?: string;
        }>) ?? [];
      
      const headerBg = (el.data?.headerBg as string) ?? "transparent";
      const headerColor = (el.data?.headerColor as string) ?? "inherit";
      const headerSize = (el.data?.headerSize as number) ?? 12;
      const rowBg = (el.data?.rowBg as string) ?? "transparent";
      const rowColor = (el.data?.rowColor as string) ?? "inherit";
      const rowSize = (el.data?.rowSize as number) ?? 12;
      const emptyStateHtml = (el.data?.emptyStateHtml as string) ?? "";

      let rows: unknown[] = [];
      if (mode === "skeleton") {
        rows = [
          { __skeleton: true, index: 0 },
          { __skeleton: true, index: 1 },
          { __skeleton: true, index: 2 },
        ];
      } else {
        const resolved = resolveExpression(path, data);
        if (Array.isArray(resolved)) {
          rows = resolved;
        } else if (resolved && typeof resolved === "object") {
          if ("linhas" in resolved && Array.isArray((resolved as any).linhas)) {
            rows = (resolved as any).linhas;
          } else {
            rows = [resolved];
          }
        } else {
          rows = [];
        }
      }

      const head = columns
        .map((c) => {
          const w = c.width && c.width !== "auto" ? `width:${c.width};` : "";
          const bg = headerBg !== "transparent" ? `background:${headerBg};` : "";
          const color = headerColor !== "inherit" ? `color:${headerColor};` : "";
          const size = `font-size:${headerSize}px;`;
          return `<th style="text-align:left;padding:6px;border-bottom:1px solid #e2e8f0;${w}${bg}${color}${size}">${escapeHtml(c.label)}</th>`;
        })
        .join("");

      const rowBgStyle = rowBg !== "transparent" ? `background:${rowBg};` : "";

      let body = "";
      if (rows.length === 0) {
        const content = emptyStateHtml
          ? interpolate(emptyStateHtml, data, { fallback: el.binding?.fallback, logs })
          : "Nenhuma informação para exibir";
        body = `<tr><td colspan="${columns.length}" style="text-align:center;padding:12px;color:#94a3b8;font-size:${rowSize}px">${content}</td></tr>`;
      } else {
        body = rows
          .map((row) => {
            const tds = columns
              .map((c) => {
                if (mode === "skeleton") {
                  const color = rowColor !== "inherit" ? rowColor : "#94a3b8";
                  return `<td style="padding:6px;border-bottom:1px solid #f1f5f9;color:${color};font-family:monospace;font-size:${rowSize}px">{{${path}[*].${c.path}}}</td>`;
                }
                const v = resolveExpression(c.path, row);
                const formatted = formatValue(v, c.format as BindingFormat | undefined);
                const displayValue = (v === undefined || v === null || v === "")
                  ? (c.emptyFallback ?? "")
                  : formatted;
                const color = rowColor !== "inherit" ? `color:${rowColor};` : "";
                return `<td style="padding:6px;border-bottom:1px solid #f1f5f9;${color}font-size:${rowSize}px">${escapeHtml(displayValue)}</td>`;
              })
              .join("");
            return `<tr style="${rowBgStyle}">${tds}</tr>`;
          })
          .join("");
      }
      return `<table style="width:100%;border-collapse:collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    case "list": {
      const items = ((el.data?.items as string[]) ?? []).map((it) => interp(it));
      const style = (el.data?.style as string) ?? "bullet";
      const tag = style === "number" ? "ol" : "ul";
      const listStyle =
        style === "number"
          ? "decimal"
          : style === "dash"
            ? "'-  '"
            : style === "check"
              ? "'☑ '"
              : "disc";
      return `<${tag} style="margin:0;padding-left:20px;list-style:${listStyle}">${items
        .map((t) => `<li>${t}</li>`)
        .join("")}</${tag}>`;
    }
    case "icon": {
      const name = escapeHtml((el.data?.name as string) ?? "Star");
      // Convert PascalCase to kebab-case for Lucide CDN/library (e.g. ArrowLeft -> arrow-left)
      const kebabName = name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();
      return `<i data-lucide="${kebabName}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center" data-icon="${name}"></i>`;
    }
  }
  return "";
}

export function renderTemplateToHtml(
  template: ReportTemplate,
  frameId: string,
  data: unknown,
  mode: "skeleton" | "preview" = "preview",
): { html: string; logs: BindingLog[] } {
  const frame = template.frames.find((f) => f.id === frameId);
  if (!frame) return { html: "", logs: [] };
  const logs: BindingLog[] = [];

  // Se o frame tiver código HTML customizado, interpola e retorna diretamente
  if (frame.customHtml && frame.customHtml.trim()) {
    if (mode === "skeleton") {
      return { html: frame.customHtml, logs };
    }
    const interpolated = interpolate(frame.customHtml, data, { fallback: "", logs });
    return { html: interpolated, logs };
  }

  const elements = template.elements.filter((el) => {
    if (el.visible === false) return false;
    if (el.frameId === frame.id) return true;
    // include elements geometrically inside the frame
    return (
      el.x >= frame.x &&
      el.y >= frame.y &&
      el.x + el.width <= frame.x + frame.width + 1 &&
      el.y + el.height <= frame.y + frame.height + 1
    );
  });

  const body = elements
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((el) => {
      let localData = data;
      if (el.arguments && Object.keys(el.arguments).length > 0) {
        const params: Record<string, unknown> = {};
        for (const [key, expr] of Object.entries(el.arguments)) {
          params[key] = evaluateExpressionRaw(expr, data);
        }
        if (data && typeof data === "object") {
          localData = {
            ...data,
            ...params,
            $params: params,
          };
        } else {
          localData = {
            $params: params,
            ...params,
          };
        }
      }
      return `<div style="${styleToCss(el, frame)}">${elementBody(el, localData, logs, mode)}</div>`;
    })
    .join("\n");

  const html = `<div style="position:relative;width:${frame.width}px;height:${frame.height}px;background:${frame.background ?? "#fff"};font-family:'Geist', 'Inter', sans-serif;color:#0f172a">\n${body}\n</div>`;
  return { html, logs };
}