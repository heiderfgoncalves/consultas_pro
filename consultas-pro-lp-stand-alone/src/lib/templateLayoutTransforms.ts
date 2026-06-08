import type {
  TemplateBuilderCapabilities,
  TemplateBuilderMode,
  TemplateLayoutDocument,
  TemplateLayoutNode,
  TemplateLayoutNodeKind,
  TemplateWidgetKind,
} from '@/types/template-layout';

const DRAFT_PREFIX = 'consultas-pro:template-layout-draft';
const LAYOUT_SCHEMA_VERSION = 1 as const;

function nodeId(kind: TemplateLayoutNodeKind): string {
  return `${kind}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultTemplateLayoutDocument(name = 'Novo template'): TemplateLayoutDocument {
  const sectionId = nodeId('section');
  const rowId = nodeId('row');
  const columnId = nodeId('column');
  const titleWidgetId = nodeId('widget');

  const nodes: Record<string, TemplateLayoutNode> = {
    [sectionId]: {
      id: sectionId,
      kind: 'section',
      parentId: null,
      children: [rowId],
      name: 'Seção principal',
    },
    [rowId]: {
      id: rowId,
      kind: 'row',
      parentId: sectionId,
      children: [columnId],
    },
    [columnId]: {
      id: columnId,
      kind: 'column',
      parentId: rowId,
      children: [titleWidgetId],
      width: 12,
    },
    [titleWidgetId]: {
      id: titleWidgetId,
      kind: 'widget',
      parentId: columnId,
      children: [],
      widgetType: 'title',
      content: 'Relatorio',
    },
  };

  return {
    layoutSchemaVersion: LAYOUT_SCHEMA_VERSION,
    rootIds: [sectionId],
    nodes,
    themeTokens: {
      surface: 'hsl(var(--card))',
      surfaceAlt: 'hsl(var(--muted))',
      text: 'hsl(var(--foreground))',
      border: 'hsl(var(--border))',
      accent: 'hsl(var(--primary))',
    },
    meta: {
      name,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function createCapabilitiesByMode(mode: TemplateBuilderMode): TemplateBuilderCapabilities {
  if (mode === 'admin') {
    return {
      canAddSections: true,
      canAddRows: true,
      canAddColumns: true,
      canAddWidgets: true,
      canReorder: true,
      canDelete: true,
      canEditAdvancedStyles: true,
      canEditStructure: true,
      canUseAdvancedVariables: true,
    };
  }

  return {
    canAddSections: false,
    canAddRows: false,
    canAddColumns: false,
    canAddWidgets: true,
    canReorder: false,
    canDelete: false,
    canEditAdvancedStyles: false,
    canEditStructure: false,
    canUseAdvancedVariables: false,
  };
}

export function appendWidgetNode(
  document: TemplateLayoutDocument,
  columnId: string,
  widgetType: TemplateWidgetKind,
  content: string,
): TemplateLayoutDocument {
  const target = document.nodes[columnId];
  if (!target || target.kind !== 'column') return document;

  const widgetId = nodeId('widget');
  const nextNodes: Record<string, TemplateLayoutNode> = {
    ...document.nodes,
    [columnId]: {
      ...target,
      children: [...target.children, widgetId],
    },
    [widgetId]: {
      id: widgetId,
      kind: 'widget',
      parentId: columnId,
      children: [],
      widgetType,
      content,
    },
  };

  return {
    ...document,
    nodes: nextNodes,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

export function appendSectionNode(document: TemplateLayoutDocument): TemplateLayoutDocument {
  const sectionId = nodeId('section');
  const rowId = nodeId('row');
  const columnId = nodeId('column');

  const nextNodes: Record<string, TemplateLayoutNode> = {
    ...document.nodes,
    [sectionId]: {
      id: sectionId,
      kind: 'section',
      parentId: null,
      children: [rowId],
      name: `Seção ${document.rootIds.length + 1}`,
    },
    [rowId]: {
      id: rowId,
      kind: 'row',
      parentId: sectionId,
      children: [columnId],
    },
    [columnId]: {
      id: columnId,
      kind: 'column',
      parentId: rowId,
      children: [],
      width: 12,
    },
  };

  return {
    ...document,
    rootIds: [...document.rootIds, sectionId],
    nodes: nextNodes,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

export function appendRowNode(
  document: TemplateLayoutDocument,
  sectionId: string,
): TemplateLayoutDocument {
  const section = document.nodes[sectionId];
  if (!section || section.kind !== 'section') return document;

  const rowId = nodeId('row');
  const columnId = nodeId('column');

  const nextNodes: Record<string, TemplateLayoutNode> = {
    ...document.nodes,
    [sectionId]: {
      ...section,
      children: [...section.children, rowId],
    },
    [rowId]: {
      id: rowId,
      kind: 'row',
      parentId: sectionId,
      children: [columnId],
    },
    [columnId]: {
      id: columnId,
      kind: 'column',
      parentId: rowId,
      children: [],
      width: 12,
    },
  };

  return {
    ...document,
    nodes: nextNodes,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

export function appendColumnNode(
  document: TemplateLayoutDocument,
  rowId: string,
): TemplateLayoutDocument {
  const row = document.nodes[rowId];
  if (!row || row.kind !== 'row') return document;

  const columnId = nodeId('column');
  const columnsAfterInsert = row.children.length + 1;
  const normalizedWidth = Math.max(1, Math.floor(12 / columnsAfterInsert));

  const nextNodes: Record<string, TemplateLayoutNode> = {
    ...document.nodes,
    [rowId]: {
      ...row,
      children: [...row.children, columnId],
    },
    [columnId]: {
      id: columnId,
      kind: 'column',
      parentId: rowId,
      children: [],
      width: normalizedWidth,
    },
  };

  for (const childId of row.children) {
    const childNode = nextNodes[childId];
    if (childNode && childNode.kind === 'column') {
      nextNodes[childId] = {
        ...childNode,
        width: normalizedWidth,
      };
    }
  }

  return {
    ...document,
    nodes: nextNodes,
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

export function updateNodeStyle(
  document: TemplateLayoutDocument,
  nodeIdValue: string,
  partialStyle: Record<string, string | number | undefined>,
): TemplateLayoutDocument {
  const node = document.nodes[nodeIdValue];
  if (!node) return document;

  return {
    ...document,
    nodes: {
      ...document.nodes,
      [nodeIdValue]: {
        ...node,
        style: {
          ...(node.style ?? {}),
          ...partialStyle,
        },
      },
    },
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

export function updateWidgetContent(
  document: TemplateLayoutDocument,
  widgetId: string,
  content: string,
): TemplateLayoutDocument {
  const node = document.nodes[widgetId];
  if (!node || node.kind !== 'widget') return document;

  return {
    ...document,
    nodes: {
      ...document.nodes,
      [widgetId]: {
        ...node,
        content,
      },
    },
    meta: { ...document.meta, updatedAt: new Date().toISOString() },
  };
}

export function stringifyTemplateLayoutForApi(document: TemplateLayoutDocument): unknown {
  return {
    layoutSchemaVersion: document.layoutSchemaVersion,
    rootIds: document.rootIds,
    nodes: document.nodes,
    themeTokens: document.themeTokens,
    meta: document.meta,
  };
}

export function parseTemplateLayoutFromApi(raw: unknown): TemplateLayoutDocument | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  if (obj.layoutSchemaVersion !== LAYOUT_SCHEMA_VERSION) return null;
  if (!Array.isArray(obj.rootIds) || typeof obj.nodes !== 'object' || !obj.nodes) return null;
  if (typeof obj.themeTokens !== 'object' || !obj.themeTokens) return null;
  if (typeof obj.meta !== 'object' || !obj.meta) return null;

  return obj as TemplateLayoutDocument;
}

export function draftStorageKey(productId: string, sessionKey: string): string {
  return `${DRAFT_PREFIX}:${productId}:${sessionKey}`;
}

export function loadTemplateLayoutDraft(productId: string, sessionKey: string): TemplateLayoutDocument | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(draftStorageKey(productId, sessionKey));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseTemplateLayoutFromApi(parsed);
  } catch {
    return null;
  }
}

export function saveTemplateLayoutDraft(productId: string, sessionKey: string, document: TemplateLayoutDocument): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(draftStorageKey(productId, sessionKey), JSON.stringify(stringifyTemplateLayoutForApi(document)));
}

export function templateVariableToMustache(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed.startsWith('${') || !trimmed.endsWith('}')) return trimmed;
  const core = trimmed.slice(2, -1).trim();

  if (/^[a-zA-Z0-9_]+$/.test(core)) {
    return `{{${core}}}`;
  }

  const typeFieldMatch = core.match(/^"([^"]+)"\."([^"]+)"$/);
  if (typeFieldMatch) {
    const [, typeKey, fieldKey] = typeFieldMatch;
    return `{{${typeKey}.${fieldKey}}}`;
  }

  return trimmed;
}

export function mustacheToTemplateVariable(value: string): string {
  const trimmed = value.trim();
  const mustacheMatch = trimmed.match(/^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/);
  if (!mustacheMatch) return value;

  const path = mustacheMatch[1]!;
  if (!path.includes('.')) return `\${${path}}`;
  const [typeKey, fieldKey] = path.split('.', 2);
  return `\${"${typeKey}"."${fieldKey}"}`;
}
