import EditableText from './EditableText';

interface ReportFooterProps {
  mode: 'skeleton' | 'preview';
  date?: string;
  protocol?: string;
  onDisclaimerChange?: (v: string) => void;
}

const DEFAULT_DISCLAIMER =
  'Aviso Importante: Este documento contém informações confidenciais e privilegiadas, protegidas por sigilo legal. O relatório tem caráter estritamente indicativo, baseado em dados coletados de provedores públicos e privados de proteção ao crédito no momento da consulta. O Consultas PRO atua apenas como intermediador tecnológico e não se responsabiliza pela veracidade, atualidade ou integridade dos dados originais, nem por decisões de crédito tomadas com base nas informações aqui apresentadas. Em conformidade com a Lei Geral de Proteção de Dados (LGPD - nº 13.709/2018), é vedada a divulgação, cópia ou compartilhamento deste relatório com terceiros não autorizados, sob pena de responsabilidade civil e criminal.';

export default function ReportFooter({
  mode,
  date,
  protocol,
  onDisclaimerChange,
}: ReportFooterProps) {
  const isSkeleton = mode === 'skeleton';
  const today = date ?? new Date().toLocaleDateString('pt-BR');
  const prot = protocol ?? `CP-${Date.now().toString().slice(-8)}`;

  return (
    <div className="border-t border-border pt-4 mt-6">
      <EditableText
        value={DEFAULT_DISCLAIMER}
        onChange={onDisclaimerChange}
        className="text-[8px] text-muted-foreground leading-relaxed block text-justify"
        tag="p"
      />
      <p className="text-center mt-3 text-[9px] font-mono text-muted-foreground">
        {isSkeleton ? 'DD/MM/AAAA • hash: CP-XXXXXXXX' : `${today} • hash: ${prot}`}
      </p>
    </div>
  );
}
