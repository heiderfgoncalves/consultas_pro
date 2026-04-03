import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Minus, Wallet, Save, Send,
  FileText, Eye, AlertTriangle, Maximize2, X,
  Gauge, Award, DollarSign, TrendingUp, ShieldAlert,
  Building2, FileX, Users, FileWarning, Play, Edit, Star, Trash2, Copy, Upload
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useConsultationStore, availableBlocks, mockTemplates, type ConsultationBlock, type SavedTemplate } from '@/stores/consultationStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, DragOverlay,
  useDroppable, type DragOverEvent
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { arrayMove } from '@dnd-kit/sortable';

const iconMap: Record<string, any> = {
  AlertTriangle, Gauge, Award, DollarSign, TrendingUp, ShieldAlert, Building2, FileX, Users, FileWarning,
};

const categories = ['Todos', ...Array.from(new Set(availableBlocks.map(b => b.category)))];

function DraggableCatalogBlock({ block, selected, onToggle }: {
  block: ConsultationBlock; selected: boolean; onToggle: () => void;
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
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
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

// Drop indicator between blocks for positional insertion
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
            // Shadow profile preview when dragging over empty zone
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
                  {[1, 2, 3].map(i => (
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

// Template preview modal with mock data
function TemplatePreviewModal({ template, open, onClose }: { template: SavedTemplate; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Prévia — {template.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <div className="bg-card rounded-xl border border-border">
            <ConsultationPreview
              blocks={template.blocks}
              document="403.406.588-51"
              clientName="JULIANO CAMPOS PEREIRA"
              mode="preview"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Editor modal (3-column builder) 
function EditorModal({ open, onClose, initialBlocks, templateName: initialName }: {
  open: boolean; onClose: () => void; initialBlocks?: ConsultationBlock[]; templateName?: string;
}) {
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
    return availableBlocks.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || b.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const isSelected = (id: string) => blocks.some(b => b.id === id);

  const toggleBlock = (block: ConsultationBlock) => {
    if (isSelected(block.id)) setBlocks(prev => prev.filter(b => b.id !== block.id));
    else setBlocks(prev => [...prev, block]);
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

    // Catalog item dropped
    if (activeId.startsWith('catalog-')) {
      const data = active.data.current;
      if (!data?.block || isSelected(data.block.id)) return;

      const overId = String(over.id);

      // Dropped on a gap indicator like "gap-0", "gap-1", etc.
      if (overId.startsWith('gap-')) {
        const idx = parseInt(overId.replace('gap-', ''), 10);
        setBlocks(prev => {
          const next = [...prev];
          next.splice(idx, 0, data.block);
          return next;
        });
      } else if (overId === 'preview-drop-zone') {
        setBlocks(prev => [...prev, data.block]);
      } else {
        // Dropped on an existing block — insert before it
        const idx = blocks.findIndex(b => b.id === overId);
        if (idx >= 0) {
          setBlocks(prev => {
            const next = [...prev];
            next.splice(idx, 0, data.block);
            return next;
          });
        } else {
          setBlocks(prev => [...prev, data.block]);
        }
      }
      return;
    }

    // Reorder within preview (sortable context handled below)
    // Not catalog → it's a preview block being reordered
    if (active.id !== over.id) {
      const oldIdx = blocks.findIndex(b => b.id === String(active.id));
      const overStr = String(over.id);
      let newIdx: number;
      if (overStr.startsWith('gap-')) {
        newIdx = parseInt(overStr.replace('gap-', ''), 10);
        if (newIdx > oldIdx) newIdx--;
      } else {
        newIdx = blocks.findIndex(b => b.id === overStr);
      }
      if (oldIdx >= 0 && newIdx >= 0) {
        setBlocks(prev => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  const handleReorder = useCallback((newBlocks: ConsultationBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] h-[92vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-2.5 border-b border-border flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-sm font-bold">
              {initialName ? `Editar: ${initialName}` : 'Novo Template'}
            </DialogTitle>
            <Input
              placeholder="Nome do template..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-7 text-xs w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
              <Save className="w-3 h-3" /> Salvar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Panel 1 - Catalog */}
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

              {/* Panel 2 - Preview (edit mode = placeholders) */}
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
                      <>
                        {/* Drop indicators between blocks */}
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
                      </>
                    )}
                  </PreviewDropZone>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Panel 3 - Summary */}
              <ResizablePanel defaultSize={25} minSize={16} maxSize={35}>
                <div className="flex flex-col h-full">
                  <div className="px-3 py-2 border-b border-border bg-card/50">
                    <h3 className="text-xs font-semibold text-foreground">Resumo</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                    {/* Logo upload */}
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
                                <button onClick={() => setBlocks(prev => prev.filter(b => b.id !== block.id))} className="text-muted-foreground hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-all"><X className="w-3 h-3" /></button>
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
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Saldo</span>
                        <span className="font-semibold text-success">R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            <DragOverlay>{activeDragItem && <CatalogDragOverlay block={activeDragItem} />}</DragOverlay>
          </DndContext>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NewConsultationPage() {
  const [templates] = useState(mockTemplates);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SavedTemplate | null>(null);
  const [document, setDocument] = useState('');
  const { user } = useAuthStore();
  const { selectedBlocks, addBlock, removeBlock, clearBlocks } = useConsultationStore();

  const totalPrice = selectedBlocks.reduce((sum, b) => sum + b.price, 0);
  const insufficientBalance = totalPrice > (user?.balance || 0);

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0, 18);
  };

  const loadTemplate = (tpl: SavedTemplate) => {
    clearBlocks();
    tpl.blocks.forEach(b => addBlock(b));
  };

  const openEditor = (tpl?: SavedTemplate) => {
    setEditingTemplate(tpl || null);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Nova Consulta" subtitle="Escolha um template ou crie um novo para emitir sua consulta">
        <div className="flex items-center gap-2">
          <Button onClick={() => openEditor()} className="gradient-primary text-primary-foreground text-xs h-8 gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo Template
          </Button>
        </div>
      </PageHeader>

      {/* Emissão rápida */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="text-xs font-semibold text-foreground mb-3">Emissão Rápida</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Documento (CPF/CNPJ)</label>
            <Input placeholder="000.000.000-00" value={document} onChange={(e) => setDocument(formatDocument(e.target.value))} className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            {selectedBlocks.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{selectedBlocks.length} blocos</span>
                <span className="font-bold text-foreground">R$ {totalPrice.toFixed(2)}</span>
                {insufficientBalance && <span className="text-destructive text-[10px] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Saldo insuficiente</span>}
              </div>
            )}
            <Button className="gradient-primary text-primary-foreground h-8 text-xs gap-1.5" disabled={selectedBlocks.length === 0 || insufficientBalance || !document}>
              <Send className="w-3.5 h-3.5" /> Emitir
            </Button>
          </div>
        </div>
      </div>

      {/* Template cards */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Seus Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border shadow-card hover:shadow-elevated transition-all duration-200 overflow-hidden group"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">{tpl.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{tpl.blocks.length} blocos</p>
                    </div>
                  </div>
                  {tpl.isFavorite && <Star className="w-3.5 h-3.5 text-warning fill-warning" />}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {tpl.blocks.slice(0, 4).map((block) => (
                    <span key={block.id} className="px-1.5 py-0.5 text-[9px] rounded-full bg-muted text-muted-foreground">{block.name}</span>
                  ))}
                  {tpl.blocks.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-primary/10 text-primary font-medium">+{tpl.blocks.length - 4}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Valor estimado</span>
                  <span className="font-semibold text-foreground">R$ {tpl.totalPrice.toFixed(2)}</span>
                </div>

                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 gradient-primary text-primary-foreground text-[10px] h-7 gap-1" onClick={() => loadTemplate(tpl)}>
                    <Play className="w-3 h-3" /> Usar
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => setPreviewTemplate(tpl)} title="Prévia com dados">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={() => openEditor(tpl)} title="Editar">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2"><Copy className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="px-4 py-1.5 border-t border-border bg-muted/30 text-[9px] text-muted-foreground">
                Atualizado em {tpl.updatedAt}
              </div>
            </motion.div>
          ))}

          {/* New template card */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: templates.length * 0.05 }}
            onClick={() => openEditor()}
            className="bg-card rounded-xl border-2 border-dashed border-border hover:border-primary/40 shadow-card hover:shadow-elevated transition-all duration-200 p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Criar Template</span>
          </motion.button>
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <EditorModal
          open={editorOpen}
          onClose={() => { setEditorOpen(false); setEditingTemplate(null); }}
          initialBlocks={editingTemplate?.blocks}
          templateName={editingTemplate?.name}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}
