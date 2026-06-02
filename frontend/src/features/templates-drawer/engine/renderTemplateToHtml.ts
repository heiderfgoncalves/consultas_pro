import type {
  BindingFormat,
  Frame,
  ReportTemplate,
  TemplateElement,
} from "../schema/template";
import { interpolate, type BindingLog } from "./interpolate";
import { resolveExpression } from "./resolveExpression";
import { formatValue } from "./formatters";

function styleToCss(el: TemplateElement, frame: Frame): string {
  const s = el.style;
  const parts: string[] = [];
  parts.push("position:absolute");
  parts.push(`left:${el.x - frame.x}px`);
  parts.push(`top:${el.y - frame.y}px`);
  parts.push(`width:${el.width}px`);
  parts.push(`height:${el.height}px`);
  if (el.rotation) parts.push(`transform:rotate(${el.rotation}deg)`);
  if (s.background) parts.push(`background:${s.background}`);
  if (s.color) parts.push(`color:${s.color}`);
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
  parts.push(`z-index:${el.zIndex}`);
  parts.push("box-sizing:border-box");
  parts.push("overflow:hidden");
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
        }>) ?? [];
      
      let rows: unknown[] = [];
      if (mode === "skeleton") {
        rows = [
          { __skeleton: true, index: 0 },
          { __skeleton: true, index: 1 },
          { __skeleton: true, index: 2 },
        ];
      } else {
        rows = (resolveExpression(path, data) as unknown[]) ?? [];
      }

      const head = columns
        .map(
          (c) =>
            `<th style="text-align:left;padding:6px;border-bottom:1px solid #e2e8f0">${escapeHtml(c.label)}</th>`,
        )
        .join("");
      const body = rows
        .map((row) => {
          const tds = columns
            .map((c) => {
              if (mode === "skeleton") {
                return `<td style="padding:6px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-family:monospace;font-size:10px">{{${path}[*].${c.path}}}</td>`;
              }
              const v = resolveExpression(c.path, row);
              const formatted = formatValue(v, c.format as BindingFormat | undefined);
              return `<td style="padding:6px;border-bottom:1px solid #f1f5f9">${escapeHtml(formatted)}</td>`;
            })
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
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
      // Use a simple data-attribute placeholder; actual SVG render happens in canvas.
      // For exported HTML, embed an inline label so layout doesn't break.
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center" data-icon="${name}"></div>`;
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
    .map(
      (el) =>
        `<div style="${styleToCss(el, frame)}">${elementBody(el, data, logs, mode)}</div>`,
    )
    .join("\n");

  const html = `<div style="position:relative;width:${frame.width}px;height:${frame.height}px;background:#fff;font-family:Inter,sans-serif;color:#0f172a">\n${body}\n</div>`;
  return { html, logs };
}