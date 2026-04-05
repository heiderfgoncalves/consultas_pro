import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Baseline,
  Calendar,
  CalendarClock,
  DollarSign,
  GripVertical,
  Hash,
  IdCard,
  Palette,
  Percent,
  Plus,
  Rows3,
  Save,
  ToggleLeft,
  Trash2,
  Type,
} from 'lucide-react';
import type {
  ConsultationFieldType,
  ReportFieldConditionOperator,
  ReportFieldConditionalRule,
  ReportFieldDataType,
  TypeReportFieldConfig,
  TypeReportFieldDefinition,
} from '@/types/integrations';
import { assignKeysToReportFields } from '@/lib/reportFieldKeys';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const FIELD_TYPE_OPTIONS: Array<{ value: ReportFieldDataType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percent' },
  { value: 'document', label: 'Document' },
];

const REPORT_FIELD_TYPE_ICONS: Record<ReportFieldDataType, LucideIcon> = {
  text: Type,
  boolean: ToggleLeft,
  numeric: Hash,
  date: Calendar,
  datetime: CalendarClock,
  currency: DollarSign,
  percent: Percent,
  document: IdCard,
};

function ReportFieldDataTypeIcon({
  dataType,
  className,
}: {
  dataType: ReportFieldDataType;
  className?: string;
}) {
  const Icon = REPORT_FIELD_TYPE_ICONS[dataType] ?? Type;
  return <Icon className={cn('h-3.5 w-3.5 shrink-0', className)} aria-hidden strokeWidth={2} />;
}

const CONDITION_OPTIONS: Array<{ value: ReportFieldConditionOperator; label: string }> = [
  { value: 'eq', label: 'Igual a' },
  { value: 'neq', label: 'Diferente de' },
  { value: 'gt', label: 'Maior que' },
  { value: 'gte', label: 'Maior ou igual' },
  { value: 'lt', label: 'Menor que' },
  { value: 'lte', label: 'Menor ou igual' },
  { value: 'contains', label: 'Contém' },
  { value: 'empty', label: 'Vazio' },
  { value: 'notEmpty', label: 'Não vazio' },
];

const DEFAULT_FIELD_COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0f766e',
];

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyRule(): ReportFieldConditionalRule {
  return {
    id: createId('rule'),
    operator: 'eq',
    value: '',
    color: '#2563eb',
    colorTarget: 'value',
  };
}

function createEmptyField(nextOrder: number): TypeReportFieldDefinition {
  return {
    id: createId('field'),
    key: 'campo',
    label: '',
    sortOrder: nextOrder,
    dataType: 'text',
    conditionalRules: [],
  };
}

function normalizeConfig(config?: TypeReportFieldConfig): TypeReportFieldConfig {
  const fields = (config?.fields ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((field, index) => ({
      ...field,
      id: field.id || createId('field'),
      sortOrder: index,
      conditionalRules: (field.conditionalRules ?? []).map((rule) => ({
        ...rule,
        id: rule.id || createId('rule'),
      })),
    }));

  return { version: 1, fields: assignKeysToReportFields(fields) };
}

function SortableFieldRow({
  field,
  children,
  keyHint,
}: {
  field: TypeReportFieldDefinition;
  children: ReactNode;
  keyHint: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex min-h-0 items-center gap-1 rounded-md border border-border/60 bg-background py-0.5 pl-1 pr-0.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
        aria-label="Reordenar campo"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:flex-nowrap">{children}</div>
      {keyHint}
    </div>
  );
}

export default function TypeReportFieldsConfig({
  fieldType,
  saving,
  onSave,
}: {
  fieldType: ConsultationFieldType;
  saving: boolean;
  onSave: (nextConfig: TypeReportFieldConfig) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TypeReportFieldConfig>(() => normalizeConfig(fieldType.reportFieldConfig));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(normalizeConfig(fieldType.reportFieldConfig));
    setDirty(false);
  }, [fieldType.id, fieldType.reportFieldConfig]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const fieldIds = useMemo(() => draft.fields.map((field) => field.id), [draft.fields]);

  const setFields = (updater: (current: TypeReportFieldDefinition[]) => TypeReportFieldDefinition[]) => {
    setDraft((current) => {
      const nextFields = assignKeysToReportFields(
        updater(current.fields).map((field, index) => ({ ...field, sortOrder: index })),
      );
      return { version: 1, fields: nextFields };
    });
    setDirty(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = draft.fields.findIndex((field) => field.id === active.id);
    const newIndex = draft.fields.findIndex((field) => field.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    setFields((current) => arrayMove(current, oldIndex, newIndex));
  };

  const updateField = (fieldId: string, patch: Partial<TypeReportFieldDefinition>) => {
    setFields((current) =>
      current.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    );
  };

  const updateRule = (
    fieldId: string,
    ruleId: string,
    patch: Partial<ReportFieldConditionalRule>,
  ) => {
    setFields((current) =>
      current.map((field) =>
        field.id !== fieldId
          ? field
          : {
              ...field,
              conditionalRules: field.conditionalRules.map((rule) =>
                rule.id === ruleId ? { ...rule, ...patch } : rule,
              ),
            },
      ),
    );
  };

  const addRule = (fieldId: string) => {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId
          ? { ...field, conditionalRules: [...field.conditionalRules, createEmptyRule()] }
          : field,
      ),
    );
  };

  const removeRule = (fieldId: string, ruleId: string) => {
    setFields((current) =>
      current.map((field) => {
        if (field.id !== fieldId) return field;
        const remaining = field.conditionalRules.filter((rule) => rule.id !== ruleId);
        return { ...field, conditionalRules: remaining };
      }),
    );
  };

  return (
    <div className="rounded-md border border-border/50 bg-muted/10">
      <div className="space-y-1.5 p-2">
        {draft.fields.length === 0 ? (
          <p className="px-1 py-2 text-center text-xs text-muted-foreground">
            Nenhum campo — use adicionar abaixo.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {draft.fields.map((field, index) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    keyHint={
                      <span
                        className="pointer-events-none shrink-0 self-center rounded border border-border/60 bg-muted/40 py-px pl-1 pr-1 font-mono text-[10px] tabular-nums tracking-tight text-muted-foreground max-w-[min(6.5rem,22vw)] truncate sm:max-w-[7.25rem]"
                        title={`Chave de referência: ${field.key}`}
                      >
                        {field.key}
                      </span>
                    }
                  >
                    <Input
                      value={field.label}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                      placeholder={`Campo ${index + 1}`}
                      className="h-7 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-ring sm:max-w-[min(100%,14rem)] md:max-w-[min(100%,18rem)]"
                      aria-label="Nome do campo"
                    />
                    <Select
                      value={field.dataType}
                      onValueChange={(value) =>
                        updateField(field.id, { dataType: value as ReportFieldDataType })
                      }
                    >
                      <SelectTrigger
                        className="flex h-7 w-[7.75rem] shrink-0 items-center justify-between gap-0 border-0 bg-transparent px-0.5 py-0 text-xs shadow-none focus:ring-1 [&>div]:min-w-0 [&_.lucide-chevron-down]:size-3 [&_.lucide-chevron-down]:shrink-0"
                        title={FIELD_TYPE_OPTIONS.find((o) => o.value === field.dataType)?.label}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                          <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                            <ReportFieldDataTypeIcon dataType={field.dataType} />
                          </span>
                          <SelectValue className="min-w-0 flex-1 truncate p-0 text-xs leading-5" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="relative h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`Regras de cor — ${field.label.trim() || `Campo ${index + 1}`}`}
                        >
                          <Palette className="h-3.5 w-3.5" />
                          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-muted px-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
                            {field.conditionalRules.length}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="z-[200] w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(65vh,24rem)] overflow-y-auto p-0"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="space-y-2 p-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 w-full text-xs"
                            onClick={() => addRule(field.id)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Regra
                          </Button>
                          {field.conditionalRules.length === 0 && (
                            <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-2 py-2 text-center text-[11px] text-muted-foreground">
                              Sem regras de cor. Use &quot;Regra&quot; acima para adicionar.
                            </p>
                          )}
                          <div className="space-y-1.5">
                            {field.conditionalRules.map((rule) => (
                              <div
                                key={rule.id}
                                className="rounded-md border border-border/60 bg-muted/15 p-2"
                              >
                                      <div className="grid gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Condição
                                          </label>
                                          <Select
                                            value={rule.operator}
                                            onValueChange={(value) =>
                                              updateRule(field.id, rule.id, {
                                                operator: value as ReportFieldConditionOperator,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="z-[300] max-h-56">
                                              {CONDITION_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value} className="text-xs">
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Valor da comparação
                                          </label>
                                          <Input
                                            value={rule.value ?? ''}
                                            onChange={(event) =>
                                              updateRule(field.id, rule.id, { value: event.target.value })
                                            }
                                            disabled={
                                              rule.operator === 'empty' || rule.operator === 'notEmpty'
                                            }
                                            placeholder="Ex.: 0, true, ALTO"
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Cor
                                          </label>
                                          <div className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2">
                                            <input
                                              type="color"
                                              value={rule.color}
                                              onChange={(event) =>
                                                updateRule(field.id, rule.id, { color: event.target.value })
                                              }
                                              className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                                              aria-label="Escolher cor"
                                            />
                                            <span className="text-xs font-mono text-muted-foreground truncate">
                                              {rule.color}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Onde colorir
                                          </label>
                                          <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2">
                                            <Baseline className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span className="text-[11px] text-foreground">Valor</span>
                                            <Switch
                                              checked={rule.colorTarget === 'row'}
                                              onCheckedChange={(checked) =>
                                                updateRule(field.id, rule.id, {
                                                  colorTarget: checked ? 'row' : 'value',
                                                })
                                              }
                                            />
                                            <Rows3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span className="text-[11px] text-foreground">Linha</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <div className="flex flex-wrap gap-1">
                                          {DEFAULT_FIELD_COLORS.map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              className={cn(
                                                'h-5 w-5 rounded-full border transition-transform hover:scale-105',
                                                rule.color.toLowerCase() === preset.toLowerCase()
                                                  ? 'border-foreground ring-2 ring-foreground/15'
                                                  : 'border-border',
                                              )}
                                              style={{ backgroundColor: preset }}
                                              onClick={() => updateRule(field.id, rule.id, { color: preset })}
                                              aria-label={`Selecionar cor ${preset}`}
                                            />
                                          ))}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => removeRule(field.id, rule.id)}
                                          aria-label="Remover regra"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}
                      aria-label="Remover campo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </SortableFieldRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/40 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 justify-center border border-dashed border-border/80 text-xs text-muted-foreground hover:text-foreground sm:flex-none sm:px-3"
          onClick={() => setFields((current) => [...current, createEmptyField(current.length)])}
        >
          <Plus className="mr-1 h-3 w-3" />
          Campo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 shrink-0 gap-1 px-2 text-xs"
          onClick={() => void onSave(normalizeConfig(draft))}
          disabled={saving || !dirty}
        >
          <Save className="h-3 w-3" />
          {saving ? '…' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
