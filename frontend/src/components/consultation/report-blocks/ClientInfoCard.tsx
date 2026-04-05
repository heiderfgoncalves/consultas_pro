import { User, Hash, Tag } from 'lucide-react';
import EditableText from './EditableText';

interface ClientInfoCardProps {
  mode: 'skeleton' | 'preview';
  clientName?: string;
  document?: string;
  reportType?: string;
  onClientNameChange?: (v: string) => void;
  onReportTypeChange?: (v: string) => void;
}

export default function ClientInfoCard({
  mode,
  clientName,
  document: docInput,
  reportType = 'Padrão',
  onClientNameChange,
  onReportTypeChange,
}: ClientInfoCardProps) {
  const isSkeleton = mode === 'skeleton';

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <User className="w-[18px] h-[18px] text-muted-foreground" />
          </div>
          <div>
            <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">
              Cliente Analisado
            </p>
            <EditableText
              value={isSkeleton ? 'NOME DO CONSULTADO' : (clientName || 'NOME DO CONSULTADO')}
              onChange={onClientNameChange}
              className="text-[13px] font-semibold text-foreground"
            />
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <Hash className="w-[18px] h-[18px] text-muted-foreground" />
          </div>
          <div>
            <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">
              Documento
            </p>
            <p className="text-[13px] font-semibold text-foreground font-mono">
              {isSkeleton ? '000.000.000-00' : (docInput || '000.000.000-00')}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <Tag className="w-[18px] h-[18px] text-muted-foreground" />
          </div>
          <div>
            <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">
              Tipo de Relatório
            </p>
            <EditableText
              value={reportType}
              onChange={onReportTypeChange}
              className="text-[13px] font-semibold text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
