import React, { useRef } from 'react';
import { Image as ImageIcon, Pencil } from 'lucide-react';
import EditableText from './EditableText';

export type ReportHeaderMode = 'skeleton' | 'preview';

interface ReportHeaderProps {
  mode: ReportHeaderMode;
  logo?: string | null;
  onLogoChange?: (logo: string | null) => void;
  companyName?: string;
  reportTitle?: string;
  date?: string;
  protocol?: string;
  onCompanyNameChange?: (v: string) => void;
  onReportTitleChange?: (v: string) => void;
}

export default function ReportHeader({
  mode,
  logo,
  onLogoChange,
  companyName = 'Consultas PRO',
  reportTitle = 'Relatório Analítico de Crédito',
  date,
  protocol,
  onCompanyNameChange,
  onReportTitleChange,
}: ReportHeaderProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isSkeleton = mode === 'skeleton';

  const today = date ?? new Date().toLocaleDateString('pt-BR');
  const prot = protocol ?? `CP-${Date.now().toString().slice(-8)}`;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => onLogoChange?.(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      <div className="pb-3" style={{ borderBottom: '3px solid var(--brand)' }}>
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
                onClick={() => (onLogoChange ? logoInputRef.current?.click() : undefined)}
                className="w-[50px] h-[50px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:border-primary hover:bg-primary/5 transition-colors group cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                <span className="text-[7px] text-muted-foreground group-hover:text-primary font-medium">LOGO</span>
              </button>
            )}
            <div>
              <EditableText
                value={companyName}
                onChange={onCompanyNameChange}
                className="text-[10px] font-bold text-primary tracking-widest uppercase"
              />
              <EditableText
                value={reportTitle}
                onChange={onReportTitleChange}
                className="text-[9px] text-muted-foreground"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">{isSkeleton ? 'DD/MM/AAAA' : today}</p>
            <p className="text-[9px] text-muted-foreground font-mono">
              PROT: {isSkeleton ? 'CP-XXXXXXXX' : prot}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
