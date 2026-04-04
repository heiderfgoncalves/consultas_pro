import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  GripVertical,
  Plus,
  Trash2,
  Save,
  Palette,
  Rows3,
  Baseline,
} from 'lucide-react';
import type {
  ConsultationFieldType,
  ReportFieldConditionOperator,
  ReportFieldConditionalRule,
  ReportFieldDataType,
  TypeReportFieldConfig,
  TypeReportFieldDefinition,
} from '@/types/integrations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
];

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
    label: '',
    sortOrder: nextOrder,
    dataType: 'text',
    conditionalRules: [createEmptyRule()],
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

  return { version: 1, fields };
}

function SortableFieldCard({
  field,
  children,
}: {
  field: TypeReportFieldDefinition;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group relative">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute left-2 top-3 z-10 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          aria-label="Reordenar campo"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {children}
      </div>
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
      const nextFields = updater(current.fields).map((field, index) => ({ ...field, sortOrder: index }));
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
        return {
          ...field,
          conditionalRules: remaining.length ? remaining : [createEmptyRule()],
        };
      }),
    );
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Campos da seção</CardTitle>
            <CardDescription>
              Defina nome, ordem e tipo de cada campo. As regras de cor ficam no botão por campo.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => void onSave(normalizeConfig(draft))}
            disabled={saving || !dirty}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? 'Salvando…' : 'Salvar campos'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {draft.fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum campo configurado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione os campos que serão exibidos nessa seção quando o relatório for montado.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {draft.fields.map((field, index) => (
                  <SortableFieldCard key={field.id} field={field}>
                    <div className="rounded-lg border border-border bg-card pl-9 pr-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {field.label.trim() || `Campo ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ordem {index + 1} no relatório
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}
                          aria-label="Remover campo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_11rem_auto] md:items-end">
                        <div className="space-y-1">
                          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Nome do campo
                          </label>
                          <Input
                            value={field.label}
                            onChange={(event) => updateField(field.id, { label: event.target.value })}
                            placeholder="Ex.: Credor, valor, data de vencimento"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Tipo
                          </label>
                          <Select
                            value={field.dataType}
                            onValueChange={(value) =>
                              updateField(field.id, { dataType: value as ReportFieldDataType })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex md:justify-end">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-full shrink-0 gap-1.5 md:w-auto md:min-w-[10.5rem]"
                                aria-label={`Regras de cor — ${field.label.trim() || `Campo ${index + 1}`}`}
                              >
                                <Palette className="h-4 w-4 shrink-0" />
                                <span className="truncate">Regras de cor</span>
                                <span className="ml-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                                  {field.conditionalRules.length}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              className="z-[200] w-[min(26rem,calc(100vw-1.5rem))] max-h-[min(70vh,28rem)] overflow-y-auto p-0"
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="border-b border-border px-3 py-2.5">
                                <p className="text-sm font-semibold text-foreground">Regras de cor</p>
                                <p className="text-xs text-muted-foreground">
                                  Condição, cor e se aplica ao valor ou à linha inteira no relatório.
                                </p>
                              </div>
                              <div className="space-y-3 p-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-full"
                                  onClick={() => addRule(field.id)}
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  Adicionar regra
                                </Button>
                                <div className="space-y-2">
                                  {field.conditionalRules.map((rule) => (
                                    <div
                                      key={rule.id}
                                      className="rounded-lg border border-border/70 bg-muted/20 p-3"
                                    >
                                      <div className="grid gap-3 sm:grid-cols-[10.5rem_minmax(0,1fr)]">
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
                                            <SelectTrigger className="h-9">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="z-[300] max-h-60">
                                              {CONDITION_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
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
                                            className="h-9"
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Cor
                                          </label>
                                          <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2">
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
                                          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2">
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

                                      <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                          {DEFAULT_FIELD_COLORS.map((preset) => (
                                            <button
                                              key={preset}
                                              type="button"
                                              className={cn(
                                                'h-6 w-6 rounded-full border transition-transform hover:scale-105',
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
                                          size="sm"
                                          className="h-8 ml-auto text-muted-foreground hover:text-destructive"
                                          onClick={() => removeRule(field.id, rule.id)}
                                        >
                                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                                          Remover
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  </SortableFieldCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-9 w-full border-dashed"
          onClick={() => setFields((current) => [...current, createEmptyField(current.length)])}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar campo
        </Button>
      </CardContent>
    </Card>
  );
}
