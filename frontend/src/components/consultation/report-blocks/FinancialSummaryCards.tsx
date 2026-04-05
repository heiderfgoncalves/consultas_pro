import { DollarSign } from 'lucide-react';
import SectionHeader from './SectionHeader';

interface FinancialSummaryCardsProps {
  mode: 'skeleton' | 'preview';
  totalApontado?: number;
  totalDeduzido?: number;
  riscoBacen?: number;
  onSectionTitleChange?: (v: string) => void;
}

const MOCK_TOTAL_APONTADO = 190828.59;
const MOCK_TOTAL_DEDUZIDO = 98654.57;
const MOCK_RISCO_BACEN = 20347.0;

export default function FinancialSummaryCards({
  mode,
  totalApontado = MOCK_TOTAL_APONTADO,
  totalDeduzido = MOCK_TOTAL_DEDUZIDO,
  riscoBacen = MOCK_RISCO_BACEN,
  onSectionTitleChange,
}: FinancialSummaryCardsProps) {
  const isSkeleton = mode === 'skeleton';

  return (
    <div>
      <SectionHeader
        icon={DollarSign}
        title="Resumo Financeiro"
        onTitleChange={onSectionTitleChange}
      />
      {isSkeleton ? (
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
            <p className="text-lg font-bold text-destructive pl-2">
              R$ {totalApontado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">Soma bruta de apontamentos</p>
          </div>
          <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-success" />
            <p className="text-[9px] uppercase text-muted-foreground font-semibold pl-2">Total Deduzido</p>
            <p className="text-lg font-bold text-success pl-2">
              R$ {totalDeduzido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">Sem duplicidades</p>
          </div>
          <div className="rounded-xl border border-border p-3 relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-warning" />
            <p className="text-[9px] uppercase text-muted-foreground font-semibold pl-2">Risco Bacen (Vencido)</p>
            <p className="text-lg font-bold text-warning pl-2">
              R$ {riscoBacen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8px] text-muted-foreground pl-2 mt-0.5">Prejuízo + Vencido</p>
          </div>
        </div>
      )}
    </div>
  );
}
