import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Wallet, FileText, Eye, Upload, X,
  Layers, LayoutGrid, Type as TypeIcon, Variable, PlusCircle, Settings2, Trash2, ChevronDown, ChevronRight, GripVertical,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { availableBlocks, type ConsultationBlock } from '@/stores/consultationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TemplateRenderer from '@/components/consultation/TemplateRenderer';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VariablesPanel } from '@/components/integrations/template-builder/VariablesPanel';
import { ExpressionConsole } from '@/components/integrations/template-builder/ExpressionConsole';
import { CustomBlockEditorModal } from '@/components/integrations/template-builder/CustomBlockEditorModal';
import type { CustomBlockDraft } from '@/components/integrations/template-builder/CustomBlockEditorModal';
import type { ConsultationFieldType, ProviderConsultation } from '@/types/integrations';
import type { ExpressionContext } from '@/lib/expressionEngine';
import type { TemplateBuilderCapabilities } from '@/types/template-layout';
import type { TemplateDocument, TemplateRendererCapabilities } from '@/types/template-document';
import { normalizeTemplateDocument, sectionsToTemplateDocument, serializeSectionXml } from '@/lib/templateDocument';
import { createCapabilitiesByMode } from '@/lib/templateLayoutTransforms';
import { createCustomBlockApi, deleteCustomBlockApi, getCustomBlocksApi } from '@/api/admin-integrations';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DEFAULT_SECTIONS, createSection, createField, sectionToXml, xmlToFields, xmlToSection,
  type TemplateSection,
} from '@/lib/templateSectionUtils';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

const iconMap: Record<string, LucideIcon> = {
  AlertTriangle: FileText, Gauge: FileText, Award: FileText, DollarSign: FileText,
  TrendingUp: FileText, ShieldAlert: FileText, Building2: FileText,
  FileX: FileText, Users: FileText, FileWarning: FileText,
};

const categories = ['Todos', ...Array.from(new Set(availableBlocks.map((b) => b.category)))];

type LayoutBlockItem = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  kind: 'card-kpi' | 'container' | 'free-text';
  template?: string;
  variables?: string[];
};

const LAYOUT_BLOCKS: LayoutBlockItem[] = [
  { id: 'lb-card-kpi', name: 'Card KPI', description: 'Card com ícone, valor e label', icon: LayoutGrid, kind: 'card-kpi' },
  { id: 'lb-container', name: 'Container', description: 'Agrupador genérico de blocos', icon: Layers, kind: 'container' },
  { id: 'lb-free-text', name: 'Texto Livre', description: 'Parágrafo com expressões dinâmicas', icon: TypeIcon, kind: 'free-text' },
];

function DraggableCatalogBlock({ block, selected, isAdmin, onEdit }: {
  block: ConsultationBlock;
  selected: boolean;
  isAdmin?: boolean;
  onEdit?: (block: ConsultationBlock) => void;
}) {
  const Icon = iconMap[block.icon] || FileText;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${block.id}`,
    data: { type: 'catalog', block },
  });

  return (
    <motion.div
      ref={setNodeRef} layout whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      className={`rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 group ${selected ? 'border-primary bg-primary/5 shadow-glow' : 'border-border bg-card hover:border-primary/30 hover:shadow-elevated'} ${isDragging ? 'opacity-40 scale-95' : ''}`}
      {...attributes} {...listeners}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-semibold text-foreground">{block.name}</h4>
            <span className="text-xs font-bold text-primary whitespace-nowrap">R$ {block.price.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">{block.description}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isAdmin && onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(block); }}
              className="w-5 h-5 rounded-md flex items-center justify-center border border-border text-muted-foreground hover:border-primary/40 hover:text-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer" title="Editar bloco">
              <Settings2 className="w-3 h-3" />
            </button>
          )}
          {selected ? <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">Selecionado</span> : null}
        </div>
      </div>
    </motion.div>
  );
}

function LayoutDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'layout-dropzone', data: { type: 'layout-dropzone' } });
  return <div ref={setNodeRef} className={isOver ? 'ring-2 ring-primary/30 ring-inset bg-primary/5' : ''}>{children}</div>;
}

function DraggableLayoutBlock({ block, onEdit, onRemove }: {
  block: LayoutBlockItem;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const Icon = block.icon;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-${block.id}`,
    data: { type: 'layout-block', block },
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`w-full rounded-lg border border-border p-2 hover:border-primary/30 transition-colors group text-left bg-card cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2">
        <button type="button" className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10" title="Arrastar"><Icon className="w-3 h-3 text-muted-foreground group-hover:text-primary" /></button>
        <div className="flex-1 min-w-0 text-left select-none">
          <p className="text-[11px] font-medium text-foreground">{block.name}</p>
          <p className="text-[9px] text-muted-foreground line-clamp-1">{block.description}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onEdit} className="h-5 w-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-primary" title="Editar bloco"><Settings2 className="h-3 w-3" /></button>
          {onRemove && <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove} className="h-5 w-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-destructive" title="Remover bloco"><Trash2 className="h-3 w-3" /></button>}
        </div>
      </div>
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
  onSave?: (payload: { name: string; blocks: ConsultationBlock[]; logo: string | null; sections: TemplateSection[]; document: TemplateDocument }) => void;
  showBalance?: boolean;
  builderMode?: 'admin' | 'user';
  fieldTypes?: ConsultationFieldType[];
  accessToken?: string | null;
  availableConsultationBlocks?: ProviderConsultation[];
  initialSections?: TemplateSection[];
  initialLogo?: string | null;
  selectedConsultation?: ProviderConsultation | null;
  expressionContext?: ExpressionContext;
  saveTrigger?: number;
  showHeader?: boolean;
};

export default function TemplateBuilderEditor({
  open = true, mode = 'modal', onClose, initialBlocks, templateName: initialName,
  onSave, showBalance = true, builderMode = 'admin', fieldTypes = [],
  accessToken = null, availableConsultationBlocks = [], initialSections, initialLogo = null, selectedConsultation = null, expressionContext,
  saveTrigger = 0, showHeader = true,
}: TemplateBuilderEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [blocks, setBlocks] = useState<ConsultationBlock[]>(initialBlocks || []);
  const [templateName, setTemplateName] = useState(initialName || '');
  const [reportLogo, setReportLogo] = useState<string | null>(initialLogo);
  const [activeDragItem, setActiveDragItem] = useState<ConsultationBlock | null>(null);
  const [activeLayoutDragItem, setActiveLayoutDragItem] = useState<LayoutBlockItem | null>(null);
  const [viewMode, setViewMode] = useState<'skeleton' | 'preview'>(builderMode === 'user' ? 'preview' : 'skeleton');
  const [customBlockEditorOpen, setCustomBlockEditorOpen] = useState(false);
  const [customBlocks, setCustomBlocks] = useState<CustomBlockDraft[]>([]);
  const [editingBlockDraft, setEditingBlockDraft] = useState<Partial<CustomBlockDraft> | undefined>(undefined);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(() => JSON.parse(JSON.stringify(initialSections ?? DEFAULT_SECTIONS)));
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [leftExpanded, setLeftExpanded] = useState<Record<string, boolean>>({ consultations: true, layout: true, variables: false });
  const [lastSaveTrigger, setLastSaveTrigger] = useState(saveTrigger);
  const { user } = useAuthStore();


  useEffect(() => {
    setTemplateName(initialName || '');
  }, [initialName]);


  useEffect(() => {
    setBlocks(initialBlocks || []);
  }, [initialBlocks]);

  useEffect(() => {
    setReportLogo(initialLogo);
  }, [initialLogo]);

  useEffect(() => {
    setTemplateSections(JSON.parse(JSON.stringify(initialSections ?? DEFAULT_SECTIONS)) as TemplateSection[]);
  }, [initialSections]);

  useEffect(() => {
    if (builderMode === 'user') setViewMode('preview');
  }, [builderMode]);

  useEffect(() => {
    if (saveTrigger === lastSaveTrigger) return;
    setLastSaveTrigger(saveTrigger);
    onSave?.({
      name: templateName,
      blocks,
      logo: reportLogo,
      sections: templateSections,
      document: normalizeTemplateDocument(
        sectionsToTemplateDocument({
          name: templateName || initialName || 'Template',
          sections: templateSections,
          logo: reportLogo,
          selectedBlockIds: blocks.map((block) => block.id),
        }),
      ),
    });
  }, [blocks, initialName, lastSaveTrigger, onSave, reportLogo, saveTrigger, templateName, templateSections]);

  const toggleLeftSection = (key: string) => setLeftExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));

  const capabilities: TemplateBuilderCapabilities = useMemo(() => createCapabilitiesByMode(builderMode), [builderMode]);

  const rendererCapabilities: TemplateRendererCapabilities = useMemo(() => ({
    showSkeleton: builderMode === 'admin',
    showPreview: true,
    showXml: builderMode === 'admin',
    showVariables: builderMode === 'admin',
    showConsole: builderMode === 'admin',
    canEditAdvanced: builderMode === 'admin',
  }), [builderMode]);

  const templateDocument: TemplateDocument = useMemo(() => normalizeTemplateDocument(
    sectionsToTemplateDocument({
      name: templateName || initialName || 'Template',
      sections: templateSections,
      logo: reportLogo,
      selectedBlockIds: blocks.map((block) => block.id),
    }),
  ), [blocks, initialName, reportLogo, templateName, templateSections]);
  const totalPrice = blocks.reduce((sum, b) => sum + b.price, 0);

  const adminConsultationBlocks = useMemo<ConsultationBlock[]>(() => {
    return availableConsultationBlocks.map((c) => ({
      id: c.id, name: c.name,
      description: c.sampleResponse ? 'Produto real do provedor' : 'Produto do provedor',
      price: c.consultationPrice ?? c.cost ?? 0, category: 'Consulta',
      icon: fieldTypes.find((f) => f.key === c.fieldMappings[0]?.fieldTypeKey)?.icon ?? 'FileText',
    }));
  }, [availableConsultationBlocks, fieldTypes]);

  const sourceBlocks = builderMode === 'admin' && adminConsultationBlocks.length > 0 ? adminConsultationBlocks : availableBlocks;
  const filteredBlocks = useMemo(() => {
    return sourceBlocks.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || b.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, sourceBlocks]);

  const customBlocksQuery = useQuery({
    queryKey: ['custom-blocks'],
    queryFn: () => getCustomBlocksApi(accessToken),
    enabled: !!accessToken && builderMode === 'admin',
  });

  const createCustomBlockMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (draft: CustomBlockDraft) => createCustomBlockApi(accessToken, { name: draft.name, description: draft.description, category: draft.category, template: draft.template, skeleton: draft.template, variables: draft.variables } as any),
    onSuccess: () => { void customBlocksQuery.refetch(); toast.success('Bloco salvo'); },
    onError: (error: Error) => toast.error(error.message || 'Falha ao salvar bloco'),
  });


  const deleteCustomBlockMutation = useMutation({
    mutationFn: (blockId: string) => deleteCustomBlockApi(accessToken, blockId),
    onSuccess: () => { void customBlocksQuery.refetch(); toast.success('Bloco removido'); },
    onError: (error: Error) => toast.error(error.message || 'Falha ao remover bloco'),
  });

  useEffect(() => {
    if ((customBlocksQuery.data ?? []).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCustomBlocks(customBlocksQuery.data!.map((b) => ({ id: b.id, name: b.name, description: b.description ?? '', category: b.category, template: b.template, isSystem: b.isSystem, variables: (b as any).variables })));
    }
  }, [customBlocksQuery.data]);

  const isSelected = (id: string) => blocks.some((b) => b.id === id);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'catalog') setActiveDragItem(data.block);
    if (data?.type === 'layout-block') setActiveLayoutDragItem(data.block);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    setActiveLayoutDragItem(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);

    if (activeId.startsWith('catalog-')) {
      const data = active.data.current;
      const overId = String(over.id);
      const validDrop = overId === 'layout-dropzone' || overId.startsWith('section-');
      if (!validDrop) return;
      if (!data?.block || isSelected(data.block.id)) return;
      setBlocks((prev) => [...prev, data.block]);
      return;
    }

    if (activeId.startsWith('layout-')) {
      const data = active.data.current;
      if (data?.block && (String(over.id) === 'layout-dropzone' || String(over.id).startsWith('section-'))) {
        if (data.block.template) {
          const hasVariables = data.block.variables && data.block.variables.length > 0;
          if (hasVariables) {
            const initialArgs: Record<string, string> = {};
            for (const v of data.block.variables) {
              initialArgs[v] = '';
            }
            const newSec = createSection(data.block.name, [], {
              kind: 'custom',
              source: 'custom',
            });
            newSec.xml = data.block.template;
            newSec.customBlockId = data.block.id;
            newSec.variables = data.block.variables;
            newSec.arguments = initialArgs;
            setTemplateSections((prev) => [...prev, newSec]);
          } else {
            setTemplateSections((prev) => [...prev, xmlToSection(data.block.template, createSection(data.block.name, xmlToFields(data.block.template), { kind: 'custom', source: 'custom' }))]);
          }
        } else {
          addLayoutBlock(data.block.kind);
        }
      }
      return;
    }

    if (activeId.startsWith('section-')) {
      const oldIdx = templateSections.findIndex((s) => `section-${s.id}` === activeId);
      const newIdx = templateSections.findIndex((s) => `section-${s.id}` === String(over.id));
      if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
        setTemplateSections((prev) => arrayMove(prev, oldIdx, newIdx));
      }
    }
  };

  const handleSectionArgumentsChange = (sectionId: string, args: Record<string, string>) => {
    setTemplateSections((prev) => prev.map((s) => s.id !== sectionId ? s : { ...s, arguments: args }));
  };

  const handleFieldExpressionChange = (sectionId: string, fieldId: string, value: string) => {
    setTemplateSections((prev) => prev.map((s) => s.id !== sectionId ? s : {
      ...s, fields: s.fields.map((f) => f.id !== fieldId ? f : { ...f, expression: value }),
    }));
  };

  const handleFieldLabelChange = (sectionId: string, fieldId: string, value: string) => {
    setTemplateSections((prev) => prev.map((s) => s.id !== sectionId ? s : {
      ...s, fields: s.fields.map((f) => f.id !== fieldId ? f : { ...f, label: value }),
    }));
  };

  const handleEditSection = (sectionId: string) => {
    const section = templateSections.find((s) => s.id === sectionId);
    if (!section) return;
    setEditingSectionId(sectionId);
    setEditingBlockDraft({
      name: section.title,
      description: `Seção com ${section.fields.length} campos`,
      category: 'section',
      template: serializeSectionXml(templateDocument, sectionId) || sectionToXml(section),
    });
    setCustomBlockEditorOpen(true);
  };

  const handleSaveCustomBlock = (draft: CustomBlockDraft) => {
    if (editingSectionId) {
      setTemplateSections((prev) => prev.map((s) => s.id !== editingSectionId ? s : xmlToSection(draft.template, { ...s, title: draft.name })));
      setEditingSectionId(null);
      return;
    }
    if (builderMode === 'admin' && accessToken) {
      void createCustomBlockMutation.mutateAsync(draft);
      return;
    }
    setCustomBlocks((prev) => [...prev, draft]);
  };

  const handleAddSection = () => {
    const newSection = createSection('Nova seção', [createField('Campo', '{$}')]);
    setTemplateSections((prev) => [...prev, newSection]);
  };

  const addLayoutBlock = (kind: LayoutBlockItem['kind']) => {
    const sectionMap: Record<string, () => TemplateSection> = {
      'card-kpi': () => createSection('Card KPI', [createField('Label', '{$}'), createField('Valor', '{$}')], { kind: 'kpi-row', source: 'custom' }),
      'container': () => createSection('Container', [], { kind: 'container', source: 'custom' }),
      'free-text': () => createSection('Texto Livre', [createField('Conteúdo', 'Texto editável aqui')], { kind: 'free-text', source: 'custom' }),
    };
    const factory = sectionMap[kind];
    if (factory) setTemplateSections((prev) => [...prev, factory()]);
  };

  const handleInsertVariable = (expression: string) => {
    toast.info(`Variável copiada: ${expression}`, { duration: 2000 });
  };


  const previewBlocks = useMemo(() => {
    const hasScoreSection = templateSections.some((section) => section.kind === 'score' || section.id === 'score');
    if (!hasScoreSection || blocks.some((block) => /score/i.test(block.name))) return blocks;
    return [...blocks, {
      id: '5',
      name: 'Score de Crédito',
      description: 'Bloco de score configurado no template',
      price: 0,
      category: 'Score & Rating',
      icon: 'Gauge',
    }];
  }, [blocks, templateSections]);
  const previewClientName = String(expressionContext?.$json.cliente && typeof expressionContext.$json.cliente === "object" ? (expressionContext.$json.cliente as Record<string, unknown>).nome ?? "JULIANO CAMPOS PEREIRA" : "JULIANO CAMPOS PEREIRA");
  const previewDocumentId = String(expressionContext?.$json.cliente && typeof expressionContext.$json.cliente === "object" ? (expressionContext.$json.cliente as Record<string, unknown>).documento ?? "403.406.588-51" : "403.406.588-51");


  const sectionIds = templateSections.map((s) => `section-${s.id}`);
  const modalHeaderToolbar = (
    <>
      <DialogTitle className="text-sm font-bold">{templateName || initialName || 'Template'}</DialogTitle>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onSave?.({
      name: templateName,
      blocks,
      logo: reportLogo,
      sections: templateSections,
      document: templateDocument,
    })}>Salvar</Button>
    </>
  );

  const content = (
    <>
      {!showHeader ? null : mode === 'embedded' ? (
        <div className="px-3 py-1.5 border-b border-border shrink-0">
          <h2 className="text-sm font-bold text-foreground">{templateName}</h2>
        </div>
      ) : (
        <DialogHeader className="px-4 py-2.5 border-b border-border flex-row items-center justify-between">{modalHeaderToolbar}</DialogHeader>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* LEFT COLUMN */}
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
                <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-3">
                  <div>
                    <button type="button" onClick={() => toggleLeftSection('consultations')} className="w-full flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                      <span>Tipos de consulta</span>
                      {leftExpanded.consultations ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    {leftExpanded.consultations && (
                      <div className="space-y-1.5">
                        <AnimatePresence>
                          {filteredBlocks.map((block) => (
                            <DraggableCatalogBlock key={block.id} block={block} selected={isSelected(block.id)} isAdmin={false}
                              onEdit={undefined} />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {builderMode === 'admin' && (
                    <div>
                      <button type="button" onClick={() => toggleLeftSection('layout')} className="w-full flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                        <span>Blocos de layout</span>
                        {leftExpanded.layout ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                      {leftExpanded.layout && <div className="space-y-1">
                        {LAYOUT_BLOCKS.map((lb) => (
                          <DraggableLayoutBlock key={lb.id} block={lb} onEdit={() => { setEditingSectionId(null); setEditingBlockDraft({ name: lb.name, description: lb.description, category: lb.kind, template: sectionToXml(createSection(lb.name, [], { kind: lb.kind === 'card-kpi' ? 'kpi-row' : lb.kind })) }); setCustomBlockEditorOpen(true); }} />
                        ))}
                        {customBlocks
                          .filter((cb) => !LAYOUT_BLOCKS.some((lb) => lb.name.toLowerCase() === cb.name.toLowerCase()))
                          .map((cb, i) => {
                            const customBlock: LayoutBlockItem = { id: cb.id ?? `custom-${i}`, name: cb.name, description: cb.description || 'Bloco customizado', icon: Variable, kind: 'free-text', template: cb.template };
                            return <DraggableLayoutBlock key={customBlock.id} block={customBlock} onEdit={() => { setEditingSectionId(null); setEditingBlockDraft(cb); setCustomBlockEditorOpen(true); }} onRemove={!cb.isSystem && cb.id ? () => { if (window.confirm('Remover este bloco da lista?')) void deleteCustomBlockMutation.mutateAsync(cb.id!); } : undefined} />;
                          })}
                        <button type="button" onClick={() => { setEditingSectionId(null); setEditingBlockDraft(undefined); setCustomBlockEditorOpen(true); }}
                          className="w-full rounded-lg border border-dashed border-border p-2 hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-2 cursor-pointer group">
                          <PlusCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          <span className="text-[11px] text-muted-foreground group-hover:text-primary font-medium">Criar bloco customizado</span>
                        </button>
                      </div>}
                    </div>
                  )}

                  {builderMode === 'admin' && fieldTypes.length > 0 && (
                    <div>
                      <button type="button" onClick={() => toggleLeftSection('variables')} className="w-full flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                        <span>Variáveis dinâmicas</span>
                        {leftExpanded.variables ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                      {leftExpanded.variables && <VariablesPanel fieldTypes={fieldTypes} capabilities={capabilities} onInsertVariable={handleInsertVariable} />}
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* MIDDLE COLUMN */}
            <ResizablePanel defaultSize={47} minSize={25}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Layout do Template
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{blocks.length} blocos</span>
                    {builderMode === 'admin' && <div className="flex items-center gap-1.5">
                      <Label htmlFor="view-toggle" className={`text-[10px] cursor-pointer ${viewMode === 'skeleton' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Esqueleto</Label>
                      <Switch id="view-toggle" checked={viewMode === 'preview'} onCheckedChange={(c) => setViewMode(c ? 'preview' : 'skeleton')} className="h-4 w-7" />
                      <Label htmlFor="view-toggle" className={`text-[10px] cursor-pointer ${viewMode === 'preview' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Preview</Label>
                    </div>}
                  </div>
                </div>

                {viewMode === 'preview' ? (
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <TemplateRenderer
                      document={templateDocument}
                      mode="preview"
                      blocks={previewBlocks}
                      capabilities={rendererCapabilities}
                      context={expressionContext}
                      logo={reportLogo}
                      onLogoChange={setReportLogo}
                      clientName={previewClientName}
                      documentIdValue={previewDocumentId}
                    />
                  </div>
                ) : (
                  <div className={`flex-1 overflow-y-auto scrollbar-thin transition-all duration-200 ${activeDragItem ? 'ring-2 ring-primary/25 ring-inset bg-primary/5' : ''}`}>
                    {blocks.length > 0 && (
                      <div className="flex flex-wrap gap-1 border-b border-border/60 px-3 py-2">
                        {blocks.map((block) => (
                          <span key={block.id} className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{block.name}</span>
                        ))}
                      </div>
                    )}
                    <LayoutDropZone>
                    <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                      <TemplateRenderer
                        document={templateDocument}
                        mode="skeleton"
                        blocks={previewBlocks}
                        capabilities={rendererCapabilities}
                        context={expressionContext}
                        logo={reportLogo}
                        onLogoChange={setReportLogo}
                        onEditSection={handleEditSection}
                        onAddSection={handleAddSection}
                        onFieldExpressionChange={handleFieldExpressionChange}
                        onFieldLabelChange={handleFieldLabelChange}
                        selectedFieldId={selectedFieldId}
                        onFieldSelect={setSelectedFieldId}
                        onCanvasDeselect={() => setSelectedFieldId(null)}
                        onRemoveSection={(sectionId) => setTemplateSections((prev) => prev.filter((s) => s.id !== sectionId))}
                        onSectionArgumentsChange={handleSectionArgumentsChange}
                        renderFieldOptionTrigger={(sectionId, field) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button type="button" className="rounded-md border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar item">
                                <Settings2 className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1" align="start">
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                                onClick={() => handleEditSection(sectionId)}
                              >
                                Editar no modal
                              </button>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                                onClick={() =>
                                  setTemplateSections((prev) =>
                                    prev.map((section) =>
                                      section.id !== sectionId
                                        ? section
                                        : {
                                            ...section,
                                            fields: [
                                              ...section.fields,
                                              {
                                                ...field,
                                                id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                              },
                                            ],
                                          },
                                    ),
                                  )
                                }
                              >
                                Duplicar item
                              </button>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => setTemplateSections((prev) => prev.map((section) => section.id !== sectionId ? section : { ...section, fields: section.fields.filter((item) => item.id !== field.id) }))}
                              >
                                Remover item
                              </button>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </SortableContext>
                    </LayoutDropZone>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* RIGHT COLUMN */}
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
                          if (file) { const reader = new FileReader(); reader.onload = (ev) => setReportLogo(ev.target?.result as string); reader.readAsDataURL(file); }
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
                        <span className="text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Saldo</span>
                        <span className="font-semibold text-success">R$ {user?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          <DragOverlay>{activeDragItem && <CatalogDragOverlay block={activeDragItem} />}{activeLayoutDragItem && <div className="rounded-lg border-2 border-primary bg-card/95 p-3 shadow-elevated max-w-[240px] backdrop-blur-sm"><div className="text-[11px] font-semibold text-foreground">{activeLayoutDragItem.name}</div><div className="text-[10px] text-muted-foreground">{activeLayoutDragItem.description}</div></div>}</DragOverlay>
        </DndContext>
        {builderMode === 'admin' && <div className="shrink-0"><ExpressionConsole context={expressionContext} defaultCollapsed={true} /></div>}
      </div>

      <CustomBlockEditorModal
        open={customBlockEditorOpen}
        onClose={() => { setCustomBlockEditorOpen(false); setEditingBlockDraft(undefined); setEditingSectionId(null); }}
        fieldTypes={fieldTypes}
        initialDraft={editingBlockDraft}
        expressionContext={expressionContext}
        selectedConsultation={selectedConsultation}
        reusableBlocks={customBlocks}
        onSave={handleSaveCustomBlock}
      />
    </>
  );

  if (mode === 'embedded') {
    return <div className="h-[80vh] min-h-[34rem] rounded-md border border-border bg-card overflow-hidden flex flex-col">{content}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[92vh] h-[92vh] p-0 overflow-hidden">{content}</DialogContent>
    </Dialog>
  );
}
