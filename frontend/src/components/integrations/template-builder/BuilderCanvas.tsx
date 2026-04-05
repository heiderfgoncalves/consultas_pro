import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateLayoutDocument, TemplateLayoutNode, TemplateWidgetNode } from '@/types/template-layout';

type BuilderCanvasProps = {
  document: TemplateLayoutDocument;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

function NodeContainer({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md border transition-colors cursor-pointer',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
      )}
    >
      {children}
    </button>
  );
}

function styleFromNode(node: TemplateLayoutNode): React.CSSProperties {
  const style = node.style;
  if (!style) return {};
  return {
    color: style.textColor,
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    borderRadius: style.borderRadius,
    padding: style.padding,
    margin: style.margin,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.textAlign,
    borderStyle: style.borderWidth ? 'solid' : undefined,
  };
}

function widgetLabel(widget: TemplateWidgetNode): string {
  if (widget.widgetType === 'variable') return widget.content || '${variavel}';
  if (widget.widgetType === 'divider') return 'Divisoria';
  if (widget.widgetType === 'table') return widget.content || 'Tabela';
  return widget.content || (widget.widgetType === 'title' ? 'Titulo' : 'Texto');
}

function renderNode(
  document: TemplateLayoutDocument,
  nodeId: string,
  selectedNodeId: string | null,
  onSelectNode: (nextNodeId: string) => void,
): React.ReactNode {
  const node = document.nodes[nodeId];
  if (!node) return null;

  const children = node.children.map((childId) => renderNode(document, childId, selectedNodeId, onSelectNode));
  const selected = selectedNodeId === node.id;

  if (node.kind === 'section') {
    return (
      <NodeContainer key={node.id} selected={selected} onClick={() => onSelectNode(node.id)}>
        <div className="p-3 space-y-2" style={styleFromNode(node)}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground">{node.name}</div>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="space-y-2">{children}</div>
        </div>
      </NodeContainer>
    );
  }

  if (node.kind === 'row') {
    return (
      <NodeContainer key={node.id} selected={selected} onClick={() => onSelectNode(node.id)}>
        <div className="p-2.5" style={styleFromNode(node)}>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Linha</div>
          <div className="grid gap-2 grid-cols-1 md:grid-cols-2">{children}</div>
        </div>
      </NodeContainer>
    );
  }

  if (node.kind === 'column') {
    return (
      <NodeContainer key={node.id} selected={selected} onClick={() => onSelectNode(node.id)}>
        <div className="p-2.5 min-h-20 space-y-2" style={styleFromNode(node)}>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Coluna {node.width}/12</div>
          <div className="space-y-2">{children}</div>
        </div>
      </NodeContainer>
    );
  }

  return (
    <NodeContainer key={node.id} selected={selected} onClick={() => onSelectNode(node.id)}>
      <div className="px-2.5 py-2 text-xs text-foreground" style={styleFromNode(node)}>
        {widgetLabel(node)}
      </div>
    </NodeContainer>
  );
}

export function BuilderCanvas({ document, selectedNodeId, onSelectNode }: BuilderCanvasProps) {
  return (
    <div className="rounded-lg border border-border bg-card h-full overflow-y-auto p-3 space-y-2">
      {document.rootIds.map((rootId) => renderNode(document, rootId, selectedNodeId, onSelectNode))}
    </div>
  );
}
