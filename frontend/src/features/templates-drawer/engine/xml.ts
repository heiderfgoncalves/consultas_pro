import type {
  BindingConfig,
  ElementStyle,
  ElementType,
  Frame,
  FramePreset,
  ReportTemplate,
  TemplateElement,
} from "../schema/template";
import { newId } from "../utils/ids";

/** Minimal pretty XML serializer for the ReportTemplate DSL. */

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attrs(record: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${k}="${esc(v)}"`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function styleXml(s: ElementStyle): string {
  const inner = Object.entries(s)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(" ");
  return inner ? `<style ${inner} />` : "";
}

function bindingXml(b?: BindingConfig): string {
  if (!b) return "";
  const a = attrs({
    mode: b.mode,
    expression: b.expression,
    fallback: b.fallback,
    format: b.format,
  });
  return a ? `<binding${a} />` : "";
}

function dataXml(el: TemplateElement): string {
  if (!el.data || Object.keys(el.data).length === 0) return "";
  return `<data><![CDATA[${JSON.stringify(el.data)}]]></data>`;
}

function indent(text: string, n: number): string {
  const pad = "  ".repeat(n);
  return text
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

function elementXml(el: TemplateElement): string {
  const open = `<element${attrs({
    id: el.id,
    type: el.type,
    name: el.name,
    frameId: el.frameId,
    parentId: el.parentId,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    zIndex: el.zIndex,
    locked: el.locked,
    visible: el.visible,
  })}>`;
  const inner = [styleXml(el.style), bindingXml(el.binding), dataXml(el)]
    .filter(Boolean)
    .map((s) => indent(s, 1))
    .join("\n");
  return inner ? `${open}\n${inner}\n</element>` : `${open}</element>`;
}

function frameXml(f: Frame): string {
  return `<frame${attrs({
    id: f.id,
    name: f.name,
    preset: f.preset,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
  })} />`;
}

export function serializeTemplateXml(t: ReportTemplate): string {
  const header = `<template${attrs({
    id: t.id,
    name: t.name,
    version: t.version,
  })}>`;
  const canvas = `<canvas${attrs({
    background: t.canvas.background,
    grid: t.canvas.grid,
  })} />`;
  const frames = t.frames.map((f) => indent(frameXml(f), 1)).join("\n");
  const elements = t.elements
    .map((el) => indent(elementXml(el), 1))
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    header,
    indent(canvas, 1),
    frames ? `  <frames>\n${indent(frames, 1)}\n  </frames>` : "  <frames />",
    elements
      ? `  <elements>\n${indent(elements, 1)}\n  </elements>`
      : "  <elements />",
    `</template>`,
  ].join("\n");
}

/* ------------------------------ Parser ------------------------------ */

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1]] = m[2];
  return out;
}

function num(v: string | undefined, fallback: number): number {
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function maybeNum(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function maybeBool(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export function parseTemplateXml(xml: string): ReportTemplate {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("XML inválido: " + err.textContent);
  const tpl = doc.querySelector("template");
  if (!tpl) throw new Error("XML sem <template> raiz");

  const canvasEl = tpl.querySelector(":scope > canvas");
  const canvas = {
    background:
      canvasEl?.getAttribute("background") ?? "#e2e8f0",
    grid: num(canvasEl?.getAttribute("grid") ?? undefined, 8),
  };

  const frames: Frame[] = Array.from(
    tpl.querySelectorAll(":scope > frames > frame"),
  ).map((f) => ({
    id: f.getAttribute("id") ?? newId("frame"),
    name: f.getAttribute("name") ?? "Frame",
    preset: (f.getAttribute("preset") as FramePreset) ?? "custom",
    x: num(f.getAttribute("x") ?? undefined, 0),
    y: num(f.getAttribute("y") ?? undefined, 0),
    width: num(f.getAttribute("width") ?? undefined, 400),
    height: num(f.getAttribute("height") ?? undefined, 300),
  }));

  const elements: TemplateElement[] = Array.from(
    tpl.querySelectorAll(":scope > elements > element"),
  ).map((e) => {
    const styleEl = e.querySelector(":scope > style");
    const style: ElementStyle = {};
    if (styleEl) {
      for (const a of Array.from(styleEl.attributes)) {
        const k = a.name as keyof ElementStyle;
        const v = a.value;
        const nKeys = [
          "borderWidth",
          "borderRadius",
          "fontSize",
          "fontWeight",
          "lineHeight",
          "padding",
          "opacity",
        ];
        if (nKeys.includes(k))
          (style as Record<string, unknown>)[k] = Number(v);
        else (style as Record<string, unknown>)[k] = v;
      }
    }
    const bindEl = e.querySelector(":scope > binding");
    const binding: BindingConfig | undefined = bindEl
      ? {
          mode:
            (bindEl.getAttribute("mode") as "static" | "expression") ??
            "static",
          expression: bindEl.getAttribute("expression") ?? undefined,
          fallback: bindEl.getAttribute("fallback") ?? undefined,
          format:
            (bindEl.getAttribute("format") as BindingConfig["format"]) ??
            undefined,
        }
      : undefined;
    const dataEl = e.querySelector(":scope > data");
    let data: Record<string, unknown> | undefined;
    if (dataEl && dataEl.textContent) {
      try {
        data = JSON.parse(dataEl.textContent);
      } catch {
        data = undefined;
      }
    }
    return {
      id: e.getAttribute("id") ?? newId("el"),
      type: (e.getAttribute("type") as ElementType) ?? "text",
      name: e.getAttribute("name") ?? undefined,
      frameId: e.getAttribute("frameId") ?? undefined,
      parentId: e.getAttribute("parentId") ?? undefined,
      x: num(e.getAttribute("x") ?? undefined, 0),
      y: num(e.getAttribute("y") ?? undefined, 0),
      width: num(e.getAttribute("width") ?? undefined, 100),
      height: num(e.getAttribute("height") ?? undefined, 40),
      rotation: maybeNum(e.getAttribute("rotation") ?? undefined),
      zIndex: num(e.getAttribute("zIndex") ?? undefined, 1),
      locked: maybeBool(e.getAttribute("locked") ?? undefined),
      visible: maybeBool(e.getAttribute("visible") ?? undefined),
      style,
      binding,
      data,
    } satisfies TemplateElement;
  });

  return {
    id: tpl.getAttribute("id") ?? newId("tpl"),
    name: tpl.getAttribute("name") ?? "Template",
    version: num(tpl.getAttribute("version") ?? undefined, 1),
    canvas,
    frames,
    elements,
  };
}