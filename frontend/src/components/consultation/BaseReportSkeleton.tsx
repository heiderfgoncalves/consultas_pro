import {
  DollarSign, FileText, Gauge, Image as ImageIcon, Plus, Settings2,
  User, Hash, Tag,
} from 'lucide-react';
import type { TemplateSection } from '@/lib/templateSectionUtils';
import { EditableText } from './report-blocks';
import { getIconByName } from './report-blocks/IconPicker';

interface BaseReportSkeletonProps {
  sections: TemplateSection[];
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  onEditSection?: (sectionId: string) => void;
  onAddSection?: () => void;
  onFieldExpressionChange?: (sectionId: string, fieldId: string, value: string) => void;
  onFieldLabelChange?: (sectionId: string, fieldId: string, value: string) => void;
}

const SECTION_ICON_MAP: Record<string, any> = {
  'client-info': User,
  'financial-summary': DollarSign,
  score: Gauge,
};

function SectionWrap({ id, title, children, onEdit }: {
  id: string;
  title: string;
  children: React.ReactNode;
  onEdit?: (id: string) => void;
}) {
  return (
    <div className="group/section relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-medium uppercase text-muted-foreground/60 tracking-wider">{title}</span>
        {onEdit && (
          <button
            onClick={() => onEdit(id)}
            className="opacity-0 group-hover/section:opacity-100 transition-opacity text-[9px] text-primary flex items-center gap-0.5 border border-primary/30 rounded px-1.5 py-0.5 bg-primary/5 hover:bg-primary/10 cursor-pointer"
          >
            <Settings2 className="w-2.5 h-2.5" /> Editar
          </button>
        )}
      </div>
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
}: BaseReportSkeletonProps) {
  const headerSection = sections.find((s) => s.id === 'header');
  const clientSection = sections.find((s) => s.id === 'client-info');
  const financialSection = sections.find((s) => s.id === 'financial-summary');
  const scoreSection = sections.find((s) => s.id === 'score');
  const dynamicSections = sections.filter(
    (s) => !['header', 'client-info', 'financial-summary', 'score'].includes(s.id),
  );

  const renderExpr = (sectionId: string, fieldId: string, value: string, className?: string) => (
    <EditableText
      value={value}
      onChange={onFieldExpressionChange ? (v) => onFieldExpressionChange(sectionId, fieldId, v) : undefined}
      tag="span"
      className={`text-[10px] font-mono text-primary/70 bg-primary/5 px-1 py-0.5 rounded border border-dashed border-primary/20 ${className ?? ''}`}
    />
  );

  const renderLabel = (sectionId: string, fieldId: string, value: string) => (
    <EditableText
      value={value}
      onChange={onFieldLabelChange ? (v) => onFieldLabelChange(sectionId, fieldId, v) : undefined}
      tag="span"
      className="text-[8px] uppercase text-muted-foreground/60"
    />
  );

  return (
    <div className="p-5 space-y-3 text-xs bg-card">
      {/* HEADER */}
      {headerSection && (
        <SectionWrap id="header" title="Header" onEdit={onEditSection}>
          <div className="pb-2" style={{ borderBottom: '3px solid hsl(var(--primary))' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt="Logo" className="h-[40px] object-contain" />
                ) : (
                  <button
                    onClick={() => onLogoChange && document.getElementById('skel-logo-input')?.click()}
                    className="w-[40px] h-[40px] rounded border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <span className="text-[6px] text-muted-foreground/50">LOGO</span>
                  </button>
                )}
                <input id="skel-logo-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { const r = new FileReader(); r.onload = (ev) => onLogoChange?.(ev.target?.result as string); r.readAsDataURL(file); }
                }} />
                <div>
                  {headerSection.fields[0] && <div>{renderExpr('header', headerSection.fields[0].id, headerSection.fields[0].expression)}</div>}
                  {headerSection.fields[1] && <div className="mt-0.5 text-[9px] text-muted-foreground">{renderExpr('header', headerSection.fields[1].id, headerSection.fields[1].expression)}</div>}
                </div>
              </div>
              <div className="text-right space-y-0.5">
                {headerSection.fields[2] && <div>{renderExpr('header', headerSection.fields[2].id, headerSection.fields[2].expression)}</div>}
                {headerSection.fields[3] && <div>{renderExpr('header', headerSection.fields[3].id, headerSection.fields[3].expression)}</div>}
              </div>
            </div>
          </div>
        </SectionWrap>
      )}

      {/* DADOS PESSOAIS */}
      {clientSection && (
        <SectionWrap id="client-info" title="Dados Pessoais" onEdit={onEditSection}>
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="grid grid-cols-3 gap-3">
              {clientSection.fields.map((field) => {
                const Icon = field.icon ? getIconByName(field.icon) : FileText;
                return (
                  <div key={field.id} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                    <div>
                      {renderLabel('client-info', field.id, field.label)}
                      <div>{renderExpr('client-info', field.id, field.expression)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionWrap>
      )}

      {/* RESUMO FINANCEIRO */}
      {financialSection && (
        <SectionWrap id="financial-summary" title="Resumo Financeiro" onEdit={onEditSection}>
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-[9px] font-medium uppercase text-muted-foreground/60 tracking-wider">Resumo Financeiro</span>
            <div className="flex-1 border-b border-dashed border-border/40" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {financialSection.fields.map((field) => (
              <div key={field.id} className="rounded-lg border border-dashed border-border p-2">
                {renderLabel('financial-summary', field.id, field.label)}
                <div className="mt-0.5">{renderExpr('financial-summary', field.id, field.expression)}</div>
              </div>
            ))}
          </div>
        </SectionWrap>
      )}

      {/* SCORE */}
      {scoreSection && (
        <SectionWrap id="score" title="Score de Crédito" onEdit={onEditSection}>
          <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
            <div className="flex items-start gap-4">
              <div className="w-[100px] text-center">
                <Gauge className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                {scoreSection.fields[0] && <div>{renderExpr('score', scoreSection.fields[0].id, scoreSection.fields[0].expression)}</div>}
                {scoreSection.fields[1] && <div>{renderExpr('score', scoreSection.fields[1].id, scoreSection.fields[1].expression)}</div>}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                {scoreSection.fields.map((field) => (
                  <div key={field.id} className="rounded border border-dashed border-border/60 p-1.5">
                    {renderLabel('score', field.id, field.label)}
                    <div>{renderExpr('score', field.id, field.expression)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionWrap>
      )}

      {/* SEÇÕES DINÂMICAS */}
      {dynamicSections.map((section) => (
        <SectionWrap key={section.id} id={section.id} title={section.title} onEdit={onEditSection}>
          <div className="rounded-lg border border-dashed border-border p-3">
            {section.fields.length > 0 ? (
              <div className="space-y-1.5">
                {section.fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    {renderLabel(section.id, field.id, field.label)}
                    <span className="text-muted-foreground/30">→</span>
                    {renderExpr(section.id, field.id, field.expression)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-muted-foreground/40 italic text-center py-2">Seção vazia — clique em Editar para configurar</div>
            )}
          </div>
        </SectionWrap>
      ))}

      {/* ADICIONAR SEÇÃO */}
      <button
        onClick={onAddSection}
        className="w-full rounded-lg border-2 border-dashed border-border/40 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer group"
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary" />
        <span className="text-[9px] text-muted-foreground/50 group-hover:text-primary font-medium">Adicionar seção</span>
      </button>

      {/* FOOTER */}
      <div className="border-t border-dashed border-border/40 pt-2 mt-3">
        <div className="text-[7px] text-muted-foreground/40 leading-relaxed">
          Aviso LGPD — Texto configurável do disclaimer
        </div>
      </div>
    </div>
  );
}
