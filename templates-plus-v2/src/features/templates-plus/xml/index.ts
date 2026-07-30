import type { SectionNode, FieldNode } from "../types";
import { nanoid } from "@/lib/id";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unescape = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");

const attr = (k: string, v: unknown) =>
  v === undefined || v === null || v === "" ? "" : ` ${k}="${escape(String(v))}"`;

export function serializeSection(section: SectionNode): string {
  const bands = section.meta?.bands ? attr("bands", section.meta.bands) : "";
  const open = `<section name="${escape(section.name)}" kind="${section.kind}"${attr("icon", section.icon)}${attr("layout", section.layout)}${attr("columns", section.columns)}${attr("gap", section.gap)}${attr("padding", section.padding)}${bands}>`;
  const body = section.fields.map((f) => fieldXml(f, 1)).join("\n");
  return `${open}\n${body}\n</section>`;
}

export function serializeTemplate(sections: SectionNode[]): string {
  return sections.map(serializeSection).join("\n\n");
}

function indent(n: number) { return "  ".repeat(n); }

function fieldXml(field: FieldNode, depth = 1): string {
  const attrs =
    attr("label", field.label) +
    attr("tag", field.tag) +
    attr("icon", field.icon) +
    attr("font-size", field.fontSize) +
    attr("font-weight", field.fontWeight) +
    attr("spacing", field.spacing) +
    attr("padding", field.padding) +
    attr("color", field.color) +
    attr("background", field.background) +
    attr("width", field.width) +
    attr("layout", field.layout) +
    attr("columns", field.columns) +
    attr("gap", field.gap) +
    attr("align", field.align) +
    attr("border-width", field.borderWidth) +
    attr("border-style", field.borderStyle) +
    attr("border-color", field.borderColor) +
    attr("border-radius", field.borderRadius);
  if (field.children && field.children.length) {
    const inner = field.children.map((c) => fieldXml(c, depth + 1)).join("\n");
    return `${indent(depth)}<field${attrs}>\n${inner}\n${indent(depth)}</field>`;
  }
  const inner = field.value !== undefined ? escape(field.value) : "";
  return `${indent(depth)}<field${attrs}>${inner}</field>`;
}

/* ---------- Parser ---------- */

const attrRe = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(attrRe)) out[m[1]] = unescape(m[2]);
  return out;
}

function num(v?: string) { return v ? Number(v) : undefined; }

function attrsToField(fa: Record<string, string>, value: string, children?: FieldNode[]): FieldNode {
  return {
    id: nanoid(),
    tag: (fa.tag as FieldNode["tag"]) ?? "text",
    label: fa.label,
    icon: fa.icon,
    fontSize: num(fa["font-size"]),
    fontWeight: fa["font-weight"],
    spacing: num(fa.spacing),
    padding: num(fa.padding),
    color: fa.color,
    background: fa.background,
    width: fa.width,
    layout: fa.layout as FieldNode["layout"],
    columns: num(fa.columns),
    gap: num(fa.gap),
    align: fa.align as FieldNode["align"],
    borderWidth: num(fa["border-width"]),
    borderStyle: fa["border-style"] as FieldNode["borderStyle"],
    borderColor: fa["border-color"],
    borderRadius: num(fa["border-radius"]),
    value: value || undefined,
    children: children && children.length ? children : undefined,
  };
}

/** Recursive scan of <field> tags within a body string, respecting nesting. */
function parseFields(body: string): FieldNode[] {
  const fields: FieldNode[] = [];
  const re = /<field\b([^>]*?)(\/>|>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const attrs = parseAttrs(m[1]);
    if (m[2] === "/>") {
      fields.push(attrsToField(attrs, ""));
      continue;
    }
    // find matching </field> with nesting awareness
    const start = re.lastIndex;
    let depth = 1;
    const inner = /<field\b[^>]*?(\/>|>)|<\/field>/g;
    inner.lastIndex = start;
    let end = -1;
    let im: RegExpExecArray | null;
    while ((im = inner.exec(body))) {
      if (im[0] === "</field>") {
        depth--;
        if (depth === 0) { end = im.index; inner.lastIndex = im.index + "</field>".length; break; }
      } else if (im[1] !== "/>") {
        depth++;
      }
    }
    if (end < 0) break;
    const innerBody = body.slice(start, end);
    const hasChildren = /<field\b/.test(innerBody);
    if (hasChildren) {
      fields.push(attrsToField(attrs, "", parseFields(innerBody)));
    } else {
      fields.push(attrsToField(attrs, unescape(innerBody.trim())));
    }
    re.lastIndex = inner.lastIndex;
  }
  return fields;
}

export function parseTemplate(xml: string): SectionNode[] {
  const sections: SectionNode[] = [];
  const re = /<section\s+([^>]*)>([\s\S]*?)<\/section>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const a = parseAttrs(m[1]);
    sections.push({
      id: nanoid(),
      name: a.name ?? "Seção",
      kind: (a.kind as SectionNode["kind"]) ?? "free",
      icon: a.icon,
      layout: a.layout as SectionNode["layout"],
      columns: num(a.columns),
      gap: num(a.gap),
      padding: num(a.padding),
      fields: parseFields(m[2]),
      meta: a.bands ? { bands: a.bands } : undefined,
    });
  }
  return sections;
}

export function formatXml(xml: string): string {
  const sections = parseTemplate(xml);
  if (sections.length === 0) return xml.trim();
  return serializeTemplate(sections);
}
