import { useState } from 'react';
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
  onClientNameChange: _onClientNameChange,
  onReportTypeChange: _onReportTypeChange,
}: ClientInfoCardProps) {
  const isSkeleton = mode === 'skeleton';
  const [labels, setLabels] = useState({ client: 'Cliente Analisado', document: 'Documento', type: 'Tipo de Relatório' });
  const setLabel = (key: keyof typeof labels, value: string) => setLabels((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <User className="w-[18px] h-[18px] text-muted-foreground" />
          </div>
          <div>
            <EditableText
              value={labels.client}
              onChange={(v) => setLabel('client', v)}
              className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider"
              tag="p"
            />
            <p className="text-[13px] font-semibold text-foreground">{isSkeleton ? 'NOME DO CONSULTADO' : (clientName || 'NOME DO CONSULTADO')}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
            <Hash className="w-[18px] h-[18px] text-muted-foreground" />
          </div>
          <div>
            <EditableText
              value={labels.document}
              onChange={(v) => setLabel('document', v)}
              className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider"
              tag="p"
            />
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
            <EditableText
              value={labels.type}
              onChange={(v) => setLabel('type', v)}
              className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider"
              tag="p"
            />
            <p className="text-[13px] font-semibold text-foreground">{reportType}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
