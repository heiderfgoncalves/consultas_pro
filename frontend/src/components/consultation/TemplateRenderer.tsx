import BaseReportSkeleton from '@/components/consultation/BaseReportSkeleton';
import ConsultationPreview from '@/components/consultation/ConsultationPreview';
import type { TemplateSection } from '@/lib/templateSectionUtils';
import { availableBlocks, type ConsultationBlock } from '@/stores/consultationStore';
import type { ExpressionContext } from '@/lib/expressionEngine';
import type {
  TemplateDocument,
  TemplateRendererCapabilities,
  TemplateRendererMode,
} from '@/types/template-document';
import { templateDocumentToSections } from '@/lib/templateDocument';

type TemplateRendererProps = {
  document: TemplateDocument;
  mode: TemplateRendererMode;
  blocks?: ConsultationBlock[];
  capabilities: TemplateRendererCapabilities;
  logo?: string | null;
  clientName?: string;
  documentIdValue?: string;
  context?: ExpressionContext;
  onLogoChange?: (logo: string | null) => void;
  onEditSection?: (sectionId: string) => void;
  onAddSection?: () => void;
  onFieldExpressionChange?: (sectionId: string, fieldId: string, value: string) => void;
  onFieldLabelChange?: (sectionId: string, fieldId: string, value: string) => void;
  onFieldSelect?: (fieldId: string) => void;
  onCanvasDeselect?: () => void;
  selectedFieldId?: string | null;
  onRemoveSection?: (sectionId: string) => void;
  renderFieldOptionTrigger?: (sectionId: string, field: TemplateSection['fields'][number]) => React.ReactNode;
  onSectionArgumentsChange?: (sectionId: string, args: Record<string, string>) => void;
};

function resolveBlocks(document: TemplateDocument, explicitBlocks: ConsultationBlock[] = []): ConsultationBlock[] {
  if (explicitBlocks.length > 0) return explicitBlocks;

  const selectedBlockIds = document.metadata?.selectedBlockIds ?? [];
  if (selectedBlockIds.length === 0) return [];

  return selectedBlockIds.map((id) => {
    const fromCatalog = availableBlocks.find((block) => block.id === id);
    if (fromCatalog) return fromCatalog;

    return {
      id,
      name: `Consulta ${id}`,
      description: 'Bloco selecionado no template',
      price: 0,
      category: 'Consulta',
      icon: 'FileText',
    };
  });
}

export default function TemplateRenderer({
  document,
  mode,
  blocks = [],
  capabilities = {
    showSkeleton: true,
    showPreview: true,
    showXml: true,
    showVariables: true,
    showConsole: true,
    canEditAdvanced: true,
  },
  logo,
  clientName,
  documentIdValue,
  context,
  onLogoChange,
  onEditSection,
  onAddSection,
  onFieldExpressionChange,
  onFieldLabelChange,
  onFieldSelect,
  onCanvasDeselect,
  selectedFieldId,
  onRemoveSection,
  renderFieldOptionTrigger,
  onSectionArgumentsChange,
}: TemplateRendererProps) {
  const sections = templateDocumentToSections(document);
  const runtimeBlocks = resolveBlocks(document, blocks);

  if (mode === 'preview' && capabilities.showPreview) {
    return (
      <ConsultationPreview
        blocks={runtimeBlocks}
        document={documentIdValue ?? ''}
        clientName={clientName}
        logo={logo}
        onLogoChange={onLogoChange}
        mode="preview"
        realData={context?.$json}
      />
    );
  }

  if (!capabilities.showSkeleton) return null;

  return (
    <BaseReportSkeleton
      sections={sections}
      logo={logo}
      onLogoChange={onLogoChange}
      onEditSection={capabilities.canEditAdvanced ? onEditSection : undefined}
      onAddSection={capabilities.canEditAdvanced ? onAddSection : undefined}
      onFieldExpressionChange={capabilities.canEditAdvanced ? onFieldExpressionChange : undefined}
      onFieldLabelChange={onFieldLabelChange}
      onFieldSelect={onFieldSelect}
      onCanvasDeselect={onCanvasDeselect}
      selectedFieldId={selectedFieldId}
      onRemoveSection={capabilities.canEditAdvanced ? onRemoveSection : undefined}
      renderFieldOptionTrigger={renderFieldOptionTrigger}
      mode={mode === 'editor' ? 'skeleton' : mode}
      expressionContext={context}
      onSectionArgumentsChange={onSectionArgumentsChange}
    />
  );
}
