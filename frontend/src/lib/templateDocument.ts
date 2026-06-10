import type { TemplateSection } from '@/lib/templateSectionUtils';
import {
  createSection,
  formatTemplateXml,
  parseSectionXml,
  sectionToXml,
} from '@/lib/templateSectionUtils';
import type {
  TemplateDocument,
  TemplateNode,
  TemplateSectionKind,
  TemplateSectionNode,
} from '@/types/template-document';

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapSectionKind(kind?: TemplateSection['kind']): TemplateSectionKind {
  if (kind === 'header') return 'header';
  if (kind === 'data') return 'personal-data';
  if (kind === 'kpi-row') return 'financial-summary';
  if (kind === 'score') return 'score';
  if (kind === 'debt-table') return 'debt-table';
  return 'custom';
}

function mapNodeKind(kind: TemplateSectionKind): TemplateSection['kind'] {
  if (kind === 'header') return 'header';
  if (kind === 'personal-data') return 'data';
  if (kind === 'financial-summary') return 'kpi-row';
  if (kind === 'score') return 'score';
  if (kind === 'debt-table') return 'debt-table';
  return 'custom';
}

export function sectionsToTemplateDocument(params: {
  name: string;
  sections: TemplateSection[];
  logo?: string | null;
  selectedBlockIds?: string[];
}): TemplateDocument {
  const nodes: TemplateNode[] = params.sections.map((section) => ({
    id: section.id,
    type: 'section',
    label: section.title,
    kind: mapSectionKind(section.kind),
    icon: section.icon ?? null,
    children: section.fields.map((field) => ({
      id: field.id,
      type: 'field',
      label: field.label,
      icon: field.icon ?? null,
      tag: field.tag,
      expression: field.expression,
      binding: { expression: field.expression },
      style: {
        fontSize: field.fontSize,
        spacing: field.spacing,
        color: field.color,
        backgroundColor: field.backgroundColor,
      },
    })),
  }));

  const xml = formatTemplateXml(nodesToXml(nodes));

  return {
    schemaVersion: 2,
    name: params.name,
    nodes,
    metadata: {
      logo: params.logo ?? null,
      selectedBlockIds: params.selectedBlockIds ?? [],
      xml,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function templateDocumentToSections(document: TemplateDocument): TemplateSection[] {
  return document.nodes
    .filter((node): node is TemplateSectionNode => node.type === 'section')
    .map((sectionNode) =>
      createSection(
        sectionNode.label || 'Seção',
        (sectionNode.children ?? []).map((child) => ({
          id: child.id || randomId('field'),
          label: child.label ?? 'Campo',
          expression: child.binding?.expression ?? (child as { expression?: string }).expression ?? '{$}',
          icon: child.icon ?? undefined,
          tag: (child as { tag?: TemplateSection['fields'][number]['tag'] }).tag,
          fontSize: child.style?.fontSize,
          spacing: child.style?.spacing,
          color: child.style?.color,
          backgroundColor: child.style?.backgroundColor,
        })),
        {
          kind: mapNodeKind(sectionNode.kind),
          icon: sectionNode.icon ?? undefined,
        },
      ),
    )
    .map((section, index) => ({
      ...section,
      id: (document.nodes[index] && document.nodes[index]!.id) || section.id,
    }));
}

export function normalizeTemplateNode(node: TemplateNode): TemplateNode {
  const normalizedChildren = node.children
    ? node.children.map(child => normalizeTemplateNode(child))
    : undefined;

  return {
    ...node,
    id: node.id || randomId(node.type),
    children: normalizedChildren,
  };
}

export function normalizeTemplateDocument(document: TemplateDocument): TemplateDocument {
  const nodes = document.nodes.map((node) => normalizeTemplateNode(node));

  return {
    ...document,
    schemaVersion: 2,
    name: document.name || 'Template',
    nodes,
    metadata: {
      ...(document.metadata ?? {}),
      xml: formatTemplateXml(document.metadata?.xml || serializeTemplateXml({ ...document, nodes })),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function migrateTemplateLayout(raw: unknown): TemplateDocument | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  // Se for um layout moderno do Templates Drawer (possui frames ou elements)
  if (Array.isArray(obj.frames) || Array.isArray(obj.elements)) {
    return obj as any;
  }

  if (obj.schemaVersion === 2 && Array.isArray(obj.nodes)) {
    return normalizeTemplateDocument(obj as TemplateDocument);
  }

  if (obj.schemaVersion === 1 && Array.isArray(obj.sections)) {
    const sections = obj.sections as TemplateSection[];
    return normalizeTemplateDocument(
      sectionsToTemplateDocument({
        name: 'Template',
        sections,
      }),
    );
  }

  return null;
}

// NOVO PARSER RECURSIVO DE XML E MODELO CANÔNICO (FASE 3)
export function parseTemplateXml(xml: string, name = 'Template'): TemplateDocument {
  const cleanXml = xml.replace(/<!--[\s\S]*?-->/g, '').trim();
  let index = 0;
  
  function skipWhitespace() {
    while (index < cleanXml.length && /\s/.test(cleanXml[index]!)) index++;
  }
  
  function match(str: string): boolean {
    if (cleanXml.startsWith(str, index)) {
      index += str.length;
      return true;
    }
    return false;
  }
  
  function parseTag(): TemplateNode | null {
    skipWhitespace();
    if (!match('<')) return null;
    
    if (cleanXml[index] === '/') return null;
    
    const nameMatch = /^([\w:-]+)/.exec(cleanXml.slice(index));
    if (!nameMatch) return null;
    const tagName = nameMatch[1]!;
    index += tagName.length;
    
    const attrs: Record<string, string> = {};
    while (index < cleanXml.length) {
      skipWhitespace();
      if (cleanXml.startsWith('/', index) || cleanXml.startsWith('>', index)) {
        break;
      }
      
      const attrMatch = /^([\w:-]+)\s*=\s*"([^"]*)"/.exec(cleanXml.slice(index));
      if (attrMatch) {
        attrs[attrMatch[1]!] = attrMatch[2]!;
        index += attrMatch[0].length;
      } else {
        index++;
      }
    }
    
    skipWhitespace();
    
    if (match('/>')) {
      return createNodeFromTag(tagName, attrs, '');
    }
    
    if (!match('>')) return null;
    
    const children: TemplateNode[] = [];
    let textContent = '';
    
    while (index < cleanXml.length) {
      skipWhitespace();
      if (cleanXml.startsWith('</', index)) {
        break;
      }
      
      if (cleanXml.startsWith('<', index)) {
        const child = parseTag();
        if (child) {
          children.push(child);
        } else {
          index++;
        }
      } else {
        const textMatch = /^([^<]+)/.exec(cleanXml.slice(index));
        if (textMatch) {
          textContent += textMatch[1]!;
          index += textMatch[1]!.length;
        } else {
          index++;
        }
      }
    }
    
    if (match('</')) {
      const closeTagNameMatch = /^([\w:-]+)\s*>/.exec(cleanXml.slice(index));
      if (closeTagNameMatch && closeTagNameMatch[1] === tagName) {
        index += closeTagNameMatch[0].length;
      } else {
        const closeEnd = cleanXml.indexOf('>', index);
        if (closeEnd !== -1) {
          index = closeEnd + 1;
        }
      }
    }
    
    return createNodeFromTag(tagName, attrs, textContent.trim(), children);
  }
  
  const nodes: TemplateNode[] = [];
  while (index < cleanXml.length) {
    skipWhitespace();
    if (index >= cleanXml.length) break;
    const node = parseTag();
    if (node) {
      nodes.push(node);
    } else {
      index++;
    }
  }

  return normalizeTemplateDocument({
    schemaVersion: 2,
    name,
    nodes,
  });
}

function createNodeFromTag(
  tagName: string,
  attrs: Record<string, string>,
  content: string,
  children?: TemplateNode[]
): TemplateNode {
  const typeMap: Record<string, string> = {
    section: 'section',
    field: 'field',
    container: 'container',
    table: 'table',
    column: 'column',
    divider: 'divider',
    image: 'image',
    icon: 'icon',
    text: 'text',
    speedometer: 'speedometer',
    kpi: 'kpi',
  };

  const nodeType = typeMap[tagName.toLowerCase()] || 'field';
  const style: Record<string, string | number> = {};
  if (attrs['font-size']) style.fontSize = Number(attrs['font-size']);
  if (attrs['font-weight']) style.fontWeight = attrs['font-weight'];
  if (attrs.spacing) style.spacing = Number(attrs.spacing);
  if (attrs.margin) style.margin = Number(attrs.margin);
  if (attrs.padding) style.padding = Number(attrs.padding);
  if (attrs.color) style.color = attrs.color;
  if (attrs.background) style.backgroundColor = attrs.background;
  if (attrs.width) style.width = attrs.width;
  if (attrs.columns) style.columns = Number(attrs.columns);

  const binding: Record<string, string> = {};
  if (attrs.expression) binding.expression = attrs.expression;
  if (attrs.source) binding.source = attrs.source;
  if (attrs.fallback) binding.fallback = attrs.fallback;

  let expression = attrs.expression || content || undefined;
  if (nodeType === 'speedometer' && attrs.value) {
    expression = attrs.value;
    binding.expression = attrs.value;
  }
  
  const nodeBase: Record<string, unknown> = {
    id: attrs.id || randomId(nodeType),
    type: nodeType,
    label: attrs.name || attrs.label || undefined,
    icon: attrs.icon || undefined,
  };

  if (Object.keys(style).length > 0) nodeBase.style = style;
  if (Object.keys(binding).length > 0) nodeBase.binding = binding;
  if (expression) nodeBase.expression = expression;

  if (nodeType === 'section') {
    nodeBase.kind = attrs.kind || 'custom';
  }
  if (nodeType === 'field') {
    nodeBase.tag = attrs.tag || 'value';
  }
  if (nodeType === 'table') {
    nodeBase.source = attrs.source || undefined;
  }

  if (children && children.length > 0) {
    nodeBase.children = children;
  } else if (nodeType === 'section' || nodeType === 'container' || nodeType === 'table') {
    nodeBase.children = [];
  }

  return nodeBase as TemplateNode;
}

export function serializeTemplateXml(document: TemplateDocument): string {
  return formatTemplateXml(nodesToXml(document.nodes));
}

function nodesToXml(nodes: TemplateNode[]): string {
  return nodes.map(nodeToXml).join('\n');
}

function nodeToXml(node: TemplateNode): string {
  const tagName = node.type;
  
  const attrsList: string[] = [];
  if (node.id) attrsList.push(`id="${node.id}"`);
  if (node.label) {
    const labelAttr = node.type === 'section' ? 'name' : 'label';
    attrsList.push(`${labelAttr}="${node.label}"`);
  }
  if (node.icon) attrsList.push(`icon="${node.icon}"`);
  
  if (node.type === 'section') {
    attrsList.push(`kind="${(node as { kind?: string }).kind || 'custom'}"`);
  }
  if (node.type === 'field') {
    attrsList.push(`tag="${(node as { tag?: string }).tag || 'value'}"`);
  }
  
  if (node.style) {
    const s = node.style;
    if (s.fontSize) attrsList.push(`font-size="${s.fontSize}"`);
    if (s.fontWeight) attrsList.push(`font-weight="${s.fontWeight}"`);
    if (s.spacing) attrsList.push(`spacing="${s.spacing}"`);
    if (s.margin) attrsList.push(`margin="${s.margin}"`);
    if (s.padding) attrsList.push(`padding="${s.padding}"`);
    if (s.color) attrsList.push(`color="${s.color}"`);
    if (s.backgroundColor) attrsList.push(`background="${s.backgroundColor}"`);
    if (s.width) attrsList.push(`width="${s.width}"`);
    if (s.columns) attrsList.push(`columns="${s.columns}"`);
  }

  if (node.binding) {
    const b = node.binding;
    if (b.source) attrsList.push(`source="${b.source}"`);
    if (b.fallback) attrsList.push(`fallback="${b.fallback}"`);
    if (node.type === 'speedometer' && b.expression) {
      attrsList.push(`value="${b.expression}"`);
    }
  }

  const attrsStr = attrsList.length > 0 ? ' ' + attrsList.join(' ') : '';
  const content = node.binding?.expression || (node as { expression?: string }).expression || '';
  
  if (node.children && node.children.length > 0) {
    const childrenXml = node.children.map(nodeToXml).join('\n');
    return `<${tagName}${attrsStr}>\n${childrenXml}\n</${tagName}>`;
  } else {
    if (content) {
      return `<${tagName}${attrsStr}>${content}</${tagName}>`;
    } else {
      return `<${tagName}${attrsStr} />`;
    }
  }
}

export function serializeSectionXml(document: TemplateDocument, sectionId: string): string {
  const section = document.nodes.find((node): node is TemplateSectionNode => node.type === 'section' && node.id === sectionId);
  if (!section) return '';
  return formatTemplateXml(nodesToXml([section]));
}
