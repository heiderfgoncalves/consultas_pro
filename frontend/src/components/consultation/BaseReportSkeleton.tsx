import type { CSSProperties } from 'react';
import {
  FileText, Gauge, Image as ImageIcon, Plus, Settings2, Trash2, GripVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TemplateField, TemplateSection } from '@/lib/templateSectionUtils';
import { evaluateExpression, type ExpressionContext } from '@/lib/expressionEngine';
import { EditableText } from './report-blocks';
import { getIconByName } from './report-blocks/IconPicker';

interface BaseReportSkeletonProps {
  sections: TemplateSection[];
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  onEditSection?: (sectionId: string) => void;
  onAddSection?: () => void;
  onRemoveSection?: (sectionId: string) => void;
  onFieldExpressionChange?: (sectionId: string, fieldId: string, value: string) => void;
  onFieldLabelChange?: (sectionId: string, fieldId: string, value: string) => void;
  onFieldSelect?: (fieldId: string) => void;
  onCanvasDeselect?: () => void;
  selectedFieldId?: string | null;
  showAddSection?: boolean;
  showFooter?: boolean;
  renderFieldOptionTrigger?: (sectionId: string, field: TemplateField) => React.ReactNode;
  enableFieldSorting?: boolean;
  mode?: 'skeleton' | 'preview';
  expressionContext?: ExpressionContext;
}

function fieldStyle(field: TemplateField): CSSProperties {
  return {
    fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
    margin: field.spacing ? `${field.spacing}px` : undefined,
  };
}

function sectionIcon(section: TemplateSection): LucideIcon | null {
  if (section.icon) return getIconByName(section.icon);
  if (section.kind === 'score' || section.id === 'score') return Gauge;
  return null;
}

function SectionWrap({ section, children, onEdit, onRemove }: {
  section: TemplateSection;
  children: React.ReactNode;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const sortableId = `section-${section.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 };
  const Icon = sectionIcon(section);

  return (
    <div ref={setNodeRef} style={style} className="group/section relative">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab rounded border border-border bg-card p-0.5 text-muted-foreground opacity-0 active:cursor-grabbing group-hover/section:opacity-100"
            title="Reordenar seção"
          >
            <GripVertical className="h-3 w-3" />
          </button>
          {Icon && <Icon className="h-3 w-3 text-muted-foreground/70" />}
          <span className="truncate text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">{section.title}</span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(section.id)}
              className="flex items-center gap-0.5 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[9px] text-primary opacity-0 transition-opacity hover:bg-primary/10 group-hover/section:opacity-100"
            >
              <Settings2 className="h-2.5 w-2.5" /> Editar
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(section.id)}
              className="flex items-center gap-0.5 rounded border border-destructive/30 bg-destructive/5 px-1.5 py-0.5 text-[9px] text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover/section:opacity-100"
            >
              <Trash2 className="h-2.5 w-2.5" /> Remover
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldWrap({
  field,
  children,
  enableSorting,
}: {
  field: TemplateField;
  children: React.ReactNode;
  enableSorting?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id, disabled: !enableSorting });
  const style = enableSorting
    ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }
    : undefined;
  return (
    <div ref={enableSorting ? setNodeRef : undefined} style={style} {...(enableSorting ? attributes : {})} {...(enableSorting ? listeners : {})}>
      {children}
    </div>
  );
}

export default function BaseReportSkeleton({
  sections,
  logo,
  onLogoChange,
  onEditSection,
  onAddSection,
  onFieldExpressionChange,
  onFieldLabelChange,
  onFieldSelect,
  onCanvasDeselect,
  selectedFieldId,
  onRemoveSection,
  showAddSection = true,
  showFooter = true,
  renderFieldOptionTrigger,
  enableFieldSorting = false,
  mode = 'skeleton',
  expressionContext,
}: BaseReportSkeletonProps) {
  const isPreview = mode === 'preview';

  const resolveExpression = (value: string) => {
    if (!isPreview || !expressionContext) return value;
    return evaluateExpression(value, expressionContext);
  };

  const renderExpr = (sectionId: string, field: TemplateField, className?: string) => (
    <span className="group/field inline-flex items-center gap-1">
      <EditableText
        value={resolveExpression(field.expression)}
        onChange={onFieldExpressionChange ? (v) => onFieldExpressionChange(sectionId, field.id, v) : undefined}
        tag="span"
        className={`rounded border border-dashed px-1 py-0.5 font-mono text-[10px] text-muted-foreground/80 bg-muted/40 cursor-pointer ${selectedFieldId === field.id ? 'ring-2 ring-primary/35' : ''} ${className ?? ''}`}
        style={fieldStyle(field)}
        onClick={() => onFieldSelect?.(field.id)}
        disabled={isPreview}
      />
      {renderFieldOptionTrigger ? (
        <span className="opacity-0 transition-opacity group-hover/field:opacity-100">
          {renderFieldOptionTrigger(sectionId, field)}
        </span>
      ) : null}
    </span>
  );

  const renderLabel = (sectionId: string, field: TemplateField) => (
    <EditableText
      value={field.label}
      onChange={onFieldLabelChange ? (v) => onFieldLabelChange(sectionId, field.id, v) : undefined}
      tag="span"
      className={`cursor-pointer text-[8px] uppercase text-muted-foreground/65 ${selectedFieldId === field.id ? 'ring-2 ring-primary/35 rounded' : ''}`}
      onClick={() => onFieldSelect?.(field.id)}
      disabled={isPreview}
    />
  );

  const renderGenericFields = (section: TemplateSection) => (
    <div className="rounded-lg border border-dashed border-border p-3">
      {section.fields.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {section.fields.map((field) => {
            const Icon = field.icon ? getIconByName(field.icon) : FileText;
            return (
              <FieldWrap key={field.id} field={field} enableSorting={enableFieldSorting}>
                <div className="group/item relative flex items-start gap-2 rounded border border-dashed border-border/60 p-2">
                {field.icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/45" />}
                <div className="min-w-0">
                  {renderLabel(section.id, field)}
                  <div>{renderExpr(section.id, field)}</div>
                </div>
                {renderFieldOptionTrigger ? <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/item:opacity-100">{renderFieldOptionTrigger(section.id, field)}</div> : null}
                </div>
              </FieldWrap>
            );
          })}
        </div>
      ) : (
        <div className="py-2 text-center text-[9px] italic text-muted-foreground/50">Seção vazia - clique em Editar para configurar</div>
      )}
    </div>
  );

  const renderSectionBody = (section: TemplateSection) => {
    if (section.kind === 'header' || section.id === 'header') {
      return (
        <div className="pb-2" style={{ borderBottom: '3px solid hsl(var(--primary))' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Logo" className="h-[40px] object-contain" />
              ) : (
                <button
                  type="button"
                  onClick={() => onLogoChange && document.getElementById('skel-logo-input')?.click()}
                  className="flex h-[40px] w-[40px] cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-border hover:border-primary/40"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[6px] text-muted-foreground/50">LOGO</span>
                </button>
              )}
              <input id="skel-logo-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { const r = new FileReader(); r.onload = (ev) => onLogoChange?.(ev.target?.result as string); r.readAsDataURL(file); }
              }} />
              <div>
                {section.fields[0] && <div>{renderExpr(section.id, section.fields[0])}</div>}
                {section.fields[1] && <div className="mt-0.5 text-[9px] text-muted-foreground">{renderExpr(section.id, section.fields[1])}</div>}
              </div>
            </div>
            <div className="space-y-0.5 text-right">
              {section.fields.slice(2).map((field) => <div key={field.id}>{renderExpr(section.id, field)}</div>)}
            </div>
          </div>
        </div>
      );
    }

    if (section.kind === 'kpi-row' || section.id === 'financial-summary') {
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {section.fields.map((field) => (
            <div key={field.id} className="rounded-lg border border-dashed border-border p-2">
              {renderLabel(section.id, field)}
              <div className="mt-0.5">{renderExpr(section.id, field)}</div>
            </div>
          ))}
        </div>
      );
    }

    if (section.kind === 'score' || section.id === 'score') {
      const title = section.fields[0];
      const subtitle = section.fields[1];
      const scoreIconField = section.fields.find((f) => f.tag === 'speedometer') ?? section.fields[2];
      const metricFields = section.fields.filter((field) => field.tag === 'value').slice(0, 4);
      const extraTextFields = section.fields.filter((field) => field.tag === 'text').slice(2, 8);
      return (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
          {title && <div>{renderExpr(section.id, title, 'block text-[12px] text-foreground/80 bg-transparent border-0 px-0')}</div>}
          {subtitle && <div>{renderExpr(section.id, subtitle, 'block text-[10px] text-muted-foreground bg-transparent border-0 px-0')}</div>}
          <div className="flex flex-wrap items-start gap-3">
            <div className="w-[140px] rounded-lg border border-dashed border-border/60 p-3 text-center">
              <Gauge className="mx-auto h-8 w-8 text-muted-foreground/35" />
              {scoreIconField && <div className="mt-1">{renderExpr(section.id, scoreIconField)}</div>}
            </div>
            <div className="grid min-w-[280px] flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              {metricFields.map((field) => {
                const Icon = field.icon ? getIconByName(field.icon) : Gauge;
                return (
                  <FieldWrap key={field.id} field={field} enableSorting={enableFieldSorting}>
                    <div className="group/item relative flex items-start gap-2 rounded border border-dashed border-border/60 p-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/45" />
                    <div className="min-w-0">
                      {renderLabel(section.id, field)}
                      <div>{renderExpr(section.id, field)}</div>
                    </div>
                    {renderFieldOptionTrigger ? <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/item:opacity-100">{renderFieldOptionTrigger(section.id, field)}</div> : null}
                    </div>
                  </FieldWrap>
                );
              })}
            </div>
          </div>
          {extraTextFields.map((field) => (
            <FieldWrap key={field.id} field={field} enableSorting={enableFieldSorting}>
              <div className="group/item relative rounded border border-dashed border-border/60 p-2">
              {renderLabel(section.id, field)}
              <div>{renderExpr(section.id, field, 'block bg-transparent border-0')}</div>
              {renderFieldOptionTrigger ? <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/item:opacity-100">{renderFieldOptionTrigger(section.id, field)}</div> : null}
              </div>
            </FieldWrap>
          ))}
        </div>
      );
    }

    if (section.kind === 'debt-table' || section.id === 'debt-table') {
      return (
        <div className="overflow-hidden rounded-lg border border-dashed border-border">
          <table className="w-full">
            <thead className="bg-muted/35">
              <tr>
                {section.fields.map((field) => (
                  <th key={field.id} className="px-2 py-1.5 text-left">{renderLabel(section.id, field)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-dashed border-border">
                {section.fields.map((field) => (
                  <td key={field.id} className="group/item relative px-2 py-1.5">
                    {renderExpr(section.id, field)}
                    {renderFieldOptionTrigger ? <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/item:opacity-100">{renderFieldOptionTrigger(section.id, field)}</div> : null}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return renderGenericFields(section);
  };

  return (
    <div className="space-y-3 bg-card p-5" onClick={() => onCanvasDeselect?.()}>
      {sections.map((section) => (
        <div key={section.id} onClick={(e) => e.stopPropagation()}>
          <SectionWrap section={section} onEdit={onEditSection} onRemove={onRemoveSection}>
            {renderSectionBody(section)}
          </SectionWrap>
        </div>
      ))}

      {showAddSection && (
        <button
          type="button"
          onClick={onAddSection}
          className="group flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border/45 p-2 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground/55 group-hover:text-primary" />
          <span className="text-[9px] font-medium text-muted-foreground/55 group-hover:text-primary">Adicionar seção</span>
        </button>
      )}

      {showFooter && (
        <div className="mt-3 border-t border-dashed border-border/40 pt-2">
          <div className="text-[7px] leading-relaxed text-muted-foreground/40">Aviso LGPD - Texto configurável do disclaimer</div>
        </div>
      )}
    </div>
  );
}
