import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ConsultationFieldType, Provider, ProviderConsultation } from '@/types/integrations';
import { patchProductApi } from '@/api/admin-integrations';
import TemplateBuilderEditor from '@/components/consultation/TemplateBuilderEditor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ConsultationBlock } from '@/stores/consultationStore';
import type { TemplateLayoutDocument } from '@/types/template-layout';
import {
  createDefaultTemplateLayoutDocument,
  loadTemplateLayoutDraft,
  parseTemplateLayoutFromApi,
  stringifyTemplateLayoutForApi,
  saveTemplateLayoutDraft,
  appendWidgetNode,
  updateWidgetContent,
} from '@/lib/templateLayoutTransforms';

type TemplatesAdminTabProps = {
  accessToken: string | null;
  providers: Provider[];
  consultations: ProviderConsultation[];
  fieldTypes: ConsultationFieldType[];
};

type ClassicTemplateState = {
  name: string;
  blocks: ConsultationBlock[];
  logo: string | null;
};

function findFirstColumnId(document: TemplateLayoutDocument): string | null {
  for (const rootId of document.rootIds) {
    const section = document.nodes[rootId];
    if (!section || section.kind !== 'section') continue;
    for (const rowId of section.children) {
      const row = document.nodes[rowId];
      if (!row || row.kind !== 'row') continue;
      const firstColumnId = row.children.find((childId) => document.nodes[childId]?.kind === 'column');
      if (firstColumnId) return firstColumnId;
    }
  }
  return null;
}

function mapClassicPayloadToLayoutDocument(
  payload: ClassicTemplateState,
  fallbackName: string,
): TemplateLayoutDocument {
  const nextName = payload.name.trim() || fallbackName;
  let next = createDefaultTemplateLayoutDocument(nextName);

  const rootSectionId = next.rootIds[0];
  if (rootSectionId) {
    const section = next.nodes[rootSectionId];
    if (section && section.kind === 'section') {
      next = {
        ...next,
        nodes: {
          ...next.nodes,
          [rootSectionId]: { ...section, name: 'Resumo da consulta' },
        },
      };
    }
  }

  const firstColumnId = findFirstColumnId(next);
  if (!firstColumnId) return next;

  const firstWidgetId = next.nodes[firstColumnId]?.children[0];
  if (firstWidgetId && next.nodes[firstWidgetId]?.kind === 'widget') {
    next = updateWidgetContent(next, firstWidgetId, nextName);
  }

  for (const block of payload.blocks) {
    next = appendWidgetNode(next, firstColumnId, 'text', `${block.name} · R$ ${block.price.toFixed(2)}`);
  }

  if (payload.logo) {
    next = appendWidgetNode(next, firstColumnId, 'text', 'Logo customizada aplicada no template');
  }

  return next;
}

const MOCK_TEMPLATES = [
  { id: '__base__', name: 'Template Base' },
  { id: '__score_restricoes__', name: 'Template Score + Restrições' },
  { id: '__premium__', name: 'Template Premium + Bacen' },
];

export default function TemplatesAdminTab({
  accessToken,
  providers,
  consultations,
  fieldTypes,
}: TemplatesAdminTabProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('__base__');
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [builderMode, setBuilderMode] = useState<'admin' | 'user'>('admin');
  const [layoutDocument, setLayoutDocument] = useState<TemplateLayoutDocument>(
    createDefaultTemplateLayoutDocument('Template Base'),
  );
  const [classicTemplate, setClassicTemplate] = useState<ClassicTemplateState>({
    name: 'Template Base',
    blocks: [],
    logo: null,
  });

  const selectedConsultation = useMemo(
    () => consultations.find((c) => c.id === selectedConsultationId) ?? null,
    [consultations, selectedConsultationId],
  );

  useEffect(() => {
    if (!selectedConsultationId && consultations.length > 0) {
      setSelectedConsultationId(consultations[0]!.id);
    }
  }, [consultations, selectedConsultationId]);

  useEffect(() => {
    if (!selectedConsultationId) return;
    const sessionKey = 'default';

    const draft = loadTemplateLayoutDraft(selectedConsultationId, sessionKey);
    if (draft) {
      setLayoutDocument(draft);
      return;
    }

    const persisted = selectedConsultation?.templateLayout
      ? parseTemplateLayoutFromApi(selectedConsultation.templateLayout)
      : null;
    if (persisted) {
      setLayoutDocument(persisted);
      return;
    }

    const tplName = MOCK_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name ?? 'Template Base';
    setLayoutDocument(createDefaultTemplateLayoutDocument(tplName));
    setClassicTemplate({ name: tplName, blocks: [], logo: null });
  }, [consultations, selectedConsultation, selectedConsultationId, selectedTemplateId]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (nextDocument: TemplateLayoutDocument) => {
      if (!selectedConsultationId) return;
      return patchProductApi(accessToken, selectedConsultationId, {
        templateLayout: stringifyTemplateLayoutForApi(nextDocument),
      });
    },
    onSuccess: () => toast.success('Layout do template salvo'),
    onError: (error: Error) => toast.error(error.message || 'Falha ao salvar layout'),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <WandSparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Editor de template</h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Template</span>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Consulta</span>
              <Select value={selectedConsultationId || '__none__'} onValueChange={(v) => setSelectedConsultationId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {consultations.map((c) => {
                    const prov = providers.find((p) => p.id === c.providerId)?.name ?? 'Provedor';
                    return <SelectItem key={c.id} value={c.id}>{c.name} - {prov}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Experiência</span>
              <Select value={builderMode} onValueChange={(v) => setBuilderMode(v as 'admin' | 'user')}>
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (alta customização)</SelectItem>
                  <SelectItem value="user">Usuário (customização simples)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TemplateBuilderEditor
          key={`${selectedConsultationId}:${selectedTemplateId}:classic`}
          mode="embedded"
          templateName={classicTemplate.name}
          initialBlocks={classicTemplate.blocks}
          showBalance={false}
          builderMode={builderMode}
          fieldTypes={fieldTypes}
          onSave={(payload) => {
            const nextClassic: ClassicTemplateState = {
              name: payload.name,
              blocks: payload.blocks,
              logo: payload.logo,
            };
            setClassicTemplate(nextClassic);
            const tplName = MOCK_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name ?? 'Template Base';
            const nextDocument = mapClassicPayloadToLayoutDocument(nextClassic, tplName);
            setLayoutDocument(nextDocument);
            if (selectedConsultationId) {
              saveTemplateLayoutDraft(selectedConsultationId, 'default', nextDocument);
            }
            void saveLayoutMutation.mutateAsync(nextDocument);
          }}
        />
      </div>
    </div>
  );
}
