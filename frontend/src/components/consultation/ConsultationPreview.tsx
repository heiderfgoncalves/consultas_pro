import React, { useState, useCallback, useRef } from 'react';
import { type ConsultationBlock } from '@/stores/consultationStore';
import {
  AlertTriangle, Gauge, Award, DollarSign, TrendingUp,
  ShieldAlert, Building2, FileX, Users, FileWarning, FileText,
  User, Hash, Tag, Pencil, Check, GripVertical, X,
  CheckCircle, Upload, Image as ImageIcon
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const iconMap: Record<string, any> = {
  AlertTriangle, Gauge, Award, DollarSign, TrendingUp, ShieldAlert, Building2, FileX, Users, FileWarning,
};

export type PreviewMode = 'edit' | 'preview';

interface ConsultationPreviewProps {
  blocks: ConsultationBlock[];
  document: string;
  onReorder?: (blocks: ConsultationBlock[]) => void;
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  clientName?: string;
  mode?: PreviewMode;
}

function EditableText({ value, onChange, className, tag: TagName = 'span', placeholder }: {
  value: string;
  onChange?: (val: string) => void;
  className?: string;
  tag?: 'span' | 'p' | 'h2' | 'h3' | 'div';
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (!onChange) return <TagName className={className}>{value}</TagName>;

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 w-full">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); onChange(text); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); onChange(text); } if (e.key === 'Escape') { setEditing(false); setText(value); } }}
          className="bg-primary/5 border border-primary/30 rounded px-1.5 py-0.5 outline-none text-foreground w-full text-inherit"
          style={{ fontSize: 'inherit', fontWeight: 'inherit' }}
        />
        <button onClick={() => { setEditing(false); onChange(text); }} className="text-primary hover:text-primary/80 flex-shrink-0"><Check className="w-3 h-3" /></button>
        <button onClick={() => { setEditing(false); setText(value); }} className="text-muted-foreground hover:text-destructive flex-shrink-0"><X className="w-3 h-3" /></button>
      </span>
    );
  }

  return (
    <span className="group/edit inline-flex items-center gap-1.5 relative cursor-pointer hover:bg-primary/5 rounded px-0.5 -mx-0.5 transition-colors" onClick={() => setEditing(true)}>
      <TagName className={className}>{text || placeholder || 'Clique para editar'}</TagName>
      <span className="opacity-0 group-hover/edit:opacity-100 transition-all duration-200 flex items-center gap-0.5 flex-shrink-0">
        <span className="bg-primary text-primary-foreground rounded p-0.5"><Pencil className="w-2.5 h-2.5" /></span>
      </span>
    </span>
  );
}

function ScoreSpeedometer({ score = 0, size = 'large' }: { score: number; size?: 'small' | 'large' }) {
  const clampedScore = Math.max(0, Math.min(1000, score));
  const angle = (clampedScore / 1000) * 180;
  const radian = (angle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 80;
  const needleX = cx - r * Math.cos(radian);
  const needleY = cy - r * Math.sin(radian);

  const getBand = (s: number) => {
    if (s <= 200) return { label: 'Péssimo', color: '#dc2626' };
    if (s <= 400) return { label: 'Ruim', color: '#ea580c' };
    if (s <= 600) return { label: 'Regular', color: '#ca8a04' };
    if (s <= 800) return { label: 'Bom', color: '#65a30d' };
    return { label: 'Ótimo', color: '#16a34a' };
  };

  const band = getBand(clampedScore);
  const isSmall = size === 'small';

  return (
    <div className="text-center">
      <svg viewBox="0 0 200 115" className={`w-full mx-auto ${isSmall ? 'max-w-[120px]' : 'max-w-[175px]'}`}>
        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="hsl(var(--border))" strokeWidth="14" strokeLinecap="round" />
        <path d="M 20 90 A 80 80 0 0 1 35.28 42.98" fill="none" stroke="#ef4444" strokeWidth="14" strokeLinecap="round" />
        <path d="M 35.28 42.98 A 80 80 0 0 1 75.28 13.91" fill="none" stroke="#f97316" strokeWidth="14" strokeLinecap="round" />
        <path d="M 75.28 13.91 A 80 80 0 0 1 124.72 13.91" fill="none" stroke="#eab308" strokeWidth="14" strokeLinecap="round" />
        <path d="M 124.72 13.91 A 80 80 0 0 1 164.72 42.98" fill="none" stroke="#84cc16" strokeWidth="14" strokeLinecap="round" />
        <path d="M 164.72 42.98 A 80 80 0 0 1 180 90" fill="none" stroke="#22c55e" strokeWidth="14" strokeLinecap="round" />
        <circle cx={needleX} cy={needleY} r="7" fill={band.color} stroke="white" strokeWidth="2" />
        <circle cx={needleX} cy={needleY} r="3" fill="white" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={band.color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="white" stroke="hsl(var(--border))" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="2" fill="hsl(var(--muted-foreground))" />
        <text x="15" y="110" fontSize="11" fill="hsl(var(--muted-foreground))" fontWeight="700">0</text>
        <text x="165" y="110" fontSize="11" fill="hsl(var(--muted-foreground))" fontWeight="700">1000</text>
      </svg>
      <p className={`font-semibold mt-1 tracking-tight ${isSmall ? 'text-lg' : 'text-2xl'}`} style={{ color: band.color }}>{clampedScore}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: band.color }}>{band.label}</p>
    </div>
  );
}

function SortableBlock({ block, children }: { block: ConsultationBlock; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="group/block relative">
        <button {...listeners} className="absolute -left-5 top-2 opacity-0 group-hover/block:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-accent">
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Placeholder wireframe for edit mode — dashed borders, no skeleton pulse
function PlaceholderTable({ label, cols = 3 }: { label: string; cols?: number }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border/60 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-dashed border-border/40">
        <div className="w-3 h-3 rounded border border-dashed border-muted-foreground/30" />
        <span className="text-[10px] text-muted-foreground/70 font-medium">{label}</span>
      </div>
      <div className="p-3 space-y-2.5">
        {/* Header row */}
        <div className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-2.5 rounded-sm border border-dashed border-border/50 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-2">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-2 rounded-sm border border-dashed border-border/30 flex-1" />
            ))}
          </div>
        ))}
      </div>
      <div className="px-3 py-1.5 text-[9px] text-muted-foreground/50 italic text-center border-t border-dashed border-border/40">
        Dados exibidos após emissão da consulta
      </div>
    </div>
  );
}

function PlaceholderScore() {
  return (
    <div className="rounded-lg border-2 border-dashed border-border/60 p-4 text-center space-y-3">
      <div className="w-[120px] h-[65px] mx-auto rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center">
        <Gauge className="w-6 h-6 text-muted-foreground/25" />
      </div>
      <div className="h-5 w-14 mx-auto rounded border border-dashed border-border/40" />
      <div className="grid grid-cols-2 gap-2 max-w-[280px] mx-auto">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center">
            <div className="w-8 h-1.5 rounded-sm border border-dashed border-border/30" />
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground/50 italic">Score e métricas exibidos após emissão</p>
    </div>
  );
}

// Mock data matching the HTML template
const mockSpcData = [
  { dtOcorr: '09/11/2025', dtInclusao: '19/12/2025', dtVencimento: '09/11/2025', contrato: 'FAT37521061', origem: 'CDL - SÃO PAULO / SP', credor: 'MOGI GUACU/SP', valor: 942.07 },
  { dtOcorr: '01/09/2025', dtInclusao: '15/10/2025', dtVencimento: '01/09/2025', contrato: '00000000000000018330', origem: 'SÃO PAULO / SP', credor: 'BRASILIA/DF', valor: 116.66 },
  { dtOcorr: '02/07/2025', dtInclusao: '10/08/2025', dtVencimento: '02/07/2025', contrato: '6505699953889900', origem: 'SÃO PAULO / SP', credor: 'SÃO PAULO/SP', valor: 302.70 },
  { dtOcorr: '20/04/2025', dtInclusao: '12/07/2025', dtVencimento: '20/04/2025', contrato: 'F104071978', origem: 'SÃO PAULO / SP', credor: 'CURITIBA/PR', valor: 825.24 },
];

const mockSerasaData = [
  { dtInclusao: '19/12/2025', dtVencimento: '09/11/2025', contrato: 'FAT37521061', origem: '- MOGI GUACU/SP', valor: 942.07 },
  { dtInclusao: '15/10/2025', dtVencimento: '01/09/2025', contrato: '00000000000000018330', origem: '- BRASILIA/DF', valor: 116.66 },
  { dtInclusao: '10/08/2025', dtVencimento: '02/07/2025', contrato: '6505699953889900', origem: '- SÃO PAULO/SP', valor: 302.70 },
  { dtInclusao: '12/07/2025', dtVencimento: '20/04/2025', contrato: 'F104071978', origem: '- CURITIBA/PR', valor: 825.24 },
  { dtInclusao: '14/05/2025', dtVencimento: '01/04/2025', contrato: '00000000000120714137', origem: '- BRASILIA/DF', valor: 4033.15 },
  { dtInclusao: '06/04/2025', dtVencimento: '21/02/2025', contrato: '12205000138708', origem: '- SÃO PAULO/SP', valor: 84702.00 },
  { dtInclusao: '01/04/2025', dtVencimento: '20/02/2025', contrato: '147759188', origem: '- BARUERI/SP', valor: 1135.54 },
];

const mockBacenConsolidado = [
  { cat: 'Carteira Ativa (A Vencer)', valor: '44.139,00', pct: '65,97%', type: 'success' as const },
  { cat: 'Vencido (Inadimplência)', valor: '20.347,00', pct: '30,41%', type: 'danger' as const },
  { cat: 'Prejuízo (Perda)', valor: '0,00', pct: '0,00%', type: 'warning' as const },
  { cat: 'Limite de Crédito', valor: '2.420,00', pct: '3,62%', type: 'neutral' as const },
];

const mockBacenOperacoes = [
  { grupo: 'EMPRÉSTIMOS / CRÉDITO PESSOAL - COM CONSIGNAÇÃO EM FOLHA', items: [
    { desc: 'Créditos a vencer de 31 a 60 dias', valor: '894,00', pct: '1,34%', vencido: false },
    { desc: 'Créditos a vencer de 91 a 180 dias', valor: '1.154,00', pct: '1,72%', vencido: false },
    { desc: 'Créditos a vencer de 181 a 360 dias', valor: '1.759,00', pct: '2,63%', vencido: false },
  ]},
  { grupo: 'EMPRÉSTIMOS / CRÉDITO ROTATIVO VINCULADO A CARTÃO', items: [
    { desc: 'Créditos a vencer até 30 dias', valor: '99,00', pct: '0,15%', vencido: false },
  ]},
  { grupo: 'FINANCIAMENTOS / AQUISIÇÃO DE BENS – VEÍCULOS', items: [
    { desc: 'Créditos a vencer até 30 dias', valor: '2.560,00', pct: '3,83%', vencido: false },
    { desc: 'Créditos a vencer de 31 a 60 dias', valor: '1.242,00', pct: '1,86%', vencido: false },
    { desc: 'Créditos vencidos de 31 a 60 dias', valor: '1.319,00', pct: '1,97%', vencido: true },
    { desc: 'Créditos vencidos de 61 a 90 dias', valor: '1.346,00', pct: '2,01%', vencido: true },
    { desc: 'Créditos vencidos de 181 a 240 dias', valor: '2.947,00', pct: '4,40%', vencido: true },
  ]},
];

export default function ConsultationPreview({ blocks, document: docInput, onReorder, logo, onLogoChange, clientName, mode = 'preview' }: ConsultationPreviewProps) {
  const [sectionTitles, setSectionTitles] = useState<Record<string, string>>({});
  const [additionalInfo, setAdditionalInfo] = useState<Record<string, string>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isEdit = mode === 'edit';

  const today = new Date().toLocaleDateString('pt-BR');
  const protocol = `CP-${Date.now().toString().slice(-8)}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      onReorder?.(arrayMove(blocks, oldIndex, newIndex));
    }
  }, [blocks, onReorder]);

  const updateSectionTitle = (id: string, title: string) => setSectionTitles(prev => ({ ...prev, [id]: title }));
  const updateAdditionalInfo = (id: string, info: string) => setAdditionalInfo(prev => ({ ...prev, [id]: info }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onLogoChange?.(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const scoreBands = [
    { label: 'Péssimo', range: '0–200', color: '#dc2626' },
    { label: 'Ruim', range: '201–400', color: '#ea580c' },
    { label: 'Regular', range: '401–600', color: '#ca8a04' },
    { label: 'Bom', range: '601–800', color: '#65a30d' },
    { label: 'Ótimo', range: '801–1000', color: '#16a34a' },
  ];

  const scoreMetrics = [
    { icon: Tag, label: 'Faixa', value: '401 a 600', desc: 'Risco moderado. Valide renda e estabilidade.', color: '#ca8a04' },
    { icon: Gauge, label: 'Score', value: '596', desc: 'Quanto maior, melhor a predisposição ao crédito.' },
    { icon: CheckCircle, label: 'Chance de pagar (6 meses)', value: '59.60%', desc: 'Estimativa de adimplência nos próximos 6 meses.' },
    { icon: AlertTriangle, label: 'Probabilidade de inadimplência', value: '40.40%', desc: 'Estimativa de inadimplência — use como apoio à decisão.' },
  ];

  const actionPlan = [
    { title: 'Limpar negativações', text: 'Negocie e quite as dívidas em aberto para remover apontamentos restritivos.' },
    { title: 'Manter pagamentos em dia', text: 'Pague cartões e parcelas antes do vencimento — isso reconstrói o histórico positivo.' },
    { title: 'Reduzir consultas de crédito', text: 'Evite múltiplas simulações em pouco tempo — o mercado interpreta como risco.' },
  ];

  const mockTotalApontado = 190828.59;
  const mockTotalDeduzido = 98654.57;
  const mockRiscoBacen = 20347.00;

  const SectionHeader = ({ icon: Icon, title, badge, blockId }: { icon: any; title: string; badge?: string; blockId?: string }) => (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 min-w-[32px] rounded-lg bg-muted border border-border flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <EditableText
        value={blockId ? (sectionTitles[blockId] || title) : title}
        onChange={blockId ? (v) => updateSectionTitle(blockId, v) : undefined}
        className="text-[13px] font-bold uppercase text-muted-foreground tracking-wider whitespace-nowrap"
        tag="h3"
      />
      <div className="flex-1 border-b-2 border-dashed border-border ml-1 min-w-[24px]" />
      {badge && (
        <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
          {isEdit ? '— registros' : badge}
        </span>
      )}
    </div>
  );

  return (
    <div className="p-5 space-y-4 text-xs bg-card">
      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />

      {/* ===== HEADER ===== */}
      <div className="pb-3" style={{ borderBottom: '3px solid hsl(var(--primary))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="group/logo relative cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                <img src={logo} alt="Logo" className="h-[50px] object-contain" />
                <div className="absolute inset-0 bg-foreground/50 rounded opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-background" />
                </div>
              </div>
            ) : (
              <button
                onClick={() => onLogoChange ? logoInputRef.current?.click() : undefined}
                className="w-[50px] h-[50px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:border-primary hover:bg-primary/5 transition-colors group cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                <span className="text-[7px] text-muted-foreground group-hover:text-primary font-medium">LOGO</span>
              </button>
            )}
            <div>
              <EditableText
                value="Consultas PRO"
                onChange={(v) => updateSectionTitle('header-title', v)}
                className="text-[10px] font-bold text-primary tracking-widest uppercase"
              />
              <EditableText
                value="Relatório Analítico de Crédito"
                onChange={(v) => updateSectionTitle('header-subtitle', v)}
                className="text-[9px] text-muted-foreground"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">{isEdit ? 'DD/MM/AAAA' : today}</p>
            <p className="text-[9px] text-muted-foreground font-mono">PROT: {isEdit ? 'CP-XXXXXXXX' : protocol}</p>
          </div>
        </div>
      </div>

      {/* ===== CLIENT INFO CARD ===== */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <User className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Cliente Analisado</p>
              <EditableText value={isEdit ? 'NOME DO CONSULTADO' : (clientName || 'NOME DO CONSULTADO')} onChange={(v) => updateSectionTitle('client-name', v)} className="text-[13px] font-semibold text-foreground" />
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Hash className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Documento</p>
              <p className="text-[13px] font-semibold text-foreground font-mono">{isEdit ? '000.000.000-00' : docInput}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Tag className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Tipo de Relatório</p>
              <EditableText
                value={blocks.length >= 8 ? 'Premium (Completa)' : 'Padrão'}
                onChange={(v) => updateSectionTitle('report-type', v)}
                className="text-[13px] font-semibold text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== FINANCIAL SUMMARY ===== */}
      <div>
        <SectionHeader icon={DollarSign} title="Resumo Financeiro" blockId="fin-summary" />
        {isEdit ? (
          <div className="grid grid-cols-3 gap-3">
            {['Total Apontado', 'Total Deduzido', 'Risco Bacen'].map((label) => (
              <div key={label} className="rounded-xl border border-dashed border-border p-3 relative overflow-hidden">
                <p className="text-[9px] uppercase text-muted-foreground font-semibold">{label}</p>
                <div className="h-5 w-24 bg-muted rounded animate-pulse mt-1" />
                <p className="text-[8px] text-muted-foreground mt-1">Calculado após emissão</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-destructive" />
              <p className="text-[9px] uppercase text-muted-foreground font-semibold pl-2">Total Apontado</p>
              <p className="text-lg font-bold text-destructive pl-2">R$ {mockTotalApontado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">Soma bruta de apontamentos</p>
            </div>
            <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-success" />
              <p className="text-[9px] uppercase text-muted-foreground font-semibold pl-2">Total Deduzido</p>
              <p className="text-lg font-bold text-success pl-2">R$ {mockTotalDeduzido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">Sem duplicidades</p>
            </div>
            <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-warning" />
              <p className="text-[9px] uppercase text-muted-foreground font-semibold pl-2">Risco Bacen (Vencido)</p>
              <p className="text-lg font-bold text-warning pl-2">R$ {mockRiscoBacen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">Prejuízo + Vencido</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== SCORE SECTION ===== */}
      {blocks.some(b => b.id === '5') && (
        isEdit ? (
          <div className="space-y-2">
            <SectionHeader icon={Gauge} title="Score de Crédito" blockId="score-section" />
            <PlaceholderScore />
          </div>
        ) : (
          <div className="rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div>
              <EditableText value="Como o mercado enxerga seu CPF hoje (e o que está travando seu crédito)" onChange={(v) => updateSectionTitle('score-hero', v)} className="text-[14px] font-bold text-foreground leading-snug block" tag="h3" />
              <EditableText value="Seu Score é uma estimativa de chance de pagar em dia nos próximos 6 meses. Quanto maior a pontuação, maior tende a ser a facilidade para conseguir crédito e melhores condições." onChange={(v) => updateAdditionalInfo('score-subtitle', v)} className="text-[10px] text-muted-foreground leading-relaxed block mt-1" tag="p" />
            </div>

            <div className="flex items-start gap-6 flex-wrap">
              <div className="w-[175px] flex-shrink-0">
                <ScoreSpeedometer score={596} />
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2.5">
                {scoreMetrics.map((m, i) => {
                  const MIcon = m.icon;
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2.5 shadow-sm">
                      <div className="w-[35px] h-[35px] min-w-[35px] rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                        <MIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] text-muted-foreground font-bold">{m.label}: </span>
                        <span className="text-[14px] font-bold" style={m.color ? { color: m.color } : {}}>{m.value}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{m.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="grid grid-cols-5 gap-2">
                {scoreBands.map((band) => (
                  <div key={band.label} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: band.color }} />
                    <span className="font-medium text-foreground">{band.label}</span>
                    <span className="text-muted-foreground">{band.range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-l-[3px] border-primary rounded-r-lg bg-muted/30 p-3">
              <EditableText value="Hoje seu Score está em Regular (401 a 600) — isso geralmente indica que o mercado enxerga risco moderado. O objetivo aqui é identificar o que mais pesa na sua pontuação e montar o caminho mais rápido para destravar aprovações." onChange={(v) => updateAdditionalInfo('score-interpretation', v)} className="text-[10px] text-foreground leading-relaxed block" tag="p" />
            </div>

            <div className="border-t border-border pt-3">
              <EditableText value="O que mais influencia sua pontuação" onChange={(v) => updateSectionTitle('score-influence', v)} className="text-[11px] font-bold text-muted-foreground block mb-2" tag="h3" />
              <EditableText value="O Serasa Score é calculado por pilares. Os que mais pesam são hábitos de pagamento e experiência/relacionamento com o mercado — e dívidas negativadas também têm impacto alto, considerando inclusive o tempo desde a quitação." onChange={(v) => updateAdditionalInfo('score-influence-text', v)} className="text-[10px] text-foreground leading-relaxed block mb-2" tag="p" />
              <ul className="space-y-1.5 text-[10px] text-foreground">
                {['Pagamentos em dia (cartão, parcelas e contas) têm peso alto na pontuação.', 'Dívidas negativadas costumam derrubar o Score e demoram a perder impacto sem regularização.', 'Muitas consultas/simulações de crédito em pouco tempo podem pesar negativamente (busca por crédito).'].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5"><span className="text-primary font-bold mt-0.5">•</span><EditableText value={item} onChange={(v) => updateAdditionalInfo(`inf-${i}`, v)} className="leading-relaxed" /></li>
                ))}
              </ul>
            </div>

            {/* Diagnostic block — dark mode fix */}
            <div className="rounded-lg p-3 bg-success/10 dark:bg-success/20 border border-success/20">
              <h4 className="text-[11px] font-bold text-success mb-1 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <EditableText value="Nós te ajudamos com tudo isso!" onChange={(v) => updateSectionTitle('diagnostic-title', v)} className="text-[11px] font-bold text-success" />
              </h4>
              <EditableText value="O que trava crédito quase sempre é simples: pendência/negativação + histórico recente. A boa notícia é que, com estratégia, dá pra acelerar sua reabilitação e voltar a ser aprovado com mais facilidade." onChange={(v) => updateAdditionalInfo('diagnostic', v)} className="text-[10px] text-foreground leading-relaxed block" tag="p" />
            </div>

            {/* Action plan — dark mode fix */}
            <div className="rounded-lg p-3.5 bg-primary/10 dark:bg-primary/15 border border-primary/20">
              <EditableText value="Plano de Ação — Seu Próximo Passo" onChange={(v) => updateSectionTitle('action-plan-title', v)} className="text-[11px] font-bold text-primary block mb-3" tag="h3" />
              <div className="space-y-3">
                {actionPlan.map((step, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-[22px] h-[22px] min-w-[22px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                    <div>
                      <EditableText value={step.title} onChange={(v) => updateSectionTitle(`step-title-${i}`, v)} className="text-[10px] font-bold text-foreground block" />
                      <EditableText value={step.text} onChange={(v) => updateAdditionalInfo(`step-text-${i}`, v)} className="text-[9px] text-muted-foreground leading-relaxed block mt-0.5" tag="p" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer — dark mode fix */}
            <div className="flex items-start gap-2 rounded-r-lg p-3 bg-warning/10 dark:bg-warning/15 border-l-4 border-warning">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning" />
              <div>
                <span className="text-[10px] font-bold text-foreground">Atenção: </span>
                <EditableText value="Score e faixas são indicadores estatísticos e não garantem aprovação de crédito. A decisão final é do credor. O objetivo deste relatório é analisar os motivos de negativa e identificar o que está impactando no seu crédito." onChange={(v) => updateAdditionalInfo('score-disclaimer', v)} className="text-[10px] text-muted-foreground leading-relaxed" />
              </div>
            </div>
          </div>
        )
      )}

      {/* ===== BLOCKS WITH DnD ===== */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => {
            if (block.id === '5') return null; // score has own section
            const Icon = iconMap[block.icon] || FileText;

            // In edit mode, all data blocks show placeholders
            if (isEdit) {
              return (
                <SortableBlock key={block.id} block={block}>
                  <div className="ml-4 space-y-2">
                    <SectionHeader icon={Icon} title={sectionTitles[block.id] || block.name} blockId={block.id} badge="— registros" />
                    <PlaceholderTable label={block.name} cols={block.id === '10' ? 3 : 5} />
                    <EditableText value={additionalInfo[block.id] || ''} onChange={(v) => updateAdditionalInfo(block.id, v)} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
                  </div>
                </SortableBlock>
              );
            }

            // Serasa block — show filled data
            if (block.id === '2') {
              return (
                <SortableBlock key={block.id} block={block}>
                  <div className="ml-4 space-y-2">
                    <SectionHeader icon={Icon} title="Serasa - Base I" badge={`${mockSerasaData.length} registros`} blockId={block.id} />
                    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Inclusão</th>
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Vencimento</th>
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Origem / Credor</th>
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Contrato</th>
                            <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockSerasaData.map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-2.5 py-2 text-[10px] font-mono text-foreground">{row.dtInclusao}</td>
                              <td className="px-2.5 py-2 text-[10px] font-mono text-foreground">{row.dtVencimento}</td>
                              <td className="px-2.5 py-2 text-[10px] text-foreground">{row.origem}</td>
                              <td className="px-2.5 py-2 text-[9px] font-mono text-foreground">{row.contrato}</td>
                              <td className="px-2.5 py-2 text-[10px] text-right font-semibold text-destructive tabular-nums">R$ {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <EditableText value={additionalInfo[block.id] || ''} onChange={(v) => updateAdditionalInfo(block.id, v)} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
                  </div>
                </SortableBlock>
              );
            }

            // SPC block
            if (block.id === '1') {
              return (
                <SortableBlock key={block.id} block={block}>
                  <div className="ml-4 space-y-2">
                    <SectionHeader icon={Icon} title="SPC - SCPC" badge={`${mockSpcData.length} registros`} blockId={block.id} />
                    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Dt Ocorr.</th>
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Inclusão</th>
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Origem</th>
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Contrato</th>
                            <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockSpcData.map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-2.5 py-2 text-[10px] font-mono text-foreground">{row.dtOcorr}</td>
                              <td className="px-2.5 py-2 text-[10px] font-mono text-foreground">{row.dtInclusao}</td>
                              <td className="px-2.5 py-2 text-[10px] text-foreground">{row.origem}</td>
                              <td className="px-2.5 py-2 text-[9px] font-mono text-foreground">{row.contrato}</td>
                              <td className="px-2.5 py-2 text-[10px] text-right font-semibold text-destructive tabular-nums">R$ {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <EditableText value={additionalInfo[block.id] || ''} onChange={(v) => updateAdditionalInfo(block.id, v)} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
                  </div>
                </SortableBlock>
              );
            }

            // Bacen block
            if (block.id === '10') {
              return (
                <SortableBlock key={block.id} block={block}>
                  <div className="ml-4 space-y-3">
                    <SectionHeader icon={Icon} title="Relatório Banco Central (SCR) - Bacen" badge="Consolidado Financeiro" blockId={block.id} />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Visão consolidada do relacionamento com o sistema financeiro nacional (SCR).</p>

                    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Categoria Consolidada</th>
                            <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor</th>
                            <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">% Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockBacenConsolidado.map((row, i) => (
                            <tr key={i} className={`border-t border-border ${row.type === 'success' ? 'bg-success/5' : row.type === 'danger' ? 'bg-destructive/5' : row.type === 'warning' ? 'bg-warning/5' : ''}`}>
                              <td className={`px-2.5 py-2 text-[10px] font-semibold ${row.type === 'success' ? 'text-success' : row.type === 'danger' ? 'text-destructive' : 'text-foreground'}`}>{row.cat}</td>
                              <td className={`px-2.5 py-2 text-[10px] text-right font-semibold tabular-nums ${row.type === 'success' ? 'text-success' : row.type === 'danger' ? 'text-destructive' : 'text-foreground'}`}>{row.valor}</td>
                              <td className="px-2.5 py-2 text-[10px] text-right text-muted-foreground tabular-nums">{row.pct}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-3 rounded-lg bg-muted/30 border border-border text-center">
                      <div className="p-3">
                        <span className="text-[9px] uppercase text-muted-foreground tracking-wider block mb-1">Relacionamento</span>
                        <span className="text-[14px] font-semibold text-foreground">29/07/2019</span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">Data de início</span>
                      </div>
                      <div className="p-3 border-l border-border">
                        <span className="text-[9px] uppercase text-muted-foreground tracking-wider block mb-1">Instituições</span>
                        <span className="text-[14px] font-semibold text-foreground">5</span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">Bancos/instituições</span>
                      </div>
                      <div className="p-3 border-l border-border">
                        <span className="text-[9px] uppercase text-muted-foreground tracking-wider block mb-1">Operações</span>
                        <span className="text-[14px] font-semibold text-foreground">9</span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">Total de operações</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Detalhamento Operacional</h4>
                      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Modalidade / Operação</th>
                              <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor</th>
                              <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockBacenOperacoes.map((grupo, gi) => (
                              <React.Fragment key={`g-${gi}`}>
                                <tr className="border-t border-border bg-muted/30">
                                  <td colSpan={3} className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground">{grupo.grupo}</td>
                                </tr>
                                {grupo.items.map((item, ii) => (
                                  <tr key={`g-${gi}-${ii}`} className="border-t border-border">
                                    <td className={`px-2.5 py-2 text-[10px] pl-6 ${item.vencido ? 'text-destructive font-semibold' : 'text-foreground'}`}>{item.desc}</td>
                                    <td className={`px-2.5 py-2 text-[10px] text-right tabular-nums ${item.vencido ? 'text-destructive' : 'text-foreground'}`}>{item.valor}</td>
                                    <td className="px-2.5 py-2 text-[10px] text-right text-muted-foreground tabular-nums">{item.pct}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <EditableText value={additionalInfo[block.id] || ''} onChange={(v) => updateAdditionalInfo(block.id, v)} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
                  </div>
                </SortableBlock>
              );
            }

            // Protestos
            if (block.id === '4') {
              return (
                <SortableBlock key={block.id} block={block}>
                  <div className="ml-4 space-y-2">
                    <SectionHeader icon={Icon} title="Protestos" badge="0 registros" blockId={block.id} />
                    <div className="rounded-xl border border-border p-4 text-center text-[11px] text-muted-foreground shadow-sm">
                      Nenhum protesto em cartório localizado.
                    </div>
                    <EditableText value={additionalInfo[block.id] || ''} onChange={(v) => updateAdditionalInfo(block.id, v)} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
                  </div>
                </SortableBlock>
              );
            }

            // Generic block
            return (
              <SortableBlock key={block.id} block={block}>
                <div className="ml-4 space-y-2">
                  <SectionHeader icon={Icon} title={sectionTitles[block.id] || block.name} badge="0 registros" blockId={block.id} />
                  <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Informação</th>
                          <th className="text-left text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Valor</th>
                          <th className="text-right text-[9px] uppercase font-semibold text-muted-foreground px-2.5 py-2 tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-border">
                          <td className="px-2.5 py-2 text-[10px] text-muted-foreground">Dados serão exibidos após emissão</td>
                          <td className="px-2.5 py-2 text-[10px] text-muted-foreground">—</td>
                          <td className="px-2.5 py-2 text-right"><span className="inline-block px-2 py-0.5 rounded-full text-[8px] bg-muted text-muted-foreground font-medium">Aguardando</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <EditableText value={additionalInfo[block.id] || ''} onChange={(v) => updateAdditionalInfo(block.id, v)} className="text-[9px] text-muted-foreground italic" tag="p" placeholder="+ Adicionar informações adicionais..." />
                </div>
              </SortableBlock>
            );
          })}
        </SortableContext>
      </DndContext>

      {/* ===== FOOTER ===== */}
      {blocks.length > 0 && (
        <div className="border-t border-border pt-4 mt-6">
          <EditableText
            value="Aviso Importante: Este documento contém informações confidenciais e privilegiadas, protegidas por sigilo legal. O relatório tem caráter estritamente indicativo, baseado em dados coletados de provedores públicos e privados de proteção ao crédito no momento da consulta. O Consultas PRO atua apenas como intermediador tecnológico e não se responsabiliza pela veracidade, atualidade ou integridade dos dados originais, nem por decisões de crédito tomadas com base nas informações aqui apresentadas. Em conformidade com a Lei Geral de Proteção de Dados (LGPD - nº 13.709/2018), é vedada a divulgação, cópia ou compartilhamento deste relatório com terceiros não autorizados, sob pena de responsabilidade civil e criminal."
            onChange={(v) => updateAdditionalInfo('footer', v)}
            className="text-[8px] text-muted-foreground leading-relaxed block text-justify"
            tag="p"
          />
          <p className="text-center mt-3 text-[9px] font-mono text-muted-foreground">{isEdit ? 'DD/MM/AAAA • hash: CP-XXXXXXXX' : `${today} • hash: ${protocol}`}</p>
        </div>
      )}
    </div>
  );
}
