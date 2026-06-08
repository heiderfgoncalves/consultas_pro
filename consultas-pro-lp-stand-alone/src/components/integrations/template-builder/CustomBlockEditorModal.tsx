import { useEffect, useMemo, useRef, useState } from 'react';
import { Braces, ChevronDown, ChevronRight, Code2, Copy, Eye, Layers, MoreHorizontal, Palette, Search, Trash2, Type as TypeIcon, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { ConsultationFieldType, ProviderConsultation } from '@/types/integrations';
import { SYSTEM_TEMPLATE_VARIABLES, buildTypeFieldVariables } from '@/lib/templateVariableCatalog';
import { toast } from 'sonner';
import { evaluateExpression, type ExpressionContext } from '@/lib/expressionEngine';
import { MOCK_EXPRESSION_CONTEXT } from '@/lib/expressionMockContext';
import { ExpressionConsole } from './ExpressionConsole';
import { IconPicker, getIconByName } from '@/components/consultation/report-blocks';
import { NO_ICON } from '@/components/consultation/report-blocks/IconPicker';
import BaseReportSkeleton from '@/components/consultation/BaseReportSkeleton';
import {
  createField,
  createSection,
  formatTemplateXml,
  sectionToXml,
  xmlToSection,
  type TemplateFieldTag,
  type TemplateSection,
} from '@/lib/templateSectionUtils';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export type CustomBlockDraft = {
  id?: string;
  name: string;
  description: string;
  category: string;
  template: string;
  isSystem?: boolean;
  variables?: string[];
};

interface CustomBlockEditorModalProps {
  open: boolean;
  onClose: () => void;
  fieldTypes: ConsultationFieldType[];
  initialDraft?: Partial<CustomBlockDraft>;
  onSave: (draft: CustomBlockDraft) => void;
  expressionContext?: ExpressionContext;
  selectedConsultation?: ProviderConsultation | null;
  reusableBlocks?: CustomBlockDraft[];
}

const AVAILABLE_BLOCK_ELEMENTS = [
  { tag: '<section>', desc: 'Seção agrupadora', snippet: '<section name="Nova seção" kind="custom">\n</section>' },
  { tag: '<card>', desc: 'Card com borda', snippet: '<card variant="kpi">\n  <label></label>\n  <value></value>\n</card>' },
  { tag: '<container>', desc: 'Container flexível', snippet: '<container cols="3">\n</container>' },
  { tag: '<field>', desc: 'Campo com label', snippet: '<field label="Novo campo" tag="value">{$}</field>' },
  { tag: '<divider>', desc: 'Linha separadora', snippet: '<divider />' },
  { tag: '<table>', desc: 'Tabela de dados', snippet: '<table source="">\n  <column key="" label="" />\n</table>' },
  { tag: '<text>', desc: 'Texto livre', snippet: '<text>Texto editável</text>' },
  { tag: '<speedometer>', desc: 'Velocímetro de score', snippet: '<speedometer value="{$SCORE.valor}" max="1000" />' },
  { tag: '<icon>', desc: 'Ícone Lucide', snippet: '<icon name="gauge" />' },
];

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xmlHighlight(xml: string) {
  const tokenRegex = /(\{\$[^}]+\}|<\/?[\w:-]+|[\w:-]+="[^"]*"|\/?>)/g;
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(xml || '')) !== null) {
    const token = match[0];
    html += escapeHtml((xml || '').slice(lastIndex, match.index));
    if (token.startsWith('{$')) {
      html += `<span class="text-cyan-300 font-semibold">${escapeHtml(token)}</span>`;
    } else if (token.startsWith('<')) {
      html += `<span class="text-sky-300">${escapeHtml(token)}</span>`;
    } else if (token.includes('=')) {
      const [name, ...value] = token.split('=');
      html += `<span class="text-amber-300">${escapeHtml(name ?? '')}</span>=<span class="text-emerald-300">${escapeHtml(value.join('='))}</span>`;
    } else {
      html += `<span class="text-slate-400">${escapeHtml(token)}</span>`;
    }
    lastIndex = match.index + token.length;
  }

  html += escapeHtml((xml || '').slice(lastIndex));
  return html;
}

function sectionFromDraft(draft?: Partial<CustomBlockDraft>) {
  const fallback = createSection(draft?.name || 'Bloco', [], { kind: 'custom' });
  return draft?.template ? xmlToSection(draft.template, fallback) : fallback;
}

function DraggablePaletteItem({ id, label, description, snippet }: { id: string; label: string; description: string; snippet: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { type: 'snippet', snippet, label, description } });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={`w-full rounded border border-border bg-background px-2 py-1.5 text-left hover:border-primary/40 hover:bg-muted/40 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <code className="text-[10px] font-mono text-primary">{label}</code>
      <p className="text-[9px] text-muted-foreground">{description}</p>
    </button>
  );
}

function CanvasDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'modal-canvas-dropzone' });
  return <div ref={setNodeRef} className={`rounded-lg border-2 border-dashed border-border/40 p-3 min-h-[100px] space-y-2 ${isOver ? 'bg-primary/5 ring-2 ring-primary/25' : ''}`}>{children}</div>;
}

export function CustomBlockEditorModal({
  open,
  onClose,
  fieldTypes,
  initialDraft,
  onSave,
  expressionContext,
  selectedConsultation,
  reusableBlocks = [],
}: CustomBlockEditorModalProps) {
  const [variables, setVariables] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [section, setSection] = useState<TemplateSection>(() => sectionFromDraft(initialDraft));
  const [template, setTemplate] = useState('');
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [variableSearch, setVariableSearch] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [iconName, setIconName] = useState(NO_ICON);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<{ label: string; description: string } | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const lineRef = useRef<HTMLPreElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ctx = expressionContext ?? MOCK_EXPRESSION_CONTEXT;

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleTemplateChange(template + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = template.substring(0, start);
    const after = template.substring(end);
    const newVal = before + text + after;
    handleTemplateChange(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  useEffect(() => {
    const nextSection = sectionFromDraft(initialDraft);
    const nextXml = formatTemplateXml(initialDraft?.template || sectionToXml(nextSection));
    setName(initialDraft?.name ?? nextSection.title ?? '');
    setDescription(initialDraft?.description ?? '');
    setCategory(initialDraft?.category ?? 'custom');
    setIconName(nextSection.icon ?? NO_ICON);
    setSection(nextSection);
    setSelectedFieldId(nextSection.fields[0]?.id ?? null);
    setTemplate(nextXml);
    setVariables(initialDraft?.variables ?? []);
    setInitialSnapshot(JSON.stringify({
      name: initialDraft?.name ?? nextSection.title ?? '',
      description: initialDraft?.description ?? '',
      category: initialDraft?.category ?? 'custom',
      template: nextXml,
      variables: initialDraft?.variables ?? [],
    }));
  }, [initialDraft, open]);

  const hasChanges = JSON.stringify({ name, description, category, template, variables }) !== initialSnapshot;
  const displaySection = useMemo<TemplateSection>(() => {
    if (!showPreview) return section;
    return {
      ...section,
      fields: section.fields.map((field) => ({
        ...field,
        expression: evaluateExpression(field.expression, ctx),
      })),
    };
  }, [ctx, section, showPreview]);

  const typeFieldVars = useMemo(() => buildTypeFieldVariables(fieldTypes), [fieldTypes]);
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

  const syncSection = (next: TemplateSection) => {
    setSection(next);
    setTemplate(formatTemplateXml(sectionToXml(next)));
  };

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const parsed = xmlToSection(value, section);
    if (parsed.fields.length > 0 || /<section\b/i.test(value)) setSection(parsed);
  };

  const insertSnippet = (snippet: string) => {
    if (/^<field\b/i.test(snippet.trim())) {
      const next = xmlToSection(`<section name="${section.title}" kind="${section.kind ?? 'custom'}">${snippet}</section>`, section);
      syncSection({ ...section, fields: [...section.fields, ...next.fields] });
      return;
    }
    handleTemplateChange(formatTemplateXml(`${template}${template.endsWith('\n') ? '' : '\n'}${snippet}`));
  };

  const insertField = (expression = '{$}') => {
    const field = createField('Novo campo', expression, iconName);
    syncSection({ ...section, fields: [...section.fields, field] });
    setSelectedFieldId(field.id);
  };

  const selectedField = section.fields.find((field) => field.id === selectedFieldId) ?? section.fields[0] ?? null;
  const updateField = (fieldId: string, patch: Partial<typeof section.fields[number]>) => {
    syncSection({ ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field) });
    setSelectedFieldId(fieldId);
  };
  const updateSelectedField = (patch: Partial<typeof section.fields[number]>) => {
    if (!selectedField) return;
    updateField(selectedField.id, patch);
  };

  const renderFieldOptions = (sectionId: string, field: typeof section.fields[number]) => {
    if (sectionId !== section.id) return null;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={() => setSelectedFieldId(field.id)}
            className="rounded-md border border-border bg-card p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Opções do item"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground"><TypeIcon className="h-3.5 w-3.5 text-primary" />Configuração do item</div>
          <div className="space-y-2">
            <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="h-8 text-xs" placeholder="Label" />
            <Input value={field.expression} onChange={(e) => updateField(field.id, { expression: e.target.value })} className="h-8 font-mono text-xs" placeholder="Valor ou expressão" />
            <div className="grid grid-cols-2 gap-2">
              <select value={field.tag ?? 'value'} onChange={(e) => updateField(field.id, { tag: e.target.value as TemplateFieldTag })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                <option value="label">label</option><option value="value">valor</option><option value="icon">ícone</option><option value="image">imagem</option><option value="divider">divisória</option><option value="container">container</option><option value="table">tabela</option><option value="text">texto</option><option value="speedometer">speedometer</option>
              </select>
              <div className="flex items-center gap-2">
                <IconPicker
                  currentIcon={getIconByName(field.icon ?? NO_ICON)}
                  currentIconName={field.icon ?? NO_ICON}
                  size={14}
                  onSelect={(name) => updateField(field.id, { icon: name === NO_ICON ? undefined : name })}
                />
                <Input value={field.icon ?? ''} onChange={(e) => updateField(field.id, { icon: e.target.value || undefined })} className="h-8 text-xs" placeholder="Ícone" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={field.fontSize ?? ''} onChange={(e) => updateField(field.id, { fontSize: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" placeholder="Fonte" />
              <Input type="number" value={field.spacing ?? ''} onChange={(e) => updateField(field.id, { spacing: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" placeholder="Espaço" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1"><Palette className="h-3.5 w-3.5 text-muted-foreground" /><Input value={field.color ?? ''} onChange={(e) => updateField(field.id, { color: e.target.value || undefined })} className="h-8 text-xs" placeholder="Cor" /></div>
              <Input value={field.backgroundColor ?? ''} onChange={(e) => updateField(field.id, { backgroundColor: e.target.value || undefined })} className="h-8 text-xs" placeholder="Fundo" />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const requestClose = () => {
    if (hasChanges && !window.confirm('Descartar alterações?')) return;
    onClose();
  };

  const handleSave = () => {
    const formatted = formatTemplateXml(template);
    onSave({ id: initialDraft?.id, name: name || section.title || 'Bloco sem nome', description, category, template: formatted, isSystem: initialDraft?.isSystem, variables });
    onClose();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'snippet') {
      setActiveSnippet({ label: String(data.label ?? 'Bloco'), description: String(data.description ?? '') });
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSnippet(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (active.data.current?.type === 'snippet') {
      const dropOnCanvas = overId === 'modal-canvas-dropzone' || section.fields.some((field) => field.id === overId);
      if (!dropOnCanvas) return;
      insertSnippet(String(active.data.current.snippet ?? ''));
      return;
    }
    const oldIndex = section.fields.findIndex((field) => field.id === activeId);
    const newIndex = section.fields.findIndex((field) => field.id === String(over.id));
    if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) syncSection({ ...section, fields: arrayMove(section.fields, oldIndex, newIndex) });
  };


  return (
    <Dialog open={open} onOpenChange={(v) => !v && requestClose()}>
      <DialogContent className="max-w-[92vw] w-[92vw] max-h-[88vh] h-[88vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-2.5 border-b border-border flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <IconPicker
              currentIcon={getIconByName(iconName)}
              currentIconName={iconName}
              onSelect={(n) => {
                const nextIcon = n === NO_ICON ? undefined : n;
                setIconName(nextIcon ?? NO_ICON);
                syncSection({ ...section, icon: nextIcon });
              }}
            />
            <DialogTitle className="text-sm font-bold">Editor de Bloco</DialogTitle>
            <Input placeholder="Nome..." value={name} onChange={(e) => { setName(e.target.value); syncSection({ ...section, title: e.target.value }); }} className="h-7 text-xs w-44" />
            {selectedConsultation && <span className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">{selectedConsultation.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={requestClose}>Cancelar</Button>
            <Button type="button" size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" onClick={handleSave}>Salvar</Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={25} minSize={18}>
                <div className="h-full overflow-y-auto p-3 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2"><Layers className="h-3.5 w-3.5 text-primary" />Blocos disponíveis</div>
                    <div className="space-y-1">
                      <DraggablePaletteItem
                        id="snippet-custom-field"
                        label="<field> customizado"
                        description="Adiciona um campo editável no canvas"
                        snippet={'<field label="Novo campo" tag="value">{$}</field>'}
                      />
                      {AVAILABLE_BLOCK_ELEMENTS.map((el) => <DraggablePaletteItem key={el.tag} id={`snippet-${el.tag}`} label={el.tag} description={el.desc} snippet={el.snippet} />)}
                      {reusableBlocks.map((block) => <DraggablePaletteItem key={block.id ?? block.name} id={`block-${block.id ?? block.name}`} label={block.name} description={block.description || 'Bloco customizado'} snippet={block.template} />)}
                    </div>
                  </div>
                  <div className="space-y-2 border-b border-border pb-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Braces className="h-3.5 w-3.5 text-primary" /> Parâmetros de Entrada
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{variables.length}</span>
                    </div>

                    <p className="text-[9px] text-muted-foreground leading-normal">
                      Crie variáveis de entrada para parametrizar o bloco. Clique nelas para inseri-las no cursor do XML.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const input = form.elements.namedItem('paramName') as HTMLInputElement;
                        const nameVal = input.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
                        if (!nameVal) return;
                        if (variables.includes(nameVal)) {
                          toast.error('Este parâmetro já existe');
                          return;
                        }
                        setVariables((prev) => [...prev, nameVal]);
                        form.reset();
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <Input
                        name="paramName"
                        placeholder="nome_parametro..."
                        className="h-7 text-xs flex-1 border-border bg-background focus-visible:ring-primary/20"
                        pattern="^[a-zA-Z0-9_]+$"
                        title="Apenas letras, números e sublinhados"
                      />
                      <Button type="submit" size="sm" className="h-7 px-2 text-xs gradient-primary text-primary-foreground">
                        + Add
                      </Button>
                    </form>

                    {variables.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-border bg-muted/20">
                        {variables.map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/15"
                          >
                            <button
                              type="button"
                              onClick={() => insertTextAtCursor(`{$params.${v}}`)}
                              className="hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                              title="Inserir {$params.nome} no XML"
                            >
                              {v}
                            </button>
                            <button
                              type="button"
                              onClick={() => setVariables((prev) => prev.filter((p) => p !== v))}
                              className="text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground italic py-1 text-center bg-muted/10 rounded border border-dashed border-border">
                        Nenhum parâmetro adicionado
                      </div>
                    )}
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
                        <button key={v.key} type="button" onClick={() => insertField(v.expression)} className="w-full rounded border border-border bg-background px-2 py-1 text-left text-[10px] font-mono text-foreground hover:border-primary/40 hover:bg-muted/40 cursor-pointer">{v.expression}</button>
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
                                  {filtered.map((v) => <button key={v.key} type="button" onClick={() => insertField(v.expression)} className="w-full rounded border border-border bg-background px-2 py-0.5 text-left text-[10px] font-mono text-foreground hover:border-primary/40 hover:bg-muted/40 cursor-pointer">{v.expression}</button>)}
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
                  <div className="flex-1 overflow-y-auto p-2 bg-card">
                    <CanvasDropZone>
                      <div className="group/canvas relative rounded-lg border border-dashed border-border/40 bg-card">
                        <div className="pointer-events-none absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-popover px-1.5 py-1 opacity-0 shadow-lg transition-opacity group-hover/canvas:opacity-100">
                          <span className="pointer-events-auto max-w-32 truncate rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{selectedField?.label ?? 'Selecione um item'}</span>
                          <button type="button" className="pointer-events-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Duplicar" onClick={() => selectedField && syncSection({ ...section, fields: [...section.fields, { ...selectedField, id: createField(selectedField.label, selectedField.expression, selectedField.icon).id }] })}><Copy className="h-3.5 w-3.5" /></button>
                          <button type="button" className="pointer-events-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive" title="Remover item" onClick={() => selectedField && syncSection({ ...section, fields: section.fields.filter((field) => field.id !== selectedField.id) })}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        {section.fields.length === 0 && !showPreview ? <div className="text-center text-[11px] text-muted-foreground py-10">Arraste blocos ou adicione variáveis para montar esta seção.</div> : (
                          <SortableContext items={section.fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                            <BaseReportSkeleton
                              sections={[displaySection]}
                              selectedFieldId={selectedFieldId}
                              onFieldSelect={setSelectedFieldId}
                              onCanvasDeselect={() => setSelectedFieldId(null)}
                              renderFieldOptionTrigger={renderFieldOptions}
                              enableFieldSorting={true}
                              onFieldExpressionChange={(sectionId, fieldId, value) => { setSelectedFieldId(fieldId); syncSection({ ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, expression: value } : field) }); }}
                              onFieldLabelChange={(sectionId, fieldId, value) => { setSelectedFieldId(fieldId); syncSection({ ...section, fields: section.fields.map((field) => field.id === fieldId ? { ...field, label: value } : field) }); }}
                              onEditSection={undefined}
                              onRemoveSection={undefined}
                              showAddSection={false}
                              showFooter={false}
                            />
                          </SortableContext>
                        )}
                      </div>
                    </CanvasDropZone>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={35} minSize={22}>
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2"><Code2 className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold text-foreground">XML / Template</span></div>
                    <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => handleTemplateChange(formatTemplateXml(template))}>Formatar XML</Button>
                  </div>
                  <div
                    className="relative m-3 flex-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 font-mono text-[11px] leading-5 shadow-inner dark:border-slate-500 dark:bg-slate-950"
                    onWheel={(event) => {
                      if (!event.shiftKey) return;
                      const textarea = event.currentTarget.querySelector('textarea');
                      if (!textarea) return;
                      event.preventDefault();
                      textarea.scrollLeft += event.deltaY;
                    }}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 border-r border-slate-700 bg-slate-900" />
                    <pre
                      ref={lineRef}
                      className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 overflow-hidden border-r border-slate-700 bg-slate-900 px-2 py-3 text-right text-slate-500"
                      aria-hidden
                    >
                      {Array.from({ length: Math.max(1, template.split('\n').length) }, (_, idx) => idx + 1).join('\n')}
                    </pre>
                    <pre ref={highlightRef} className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre p-3 pl-12 text-slate-100" aria-hidden dangerouslySetInnerHTML={{ __html: xmlHighlight(template) }} />
                    <textarea
                      ref={textareaRef}
                      value={template}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      onScroll={(e) => {
                        if (!highlightRef.current) return;
                        highlightRef.current.scrollTop = e.currentTarget.scrollTop;
                        highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        if (lineRef.current) lineRef.current.scrollTop = e.currentTarget.scrollTop;
                      }}
                      placeholder="Escreva XML ou insira blocos..."
                      className="absolute inset-0 z-30 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent p-3 pl-12 text-transparent caret-white outline-none scrollbar-thin selection:bg-sky-500/30 placeholder:text-slate-400"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            <DragOverlay>
              {activeSnippet ? (
                <div className="max-w-[260px] rounded-md border-2 border-primary bg-card p-2 shadow-lg">
                  <div className="text-[10px] font-mono text-primary">{activeSnippet.label}</div>
                  <div className="text-[9px] text-muted-foreground">{activeSnippet.description}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          <div className="shrink-0"><ExpressionConsole context={ctx} defaultCollapsed={true} /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
