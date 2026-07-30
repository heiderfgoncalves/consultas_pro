// Canonical TemplateDocument contract (ported from original project).
// Pure types, no UI / store deps.

export type TemplateSchemaVersion = 2;

export type TemplateNodeType =
  | "section"
  | "field"
  | "container"
  | "table"
  | "column"
  | "divider"
  | "image"
  | "icon"
  | "text"
  | "speedometer"
  | "kpi";

export type TemplateSectionKind =
  | "header"
  | "personal-data"
  | "financial-summary"
  | "score"
  | "debt-table"
  | "custom";

export type TemplateFieldTag =
  | "label"
  | "value"
  | "text"
  | "icon"
  | "image"
  | "divider"
  | "container"
  | "table"
  | "speedometer";

export type TemplateStyle = {
  fontSize?: number;
  fontWeight?: string;
  spacing?: number;
  margin?: number;
  padding?: number;
  color?: string;
  backgroundColor?: string;
  width?: string;
  columns?: number;
  align?: "left" | "center" | "right";
  layout?: "row" | "column" | "grid";
  gap?: number;
};

export type TemplateBinding = {
  expression?: string;
  source?: string;
  fallback?: string;
};

export type BaseTemplateNode = {
  id: string;
  type: TemplateNodeType;
  label?: string;
  style?: TemplateStyle;
  binding?: TemplateBinding;
  icon?: string | null;
  children?: TemplateNode[];
};

export type TemplateSectionNode = BaseTemplateNode & {
  type: "section";
  kind: TemplateSectionKind;
  children: TemplateNode[];
};

export type TemplateFieldNode = BaseTemplateNode & {
  type: "field";
  tag?: TemplateFieldTag;
  expression?: string;
};

export type TemplateNode = TemplateSectionNode | TemplateFieldNode | BaseTemplateNode;

export type TemplateMetadata = {
  logo?: string | null;
  selectedBlockIds?: string[];
  xml?: string;
  updatedAt?: string;
};

export type TemplateDocument = {
  schemaVersion: TemplateSchemaVersion;
  id?: string;
  name: string;
  nodes: TemplateNode[];
  metadata?: TemplateMetadata;
};

export type TemplateRendererMode = "skeleton" | "preview" | "editor";

export type TemplateRendererCapabilities = {
  showSkeleton: boolean;
  showPreview: boolean;
  showXml: boolean;
  showVariables: boolean;
  showConsole: boolean;
  canEditAdvanced: boolean;
};

export const DEFAULT_CAPABILITIES_ADMIN: TemplateRendererCapabilities = {
  showSkeleton: true,
  showPreview: true,
  showXml: true,
  showVariables: true,
  showConsole: true,
  canEditAdvanced: true,
};

export const DEFAULT_CAPABILITIES_USER: TemplateRendererCapabilities = {
  showSkeleton: true,
  showPreview: true,
  showXml: false,
  showVariables: true,
  showConsole: false,
  canEditAdvanced: false,
};

export function isSectionNode(n: TemplateNode): n is TemplateSectionNode {
  return n.type === "section";
}
export function isFieldNode(n: TemplateNode): n is TemplateFieldNode {
  return n.type === "field";
}
