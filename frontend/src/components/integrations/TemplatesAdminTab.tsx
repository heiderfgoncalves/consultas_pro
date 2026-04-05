import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ConsultationFieldType, Provider, ProviderConsultation } from '@/types/integrations';
import { patchProductApi } from '@/api/admin-integrations';
import TemplateBuilderEditor from '@/components/consultation/TemplateBuilderEditor';
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

function findFirstColumnId(doc: TemplateLayoutDocument): string | null {
  for (const rootId of doc.rootIds) {
    const section = doc.nodes[rootId];
    if (!section || section.kind !== 'section') continue;
    for (const rowId of section.children) {
      const row = doc.nodes[rowId];
      if (!row || row.kind !== 'row') continue;
      const colId = row.children.find((c) => doc.nodes[c]?.kind === 'column');
      if (colId) return colId;
    }
  }
  return null;
}

function mapClassicToLayout(payload: ClassicTemplateState, fallbackName: string): TemplateLayoutDocument {
  const name = payload.name.trim() || fallbackName;
  let doc = createDefaultTemplateLayoutDocument(name);
  const rootId = doc.rootIds[0];
  if (rootId) {
    const s = doc.nodes[rootId];
    if (s?.kind === 'section') doc = { ...doc, nodes: { ...doc.nodes, [rootId]: { ...s, name: 'Resumo' } } };
  }
  const colId = findFirstColumnId(doc);
  if (!colId) return doc;
  const widgetId = doc.nodes[colId]?.children[0];
  if (widgetId && doc.nodes[widgetId]?.kind === 'widget') doc = updateWidgetContent(doc, widgetId, name);
  for (const b of payload.blocks) doc = appendWidgetNode(doc, colId, 'text', `${b.name} · R$ ${b.price.toFixed(2)}`);
  return doc;
}

export default function TemplatesAdminTab({ accessToken, providers, consultations, fieldTypes }: TemplatesAdminTabProps) {
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [builderMode, setBuilderMode] = useState<'admin' | 'user'>('admin');
  const [layoutDocument, setLayoutDocument] = useState<TemplateLayoutDocument>(createDefaultTemplateLayoutDocument('Template Base'));
  const [classicTemplate, setClassicTemplate] = useState<ClassicTemplateState>({ name: 'Template Base', blocks: [], logo: null });

  const selectedConsultation = useMemo(() => consultations.find((c) => c.id === selectedConsultationId) ?? null, [consultations, selectedConsultationId]);

  useEffect(() => {
    if (!selectedConsultationId && consultations.length > 0) setSelectedConsultationId(consultations[0]!.id);
  }, [consultations, selectedConsultationId]);

  useEffect(() => {
    if (!selectedConsultationId) return;
    const draft = loadTemplateLayoutDraft(selectedConsultationId, 'default');
    if (draft) { setLayoutDocument(draft); return; }
    const persisted = selectedConsultation?.templateLayout ? parseTemplateLayoutFromApi(selectedConsultation.templateLayout) : null;
    if (persisted) { setLayoutDocument(persisted); return; }
    setLayoutDocument(createDefaultTemplateLayoutDocument('Template Base'));
    setClassicTemplate({ name: 'Template Base', blocks: [], logo: null });
  }, [consultations, selectedConsultation, selectedConsultationId]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (next: TemplateLayoutDocument) => {
      if (!selectedConsultationId) return;
      return patchProductApi(accessToken, selectedConsultationId, { templateLayout: stringifyTemplateLayoutForApi(next) });
    },
    onSuccess: () => toast.success('Layout salvo'),
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
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
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Consulta</span>
              <Select value={selectedConsultationId || '__none__'} onValueChange={(v) => setSelectedConsultationId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (alta customização)</SelectItem>
                  <SelectItem value="user">Usuário (customização simples)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TemplateBuilderEditor
          key={`${selectedConsultationId}:classic`}
          mode="embedded"
          templateName={classicTemplate.name}
          initialBlocks={classicTemplate.blocks}
          showBalance={false}
          builderMode={builderMode}
          fieldTypes={fieldTypes}
          accessToken={accessToken}
          availableConsultationBlocks={consultations}
          onSave={(payload) => {
            const next: ClassicTemplateState = { name: payload.name, blocks: payload.blocks, logo: payload.logo };
            setClassicTemplate(next);
            const doc = mapClassicToLayout(next, 'Template Base');
            setLayoutDocument(doc);
            if (selectedConsultationId) saveTemplateLayoutDraft(selectedConsultationId, 'default', doc);
            void saveLayoutMutation.mutateAsync(doc);
          }}
        />
      </div>
    </div>
  );
}
