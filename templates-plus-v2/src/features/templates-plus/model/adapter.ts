// Adapter between the canonical TemplateDocument contract (backend) and the
// legacy TemplateDoc/SectionNode shape used by the existing pretty renderer.
// Lets us round-trip through the local backend without rewriting the UI yet.

import { nanoid } from "@/lib/id";
const newId = (p: string) => `${p}_${nanoid(8)}`;
import type { SectionNode, FieldNode, SectionKind, TemplateDoc } from "../types";
import type {
  TemplateDocument,
  TemplateNode,
  TemplateSectionKind,
  TemplateSectionNode,
  TemplateFieldNode,
} from "./template-document";

const KIND_TO_LEGACY: Record<TemplateSectionKind, SectionKind> = {
  "header": "header",
  "personal-data": "personal",
  "financial-summary": "kpi-row",
  "score": "score",
  "debt-table": "debt-table",
  "custom": "free",
};

const LEGACY_TO_KIND: Record<SectionKind, TemplateSectionKind> = {
  "header": "header",
  "personal": "personal-data",
  "kpi-row": "financial-summary",
  "score": "score",
  "debt-table": "debt-table",
  "serasa-table": "debt-table",
  "spc-table": "debt-table",
  "bacen": "custom",
  "protestos": "custom",
  "footer": "custom",
  "free": "custom",
  "container": "custom",
};

function fieldFromCanonical(n: TemplateFieldNode): FieldNode {
  const s = n.style ?? {};
  return {
    id: n.id || newId("f"),
    tag: (n.tag ?? "value") as FieldNode["tag"],
    label: n.label,
    value: n.binding?.expression ?? n.expression ?? "",
    icon: n.icon ?? undefined,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    spacing: s.spacing,
    padding: s.padding,
    color: s.color,
    background: s.backgroundColor,
    width: s.width,
    layout: s.layout,
    columns: s.columns,
    gap: s.gap,
    align: s.align,
  };
}

function fieldToCanonical(f: FieldNode): TemplateFieldNode {
  return {
    id: f.id,
    type: "field",
    tag: f.tag,
    label: f.label,
    icon: f.icon,
    binding: f.value ? { expression: f.value } : undefined,
    style: {
      fontSize: f.fontSize,
      fontWeight: f.fontWeight,
      spacing: f.spacing,
      padding: f.padding,
      color: f.color,
      backgroundColor: f.background,
      width: f.width,
      columns: f.columns,
      gap: f.gap,
      align: f.align,
      layout: f.layout,
    },
  };
}

export function documentToLegacy(doc: TemplateDocument, fallbackId = "tpl"): TemplateDoc {
  const sections: SectionNode[] = [];
  for (const node of doc.nodes ?? []) {
    if (node.type !== "section") continue;
    const sn = node as TemplateSectionNode;
    sections.push({
      id: sn.id || newId("s"),
      name: sn.label ?? "Seção",
      kind: KIND_TO_LEGACY[sn.kind] ?? "free",
      icon: sn.icon ?? undefined,
      layout: sn.style?.layout,
      columns: sn.style?.columns,
      gap: sn.style?.gap,
      padding: sn.style?.padding,
      fields: (sn.children ?? [])
        .filter((c): c is TemplateFieldNode => c.type === "field")
        .map(fieldFromCanonical),
    });
  }
  return {
    id: doc.id ?? fallbackId,
    name: doc.name,
    logo: doc.metadata?.logo ?? undefined,
    sections,
    selectedQueryBlocks: doc.metadata?.selectedBlockIds ?? [],
  };
}

export function legacyToDocument(tpl: TemplateDoc): TemplateDocument {
  const nodes: TemplateNode[] = tpl.sections.map((s) => ({
    id: s.id,
    type: "section",
    kind: LEGACY_TO_KIND[s.kind] ?? "custom",
    label: s.name,
    icon: s.icon,
    style: {
      layout: s.layout,
      columns: s.columns,
      gap: s.gap,
      padding: s.padding,
    },
    children: s.fields.map(fieldToCanonical),
  } as TemplateSectionNode));
  return {
    schemaVersion: 2,
    id: tpl.id,
    name: tpl.name,
    nodes,
    metadata: {
      logo: tpl.logo ?? null,
      selectedBlockIds: tpl.selectedQueryBlocks,
      updatedAt: new Date().toISOString(),
    },
  };
}
