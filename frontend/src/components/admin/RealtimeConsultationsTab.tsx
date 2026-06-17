import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, AlertCircle, ArrowUpRight, CheckCircle2, Clock, Eye, RefreshCw, Search,
  Terminal, ShieldAlert, X, ChevronRight, Cpu, HelpCircle, Maximize2, Globe, Download, Code2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminConsultations,
  getAdminConsultationDetail,
  type AdminConsultationRow,
  type AdminConsultationDetail
} from '@/api/admin-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiRequest, apiBase, getStoredToken, openConsultationPdfInNewTab } from '@/lib/api';
import { getCanonicalFields, mapCanonicalToFieldTypes, parseProductTypeItemFilters } from '@/api/admin-integrations';
import { buildTypeLinkedConsultationMappedPreview } from '@/lib/consultationMappedPreview';
import { normalizeTypeItemFilterConfig } from '@/lib/typeItemFilters';
import type { ConsultationFieldType } from '@/types/integrations';

const labelCls = 'text-xs font-bold text-muted-foreground uppercase tracking-wider';

function detectHtml(rawResponse: any): string | null {
  if (!rawResponse) return null;
  if (typeof rawResponse === 'string' && (rawResponse.includes('<!DOCTYPE html>') || rawResponse.includes('<html') || rawResponse.includes('<!doctype html>'))) {
    return rawResponse;
  }
  if (typeof rawResponse === 'object' && rawResponse !== null) {
    const rawText = rawResponse.rawText;
    if (typeof rawText === 'string' && (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html') || rawText.includes('<!doctype html>'))) {
      return rawText;
    }
  }
  return null;
}

interface ExecutionResponseViewerProps {
  exec: any;
  idx: number;
  fieldTypes: ConsultationFieldType[];
  setExpandedJson: (json: string | null) => void;
  setExpandedTitle: (title: string | null) => void;
  setPreviewHtml: (html: string | null) => void;
  setPreviewHtmlTitle: (title: string | null) => void;
}

function ExecutionResponseViewer({
  exec,
  idx,
  fieldTypes,
  setExpandedJson,
  setExpandedTitle,
  setPreviewHtml,
  setPreviewHtmlTitle,
}: ExecutionResponseViewerProps) {
  const mappedTypeKeys = useMemo(() => {
    const keys = new Set<string>();
    if (exec.product?.mappings) {
      for (const m of exec.product.mappings) {
        if (m.canonicalField?.pathKey) {
          keys.add(m.canonicalField.pathKey);
        }
      }
    }
    return Array.from(keys);
  }, [exec.product?.mappings]);

  const [activeTypeKey, setActiveTypeKey] = useState<string | null>(() => {
    return mappedTypeKeys[0] || null;
  });

  useEffect(() => {
    if (mappedTypeKeys.length > 0 && (!activeTypeKey || !mappedTypeKeys.includes(activeTypeKey))) {
      setActiveTypeKey(mappedTypeKeys[0]);
    } else if (mappedTypeKeys.length === 0) {
      setActiveTypeKey(null);
    }
  }, [mappedTypeKeys]);

  const activeFieldType = useMemo(() => {
    if (!activeTypeKey) return null;
    return fieldTypes.find((f) => f.key === activeTypeKey) || null;
  }, [fieldTypes, activeTypeKey]);

  const mappedPreviewJson = useMemo(() => {
    if (!exec.product || !activeTypeKey || !activeFieldType) return null;

    const productMappings = exec.product.mappings || [];
    const prismaMappingsForType = productMappings.filter(
      (m: any) => m.canonicalField?.pathKey === activeTypeKey
    );

    const trechoMappings = prismaMappingsForType.map((m: any) => ({
      jsonPath: m.sourcePath,
      fieldTypeKey: m.canonicalField?.pathKey || '',
      label: m.canonicalField?.label || '',
      format: 'object',
      uiStartLine: m.uiStartLine ?? undefined,
      uiEndLine: m.uiEndLine ?? undefined,
    }));

    if (trechoMappings.length === 0) return null;

    const sampleResponse = typeof exec.rawResponse === 'string'
      ? exec.rawResponse
      : JSON.stringify(exec.rawResponse || {}, null, 2);

    const productTypeItemFilters = parseProductTypeItemFilters(exec.product.typeItemFilters);
    const typeItemFilterConfig = normalizeTypeItemFilterConfig(productTypeItemFilters?.[activeTypeKey]);

    try {
      return buildTypeLinkedConsultationMappedPreview({
        sampleResponse,
        trechoMappings,
        fieldType: activeFieldType,
        typeItemFilterConfig,
      });
    } catch (err) {
      console.error('Erro ao construir de-para para', activeTypeKey, err);
      return 'Erro ao computar de-para do tipo.';
    }
  }, [exec.product, exec.rawResponse, activeTypeKey, activeFieldType]);

  const fallbackJson = useMemo(() => {
    return JSON.stringify(exec.normalizedPayload || { message: 'Nenhuma normalização' }, null, 2);
  }, [exec.normalizedPayload]);

  const displayText = mappedPreviewJson !== null ? mappedPreviewJson : fallbackJson;

  return (
    <div className="border-t border-border/50 pt-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-primary flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5" /> Execução #{idx + 1}: {exec.provider.name} ({exec.product?.name || exec.product?.code || 'Produto'})
        </span>
        <span className="text-[9px] font-mono text-muted-foreground bg-muted border border-border/80 px-1.5 py-0.5 rounded">
          {exec.id}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Request Payload */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase">Payload de Envio (Request)</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => {
                const json = JSON.stringify(exec.requestPayload || { message: 'Nenhum request' }, null, 2);
                setExpandedJson(json);
                setExpandedTitle(`Request Payload - Execução #${idx + 1}`);
              }}
            >
              <Maximize2 className="w-2.5 h-2.5" />
            </Button>
          </div>
          <pre className="p-2 bg-background border border-border/50 rounded-lg text-[9px] font-mono text-foreground/70 overflow-x-auto max-h-[140px] scrollbar-thin">
            {JSON.stringify(exec.requestPayload || { message: 'Nenhum request' }, null, 2)}
          </pre>
        </div>

        {/* Raw Response */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-semibold text-muted-foreground uppercase">Resposta Crua Provedor (Raw Response)</div>
            <div className="flex items-center gap-1">
              {detectHtml(exec.rawResponse) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[9px] text-primary hover:text-primary-foreground hover:bg-primary/20"
                  onClick={() => {
                    const html = detectHtml(exec.rawResponse);
                    setPreviewHtml(html);
                    setPreviewHtmlTitle(`Resposta Renderizada HTML - Execução #${idx + 1} (${exec.provider.name})`);
                  }}
                >
                  <Globe className="w-2.5 h-2.5 mr-0.5" /> Preview
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => {
                  const json = JSON.stringify(exec.rawResponse || { message: 'Nenhum raw response' }, null, 2);
                  setExpandedJson(json);
                  setExpandedTitle(`Raw Response - Execução #${idx + 1}`);
                }}
              >
                <Maximize2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>
          <pre className="p-2 bg-background border border-border/50 rounded-lg text-[9px] font-mono text-foreground/70 overflow-x-auto max-h-[140px] scrollbar-thin">
            {JSON.stringify(exec.rawResponse || { message: 'Nenhum raw response' }, null, 2)}
          </pre>
        </div>

        {/* Mapped Response - Treated (Para) */}
        <div className="space-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-semibold text-muted-foreground uppercase">
                {mappedPreviewJson !== null ? 'Resposta Tratada (De-Para)' : 'Resposta Traduzida (Normalized)'}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => {
                    setExpandedJson(displayText);
                    setExpandedTitle(
                      mappedPreviewJson !== null
                        ? `Resposta Tratada (${activeTypeKey}) - Execução #${idx + 1}`
                        : `Resposta Traduzida - Execução #${idx + 1}`
                    );
                  }}
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>

            {/* Mapped Type Selector Tabs if there are multiple */}
            {mappedTypeKeys.length > 1 && (
              <div className="flex gap-1 overflow-x-auto py-1 my-1 scrollbar-none border-b border-border/20">
                {mappedTypeKeys.map((key) => {
                  const label = fieldTypes.find((f) => f.key === key)?.label || key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTypeKey(key)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        activeTypeKey === key
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {mappedTypeKeys.length === 1 && (
              <div className="my-1">
                <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  Tipo: {fieldTypes.find((f) => f.key === activeTypeKey)?.label || activeTypeKey}
                </span>
              </div>
            )}
          </div>

          <pre className="p-2 bg-background border border-border/50 rounded-lg text-[9px] font-mono text-foreground/70 overflow-x-auto max-h-[140px] scrollbar-thin mt-1 flex-1">
            {displayText}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function RealtimeConsultationsTab({ accessToken }: { accessToken: string | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Queries
  const { data: consultations = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-realtime-consultations'],
    queryFn: () => getAdminConsultations(accessToken),
    refetchOnWindowFocus: false,
  });

  // Load canonical fields
  const { data: canonicalFieldsRaw = [] } = useQuery({
    queryKey: ['admin-canonical-fields'],
    queryFn: () => getCanonicalFields(accessToken),
    enabled: !!accessToken,
  });

  const fieldTypes = useMemo(() => {
    return mapCanonicalToFieldTypes(canonicalFieldsRaw);
  }, [canonicalFieldsRaw]);

  // States for download and reexecute loaders per item ID
  const [pdfLoadingIds, setPdfLoadingIds] = useState<Record<string, boolean>>({});
  const [reexecuteLoadingIds, setReexecuteLoadingIds] = useState<Record<string, boolean>>({});

  // Handlers for download and reexecute
  const downloadPdf = useCallback((item: any) => {
    openConsultationPdfInNewTab(item.id);
    toast.success('PDF aberto em nova aba!');
  }, []);

  const handleReexecute = useCallback(async (row: AdminConsultationRow) => {
    if (reexecuteLoadingIds[row.id]) return;
    setReexecuteLoadingIds(prev => ({ ...prev, [row.id]: true }));
    try {
      const detail = await getAdminConsultationDetail(accessToken, row.id);
      
      const providerProductIds = detail.items
        ?.map((i: any) => i.providerProduct?.id)
        .filter(Boolean);

      const cleanedDoc = detail.subjectDocument.replace(/\D/g, '');
      const subjectType = cleanedDoc.length === 14 ? 'CNPJ' : 'CPF';

      const result = await apiRequest<any>('/consultations', {
        method: 'POST',
        body: JSON.stringify({
          subjectDocument: cleanedDoc,
          subjectType,
          templateId: detail.template?.id || undefined,
          providerProductIds: (!detail.template?.id && providerProductIds && providerProductIds.length > 0) ? providerProductIds : undefined,
          externalUserId: detail.externalUserId || undefined,
        })
      });

      if (!result || !result.id) {
        throw new Error('Retorno inválido ao criar consulta.');
      }

      toast.success('Consulta reexecutada com sucesso! Atualizando painel...');
      refetch();
    } catch (err: any) {
      console.error('Erro ao reexecutar consulta:', err);
      toast.error(err?.message || 'Falha ao reexecutar consulta.');
    } finally {
      setReexecuteLoadingIds(prev => ({ ...prev, [row.id]: false }));
    }
  }, [accessToken, reexecuteLoadingIds, refetch]);

  // States for expansion and preview
  const [expandedJson, setExpandedJson] = useState<string | null>(null);
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewHtmlTitle, setPreviewHtmlTitle] = useState<string | null>(null);

  // Queries

  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin-consultation-detail', selectedId],
    queryFn: () => getAdminConsultationDetail(accessToken, selectedId!),
    enabled: !!selectedId,
  });

  // Auto-refresh loop
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refetch();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Reset counter on manual refresh
  const handleManualRefresh = () => {
    refetch();
    setCountdown(5);
    toast.success('Dados atualizados');
  };

  // Filtragem local
  const filtered = useMemo(() => {
    return consultations.filter(c => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q ||
        c.id.toLowerCase().includes(q) ||
        c.subjectDocument.includes(q) ||
        (c.company?.name || '').toLowerCase().includes(q) ||
        (c.requestedByUser?.fullName || '').toLowerCase().includes(q);
      
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [consultations, searchQuery, statusFilter]);

  // Métricas estilo Grafana
  const metrics = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter(c => c.status === 'COMPLETED').length;
    const partial = filtered.filter(c => c.status === 'PARTIAL').length;
    const failed = filtered.filter(c => c.status === 'FAILED').length;
    const queued = filtered.filter(c => c.status === 'QUEUED').length;
    const processing = filtered.filter(c => c.status === 'PROCESSING').length;
    
    const successRate = total > 0 ? ((completed + partial) / total) * 100 : 100;
    const totalCost = filtered.reduce((acc, c) => acc + Number(c.totalCost), 0);

    return {
      total,
      completed,
      partial,
      failed,
      queued,
      processing,
      successRate,
      totalCost
    };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Grafana-style top panel dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-card border border-border/75 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Consultas</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{metrics.total}</span>
            <span className="text-[10px] text-muted-foreground">filtradas</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20" />
        </div>

        {/* Metric 2 */}
        <div className="bg-card border border-border/75 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Sucesso</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-500">{metrics.successRate.toFixed(1)}%</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20" />
        </div>

        {/* Metric 3 */}
        <div className="bg-card border border-border/75 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Processando / Fila</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500">{metrics.processing + metrics.queued}</span>
            <span className="text-[10px] text-muted-foreground">em execução</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20" />
        </div>

        {/* Metric 4 */}
        <div className="bg-card border border-border/75 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Falhas</span>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-destructive">{metrics.failed}</span>
            <span className="text-[10px] text-muted-foreground">100% de erro</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-destructive/20" />
        </div>

        {/* Metric 5 */}
        <div className="bg-card border border-border/75 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Consumo Gerado</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-xl font-black text-foreground">
              {metrics.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/20" />
        </div>
      </div>

      {/* Distribution visual bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
        <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
          <span>Distribuição de Status</span>
          <span className="text-foreground">Total: {metrics.total}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-muted">
          {metrics.completed > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(metrics.completed / metrics.total) * 100}%` }}
              title={`Sucesso: ${metrics.completed}`}
            />
          )}
          {metrics.partial > 0 && (
            <div
              className="bg-sky-500 h-full transition-all duration-300"
              style={{ width: `${(metrics.partial / metrics.total) * 100}%` }}
              title={`Parcial: ${metrics.partial}`}
            />
          )}
          {metrics.processing > 0 && (
            <div
              className="bg-amber-500 h-full transition-all duration-300 animate-pulse"
              style={{ width: `${(metrics.processing / metrics.total) * 100}%` }}
              title={`Processando: ${metrics.processing}`}
            />
          )}
          {metrics.queued > 0 && (
            <div
              className="bg-slate-400 h-full transition-all duration-300"
              style={{ width: `${(metrics.queued / metrics.total) * 100}%` }}
              title={`Fila: ${metrics.queued}`}
            />
          )}
          {metrics.failed > 0 && (
            <div
              className="bg-destructive h-full transition-all duration-300"
              style={{ width: `${(metrics.failed / metrics.total) * 100}%` }}
              title={`Falha: ${metrics.failed}`}
            />
          )}
        </div>
        <div className="flex gap-4 flex-wrap text-[10px] text-muted-foreground font-bold uppercase mt-1">
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sucesso ({metrics.completed})</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Parcial ({metrics.partial})</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Processando ({metrics.processing})</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Na Fila ({metrics.queued})</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Falha ({metrics.failed})</div>
        </div>
      </div>

      {/* Control panel and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, documento, empresa, usuário..."
            className="pl-9 h-9.5 bg-card text-xs rounded-xl"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status capsules */}
          <div className="flex gap-1 bg-muted/40 border border-border p-1 rounded-xl">
            {['all', 'COMPLETED', 'PROCESSING', 'FAILED', 'PARTIAL', 'QUEUED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'COMPLETED' ? 'Sucesso' : s === 'PROCESSING' ? 'Rodando' : s === 'FAILED' ? 'Falha' : s === 'PARTIAL' ? 'Parcial' : 'Fila'}
              </button>
            ))}
          </div>

          {/* Auto refresh control */}
          <div className="flex items-center gap-2 bg-card border border-border p-1.5 px-3 rounded-xl shadow-sm text-xs">
            <span className="font-semibold text-muted-foreground">Auto Refresh</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                autoRefresh ? 'bg-primary' : 'bg-muted border border-border'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all ${
                  autoRefresh ? 'left-[15px]' : 'left-[1px]'
                }`}
              />
            </button>
            {autoRefresh && (
              <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-md animate-pulse">
                {countdown}s
              </span>
            )}
          </div>

          {/* Refresh button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isFetching}
            className="h-9.5 rounded-xl text-xs gap-1 border-border/80 bg-card hover:bg-muted"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card rounded-2xl border border-border/80 shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Carregando painel em tempo real...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-1">
            <Cpu className="w-8 h-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider">Nenhuma consulta correspondente</p>
            <p className="text-xs text-muted-foreground/60">Aguarde novas requisições na plataforma ou limpe os filtros.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-border/50">
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3">Data/Hora</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3">ID / Documento</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3">Cliente (Empresa / Usuário)</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3">Template / Consulta</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3 text-right">Valor</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3 text-center">Provedores</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3 text-center">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-3 text-right w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const dateStr = new Date(row.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date(row.createdAt).toLocaleDateString('pt-BR');
                const cost = Number(row.totalCost);
                const templateName = row.template?.name || 'Consulta Personalizada';
                
                return (
                  <TableRow key={row.id} className="hover:bg-muted/15 border-b border-border/50">
                    <TableCell className="text-xs font-medium text-muted-foreground font-mono whitespace-nowrap">{dateStr}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground font-mono leading-none">{row.subjectDocument}</span>
                        <span className="text-[9px] text-muted-foreground font-mono leading-none mt-1">ID: {row.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground leading-none">{row.company?.name || '—'}</span>
                        <span className="text-[9px] text-muted-foreground leading-none mt-1">por {row.requestedByUser?.fullName || 'API Token'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground leading-none">{templateName}</span>
                        <span className="text-[9px] text-muted-foreground leading-none mt-1">{row.subjectType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground text-right whitespace-nowrap">
                      {cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted/30">
                        {row._count?.executions || row._count?.items || 0} prod
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                        row.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : row.status === 'PROCESSING'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                            : row.status === 'QUEUED'
                              ? 'bg-slate-400/10 text-slate-500 dark:text-slate-400 border-slate-400/20'
                              : row.status === 'PARTIAL'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}>
                        {row.status === 'COMPLETED' ? 'Sucesso' : row.status === 'PROCESSING' ? 'Rodando' : row.status === 'QUEUED' ? 'Fila' : row.status === 'PARTIAL' ? 'Parcial' : 'Falha'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedId(row.id)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/10"
                          title="Visualizar consulta"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pdfLoadingIds[row.id]}
                          onClick={() => downloadPdf(row)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/10"
                          title="Baixar Relatório"
                        >
                          {pdfLoadingIds[row.id] ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={reexecuteLoadingIds[row.id]}
                          onClick={() => handleReexecute(row)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                          title="Reexecutar Consulta"
                        >
                          {reexecuteLoadingIds[row.id] ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExpandedJson(JSON.stringify(row, null, 2));
                            setExpandedTitle('Log JSON da Consulta');
                          }}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/10"
                          title="Ver Log JSON"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Technical Detail Modal */}
      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl border border-border shadow-2xl bg-card">
          <DialogHeader className="border-b border-border/50 pb-4">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> Análise de Consulta Detalhada
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Consulta ID: {selectedId}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 flex-1">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">Carregando payloads JSON e logs de execuções...</span>
            </div>
          ) : detail ? (
            <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1 scrollbar-thin">
              {/* Resumo da consulta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
                <div>
                  <div className={labelCls}>Documento</div>
                  <div className="text-xs font-bold font-mono text-foreground mt-0.5">{detail.subjectDocument} ({detail.subjectType})</div>
                </div>
                <div>
                  <div className={labelCls}>Solicitante</div>
                  <div className="text-xs font-bold text-foreground mt-0.5">{detail.company?.name || '—'}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">por {detail.requestedByUser?.fullName || 'API'}</div>
                </div>
                <div>
                  <div className={labelCls}>Custo / Cobrança</div>
                  <div className="text-xs font-black text-foreground mt-0.5">
                    {Number(detail.totalCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div>
                  <div className={labelCls}>Status Geral</div>
                  <div className="mt-1">
                    <Badge variant={detail.status === 'COMPLETED' ? 'default' : 'destructive'} className="text-[10px] font-bold uppercase">
                      {detail.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {detail.errorMessage && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Mensagem de Erro da Plataforma</div>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed">{detail.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Tabela de Execuções nos Provedores */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Fluxo de Chamadas aos Provedores Parceiros</h4>
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card/50">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b border-border/50">
                        <TableHead className="text-[9px] uppercase font-bold text-muted-foreground py-2.5">Provedor</TableHead>
                        <TableHead className="text-[9px] uppercase font-bold text-muted-foreground py-2.5">Produto</TableHead>
                        <TableHead className="text-[9px] uppercase font-bold text-muted-foreground py-2.5 text-center">Status</TableHead>
                        <TableHead className="text-[9px] uppercase font-bold text-muted-foreground py-2.5 text-center">HTTP Status</TableHead>
                        <TableHead className="text-[9px] uppercase font-bold text-muted-foreground py-2.5 text-right">Custo Provedor</TableHead>
                        <TableHead className="text-[9px] uppercase font-bold text-muted-foreground py-2.5">Mensagem de Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.executions && detail.executions.length > 0 ? (
                        detail.executions.map((exec) => (
                          <TableRow key={exec.id} className="border-b border-border/50">
                            <TableCell className="text-xs font-bold text-foreground">{exec.provider.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{exec.product?.name || exec.product?.code || '—'}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                exec.status === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              }`}>
                                {exec.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-center font-mono">{exec.statusCode || '—'}</TableCell>
                            <TableCell className="text-xs font-medium text-right text-muted-foreground whitespace-nowrap">
                              {exec.providerCost ? Number(exec.providerCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                            </TableCell>
                            <TableCell className="text-[10px] text-rose-500 font-mono max-w-[200px] truncate" title={exec.errorMessage || ''}>
                              {exec.errorMessage || '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6 font-medium">
                            Nenhuma execução realizada. A consulta pode ter falhado na validação inicial ou está na fila (`QUEUED`).
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Seção JSON com Abas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-primary" /> Visualizador de Carga JSON de Entrada/Saída
                </h4>
                
                <div className="bg-muted/30 border border-border/80 rounded-xl overflow-hidden p-4 space-y-4">
                  {/* Abas */}
                  <div className="flex flex-col gap-4">
                    {/* Exibe payload final mesclado */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">Payload Consolidado Mesclado (Final renderizado)</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40"
                            onClick={() => {
                              const json = JSON.stringify(detail.mergedPayload || detail.renderPayload || { message: 'Sem payload mesclado' }, null, 2);
                              setExpandedJson(json);
                              setExpandedTitle('Payload Consolidado Mesclado');
                            }}
                          >
                            <Maximize2 className="w-3 h-3 mr-1" /> Expandir
                          </Button>
                          <Badge variant="outline" className="text-[9px] font-mono">mergedPayload</Badge>
                        </div>
                      </div>
                      <pre className="p-3 bg-background border border-border/60 rounded-lg text-[10px] font-mono text-foreground/80 overflow-x-auto max-h-[200px] scrollbar-thin">
                        {JSON.stringify(detail.mergedPayload || detail.renderPayload || { message: 'Sem payload mesclado' }, null, 2)}
                      </pre>
                    </div>

                    {/* Exibe cada execucao de forma detalhada com requests/responses */}
                    {detail.executions && detail.executions.map((exec, idx) => (
                      <ExecutionResponseViewer
                        key={exec.id}
                        exec={exec}
                        idx={idx}
                        fieldTypes={fieldTypes}
                        setExpandedJson={setExpandedJson}
                        setExpandedTitle={setExpandedTitle}
                        setPreviewHtml={setPreviewHtml}
                        setPreviewHtmlTitle={setPreviewHtmlTitle}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground flex-1">
              <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground/50 mb-1" />
              <span className="text-xs font-semibold uppercase">Dados indisponíveis</span>
            </div>
          )}

          <div className="border-t border-border/50 pt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => setSelectedId(null)}
              className="bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs h-9"
            >
              Fechar Detalhes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Expandir JSON */}
      <Dialog open={!!expandedJson} onOpenChange={(v) => !v && setExpandedJson(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-xl border border-border shadow-2xl bg-card">
          <DialogHeader className="border-b border-border/50 pb-3">
            <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
              {expandedTitle || 'Visualizar Carga JSON'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-background border border-border/60 rounded-lg p-4 font-mono text-xs text-foreground/95 scrollbar-thin max-h-[60vh]">
            <pre>{expandedJson}</pre>
          </div>
          <div className="border-t border-border/50 pt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(expandedJson || '');
                toast.success('JSON copiado para a área de transferência');
              }}
              className="text-xs h-9"
            >
              Copiar JSON
            </Button>
            <Button
              type="button"
              onClick={() => setExpandedJson(null)}
              className="bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs h-9"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Preview de HTML */}
      <Dialog open={!!previewHtml} onOpenChange={(v) => !v && setPreviewHtml(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-6 rounded-xl border border-border shadow-2xl bg-card">
          <DialogHeader className="border-b border-border/50 pb-3">
            <DialogTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
              {previewHtmlTitle || 'Preview de Resposta HTML'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-white border border-border/80 rounded-lg overflow-hidden relative">
            <iframe
              srcDoc={previewHtml || ''}
              title="HTML Response Preview"
              className="w-full h-full border-none"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
          <div className="border-t border-border/50 pt-3 flex justify-end">
            <Button
              type="button"
              onClick={() => setPreviewHtml(null)}
              className="bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs h-9"
            >
              Fechar Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
