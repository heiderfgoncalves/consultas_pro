import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Minus, Wallet, Save, FileText, Eye, Upload, X, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { availableBlocks, type ConsultationBlock } from '@/stores/consultationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, DragOverlay,
  useDroppable, type DragOverEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

const iconMap: Record<string, LucideIcon> = {
  AlertTriangle: FileText,
  Gauge: FileText,
  Award: FileText,
  DollarSign: FileText,
  TrendingUp: FileText,
  ShieldAlert: FileText,
  Building2: FileText,
  FileX: FileText,
  Users: FileText,
  FileWarning: FileText,
};

const categories = ['Todos', ...Array.from(new Set(availableBlocks.map((b) => b.category)))];

function DraggableCatalogBlock({ block, selected, onToggle }: {
  block: ConsultationBlock;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = iconMap[block.icon] || FileText;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${block.id}`,
    data: { type: 'catalog', block },
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 group ${
        selected ? 'border-primary bg-primary/5 shadow-glow' : 'border-border bg-card hover:border-primary/30 hover:shadow-elevated'
      } ${isDragging ? 'opacity-40 scale-95' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
        }`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-semibold text-foreground">{block.name}</h4>
            <span className="text-xs font-bold text-primary whitespace-nowrap">R$ {block.price.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">{block.description}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            selected ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground group-hover:border-primary/40'
          }`}
        >
          {selected ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>
    </motion.div>
  );
}

function DropIndicator({ id, isOver }: { id: string; isOver?: boolean }) {
  const { setNodeRef, isOver: over } = useDroppable({ id });
  const active = isOver || over;
  return (
    <div ref={setNodeRef} className={`transition-all duration-200 ${active ? 'h-8 my-1' : 'h-1 my-0'}`}>
      {active && (
        <div className="h-full rounded-lg border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center">
          <span className="text-[10px] text-primary font-medium">Soltar aqui</span>
        </div>
      )}
    </div>
  );
}

function PreviewDropZone({ children, hasBlocks, activeDragItem }: { children: React.ReactNode; hasBlocks: boolean; activeDragItem: ConsultationBlock | null }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'preview-drop-zone' });
  const Icon = activeDragItem ? (iconMap[activeDragItem.icon] || FileText) : FileText;

  return (
    <div ref={setNodeRef} className={`flex-1 overflow-y-auto scrollbar-thin transition-all duration-300 ${isOver && !hasBlocks ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset' : ''}`}>
      {!hasBlocks && (
        <div className={`flex flex-col items-center justify-center h-full p-8 text-center transition-all duration-300 ${isOver ? 'scale-105' : ''}`}>
          {isOver && activeDragItem ? (
            <div className="w-full max-w-md opacity-50 pointer-events-none">
              <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg border border-dashed border-primary/30 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-primary/50" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="h-2.5 w-24 rounded border border-dashed border-primary/30" />
                    <div className="h-2 w-16 rounded border border-dashed border-primary/20" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-2">
                      <div className="h-2 rounded border border-dashed border-primary/20 flex-1" />
                      <div className="h-2 rounded border border-dashed border-primary/20 flex-1" />
                      <div className="h-2 rounded border border-dashed border-primary/20 flex-1" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-primary/60 font-medium text-center">{activeDragItem.name}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-muted">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum bloco selecionado</p>
              <p className="text-xs text-muted-foreground">Arraste blocos do catálogo ou clique para adicionar</p>
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function CatalogDragOverlay({ block }: { block: ConsultationBlock }) {
  const Icon = iconMap[block.icon] || FileText;
  return (
    <div className="rounded-lg border-2 border-primary bg-card/95 p-3 shadow-elevated max-w-[240px] backdrop-blur-sm">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-primary/15 text-primary"><Icon className="w-3.5 h-3.5" /></div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-semibold text-foreground">{block.name}</h4>
          <span className="text-[10px] font-bold text-primary">R$ {block.price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

type TemplateBuilderEditorProps = {
  open?: boolean;
  mode?: 'modal' | 'embedded';
  onClose?: () => void;
  initialBlocks?: ConsultationBlock[];
  templateName?: string;
  onSave?: (payload: { name: string; blocks: ConsultationBlock[]; logo: string | null }) => void;
  showBalance?: boolean;
};

export default function TemplateBuilderEditor({
  open = true,
  mode = 'modal',
  onClose,
  initialBlocks,
  templateName: initialName,
  onSave,
  showBalance = true,
}: TemplateBuilderEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [blocks, setBlocks] = useState<ConsultationBlock[]>(initialBlocks || []);
  const [templateName, setTemplateName] = useState(initialName || '');
  const [reportLogo, setReportLogo] = useState<string | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<ConsultationBlock | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const totalPrice = blocks.reduce((sum, b) => sum + b.price, 0);

  const filteredBlocks = useMemo(() => {
    return availableBlocks.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || b.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const isSelected = (id: string) => blocks.some((b) => b.id === id);

  const toggleBlock = (block: ConsultationBlock) => {
    if (isSelected(block.id)) setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    else setBlocks((prev) => [...prev, block]);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'catalog') setActiveDragItem(data.block);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverDropId(over ? String(over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    setOverDropId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);

    if (activeId.startsWith('catalog-')) {
      const data = active.data.current;
      if (!data?.block || isSelected(data.block.id)) return;

      const overId = String(over.id);

      if (overId.startsWith('gap-')) {
        const idx = parseInt(overId.replace('gap-', ''), 10);
        setBlocks((prev) => {
          const next = [...prev];
          next.splice(idx, 0, data.block);
          return next;
        });
      } else if (overId === 'preview-drop-zone') {
        setBlocks((prev) => [...prev, data.block]);
      } else {
        const idx = blocks.findIndex((b) => b.id === overId);
        if (idx >= 0) {
          setBlocks((prev) => {
            const next = [...prev];
            next.splice(idx, 0, data.block);
            return next;
          });
        } else {
          setBlocks((prev) => [...prev, data.block]);
        }
      }
      return;
    }

    if (active.id !== over.id) {
      const oldIdx = blocks.findIndex((b) => b.id === String(active.id));
      const overStr = String(over.id);
      let newIdx: number;
      if (overStr.startsWith('gap-')) {
        newIdx = parseInt(overStr.replace('gap-', ''), 10);
        if (newIdx > oldIdx) newIdx--;
      } else {
        newIdx = blocks.findIndex((b) => b.id === overStr);
      }
      if (oldIdx >= 0 && newIdx >= 0) {
        setBlocks((prev) => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  const handleReorder = useCallback((newBlocks: ConsultationBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  const titleText = initialName ? `Editar: ${initialName}` : 'Novo Template';
  const headerToolbar = (
    <>
      <div className="flex items-center gap-3">
        {mode === 'embedded' ? (
          <h2 className="text-sm font-bold text-foreground">{titleText}</h2>
        ) : (
          <DialogTitle className="text-sm font-bold">{titleText}</DialogTitle>
        )}
        <Input
          placeholder="Nome do template..."
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="h-7 text-xs w-48"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 gap-1"
          onClick={() => onSave?.({ name: templateName, blocks, logo: reportLogo })}
        >
          <Save className="w-3 h-3" /> Salvar
        </Button>
      </div>
    </>
  );

  const content = (
    <>
      {mode === 'embedded' ? (
        <div className="px-4 py-2.5 border-b border-border flex flex-row items-center justify-between shrink-0">
          {headerToolbar}
        </div>
      ) : (
        <DialogHeader className="px-4 py-2.5 border-b border-border flex-row items-center justify-between">
          {headerToolbar}
        </DialogHeader>
      )}

      <div className="flex-1 overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={28} minSize={18} maxSize={40}>
              <div className="flex flex-col h-full">
                <div className="px-3 py-2 border-b border-border bg-card/50">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar blocos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-7 text-xs" />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 ${activeCategory === cat ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
                  <AnimatePresence>
                    {filteredBlocks.map((block) => (
                      <DraggableCatalogBlock key={block.id} block={block} selected={isSelected(block.id)} onToggle={() => toggleBlock(block)} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={47} minSize={25}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Layout do Template
                  </h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{blocks.length} blocos</span>
                </div>
                <PreviewDropZone hasBlocks={blocks.length > 0} activeDragItem={activeDragItem}>
                  {blocks.length > 0 && (
                    <div className="relative">
                      <DropIndicator id="gap-0" isOver={overDropId === 'gap-0'} />
                      <ConsultationPreview
                        blocks={blocks}
                        document="000.000.000-00"
                        onReorder={handleReorder}
                        logo={reportLogo}
                        onLogoChange={setReportLogo}
                        mode="edit"
                      />
                    </div>
                  )}
                </PreviewDropZone>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={25} minSize={16} maxSize={35}>
              <div className="flex flex-col h-full">
                <div className="px-3 py-2 border-b border-border bg-card/50">
                  <h3 className="text-xs font-semibold text-foreground">Resumo</h3>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Logo do Relatório</label>
                    {reportLogo ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                        <img src={reportLogo} alt="Logo" className="h-6 object-contain" />
                        <button onClick={() => setReportLogo(null)} className="text-muted-foreground hover:text-destructive ml-auto"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors group">
                        <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        <span className="text-[11px] text-muted-foreground group-hover:text-primary">Carregar logo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setReportLogo(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Blocos ({blocks.length})</label>
                    {blocks.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Nenhum selecionado</p>
                    ) : (
                      <div className="space-y-0.5">
                        {blocks.map((block) => (
                          <motion.div key={block.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between text-[11px] group/item py-1 px-1.5 rounded-lg hover:bg-accent transition-colors">
                            <span className="text-foreground truncate">{block.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">R$ {block.price.toFixed(2)}</span>
                              <button onClick={() => setBlocks((prev) => prev.filter((b) => b.id !== block.id))} className="text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                    {showBalance && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> Saldo
                        </span>
                        <span className="font-semibold text-success">R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          <DragOverlay>{activeDragItem && <CatalogDragOverlay block={activeDragItem} />}</DragOverlay>
        </DndContext>
      </div>
    </>
  );

  if (mode === 'embedded') {
    return (
      <div className="h-[80vh] min-h-[34rem] rounded-md border border-border bg-card overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] h-[92vh] p-0 overflow-hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
