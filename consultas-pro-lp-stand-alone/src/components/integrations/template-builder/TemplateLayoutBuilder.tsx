import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { ConsultationFieldType } from '@/types/integrations';
import type {
  TemplateBuilderMode,
  TemplateLayoutDocument,
  TemplateLayoutStyle,
  TemplateWidgetKind,
} from '@/types/template-layout';
import {
  appendColumnNode,
  appendRowNode,
  appendSectionNode,
  appendWidgetNode,
  createCapabilitiesByMode,
  updateNodeStyle,
  updateWidgetContent,
} from '@/lib/templateLayoutTransforms';
import { BuilderToolbar } from './BuilderToolbar';
import { BuilderCanvas } from './BuilderCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { VariablesPanel } from './VariablesPanel';

type TemplateLayoutBuilderProps = {
  mode: TemplateBuilderMode;
  fieldTypes: ConsultationFieldType[];
  document: TemplateLayoutDocument;
  onDocumentChange: (next: TemplateLayoutDocument) => void;
  onSave: (next: TemplateLayoutDocument) => void;
};

function findFirstColumnId(document: TemplateLayoutDocument): string | null {
  for (const rootId of document.rootIds) {
    const section = document.nodes[rootId];
    if (!section || section.kind !== 'section') continue;
    for (const rowId of section.children) {
      const row = document.nodes[rowId];
      if (!row || row.kind !== 'row') continue;
      const firstColumnId = row.children.find((childId) => document.nodes[childId]?.kind === 'column');
      if (firstColumnId) return firstColumnId;
    }
  }
  return null;
}

function findFirstSectionId(document: TemplateLayoutDocument): string | null {
  for (const rootId of document.rootIds) {
    if (document.nodes[rootId]?.kind === 'section') return rootId;
  }
  return null;
}

function findRowIdFromSelection(document: TemplateLayoutDocument, selectedNodeId: string | null): string | null {
  if (!selectedNodeId) return null;
  const node = document.nodes[selectedNodeId];
  if (!node) return null;
  if (node.kind === 'row') return node.id;
  if (node.kind === 'column' || node.kind === 'widget') {
    const parent = node.parentId ? document.nodes[node.parentId] : null;
    if (parent?.kind === 'row') return parent.id;
  }
  if (node.kind === 'section') {
    const firstRowId = node.children.find((childId) => document.nodes[childId]?.kind === 'row');
    return firstRowId ?? null;
  }
  return null;
}

export default function TemplateLayoutBuilder({
  mode,
  fieldTypes,
  document,
  onDocumentChange,
  onSave,
}: TemplateLayoutBuilderProps) {
  const capabilities = useMemo(() => createCapabilitiesByMode(mode), [mode]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(document.rootIds[0] ?? null);

  const onAddSection = () => {
    if (!capabilities.canAddSections) return;
    const next = appendSectionNode(document);
    onDocumentChange(next);
    setSelectedNodeId(next.rootIds[next.rootIds.length - 1] ?? null);
  };

  const onAddWidget = (widgetType: TemplateWidgetKind) => {
    if (!capabilities.canAddWidgets) return;

    const targetColumnId =
      (selectedNodeId && document.nodes[selectedNodeId]?.kind === 'column' ? selectedNodeId : null) ??
      findFirstColumnId(document);

    if (!targetColumnId) return;

    const placeholderByType: Record<TemplateWidgetKind, string> = {
      title: 'Novo titulo',
      text: 'Texto do bloco',
      variable: '${protocol_id}',
      divider: '---',
      table: 'Tabela de dados',
    };

    const next = appendWidgetNode(document, targetColumnId, widgetType, placeholderByType[widgetType]);
    onDocumentChange(next);
  };

  const onAddRow = () => {
    if (!capabilities.canAddRows) return;
    const targetSectionId =
      (selectedNodeId && document.nodes[selectedNodeId]?.kind === 'section' ? selectedNodeId : null) ??
      findFirstSectionId(document);
    if (!targetSectionId) return;
    const next = appendRowNode(document, targetSectionId);
    onDocumentChange(next);
  };

  const onAddColumn = () => {
    if (!capabilities.canAddColumns) return;
    const targetRowId = findRowIdFromSelection(document, selectedNodeId)
      ?? (findFirstSectionId(document)
        ? findRowIdFromSelection(document, findFirstSectionId(document))
        : null);
    if (!targetRowId) return;
    const next = appendColumnNode(document, targetRowId);
    onDocumentChange(next);
  };

  const handleStyleChange = (partialStyle: Partial<TemplateLayoutStyle>) => {
    if (!selectedNodeId) return;
    const next = updateNodeStyle(document, selectedNodeId, partialStyle);
    onDocumentChange(next);
  };

  const handleContentChange = (content: string) => {
    if (!selectedNodeId) return;
    const next = updateWidgetContent(document, selectedNodeId, content);
    onDocumentChange(next);
  };

  const handleInsertVariable = (expression: string) => {
    if (!selectedNodeId || document.nodes[selectedNodeId]?.kind !== 'widget') return;
    const existing = document.nodes[selectedNodeId]?.content ?? '';
    const next = updateWidgetContent(document, selectedNodeId, `${existing}${existing ? ' ' : ''}${expression}`);
    onDocumentChange(next);
  };

  return (
    <div className="h-[80vh] min-h-[40rem] rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Input
            value={document.meta.name}
            onChange={(event) =>
              onDocumentChange({
                ...document,
                meta: { ...document.meta, name: event.target.value },
              })
            }
            className="h-8 text-sm w-60 max-w-full"
          />
          <span className="text-[11px] text-muted-foreground">
            modo: {mode === 'admin' ? 'admin avançado' : 'usuário simplificado'}
          </span>
        </div>
        <Button type="button" size="sm" className="h-8 text-xs gap-1.5 gradient-primary text-primary-foreground" onClick={() => onSave(document)}>
          <Save className="h-3.5 w-3.5" />
          Salvar layout
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-49px)]">
        <ResizablePanel defaultSize={24} minSize={18}>
          <div className="h-full overflow-y-auto p-3 space-y-3">
            <BuilderToolbar
              capabilities={capabilities}
              onAddSection={onAddSection}
              onAddRow={onAddRow}
              onAddColumn={onAddColumn}
              onAddWidget={onAddWidget}
            />
            <VariablesPanel
              fieldTypes={fieldTypes}
              capabilities={capabilities}
              onInsertVariable={handleInsertVariable}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={48} minSize={30}>
          <div className="h-full p-3">
            <BuilderCanvas
              document={document}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={28} minSize={22}>
          <div className="h-full overflow-y-auto p-3">
            <PropertiesPanel
              document={document}
              selectedNodeId={selectedNodeId}
              capabilities={capabilities}
              onStyleChange={handleStyleChange}
              onContentChange={handleContentChange}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
