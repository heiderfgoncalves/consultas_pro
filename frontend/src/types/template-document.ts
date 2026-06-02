export type TemplateSchemaVersion = 2;

export type TemplateNodeType =
  | 'section'
  | 'field'
  | 'container'
  | 'table'
  | 'column'
  | 'divider'
  | 'image'
  | 'icon'
  | 'text'
  | 'speedometer'
  | 'kpi';

export type TemplateSectionKind =
  | 'header'
  | 'personal-data'
  | 'financial-summary'
  | 'score'
  | 'debt-table'
  | 'custom';

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
  type: 'section';
  kind: TemplateSectionKind;
  children: TemplateNode[];
};

export type TemplateFieldNode = BaseTemplateNode & {
  type: 'field';
  tag?: 'label' | 'value' | 'text' | 'icon' | 'image' | 'divider' | 'container' | 'table' | 'speedometer';
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

export type TemplateRendererMode = 'skeleton' | 'preview' | 'editor';

export type TemplateRendererCapabilities = {
  showSkeleton: boolean;
  showPreview: boolean;
  showXml: boolean;
  showVariables: boolean;
  showConsole: boolean;
  canEditAdvanced: boolean;
};
