import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Layers3, Save, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ConsultationFieldType, Provider, ProviderConsultation } from '@/types/integrations';
import {
  getProductSessionAssignmentsApi,
  patchProductApi,
  putProductSessionAssignmentsApi,
  type ApiSessionFieldAssignment,
} from '@/api/admin-integrations';
import TemplateBuilderEditor from '@/components/consultation/TemplateBuilderEditor';
import TemplateLayoutBuilder from '@/components/integrations/template-builder/TemplateLayoutBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { availableBlocks, type ConsultationBlock } from '@/stores/consultationStore';
import type { TemplateLayoutDocument } from '@/types/template-layout';
import {
  appendWidgetNode,
  createDefaultTemplateLayoutDocument,
  loadTemplateLayoutDraft,
  parseTemplateLayoutFromApi,
  updateWidgetContent,
  stringifyTemplateLayoutForApi,
  saveTemplateLayoutDraft,
} from '@/lib/templateLayoutTransforms';

type AssignmentRow = {
  canonicalFieldId: string;
  fieldTypeKey: string;
  label: string;
  sourcePath: string;
  enabled: boolean;
};

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

function toRowsFromBaseMappings(
  consultation: ProviderConsultation,
  fieldTypes: ConsultationFieldType[],
): AssignmentRow[] {
  return consultation.fieldMappings.map((m) => ({
    canonicalFieldId: fieldTypes.find((f) => f.key === m.fieldTypeKey)?.id ?? '',
    fieldTypeKey: m.fieldTypeKey,
    label: m.label,
    sourcePath: m.jsonPath,
    enabled: true,
  }));
}

function toRowsFromAssignments(
  assignments: ApiSessionFieldAssignment[],
  fieldTypes: ConsultationFieldType[],
): AssignmentRow[] {
  return assignments.map((row) => ({
    canonicalFieldId: row.canonicalFieldId,
    fieldTypeKey: row.canonicalField.pathKey,
    label: row.canonicalField.label || fieldTypes.find((f) => f.id === row.canonicalFieldId)?.label || row.canonicalField.pathKey,
    sourcePath: row.sourcePath ?? '',
    enabled: row.isActive,
  }));
}

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
          [rootSectionId]: {
            ...section,
            name: 'Resumo da consulta',
          },
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

export default function TemplatesAdminTab({
  accessToken,
  providers,
  consultations,
  fieldTypes,
}: TemplatesAdminTabProps) {
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [sessionKey, setSessionKey] = useState<string>('default');
  const [editorExperience, setEditorExperience] = useState<'classic' | 'advanced'>('classic');
  const [builderMode, setBuilderMode] = useState<'admin' | 'user'>('admin');
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [layoutDocument, setLayoutDocument] = useState<TemplateLayoutDocument>(
    createDefaultTemplateLayoutDocument('Template admin'),
  );
  const [classicTemplate, setClassicTemplate] = useState<ClassicTemplateState>({
    name: 'Template admin',
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
    if (!selectedConsultationId || !sessionKey) return;

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

    const consultationName =
      consultations.find((consultation) => consultation.id === selectedConsultationId)?.name ?? 'Template admin';
    setLayoutDocument(createDefaultTemplateLayoutDocument(`Template ${consultationName}`));
    setClassicTemplate({
      name: `Template ${consultationName}`,
      blocks: [],
      logo: null,
    });
  }, [consultations, selectedConsultation, selectedConsultationId, sessionKey]);

  const assignmentsQuery = useQuery({
    queryKey: ['admin-product-session-assignments', selectedConsultationId, sessionKey],
    queryFn: () => getProductSessionAssignmentsApi(accessToken, selectedConsultationId, sessionKey),
    enabled: !!selectedConsultationId && !!sessionKey,
  });

  useEffect(() => {
    if (!selectedConsultation) {
      setRows([]);
      return;
    }
    if ((assignmentsQuery.data ?? []).length > 0) {
      setRows(toRowsFromAssignments(assignmentsQuery.data ?? [], fieldTypes));
      return;
    }
    setRows(toRowsFromBaseMappings(selectedConsultation, fieldTypes));
  }, [selectedConsultation, assignmentsQuery.data, fieldTypes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConsultationId) return;
      const payload = rows
        .filter((row) => row.enabled && row.canonicalFieldId)
        .map((row, index) => ({
          canonicalFieldId: row.canonicalFieldId,
          sourcePath: row.sourcePath,
          sortOrder: index,
          isActive: true,
        }));
      return putProductSessionAssignmentsApi(accessToken, selectedConsultationId, {
        sessionKey,
        assignments: payload,
      });
    },
    onSuccess: () => {
      toast.success('Sessão atualizada com sucesso');
      void assignmentsQuery.refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Falha ao salvar atribuições de sessão');
    },
  });

  const saveLayoutMutation = useMutation({
    mutationFn: async (nextDocument: TemplateLayoutDocument) => {
      if (!selectedConsultationId) return;
      return patchProductApi(accessToken, selectedConsultationId, {
        templateLayout: stringifyTemplateLayoutForApi(nextDocument),
      });
    },
    onSuccess: () => {
      toast.success('Layout avançado salvo para a consulta');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Falha ao salvar layout avançado');
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <WandSparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Editor de template</h3>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Experiência</span>
          <Select value={editorExperience} onValueChange={(value) => setEditorExperience(value as 'classic' | 'advanced')}>
            <SelectTrigger className="h-8 w-56 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Clássico (parecido com antes)</SelectItem>
              <SelectItem value="advanced">Avançado (WordPress-like)</SelectItem>
            </SelectContent>
          </Select>

          {editorExperience === 'advanced' && (
            <>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Permissões</span>
              <Select value={builderMode} onValueChange={(value) => setBuilderMode(value as 'admin' | 'user')}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (alta customização)</SelectItem>
                  <SelectItem value="user">Usuário (customização simples)</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {editorExperience === 'classic' ? (
          <TemplateBuilderEditor
            key={`${selectedConsultationId}:${sessionKey}:classic`}
            mode="embedded"
            templateName={classicTemplate.name}
            initialBlocks={classicTemplate.blocks}
            showBalance={false}
            onSave={(payload) => {
              const nextClassic: ClassicTemplateState = {
                name: payload.name,
                blocks: payload.blocks,
                logo: payload.logo,
              };
              setClassicTemplate(nextClassic);
              const consultationName = selectedConsultation?.name ?? 'Template admin';
              const nextDocument = mapClassicPayloadToLayoutDocument(
                nextClassic,
                `Template ${consultationName}`,
              );
              setLayoutDocument(nextDocument);
              if (selectedConsultationId && sessionKey) {
                saveTemplateLayoutDraft(selectedConsultationId, sessionKey, nextDocument);
              }
              void saveLayoutMutation.mutateAsync(nextDocument);
            }}
          />
        ) : (
          <TemplateLayoutBuilder
            mode={builderMode}
            fieldTypes={fieldTypes}
            document={layoutDocument}
            onDocumentChange={(nextDocument) => {
              setLayoutDocument(nextDocument);
              if (selectedConsultationId && sessionKey) {
                saveTemplateLayoutDraft(selectedConsultationId, sessionKey, nextDocument);
              }
            }}
            onSave={(nextDocument) => {
              setLayoutDocument(nextDocument);
              if (selectedConsultationId && sessionKey) {
                saveTemplateLayoutDraft(selectedConsultationId, sessionKey, nextDocument);
              }
              void saveLayoutMutation.mutateAsync(nextDocument);
            }}
          />
        )}
        {editorExperience === 'classic' && (
          <p className="mt-2 text-xs text-muted-foreground">
            Modo clássico ativo para manter a experiência antiga. O botão salvar continua persistindo no layout da consulta.
          </p>
        )}
        {editorExperience === 'advanced' && (
          <p className="mt-2 text-xs text-muted-foreground">
            Modo avançado ativo para estruturar seção, linha, coluna, widgets e variáveis dinâmicas.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Atribuição de campos por sessão</h3>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Consulta</label>
            <Select value={selectedConsultationId || '__none__'} onValueChange={(v) => setSelectedConsultationId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione uma consulta" />
              </SelectTrigger>
              <SelectContent>
                {consultations.map((consultation) => {
                  const providerName = providers.find((p) => p.id === consultation.providerId)?.name ?? 'Provedor';
                  return (
                    <SelectItem key={consultation.id} value={consultation.id}>
                      {consultation.name} - {providerName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sessão</label>
            <Input
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              className="h-9 text-sm"
              placeholder="Ex: SPC, SERASA, default"
            />
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <div className="grid grid-cols-[auto_minmax(8rem,1fr)_minmax(12rem,2fr)] gap-2 bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Ativo</span>
            <span>Campo canônico</span>
            <span>Source path</span>
          </div>
          <div className="divide-y divide-border">
            {rows.map((row, index) => (
              <div key={`${row.canonicalFieldId}-${index}`} className="grid grid-cols-[auto_minmax(8rem,1fr)_minmax(12rem,2fr)] gap-2 px-3 py-2 items-center">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => setRows((prev) => prev.map((item, i) => (i === index ? { ...item, enabled: e.target.checked } : item)))}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm text-foreground">{row.label || row.fieldTypeKey}</span>
                <Input
                  value={row.sourcePath}
                  onChange={(e) => setRows((prev) => prev.map((item, i) => (i === index ? { ...item, sourcePath: e.target.value } : item)))}
                  className="h-8 text-xs font-mono"
                  disabled={!row.enabled}
                />
              </div>
            ))}
            {rows.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhum campo encontrado para a consulta/sessão atual.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Sessão atual: <span className="font-medium text-foreground">{sessionKey || '-'}</span> · campos: {rows.filter((r) => r.enabled).length}
          </p>
          <Button
            type="button"
            className="gradient-primary text-primary-foreground h-9 text-xs gap-1.5"
            onClick={() => saveMutation.mutate()}
            disabled={!selectedConsultationId || !sessionKey || saveMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar sessão'}
          </Button>
        </div>
      </div>
    </div>
  );
}
