export type TemplateLayoutSchemaVersion = 1;

export type TemplateLayoutNodeKind = 'section' | 'row' | 'column' | 'widget';

export type TemplateWidgetKind =
  | 'title'
  | 'text'
  | 'variable'
  | 'divider'
  | 'table'
  | 'card-kpi'
  | 'container'
  | 'free-text'
  | 'custom';

export type TemplateLayoutStyle = {
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700;
  textAlign?: 'left' | 'center' | 'right';
};

export type TemplateLayoutBinding = {
  id: string;
  label: string;
  expression: string;
};

type BaseNode = {
  id: string;
  kind: TemplateLayoutNodeKind;
  parentId: string | null;
  children: string[];
  style?: TemplateLayoutStyle;
};

export type TemplateSectionNode = BaseNode & {
  kind: 'section';
  name: string;
};

export type TemplateRowNode = BaseNode & {
  kind: 'row';
};

export type TemplateColumnNode = BaseNode & {
  kind: 'column';
  width: number;
};

export type TemplateWidgetNode = BaseNode & {
  kind: 'widget';
  widgetType: TemplateWidgetKind;
  content?: string;
  bindings?: TemplateLayoutBinding[];
};

export type TemplateLayoutNode =
  | TemplateSectionNode
  | TemplateRowNode
  | TemplateColumnNode
  | TemplateWidgetNode;

export type TemplateLayoutThemeTokens = {
  surface: string;
  surfaceAlt: string;
  text: string;
  border: string;
  accent: string;
};

export type TemplateLayoutMeta = {
  name: string;
  description?: string;
  updatedAt: string;
};

export type TemplateLayoutDocument = {
  layoutSchemaVersion: TemplateLayoutSchemaVersion;
  rootIds: string[];
  nodes: Record<string, TemplateLayoutNode>;
  themeTokens: TemplateLayoutThemeTokens;
  meta: TemplateLayoutMeta;
};

export type TemplateBuilderCapabilities = {
  canAddSections: boolean;
  canAddRows: boolean;
  canAddColumns: boolean;
  canAddWidgets: boolean;
  canReorder: boolean;
  canDelete: boolean;
  canEditAdvancedStyles: boolean;
  canEditStructure: boolean;
  canUseAdvancedVariables: boolean;
};

export type TemplateBuilderMode = 'admin' | 'user';
