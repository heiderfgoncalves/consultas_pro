import { useState } from 'react';
import { type ConsultationBlock } from '@/stores/consultationStore';
import {
  AlertTriangle, Gauge, DollarSign, FileText, CheckCircle,
  User, Hash, Tag, Image as ImageIcon, Pencil, Settings2, Trash2, Plus,
} from 'lucide-react';
import { EditableText, SectionHeader, PlaceholderTable, PlaceholderScore, ReportFooter } from './report-blocks';

const iconMap: Record<string, any> = {
  AlertTriangle, Gauge, FileText,
};

interface BaseReportSkeletonProps {
  blocks: ConsultationBlock[];
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  onEditSection?: (sectionId: string) => void;
}

function ExprField({ expr, className }: { expr: string; className?: string }) {
  const [value, setValue] = useState(expr);
  return (
    <EditableText
      value={value}
      onChange={setValue}
      className={`font-mono text-[11px] text-primary/80 ${className ?? ''}`}
    />
  );
}

function SectionWrapper({ id, title, onEdit, onRemove, children }: {
  id: string;
  title: string;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group/section relative">
      <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-transparent group-hover/section:bg-primary/30 transition-colors rounded-full" />
      <div className="flex items-center justify-between mb-1.5">
        <EditableText
          value={title}
          onChange={() => {}}
          className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider"
          tag="span"
        />
        <div className="opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1">
          {onEdit && (
            <button onClick={() => onEdit(id)} className="text-[9px] text-primary hover:text-primary/80 flex items-center gap-0.5 border border-primary/30 rounded px-1.5 py-0.5 bg-primary/5 cursor-pointer">
              <Settings2 className="w-2.5 h-2.5" /> Editar
            </button>
          )}
          {onRemove && (
            <button onClick={() => onRemove(id)} className="text-[9px] text-destructive hover:text-destructive/80 flex items-center gap-0.5 border border-destructive/30 rounded px-1.5 py-0.5 bg-destructive/5 cursor-pointer">
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function BaseReportSkeleton({
  blocks,
  logo,
  onLogoChange,
  onEditSection,
}: BaseReportSkeletonProps) {
  return (
    <div className="p-5 space-y-4 text-xs bg-card">

      {/* ===== HEADER — espelho do ReportHeader preview ===== */}
      <SectionWrapper id="header" title="Header" onEdit={onEditSection}>
        <div className="pb-3" style={{ borderBottom: '3px solid hsl(var(--primary))' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Logo" className="h-[50px] object-contain" />
              ) : (
                <button
                  onClick={() => onLogoChange && document.getElementById('skel-logo-input')?.click()}
                  className="w-[50px] h-[50px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:border-primary hover:bg-primary/5 transition-colors group cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-[7px] text-muted-foreground group-hover:text-primary font-medium">LOGO</span>
                </button>
              )}
              <input id="skel-logo-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { const r = new FileReader(); r.onload = (ev) => onLogoChange?.(ev.target?.result as string); r.readAsDataURL(file); }
              }} />
              <div>
                <ExprField expr="{$template.company}" className="text-[10px] font-bold text-primary tracking-widest uppercase" />
                <ExprField expr="Relatório Analítico de Crédito" className="text-[9px] text-muted-foreground" />
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <ExprField expr="{$template.date}" className="text-[9px]" />
              <ExprField expr="PROT: {$template.protocol}" className="text-[9px]" />
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ===== DADOS DO CLIENTE — espelho do ClientInfoCard preview ===== */}
      <SectionWrapper id="client-info" title="Dados Pessoais" onEdit={onEditSection}>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <User className="w-[18px] h-[18px] text-muted-foreground" />
              </div>
              <div>
                <EditableText value="Cliente Analisado" onChange={() => {}} className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider" />
                <ExprField expr="{$json.cliente.nome}" className="text-[13px] font-semibold" />
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <Hash className="w-[18px] h-[18px] text-muted-foreground" />
              </div>
              <div>
                <EditableText value="Documento" onChange={() => {}} className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider" />
                <ExprField expr="{$json.cliente.documento}" className="text-[13px] font-semibold font-mono" />
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <Tag className="w-[18px] h-[18px] text-muted-foreground" />
              </div>
              <div>
                <EditableText value="Tipo de Relatório" onChange={() => {}} className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider" />
                <ExprField expr="Padrão" className="text-[13px] font-semibold" />
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ===== RESUMO FINANCEIRO — espelho do FinancialSummaryCards preview ===== */}
      <SectionWrapper id="financial-summary" title="Resumo Financeiro" onEdit={onEditSection}>
        <div>
          <SectionHeader icon={DollarSign} title="Resumo Financeiro" onTitleChange={() => {}} />
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-destructive" />
              <EditableText value="Total Apontado" onChange={() => {}} className="text-[9px] uppercase text-muted-foreground font-semibold pl-2" />
              <ExprField expr="{$RESUMO_FINANCEIRO.totalApontado}" className="text-lg font-bold text-destructive pl-2 block mt-0.5" />
              <EditableText value="Soma bruta de apontamentos" onChange={() => {}} className="text-[8px] text-muted-foreground pl-2 mt-0.5" tag="p" />
            </div>
            <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-success" />
              <EditableText value="Total Deduzido" onChange={() => {}} className="text-[9px] uppercase text-muted-foreground font-semibold pl-2" />
              <ExprField expr="{$RESUMO_FINANCEIRO.totalDeduzido}" className="text-lg font-bold text-success pl-2 block mt-0.5" />
              <EditableText value="Sem duplicidades" onChange={() => {}} className="text-[8px] text-muted-foreground pl-2 mt-0.5" tag="p" />
            </div>
            <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-warning" />
              <EditableText value="Risco Bacen (Vencido)" onChange={() => {}} className="text-[9px] uppercase text-muted-foreground font-semibold pl-2" />
              <ExprField expr="{$RESUMO_FINANCEIRO.riscoBacenVencido}" className="text-lg font-bold text-warning pl-2 block mt-0.5" />
              <EditableText value="Prejuízo + Vencido" onChange={() => {}} className="text-[8px] text-muted-foreground pl-2 mt-0.5" tag="p" />
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ===== SCORE — espelho da seção de score do preview ===== */}
      {blocks.some((b) => b.id === '5') && (
        <SectionWrapper id="score" title="Score de Crédito" onEdit={onEditSection}>
          <div className="rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div>
              <EditableText value="Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)" onChange={() => {}} className="text-[14px] font-bold text-foreground leading-snug block" tag="h3" />
              <EditableText value="Seu Score é uma estimativa de chance de pagar em dia nos próximos 6 meses." onChange={() => {}} className="text-[10px] text-muted-foreground leading-relaxed block mt-1" tag="p" />
            </div>
            <div className="flex items-start gap-6 flex-wrap">
              <div className="w-[175px] flex-shrink-0 text-center">
                <div className="w-[120px] h-[65px] mx-auto rounded-lg border-2 border-dashed border-border/60 flex items-center justify-center mb-1">
                  <Gauge className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <ExprField expr="{$SCORE.valor}" className="text-2xl font-semibold block" />
                <ExprField expr="{$SCORE.faixa}" className="text-[10px] font-semibold uppercase block" />
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Faixa', expr: '{$SCORE.faixaMin} a {$SCORE.faixaMax}', desc: 'Risco moderado. Valide renda e estabilidade.' },
                  { label: 'Score', expr: '{$SCORE.valor}', desc: 'Quanto maior, melhor a predisposição ao crédito.' },
                  { label: 'Chance de pagar (6 meses)', expr: '{$SCORE.chancePagar}%', desc: 'Estimativa de adimplência nos próximos 6 meses.' },
                  { label: 'Probabilidade de inadimplência', expr: '{$SCORE.probabilidadeInadimplencia}%', desc: 'Estimativa de inadimplência — use como apoio à decisão.' },
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2.5 shadow-sm">
                    <div className="w-[35px] h-[35px] min-w-[35px] rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                      <Gauge className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <EditableText value={m.label} onChange={() => {}} className="text-[13px] text-muted-foreground font-bold" />
                      <span className="text-[13px]">: </span>
                      <ExprField expr={m.expr} className="text-[14px] font-bold inline" />
                      <EditableText value={m.desc} onChange={() => {}} className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed block" tag="p" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Péssimo', range: '0–200', color: '#dc2626' },
                  { label: 'Ruim', range: '201–400', color: '#ea580c' },
                  { label: 'Regular', range: '401–600', color: '#ca8a04' },
                  { label: 'Bom', range: '601–800', color: '#65a30d' },
                  { label: 'Ótimo', range: '801–1000', color: '#16a34a' },
                ].map((band) => (
                  <div key={band.label} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: band.color }} />
                    <span className="font-medium text-foreground">{band.label}</span>
                    <span className="text-muted-foreground">{band.range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-l-[3px] border-primary rounded-r-lg bg-muted/30 p-3">
              <EditableText value="Hoje seu Score está em Regular (401 a 600) — isso geralmente indica que o mercado enxerga risco moderado." onChange={() => {}} className="text-[10px] text-foreground leading-relaxed block" tag="p" />
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* ===== BLOCOS DINÂMICOS ===== */}
      {blocks.filter((b) => b.id !== '5').map((block) => {
        const Icon = iconMap[block.icon] || FileText;
        return (
          <SectionWrapper key={block.id} id={block.id} title={block.name} onEdit={onEditSection}>
            <SectionHeader icon={Icon} title={block.name} isEdit badge="— registros" onTitleChange={() => {}} />
            <PlaceholderTable label={block.name} cols={block.id === '10' ? 3 : 5} />
            <EditableText value="" onChange={() => {}} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
          </SectionWrapper>
        );
      })}

      {/* ===== BOTÃO ADICIONAR SEÇÃO ===== */}
      <button className="w-full rounded-lg border-2 border-dashed border-border/60 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 cursor-pointer group">
        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
        <span className="text-[11px] text-muted-foreground group-hover:text-primary font-medium">Adicionar seção</span>
      </button>

      {/* ===== FOOTER ===== */}
      <ReportFooter mode="skeleton" onDisclaimerChange={() => {}} />
    </div>
  );
}
