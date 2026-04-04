import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
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
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarClock,
  DollarSign,
  Filter,
  GripVertical,
  Hash,
  List,
  Percent,
  Plus,
  SplitSquareVertical,
  TableProperties,
  ToggleLeft,
  Trash2,
  Type,
} from 'lucide-react';
import type {
  ConsultationFieldType,
  MappingItemFilter,
  MappingItemFilterOp,
  ReportFieldDataType,
  TypeItemFilterConfig,
  TypeItemFilterGroup,
  TypeItemFilterRule,
} from '@/types/integrations';
import { cn } from '@/lib/utils';
import {
  createTypeItemFilterGroup,
  createTypeItemFilterRule,
  getActiveTypeItemFilterGroups,
} from '@/lib/typeItemFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FILTER_OPS: { value: MappingItemFilterOp; label: string }[] = [
  { value: 'eq', label: 'igual a' },
  { value: 'contains', label: 'contém' },
  { value: 'startsWith', label: 'começa com' },
  { value: 'endsWith', label: 'termina com' },
  { value: 'regex', label: 'regex' },
];

const SENTINEL_EMPTY = '__empty__';
const SENTINEL_FREE_FIELD = '__add_campo_livre__';
const SENTINEL_FREE_VALUE = '__add_valor_livre__';

/** Operador (condição) com largura fixa; campo e valor usam flex no JSX. */
const CRITERION_OP_TRIGGER =
  'h-8 w-[6.25rem] shrink-0 border-border/50 bg-background px-2 text-[11px]';
/** Preenche a coluna disponível (usar dentro de wrapper flex-1 min-w-0). */
const CRITERION_FLEX_TRIGGER =
  'h-8 w-full min-w-0 border-border/50 bg-background px-2 text-[11px] truncate';

type SuggestionPayload = {
  fields: string[];
  valuesByField: Record<string, string[]>;
  allValues: string[];
};

const REPORT_FIELD_TYPE_ICONS: Record<ReportFieldDataType, LucideIcon> = {
  text: Type,
  boolean: ToggleLeft,
  numeric: Hash,
  date: Calendar,
  datetime: CalendarClock,
  currency: DollarSign,
  percent: Percent,
};

function ReportFieldDataTypeIcon({
  dataType,
  className,
}: {
  dataType: ReportFieldDataType;
  className?: string;
}) {
  const Icon = REPORT_FIELD_TYPE_ICONS[dataType] ?? Type;
  return <Icon className={cn('h-4 w-4 shrink-0', className)} aria-hidden />;
}

function SortableRuleRow({
  rule,
  children,
}: {
  rule: TypeItemFilterRule;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
      className="rounded-md border border-border/50 bg-background/90 px-1 py-0.5"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 cursor-grab active:cursor-grabbing"
          aria-label="Arrastar critério"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center">{children}</div>
      </div>
    </div>
  );
}

export default function TypeCriteriaDialog({
  open,
  fieldType,
  draftConfig,
  suggestions,
  jsonFieldOptions,
  mappedRegionCount,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  fieldType: ConsultationFieldType;
  draftConfig: TypeItemFilterConfig;
  suggestions: SuggestionPayload;
  jsonFieldOptions: string[];
  mappedRegionCount: number;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (next: TypeItemFilterConfig) => void;
  onSave: () => void;
}) {
  const [uiModeByRule, setUiModeByRule] = useState<Record<string, { fieldList: boolean; valueList: boolean }>>({});
  const [criteriaModalEl, setCriteriaModalEl] = useState<HTMLDivElement | null>(null);
  const dialogWasOpenRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (!open) {
      setCriteriaModalEl(null);
      dialogWasOpenRef.current = false;
      return;
    }
    const justOpened = !dialogWasOpenRef.current;
    dialogWasOpenRef.current = true;

    const rules = draftConfig.groups.flatMap((group) => group.rules);
    setUiModeByRule((current) => {
      const next: Record<string, { fieldList: boolean; valueList: boolean }> = {};
      for (const rule of rules) {
        const valueOptions = rule.field.trim()
          ? (suggestions.valuesByField[rule.field] ?? [])
          : suggestions.allValues;
        if (justOpened || current[rule.id] === undefined) {
          next[rule.id] = {
            fieldList:
              rule.field === ''
              || suggestions.fields.length === 0
              || suggestions.fields.includes(rule.field),
            valueList:
              rule.value === ''
              || valueOptions.length === 0
              || valueOptions.includes(rule.value),
          };
        } else {
          next[rule.id] = current[rule.id]!;
        }
      }
      return next;
    });
  }, [open, draftConfig, suggestions]);

  const reportFields = useMemo(
    () => [...(fieldType.reportFieldConfig?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldType.reportFieldConfig],
  );

  const activeRuleCount = getActiveTypeItemFilterGroups(draftConfig).reduce(
    (total, group) => total + group.rules.length,
    0,
  );

  const patchGroups = (updater: (current: TypeItemFilterGroup[]) => TypeItemFilterGroup[]) => {
    onDraftChange({
      ...draftConfig,
      groups: updater(draftConfig.groups),
    });
  };

  const patchRule = (groupId: string, ruleId: string, patch: Partial<MappingItemFilter>) => {
    patchGroups((groups) =>
      groups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              rules: group.rules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
            },
      ),
    );
  };

  const setRuleMode = (ruleId: string, patch: Partial<{ fieldList: boolean; valueList: boolean }>) => {
    setUiModeByRule((current) => ({
      ...current,
      [ruleId]: { ...(current[ruleId] ?? { fieldList: true, valueList: true }), ...patch },
    }));
  };

  const addRule = (groupId: string) => {
    patchGroups((groups) =>
      groups.map((group) =>
        group.id === groupId ? { ...group, rules: [...group.rules, createTypeItemFilterRule()] } : group,
      ),
    );
  };

  const removeRule = (groupId: string, ruleId: string) => {
    patchGroups((groups) =>
      groups.flatMap((group) => {
        if (group.id !== groupId) return [group];
        const rules = group.rules.filter((rule) => rule.id !== ruleId);
        return rules.length ? [{ ...group, rules }] : [];
      }),
    );
  };

  const addOrGroup = () => {
    onDraftChange({
      ...draftConfig,
      groups: [...draftConfig.groups, createTypeItemFilterGroup(draftConfig.groups.length === 0 ? 'and' : 'or')],
    });
  };

  const updateGroupJoinOperator = (groupId: string, joinOperator: TypeItemFilterGroup['joinOperator']) => {
    patchGroups((groups) =>
      groups.map((group) => (group.id === groupId ? { ...group, joinOperator } : group)),
    );
  };

  const removeGroup = (groupId: string) => {
    patchGroups((groups) => groups.filter((group) => group.id !== groupId));
  };

  const findRuleLocation = (ruleId: string) => {
    for (const group of draftConfig.groups) {
      const index = group.rules.findIndex((rule) => rule.id === ruleId);
      if (index >= 0) return { groupId: group.id, index };
    }
    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeLocation = findRuleLocation(String(active.id));
    const overLocation = findRuleLocation(String(over.id));
    if (!activeLocation || !overLocation) return;

    patchGroups((groups) => {
      const next = groups.map((group) => ({ ...group, rules: [...group.rules] }));
      const fromGroup = next.find((group) => group.id === activeLocation.groupId);
      const toGroup = next.find((group) => group.id === overLocation.groupId);
      if (!fromGroup || !toGroup) return groups;

      const [moved] = fromGroup.rules.splice(activeLocation.index, 1);
      if (!moved) return groups;

      if (fromGroup.id === toGroup.id) {
        toGroup.rules = arrayMove(toGroup.rules, activeLocation.index, overLocation.index);
      } else {
        toGroup.rules.splice(overLocation.index, 0, moved);
      }

      return next.filter((group) => group.rules.length > 0);
    });
  };

  const upsertFieldMapping = (reportFieldId: string, reportFieldLabel: string, jsonPath: string) => {
    const nextMappings = draftConfig.fieldMappings.filter((mapping) => mapping.reportFieldId !== reportFieldId);
    if (jsonPath !== SENTINEL_EMPTY) {
      nextMappings.push({
        id: draftConfig.fieldMappings.find((mapping) => mapping.reportFieldId === reportFieldId)?.id ?? `${reportFieldId}_${Date.now()}`,
        reportFieldId,
        reportFieldLabel,
        jsonPath,
      });
    }
    onDraftChange({
      ...draftConfig,
      fieldMappings: nextMappings,
    });
  };

  const criteriaSubtitle =
    activeRuleCount > 0
      ? activeRuleCount === 1
        ? '1 regra ativa. Dentro da sessão, condições em AND; entre sessões, AND ou OR.'
        : `${activeRuleCount} regras ativas. Dentro da sessão, condições em AND; entre sessões, AND ou OR.`
      : 'Nenhuma regra ativa — o preview usa o trecho inteiro até você criar sessões e condições.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={setCriteriaModalEl}
        showClose={false}
        className="flex max-h-[92vh] w-[min(72rem,calc(100vw-1.5rem))] max-w-[min(72rem,95vw)] flex-col gap-0 overflow-hidden border border-border/60 bg-background p-0 shadow-sm sm:rounded-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Mapeamento e critérios — {fieldType.label}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-y-4 px-4 pb-4 pt-4 md:flex-row md:items-stretch md:gap-0">
            <section className="min-w-0 flex-1 space-y-3 md:min-w-0 md:flex-[1_1_0%] md:pr-5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <TableProperties className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm font-semibold leading-snug text-foreground">Mapeamento de Campos</p>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Campos do tipo — paths no trecho JSON mapeado.
                </p>
              </div>
              {reportFields.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-center text-[11px] text-muted-foreground">
                  Este tipo ainda não possui campos definidos.
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-muted/10">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 border-b border-border/50 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Campo do tipo</span>
                    <span>Campo do JSON</span>
                  </div>
                  <div className="space-y-1 p-2">
                    {reportFields.map((field) => {
                      const selected = draftConfig.fieldMappings.find((mapping) => mapping.reportFieldId === field.id)?.jsonPath ?? SENTINEL_EMPTY;
                      return (
                        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-2 rounded-md border border-border/50 bg-background/90 px-2 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/50 bg-muted/25 text-muted-foreground"
                              title={field.dataType}
                              aria-label={`Tipo do campo: ${field.dataType}`}
                            >
                              <ReportFieldDataTypeIcon dataType={field.dataType} className="h-3.5 w-3.5 text-foreground/80" />
                            </div>
                            <div className="flex min-w-0 min-h-0 flex-1 items-center justify-start overflow-hidden">
                              <div className="flex w-fit max-w-full min-w-0 items-center gap-0.5">
                                <span className="min-w-0 shrink truncate text-xs font-medium text-foreground">
                                  {field.label || 'Campo sem nome'}
                                </span>
                                <Tooltip delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full border border-border/55 bg-muted/40 text-[9px] font-bold leading-none text-muted-foreground outline-none hover:bg-muted/65 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                                      aria-label={`Chave: ${field.key}`}
                                    >
                                      ?
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    align="center"
                                    sideOffset={6}
                                    collisionBoundary={criteriaModalEl ?? undefined}
                                    collisionPadding={10}
                                    className="z-[300] max-w-[min(20rem,calc(100vw-2rem))] border-border/80 px-2 py-1.5 font-mono text-[11px] leading-snug text-foreground shadow-md"
                                  >
                                    <span className="block break-all select-all">{field.key}</span>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                          <Select value={selected} onValueChange={(value) => upsertFieldMapping(field.id, field.label, value)}>
                            <SelectTrigger className="h-8 border-border/50 bg-background text-[11px]">
                              <SelectValue placeholder="JSON…" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value={SENTINEL_EMPTY} className="text-xs text-muted-foreground">
                                Não mapear agora
                              </SelectItem>
                              {jsonFieldOptions.map((option) => (
                                <SelectItem key={option} value={option} className="font-mono text-xs">
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                  {jsonFieldOptions.length === 0 && (
                    <div className="border-t border-border/50 px-2 py-2 text-[11px] leading-snug text-muted-foreground">
                      Nenhum campo no trecho. Ajuste o mapeamento do JSON.
                    </div>
                  )}
                </div>
              )}
            </section>

            <div
              className="hidden shrink-0 self-stretch border-0 border-l border-dashed border-muted-foreground/25 md:mx-1 md:block dark:border-muted-foreground/20"
              aria-hidden
            />

            <section className="min-w-0 flex-1 space-y-3 md:min-w-0 md:flex-[1.05_1_0%] md:pl-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5 pr-1">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <p className="text-sm font-semibold leading-snug text-foreground">Critérios</p>
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">{criteriaSubtitle}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1 border-border/50 px-2.5 text-[11px] font-medium"
                  onClick={addOrGroup}
                >
                  <SplitSquareVertical className="h-3 w-3" />
                  Sessão OR
                </Button>
              </div>
              {draftConfig.groups.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-center">
                  <p className="text-xs font-medium text-foreground">Nenhum critério configurado</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    O preview usa o trecho inteiro até você adicionar regras. Comece criando uma sessão e, se quiser,
                    inclua condições AND na sessão.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 h-7 gap-1 border-border/50 px-2.5 text-[11px] font-medium"
                    onClick={addOrGroup}
                  >
                    <Plus className="h-3 w-3" />
                    Nova sessão
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="space-y-2">
                    {draftConfig.groups.map((group, groupIndex) => (
                      <div key={group.id} className="rounded-lg border border-border/50 bg-muted/10">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-2 py-1.5">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <Badge variant={group.joinOperator === 'or' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                              {groupIndex === 0 ? 'Base' : group.joinOperator}
                            </Badge>
                            {groupIndex > 0 && (
                              <Select
                                value={group.joinOperator}
                                onValueChange={(value) => updateGroupJoinOperator(group.id, value as TypeItemFilterGroup['joinOperator'])}
                              >
                                <SelectTrigger className="h-7 w-[7rem] border-border/50 bg-background text-[11px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="and" className="text-xs">AND com anterior</SelectItem>
                                  <SelectItem value="or" className="text-xs">OR com anterior</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <span className="hidden text-[11px] text-muted-foreground sm:inline">
                              AND na sessão.
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] hover:bg-muted/50" onClick={() => addRule(group.id)}>
                              <Plus className="h-3 w-3" />
                              AND
                            </Button>
                            {(draftConfig.groups.length > 1 || group.rules.length === 0) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeGroup(group.id)}
                                aria-label="Remover sessão"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 px-2 pb-2 pt-1">
                          {group.rules.length === 0 ? (
                            <div className="rounded-md border border-dashed border-border/50 bg-background/60 px-3 py-3 text-center">
                              <p className="text-[11px] text-muted-foreground">Nenhuma regra nesta sessão.</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 h-7 gap-1 px-2.5 text-[11px] font-medium"
                                onClick={() => addRule(group.id)}
                              >
                                <Plus className="h-3 w-3" />
                                Adicionar regra
                              </Button>
                            </div>
                          ) : (
                          <SortableContext items={group.rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1">
                              {group.rules.map((rule) => {
                                const uiMode = uiModeByRule[rule.id] ?? { fieldList: true, valueList: true };
                                const valueOptions = rule.field.trim()
                                  ? (suggestions.valuesByField[rule.field] ?? [])
                                  : suggestions.allValues;
                                const showFieldSelect = uiMode.fieldList && (suggestions.fields.length > 0 || rule.field === '');
                                const showValueSelect = uiMode.valueList && (valueOptions.length > 0 || rule.value === '');

                                return (
                                  <SortableRuleRow key={rule.id} rule={rule}>
                                    <div className="flex min-w-0 flex-1 items-center gap-1">
                                      <div className="flex min-w-0 flex-1 items-center gap-1">
                                        <div className="min-w-0 flex-1 basis-0">
                                        {showFieldSelect ? (
                                          <Select
                                            value={rule.field && suggestions.fields.includes(rule.field) ? rule.field : SENTINEL_EMPTY}
                                            onValueChange={(value) => {
                                              if (value === SENTINEL_FREE_FIELD) {
                                                setRuleMode(rule.id, { fieldList: false });
                                                return;
                                              }
                                              patchRule(group.id, rule.id, { field: value === SENTINEL_EMPTY ? '' : value });
                                            }}
                                          >
                                            <SelectTrigger className={CRITERION_FLEX_TRIGGER}>
                                              <SelectValue placeholder="Campo" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 z-[200]">
                                              <SelectItem value={SENTINEL_EMPTY} className="text-xs text-muted-foreground">
                                                Campo…
                                              </SelectItem>
                                              {suggestions.fields.map((field) => (
                                                <SelectItem key={field} value={field} className="font-mono text-xs">
                                                  {field}
                                                </SelectItem>
                                              ))}
                                              <SelectItem value={SENTINEL_FREE_FIELD} className="text-xs font-medium text-primary">
                                                + Livre
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div className="flex w-full min-w-0 items-center gap-0.5">
                                            <Input
                                              value={rule.field}
                                              onChange={(event) => patchRule(group.id, rule.id, { field: event.target.value })}
                                              placeholder="Campo"
                                              className="h-8 min-w-0 flex-1 border-border/50 bg-background px-2 font-mono text-[11px]"
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-7 shrink-0 px-0"
                                              onClick={() => setRuleMode(rule.id, { fieldList: true })}
                                              aria-label="Lista de campos"
                                            >
                                              <List className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                        </div>

                                        <Select
                                          value={rule.op}
                                          onValueChange={(value) => patchRule(group.id, rule.id, { op: value as MappingItemFilterOp })}
                                        >
                                          <SelectTrigger className={CRITERION_OP_TRIGGER}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {FILTER_OPS.map((op) => (
                                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                                {op.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <div className="min-w-0 flex-1 basis-0">
                                        {showValueSelect ? (
                                          <Select
                                            value={rule.value && valueOptions.includes(rule.value) ? rule.value : SENTINEL_EMPTY}
                                            onValueChange={(value) => {
                                              if (value === SENTINEL_FREE_VALUE) {
                                                setRuleMode(rule.id, { valueList: false });
                                                return;
                                              }
                                              patchRule(group.id, rule.id, { value: value === SENTINEL_EMPTY ? '' : value });
                                            }}
                                          >
                                            <SelectTrigger className={CRITERION_FLEX_TRIGGER}>
                                              <SelectValue placeholder="Valor" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 z-[200]">
                                              <SelectItem value={SENTINEL_EMPTY} className="text-xs text-muted-foreground">
                                                Valor…
                                              </SelectItem>
                                              {valueOptions.map((value) => (
                                                <SelectItem key={value} value={value} className="text-xs">
                                                  <span className="line-clamp-2">{value}</span>
                                                </SelectItem>
                                              ))}
                                              <SelectItem value={SENTINEL_FREE_VALUE} className="text-xs font-medium text-primary">
                                                + Livre
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <div className="flex w-full min-w-0 items-center gap-0.5">
                                            <Input
                                              value={rule.value}
                                              onChange={(event) => patchRule(group.id, rule.id, { value: event.target.value })}
                                              placeholder="Valor"
                                              className="h-8 min-w-0 flex-1 border-border/50 bg-background px-2 text-[11px]"
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-7 shrink-0 px-0"
                                              onClick={() => setRuleMode(rule.id, { valueList: true })}
                                              aria-label="Lista de valores"
                                            >
                                              <List className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                        </div>
                                      </div>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => removeRule(group.id, rule.id)}
                                        aria-label="Remover critério"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </SortableRuleRow>
                                );
                              })}
                            </div>
                          </SortableContext>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </DndContext>
              )}
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col gap-3 border-t border-border/50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="h-6 border-0 px-2 text-[10px] font-medium">
              {fieldType.label}
            </Badge>
            <Badge variant="outline" className="h-6 border-border/60 px-2 text-[10px] font-medium text-muted-foreground">
              {mappedRegionCount} trecho{mappedRegionCount !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" className="h-8 text-[11px]" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" className="h-8 px-4 text-[11px] font-medium" onClick={onSave}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
