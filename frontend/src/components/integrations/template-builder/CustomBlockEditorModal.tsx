import { useState, useMemo, useEffect } from 'react';
import { Code2, Eye, Braces, ChevronDown, ChevronRight, Search, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { ConsultationFieldType } from '@/types/integrations';
import { SYSTEM_TEMPLATE_VARIABLES, buildTypeFieldVariables } from '@/lib/templateVariableCatalog';
import { evaluateExpression, type ExpressionContext } from '@/lib/expressionEngine';
import { MOCK_EXPRESSION_CONTEXT } from '@/lib/expressionMockContext';
import { ExpressionConsole } from './ExpressionConsole';
import { IconPicker, getIconByName } from '@/components/consultation/report-blocks';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type CustomBlockDraft = {
  name: string;
  description: string;
  category: string;
  template: string;
};

interface CustomBlockEditorModalProps {
  open: boolean;
  onClose: () => void;
  fieldTypes: ConsultationFieldType[];
  initialDraft?: Partial<CustomBlockDraft>;
  onSave: (draft: CustomBlockDraft) => void;
}

const AVAILABLE_BLOCK_ELEMENTS = [
  { tag: '<section>', desc: 'Seção agrupadora', snippet: '<section name="">\n  \n</section>' },
  { tag: '<card>', desc: 'Card com borda', snippet: '<card variant="kpi">\n  <label></label>\n  <value></value>\n</card>' },
  { tag: '<container>', desc: 'Container flexível', snippet: '<container cols="3">\n  \n</container>' },
  { tag: '<field>', desc: 'Campo com label', snippet: '<field label="" icon="">{$}</field>' },
  { tag: '<divider>', desc: 'Linha separadora', snippet: '<divider />' },
  { tag: '<table>', desc: 'Tabela de dados', snippet: '<table source="">\n  <column key="" label="" />\n</table>' },
  { tag: '<text>', desc: 'Texto livre', snippet: '<text></text>' },
  { tag: '<speedometer>', desc: 'Velocímetro de score', snippet: '<speedometer value="{$SCORE.valor}" max="1000" />' },
  { tag: '<icon>', desc: 'Ícone Lucide', snippet: '<icon name="gauge" />' },
];

type LayoutItem = { id: string; content: string };

let _modalItemId = 1;
function nextItemId() { return `item_${Date.now()}_${_modalItemId++}`; }

export function CustomBlockEditorModal({ open, onClose, fieldTypes, initialDraft, onSave }: CustomBlockEditorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [template, setTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [variableSearch, setVariableSearch] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [iconName, setIconName] = useState('FileText');
  const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);

  useEffect(() => {
    setName(initialDraft?.name ?? '');
    setDescription(initialDraft?.description ?? '');
    setCategory(initialDraft?.category ?? 'custom');
    setTemplate(initialDraft?.template ?? '');
    setLayoutItems(
      initialDraft?.template
        ? initialDraft.template.split('\n').filter((l) => l.trim()).map((l) => ({ id: nextItemId(), content: l.trim() }))
        : [],
    );
  }, [initialDraft, open]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function SortableItem({ item }: { item: LayoutItem }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="rounded border border-dashed border-primary/30 bg-primary/5 p-2 text-[10px] font-mono cursor-grab active:cursor-grabbing truncate">
        {item.content}
      </div>
    );
  }

  const handleLayoutDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layoutItems.findIndex((i) => i.id === String(active.id));
    const newIndex = layoutItems.findIndex((i) => i.id === String(over.id));
    if (oldIndex >= 0 && newIndex >= 0) {
      const next = arrayMove(layoutItems, oldIndex, newIndex);
      setLayoutItems(next);
      setTemplate(next.map((i) => i.content).join('\n'));
    }
  };

  const typeFieldVars = useMemo(() => buildTypeFieldVariables(fieldTypes), [fieldTypes]);
  const ctx: ExpressionContext = MOCK_EXPRESSION_CONTEXT;

  const renderedHtml = useMemo(() => {
    if (!template.trim()) return '<p class="text-muted-foreground text-xs italic">Nenhum conteúdo</p>';
    try {
      return showPreview ? evaluateExpression(template, ctx) : template;
    } catch {
      return '<p class="text-destructive text-xs">Erro ao renderizar</p>';
    }
  }, [template, showPreview, ctx]);

  const byType = useMemo(() => {
    const grouped: Record<string, typeof typeFieldVars> = {};
    for (const item of typeFieldVars) {
      if (!item.typeKey) continue;
      if (!grouped[item.typeKey]) grouped[item.typeKey] = [];
      grouped[item.typeKey]!.push(item);
    }
    return grouped;
  }, [typeFieldVars]);

  const q = variableSearch.trim().toLowerCase();
  const filteredSystem = useMemo(() => !q ? SYSTEM_TEMPLATE_VARIABLES : SYSTEM_TEMPLATE_VARIABLES.filter((v) => v.label.toLowerCase().includes(q) || v.expression.toLowerCase().includes(q)), [q]);

  const insertAtCursor = (text: string) => {
    setTemplate((prev) => prev + (prev && !prev.endsWith('\n') ? '\n' : '') + text);
    const lines = text.split('\n').filter((l) => l.trim());
    setLayoutItems((prev) => [...prev, ...lines.map((l) => ({ id: nextItemId(), content: l.trim() }))]);
  };

  const handleSave = () => {
    onSave({ name: name || 'Bloco sem nome', description, category, template });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] max-h-[85vh] h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-2.5 border-b border-border flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <IconPicker currentIcon={getIconByName(iconName)} onSelect={(n) => setIconName(n)} />
            <DialogTitle className="text-sm font-bold">Editor de Bloco</DialogTitle>
            <Input placeholder="Nome..." value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs w-40" />
            <Input placeholder="Descrição..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs w-40" />
          </div>
          <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" onClick={handleSave}>Salvar</Button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={25} minSize={18}>
              <div className="h-full overflow-y-auto p-3 space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2"><Layers className="h-3.5 w-3.5 text-primary" />Blocos disponíveis</div>
                  <div className="space-y-1">
                    {AVAILABLE_BLOCK_ELEMENTS.map((el) => (
                      <button key={el.tag} type="button" onClick={() => insertAtCursor(el.snippet)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-left hover:border-primary/40 hover:bg-muted/40 cursor-pointer">
                        <code className="text-[10px] font-mono text-primary">{el.tag}</code>
                        <p className="text-[9px] text-muted-foreground">{el.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Braces className="h-3.5 w-3.5 text-primary" />Variáveis</div>
                  <div className="relative mt-2">
                    <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={variableSearch} onChange={(e) => setVariableSearch(e.target.value)} placeholder="Buscar..." className="h-7 pl-7 text-xs" />
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sistêmicas</div>
                    {filteredSystem.map((v) => (
                      <button key={v.key} type="button" onClick={() => insertAtCursor(v.expression)} className="w-full rounded border border-border bg-background px-2 py-1 text-left text-[10px] font-mono text-foreground hover:border-primary/40 hover:bg-muted/40 cursor-pointer">{v.expression}</button>
                    ))}
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tipos e campos</div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {fieldTypes.map((ft) => {
                        const typeVars = byType[ft.key] ?? [];
                        const matchesType = !q || ft.label.toLowerCase().includes(q) || ft.key.toLowerCase().includes(q);
                        const filtered = q ? typeVars.filter((v) => v.label.toLowerCase().includes(q) || v.expression.toLowerCase().includes(q)) : typeVars;
                        if (!matchesType && filtered.length === 0) return null;
                        const expanded = expandedTypes[ft.key] ?? false;
                        return (
                          <div key={ft.id} className="rounded-md border border-border">
                            <button type="button" className="w-full h-7 px-2 text-left flex items-center gap-1.5 hover:bg-muted/40 cursor-pointer" onClick={() => setExpandedTypes((prev) => ({ ...prev, [ft.key]: !expanded }))}>
                              {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-[11px] font-medium text-foreground truncate">{ft.label}</span>
                            </button>
                            {expanded && (
                              <div className="px-2 pb-1.5 space-y-0.5">
                                {filtered.map((v) => (
                                  <button key={v.key} type="button" onClick={() => insertAtCursor(v.expression)} className="w-full rounded border border-border bg-background px-2 py-0.5 text-left text-[10px] font-mono text-foreground hover:border-primary/40 hover:bg-muted/40 cursor-pointer">{v.expression}</button>
                                ))}
                                {filtered.length === 0 && <p className="text-[10px] text-muted-foreground py-1">Sem campos.</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={40} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Eye className="h-3.5 w-3.5 text-primary" />Layout do bloco</div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className={!showPreview ? 'text-foreground font-medium' : ''}>Esqueleto</span>
                    <Switch checked={showPreview} onCheckedChange={setShowPreview} className="h-4 w-7" />
                    <span className={showPreview ? 'text-foreground font-medium' : ''}>Preview</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-card">
                  {layoutItems.length === 0 && !template.trim() ? (
                    <div className="h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
                      <Layers className="w-8 h-8 text-muted-foreground/20 mb-2" />
                      <p className="text-[11px] text-muted-foreground/60 mb-1">Nenhum conteúdo</p>
                      <p className="text-[9px] text-muted-foreground/40">Insira blocos da coluna esquerda ou escreva XML</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLayoutDragEnd}>
                      <div className="rounded-lg border-2 border-dashed border-border/40 p-3 min-h-[100px] space-y-2">
                        <SortableContext items={layoutItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                          {layoutItems.map((item) => <SortableItem key={item.id} item={item} />)}
                        </SortableContext>
                        {showPreview && (
                          <div className="rounded border border-dashed border-border/30 p-2 mt-3">
                            <div className="text-xs" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                          </div>
                        )}
                      </div>
                    </DndContext>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={35} minSize={22}>
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">XML / Template</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <textarea value={template} onChange={(e) => setTemplate(e.target.value)}
                    placeholder="Escreva XML ou insira blocos..."
                    className="h-full w-full resize-none bg-transparent text-[11px] font-mono text-foreground p-3 outline-none scrollbar-thin placeholder:text-muted-foreground/40" spellCheck={false} />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          <div className="shrink-0"><ExpressionConsole defaultCollapsed={true} /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
