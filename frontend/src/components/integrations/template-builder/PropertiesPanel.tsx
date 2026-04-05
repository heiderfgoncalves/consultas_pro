import { SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TemplateBuilderCapabilities, TemplateLayoutDocument, TemplateLayoutStyle } from '@/types/template-layout';

type PropertiesPanelProps = {
  document: TemplateLayoutDocument;
  selectedNodeId: string | null;
  capabilities: TemplateBuilderCapabilities;
  onStyleChange: (style: Partial<TemplateLayoutStyle>) => void;
  onContentChange: (content: string) => void;
};

export function PropertiesPanel({
  document,
  selectedNodeId,
  capabilities,
  onStyleChange,
  onContentChange,
}: PropertiesPanelProps) {
  const selectedNode = selectedNodeId ? document.nodes[selectedNodeId] : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        Propriedades
      </div>

      {!selectedNode && <p className="text-xs text-muted-foreground">Selecione um bloco no canvas para editar.</p>}

      {selectedNode && (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs">
            Tipo selecionado: <span className="font-semibold text-foreground">{selectedNode.kind}</span>
          </div>

          {selectedNode.kind === 'widget' && (
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Conteúdo</Label>
              <Input
                value={selectedNode.content ?? ''}
                onChange={(event) => onContentChange(event.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Cor do texto</Label>
              <Input
                type="color"
                className="h-8 p-1"
                value={selectedNode.style?.textColor ?? '#111827'}
                onChange={(event) => onStyleChange({ textColor: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Fundo</Label>
              <Input
                type="color"
                className="h-8 p-1"
                value={selectedNode.style?.backgroundColor ?? '#ffffff'}
                onChange={(event) => onStyleChange({ backgroundColor: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Borda</Label>
              <Input
                type="color"
                className="h-8 p-1"
                value={selectedNode.style?.borderColor ?? '#d1d5db'}
                onChange={(event) => onStyleChange({ borderColor: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Espessura</Label>
              <Input
                type="number"
                min={0}
                max={12}
                className="h-8 text-xs"
                value={selectedNode.style?.borderWidth ?? 0}
                onChange={(event) => onStyleChange({ borderWidth: Number(event.target.value || 0) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Padding</Label>
              <Input
                type="number"
                min={0}
                max={64}
                className="h-8 text-xs"
                value={selectedNode.style?.padding ?? 0}
                onChange={(event) => onStyleChange({ padding: Number(event.target.value || 0) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Raio</Label>
              <Input
                type="number"
                min={0}
                max={64}
                className="h-8 text-xs"
                value={selectedNode.style?.borderRadius ?? 0}
                onChange={(event) => onStyleChange({ borderRadius: Number(event.target.value || 0) })}
                disabled={!capabilities.canEditAdvancedStyles}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
