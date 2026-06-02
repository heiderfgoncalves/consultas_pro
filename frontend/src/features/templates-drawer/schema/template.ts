export type FramePreset =
  | "a4-p" | "a4-l" | "a3-p" | "a3-l" | "slide-16-9" | "custom";

export type Frame = {
  id: string;
  name: string;
  preset: FramePreset;
  x: number;
  y: number;
  width: number;
  height: number;
  background?: string;
  customHtml?: string;
};

export type ElementType =
  | "text" | "image" | "card" | "divider" | "table" | "container" | "list" | "icon";

export type ElementStyle = {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  padding?: number;
  opacity?: number;
};

export type BindingFormat =
  | "text" | "currency" | "date" | "cpf" | "cnpj" | "percent";

export type BindingConfig = {
  mode: "static" | "expression";
  expression?: string;
  fallback?: string;
  format?: BindingFormat;
};

export type TemplateElement = {
  id: string;
  type: ElementType;
  name?: string;
  /** parent container element id, undefined = root */
  parentId?: string;
  /** frame the element is conceptually attached to (for export) */
  frameId?: string;
  /** world coordinates (canvas-space) */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  style: ElementStyle;
  binding?: BindingConfig;
  /** Group identifier for grouping elements together */
  groupId?: string;
  /** Free-form data for type-specific config (e.g. text content, image src, table columns) */
  data?: Record<string, unknown>;
};

export type CalculatedMeasure = {
  id: string;
  name: string;
  expression: string;
  description?: string;
};

export type ReportTemplate = {
  id: string;
  name: string;
  version: number;
  canvas: { background: string; grid: number };
  frames: Frame[];
  elements: TemplateElement[];
  measures?: CalculatedMeasure[];
  metadata?: Record<string, unknown>;
};

export type ReusableComponent = {
  id: string;
  name: string;
  category: "card" | "header" | "footer" | "table" | "block" | "custom";
  thumbnail?: string;
  elementTree: TemplateElement[];
  createdAt: string;
  updatedAt: string;
};
