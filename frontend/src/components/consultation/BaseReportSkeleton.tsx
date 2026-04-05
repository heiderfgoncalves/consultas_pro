import { useState } from 'react';
import { type ConsultationBlock } from '@/stores/consultationStore';
import {
  AlertTriangle, Gauge, Award, DollarSign, TrendingUp,
  ShieldAlert, Building2, FileX, Users, FileWarning, FileText,
  User, Hash, Tag, Image as ImageIcon, Settings2, Trash2, Plus, CheckCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableText } from './report-blocks';

const iconMap: Record<string, any> = {
  AlertTriangle, Gauge, Award, DollarSign, TrendingUp, ShieldAlert, Building2, FileX, Users, FileWarning,
};

interface BaseReportSkeletonProps {
  blocks: ConsultationBlock[];
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  onEditSection?: (sectionId: string) => void;
}

function Expr({ children }: { children: string }) {
  return (
    <EditableText
      value={children}
      onChange={() => {}}
      tag="span"
      className="inline-block text-[10px] font-mono text-primary/70 bg-primary/5 px-1 py-0.5 rounded border border-dashed border-primary/20"
    />
  );
}

function SectionWrap({ id, title, children, onEdit }: {
  id: string;
  title: string;
  children: React.ReactNode;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="group/section relative">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-medium uppercase text-muted-foreground/60 tracking-wider">{title}</span>
        <button
          onClick={() => onEdit(id)}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity text-[9px] text-primary flex items-center gap-0.5 border border-primary/30 rounded px-1.5 py-0.5 bg-primary/5 hover:bg-primary/10 cursor-pointer"
        >
          <Settings2 className="w-2.5 h-2.5" /> Editar
        </button>
      </div>
      {children}
    </div>
  );
}

type SectionEditField = { label: string; expression: string };
type SectionEditState = { id: string; title: string; fields: SectionEditField[] } | null;

export default function BaseReportSkeleton({ blocks, logo, onLogoChange, onEditSection }: BaseReportSkeletonProps) {
  const [editingSection, setEditingSection] = useState<SectionEditState>(null);

  const sectionData: Record<string, { title: string; fields: SectionEditField[] }> = {
    header: { title: 'Header', fields: [
      { label: 'Empresa', expression: '{$template.company}' },
      { label: 'Título', expression: 'Relatório Analítico de Crédito' },
      { label: 'Data', expression: '{$template.date}' },
      { label: 'Protocolo', expression: '{$template.protocol}' },
    ]},
    'client-info': { title: 'Dados Pessoais', fields: [
      { label: 'Cliente Analisado', expression: '{$cliente.nome}' },
      { label: 'Documento', expression: '{$cliente.documento}' },
      { label: 'Tipo de Relatório', expression: 'Padrão' },
    ]},
    'financial-summary': { title: 'Resumo Financeiro', fields: [
      { label: 'Total Apontado', expression: '{$RESUMO_FINANCEIRO.totalApontado}' },
      { label: 'Total Deduzido', expression: '{$RESUMO_FINANCEIRO.totalDeduzido}' },
      { label: 'Risco Bacen (Vencido)', expression: '{$RESUMO_FINANCEIRO.riscoBacenVencido}' },
    ]},
    score: { title: 'Score de Crédito', fields: [
      { label: 'Score', expression: '{$SCORE.valor}' },
      { label: 'Faixa', expression: '{$SCORE.faixa}' },
      { label: 'Chance de pagar', expression: '{$SCORE.chancePagar}' },
      { label: 'Inadimplência', expression: '{$SCORE.probabilidadeInadimplencia}' },
    ]},
  };

  const openSectionEditor = (id: string) => {
    if (onEditSection) {
      onEditSection(id);
      return;
    }
    const data = sectionData[id];
    if (data) {
      setEditingSection({ id, title: data.title, fields: [...data.fields] });
    } else {
      const block = blocks.find((b) => b.id === id);
      setEditingSection({ id, title: block?.name ?? id, fields: [] });
    }
  };

  return (
    <div className="p-5 space-y-3 text-xs bg-card">

      {/* ===== HEADER ===== */}
      <SectionWrap id="header" title="Header" onEdit={openSectionEditor}>
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
                <div><Expr>{'{$template.company}'}</Expr></div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">Relatório Analítico de Crédito</div>
              </div>
            </div>
            <div className="text-right">
              <div><Expr>{'{$template.date}'}</Expr></div>
              <div className="mt-0.5"><Expr>{'PROT: {$template.protocol}'}</Expr></div>
            </div>
          </div>
        </div>
      </SectionWrap>

      {/* ===== DADOS PESSOAIS ===== */}
      <SectionWrap id="client-info" title="Dados Pessoais" onEdit={openSectionEditor}>
        <div className="rounded-lg border border-dashed border-border p-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[8px] uppercase text-muted-foreground/60">Cliente Analisado</span>
                <div><Expr>{'{$cliente.nome}'}</Expr></div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[8px] uppercase text-muted-foreground/60">Documento</span>
                <div><Expr>{'{$cliente.documento}'}</Expr></div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[8px] uppercase text-muted-foreground/60">Tipo de Relatório</span>
                <div className="text-[10px] text-muted-foreground">Padrão</div>
              </div>
            </div>
          </div>
        </div>
      </SectionWrap>

      {/* ===== RESUMO FINANCEIRO ===== */}
      <SectionWrap id="financial-summary" title="Resumo Financeiro" onEdit={openSectionEditor}>
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-[9px] font-medium uppercase text-muted-foreground/60 tracking-wider">Resumo Financeiro</span>
          <div className="flex-1 border-b border-dashed border-border/40" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-dashed border-border p-2">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-0.5 h-full min-h-[2rem] rounded bg-destructive/30 absolute left-0 top-0 bottom-0" />
              <span className="text-[8px] uppercase text-muted-foreground/60">Total Apontado</span>
            </div>
            <Expr>{'{$RESUMO_FINANCEIRO.totalApontado}'}</Expr>
            <div className="text-[7px] text-muted-foreground/40 mt-0.5">Soma bruta de apontamentos</div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-2">
            <span className="text-[8px] uppercase text-muted-foreground/60">Total Deduzido</span>
            <div className="mt-0.5"><Expr>{'{$RESUMO_FINANCEIRO.totalDeduzido}'}</Expr></div>
            <div className="text-[7px] text-muted-foreground/40 mt-0.5">Sem duplicidades</div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-2">
            <span className="text-[8px] uppercase text-muted-foreground/60">Risco Bacen (Vencido)</span>
            <div className="mt-0.5"><Expr>{'{$RESUMO_FINANCEIRO.riscoBacenVencido}'}</Expr></div>
            <div className="text-[7px] text-muted-foreground/40 mt-0.5">Prejuízo + Vencido</div>
          </div>
        </div>
      </SectionWrap>

      {/* ===== SCORE ===== */}
      {blocks.some((b) => b.id === '5') && (
        <SectionWrap id="score" title="Score de Crédito" onEdit={openSectionEditor}>
          <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
            <span className="text-[9px] text-muted-foreground/60">Como o mercado enxerga seu CPF hoje</span>
            <div className="flex items-start gap-4">
              <div className="w-[100px] text-center">
                <Gauge className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <div><Expr>{'{$SCORE.valor}'}</Expr></div>
                <div><Expr>{'{$SCORE.faixa}'}</Expr></div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Faixa', expr: '{$SCORE.faixaMin} a {$SCORE.faixaMax}' },
                  { label: 'Score', expr: '{$SCORE.valor}' },
                  { label: 'Chance de pagar', expr: '{$SCORE.chancePagar}%' },
                  { label: 'Inadimplência', expr: '{$SCORE.probabilidadeInadimplencia}%' },
                ].map((m, i) => (
                  <div key={i} className="rounded border border-dashed border-border/60 p-1.5">
                    <span className="text-[8px] text-muted-foreground/60">{m.label}</span>
                    <div><Expr>{m.expr}</Expr></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded border border-dashed border-border/40 p-2">
              <div className="flex gap-2">
                {['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'].map((b) => (
                  <span key={b} className="text-[8px] text-muted-foreground/50">{b}</span>
                ))}
              </div>
            </div>
          </div>
        </SectionWrap>
      )}

      {/* ===== BLOCOS DINÂMICOS ===== */}
      {blocks.filter((b) => b.id !== '5').map((block) => {
        const Icon = iconMap[block.icon] || FileText;
        return (
          <SectionWrap key={block.id} id={block.id} title={block.name} onEdit={openSectionEditor}>
            <div className="rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                <span className="text-[9px] font-medium uppercase text-muted-foreground/60 tracking-wider">{block.name}</span>
                <div className="flex-1 border-b border-dashed border-border/40" />
                <span className="text-[8px] text-muted-foreground/40">— registros</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  {Array.from({ length: block.id === '10' ? 3 : 5 }).map((_, c) => (
                    <div key={c} className="h-2 rounded border border-dashed border-border/30 flex-1" />
                  ))}
                </div>
                {[1, 2].map((r) => (
                  <div key={r} className="flex gap-1.5">
                    {Array.from({ length: block.id === '10' ? 3 : 5 }).map((_, c) => (
                      <div key={c} className="h-1.5 rounded border border-dashed border-border/20 flex-1" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </SectionWrap>
        );
      })}

      {/* ===== ADD SECTION ===== */}
      <button className="w-full rounded-lg border-2 border-dashed border-border/40 p-2 hover:border-primary/40 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer group">
        <Plus className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary" />
        <span className="text-[9px] text-muted-foreground/50 group-hover:text-primary font-medium">Adicionar seção</span>
      </button>

      {/* ===== FOOTER ===== */}
      <div className="border-t border-dashed border-border/40 pt-2 mt-3">
        <div className="text-[7px] text-muted-foreground/40 leading-relaxed">
          Aviso LGPD — Texto configurável do disclaimer
        </div>
        <div className="text-center mt-1.5">
          <Expr>{'{$template.date}'}</Expr>
          <span className="text-[8px] text-muted-foreground/40 mx-1">•</span>
          <Expr>{'{$template.protocol}'}</Expr>
        </div>
      </div>

      {/* ===== MODAL EDIÇÃO DE SEÇÃO ===== */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar seção: {editingSection?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editingSection?.fields.map((field, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Label</label>
                  <Input
                    value={field.label}
                    onChange={(e) => {
                      setEditingSection((prev) => {
                        if (!prev) return prev;
                        const fields = [...prev.fields];
                        fields[idx] = { ...fields[idx]!, label: e.target.value };
                        return { ...prev, fields };
                      });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Expressão</label>
                  <Input
                    value={field.expression}
                    onChange={(e) => {
                      setEditingSection((prev) => {
                        if (!prev) return prev;
                        const fields = [...prev.fields];
                        fields[idx] = { ...fields[idx]!, expression: e.target.value };
                        return { ...prev, fields };
                      });
                    }}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setEditingSection((prev) => prev ? { ...prev, fields: [...prev.fields, { label: '', expression: '' }] } : prev);
              }}
              className="w-full rounded border border-dashed border-border p-2 text-[10px] text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Adicionar campo
            </button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={() => setEditingSection(null)}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
