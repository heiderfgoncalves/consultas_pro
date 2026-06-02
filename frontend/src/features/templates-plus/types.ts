export type Experience = "admin" | "user";

export type FieldTag =
  | "label"
  | "value"
  | "icon"
  | "image"
  | "divider"
  | "container"
  | "table"
  | "text"
  | "speedometer";

export type SectionKind =
  | "header"
  | "personal"
  | "kpi-row"
  | "score"
  | "debt-table"
  | "serasa-table"
  | "spc-table"
  | "bacen"
  | "protestos"
  | "footer"
  | "free"
  | "container";

export type LayoutMode = "row" | "column" | "grid";

export interface FieldNode {
  id: string;
  tag: FieldTag;
  label?: string;
  /** raw value or {$expression} */
  value?: string;
  icon?: string;          // Lucide icon name
  fontSize?: number;
  fontWeight?: string;    // "400" | "600" | "bold" | …
  spacing?: number;       // vertical margin (px)
  padding?: number;       // padding (px)
  color?: string;
  background?: string;
  /** width hint: "auto", "100%", "50%", "200px", "1/2", "1/3"… */
  width?: string;
  /** when this field is a container/row: layout mode for children */
  layout?: LayoutMode;
  /** grid columns when layout="grid" */
  columns?: number;
  /** gap between children (px) */
  gap?: number;
  /** horizontal alignment hint: left | center | right */
  align?: "left" | "center" | "right";
  /** border styling */
  borderWidth?: number;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderColor?: string;
  borderRadius?: number;
  /** flex weight inside a row/column container (1, 2, 3…) */
  flex?: number;
  /** minimum width in px (containers/leafs) */
  minWidth?: number;
  /** minimum height in px (containers) */
  minHeight?: number;
  /** allow wrap in row layout (default true) */
  wrap?: boolean;
  /** stack children vertically when section narrower than N px */
  stackBelow?: number;
  children?: FieldNode[];
  meta?: Record<string, string>;
}

export interface SectionNode {
  id: string;
  name: string;
  kind: SectionKind;
  icon?: string;
  /** section-level layout overrides */
  layout?: LayoutMode;
  columns?: number;
  gap?: number;
  padding?: number;
  fields: FieldNode[];
  /** Section-level metadata. For "score", `bands` can be a JSON array of
   *  `{ label, range, color }` to override the default speedometer legend. */
  meta?: Record<string, string>;
}

export interface TemplateDoc {
  id: string;
  name: string;
  logo?: string;
  sections: SectionNode[];
  selectedQueryBlocks: string[];
}

export interface QueryType {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: "restricoes" | "score" | "analise" | "bacen" | "cadastral";
  sample: Record<string, unknown>;
}

export interface LibraryBlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "fixo" | "custom";
  make: () => SectionNode;
  system?: boolean;
}
