import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  Server, Plus, Pencil, Trash2, Database,
  Play, Tag, ChevronDown, ChevronRight, Search, RefreshCcw,
  Code2, Link2, Save, Hash, Filter, Undo2, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type {
  Provider, ProviderConsultation, ConsultationFieldType, FieldMapping,
  MappingItemFilter, MappingItemFilterOp, TypeItemFilterConfig,
} from '@/types/integrations';
import JsonFieldMapper from '@/components/integrations/JsonFieldMapper';
import TypeReportFieldsConfig from '@/components/integrations/TypeReportFieldsConfig';
import { formatDeepFilteredValueAtPath } from '@/lib/providerResponseMapping';
import {
  buildSingleGroupTypeItemFilterConfig,
  cloneTypeItemFilterConfig,
  countActiveTypeItemRules,
  flattenTypeItemFilterRules,
  normalizeTypeItemFilterConfig,
} from '@/lib/typeItemFilters';
import { toast } from 'sonner';
import { slugify } from '@/lib/slug';
import {
  authToApi,
  createCanonicalFieldApi,
  createMappingApi,
  createOperationApi,
  createProductApi,
  createProviderApi,
  deleteCanonicalFieldApi,
  deleteMappingApi,
  deleteProductApi,
  deleteProviderApi,
  getCanonicalFields,
  getProviders,
  getTestLogs,
  importDefaultCanonicalSectionsApi,
  mapApiProduct,
  mapApiProvider,
  mapCanonicalToFieldTypes,
  mapTestLogs,
  pairsToCredentials,
  patchCanonicalFieldApi,
  patchOperationApi,
  patchProductApi,
  patchProviderApi,
  testProductApi,
  testProductDraftApi,
  type ApiProviderTestResult,
} from '@/api/admin-integrations';

type ConsultationTestInput =
  | {
      kind: 'saved';
      productId: string;
      bodyTemplate?: unknown;
      queryTemplate?: Record<string, unknown>;
      headersTemplate?: Record<string, unknown>;
    }
  | {
      kind: 'draft';
      providerId: string;
      endpointPath: string;
      method: 'GET' | 'POST';
      bodyTemplate?: unknown;
      queryTemplate?: Record<string, unknown>;
      headersTemplate?: Record<string, unknown>;
    };

function parseOptionalBodyTemplateJson(raw: string): { bodyTemplate?: unknown } {
  const t = raw.trim();
  if (!t) return {};
  try {
    return { bodyTemplate: JSON.parse(t) };
  } catch {
    toast.error('Corpo da requisição (JSON) inválido');
    throw new Error('INVALID_BODY_JSON');
  }
}

const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide';
const inputCls = 'h-9 text-sm bg-background placeholder:text-muted-foreground';
const selectTriggerCls = 'h-9 text-sm';
const sectionLabelCls =
  'text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1';
const metaMonoCls = 'text-xs font-mono text-muted-foreground';
const cardTitleCls = 'text-sm font-semibold text-foreground';
const subtleBadgeCls = 'text-xs px-2 py-0.5 rounded font-medium';
const linkActionCls = 'text-xs font-medium transition-colors flex items-center gap-1';

/** Valor do Select ao criar consulta nova (não confundir com id de produto). */
const CONSULTATION_PICKER_NEW = '__new__';

type TestLogRow = {
  id: string;
  productId?: string | null;
  consultationName: string;
  providerId: string;
  responseJson: string;
  testedAt: string;
};

type ConsultationEditorHandle = {
  save: () => void;
  revert: () => void;
  loadResponseFromLog: (entry: TestLogRow) => void;
};

const TYPES_TAB_FILTER_OPS: { value: MappingItemFilterOp; label: string }[] = [
  { value: 'eq', label: 'igual a' },
  { value: 'contains', label: 'contém' },
  { value: 'startsWith', label: 'começa com' },
  { value: 'endsWith', label: 'termina com' },
  { value: 'regex', label: 'regex' },
];

/** Referência estável para evitar reset do estado em LinkedConsultationCard a cada render. */
const EMPTY_LINKED_FILTERS: MappingItemFilter[] = [];

/**
 * Critérios exibidos por consulta: usa o que está salvo no produto (`typeItemFilters[pathKey]`).
 * Se essa chave não existir no JSON do produto, usa o padrão do catálogo (`uiItemFilters` do tipo),
 * para dados legados e até a primeira gravação por consulta.
 */
function linkedConsultationInitialFilters(
  pc: ProviderConsultation,
  fieldTypeKey: string,
  catalogTypes: ConsultationFieldType[],
): MappingItemFilter[] {
  const blob = pc.typeItemFilters;
  if (blob && Object.prototype.hasOwnProperty.call(blob, fieldTypeKey)) {
    const row = blob[fieldTypeKey];
    return flattenTypeItemFilterRules(row) || EMPTY_LINKED_FILTERS;
  }
  const ft = catalogTypes.find((f) => f.key === fieldTypeKey);
  return ft?.typeItemFilters ?? EMPTY_LINKED_FILTERS;
}

const emptyProvider: Partial<Provider> = {
  name: '', baseUrl: '', balanceEndpoint: '', rechargeEndpoint: '',
  authType: 'bearer', credentials: [{ key: 'token', value: '' }], status: 'active',
};

function ProviderModal({ open, onClose, provider, onSave, saving }: {
  open: boolean;
  onClose: () => void;
  provider?: Provider;
  onSave: (form: Partial<Provider>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Provider>>(emptyProvider);

  useEffect(() => {
    if (!open) return;
    setForm(provider ? { ...provider } : { ...emptyProvider });
  }, [open, provider]);

  const save = async () => {
    if (!form.name || !form.baseUrl) {
      toast.error('Nome e URL base são obrigatórios');
      return;
    }
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar provedor';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">{provider ? 'Editar Provedor' : 'Novo Provedor'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Configure o provedor de consultas</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 py-2">
          <div className="space-y-1">
            <label className={labelCls}>Nome</label>
            <Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Sollos, EHM" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>URL Base</label>
            <Input value={form.baseUrl || ''} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.provedor.com.br/v1" className={`${inputCls} font-mono`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Endpoint Saldo</label>
              <Input value={form.balanceEndpoint || ''} onChange={(e) => setForm((f) => ({ ...f, balanceEndpoint: e.target.value }))} placeholder="/account/balance" className={`${inputCls} font-mono`} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Endpoint Recarga</label>
              <Input value={form.rechargeEndpoint || ''} onChange={(e) => setForm((f) => ({ ...f, rechargeEndpoint: e.target.value }))} placeholder="/account/recharge" className={`${inputCls} font-mono`} />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Autenticação</label>
            <Select value={form.authType} onValueChange={(v) => setForm((f) => ({ ...f, authType: v as Provider['authType'] }))}>
              <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Credenciais</label>
            {(form.credentials || []).map((cred, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={cred.key}
                  onChange={(e) => {
                    const creds = [...(form.credentials || [])];
                    creds[i] = { ...creds[i], key: e.target.value };
                    setForm((f) => ({ ...f, credentials: creds }));
                  }}
                  placeholder="Chave"
                  className={`${inputCls} flex-1`}
                />
                <Input
                  value={cred.value}
                  onChange={(e) => {
                    const creds = [...(form.credentials || [])];
                    creds[i] = { ...creds[i], value: e.target.value };
                    setForm((f) => ({ ...f, credentials: creds }));
                  }}
                  placeholder="Valor"
                  className={`${inputCls} flex-1`}
                  type="password"
                />
                <button
                  type="button"
                  className="h-9 w-9 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors flex-shrink-0"
                  onClick={() => setForm((f) => ({ ...f, credentials: (f.credentials || []).filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={`${linkActionCls} text-primary hover:text-primary/80`}
              onClick={() => setForm((f) => ({ ...f, credentials: [...(f.credentials || []), { key: '', value: '' }] }))}
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>
        <DialogFooter className="pt-3 gap-2">
          <Button variant="ghost" size="default" onClick={onClose} className="text-sm h-9" disabled={saving}>Cancelar</Button>
          <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9" onClick={() => void save()} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldTypeModal({ open, onClose, fieldType, onSave, saving }: {
  open: boolean;
  onClose: () => void;
  fieldType?: ConsultationFieldType;
  onSave: (form: Partial<ConsultationFieldType>) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<ConsultationFieldType>>({
    key: '', label: '', description: '', color: 'primary', icon: 'Tag',
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      fieldType
        ? { ...fieldType }
        : { key: '', label: '', description: '', color: 'primary', icon: 'Tag' },
    );
  }, [open, fieldType]);

  const save = async () => {
    if (!form.key || !form.label) {
      toast.error('Chave e label são obrigatórios');
      return;
    }
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar tipo';
      toast.error(msg);
    }
  };

  const colors = ['primary', 'destructive', 'warning', 'success', 'info'] as const;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg font-semibold">{fieldType ? 'Editar Tipo' : 'Novo Tipo'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">Defina a chave e o significado desse tipo de dado</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className={labelCls}>Chave</label>
            <Input
              value={form.key || ''}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
              placeholder="DIVIDAS_SPC"
              className={`${inputCls} font-mono`}
              disabled={!!fieldType}
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Label</label>
            <Input value={form.label || ''} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Dívidas SPC" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Descrição</label>
            <Input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Registros..." className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Cor (UI)</label>
            <div className="flex gap-1.5">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded border transition-all ${
                    c === 'primary' ? 'bg-primary/20' :
                    c === 'destructive' ? 'bg-destructive/20' :
                    c === 'warning' ? 'bg-amber-500/20' :
                    c === 'success' ? 'bg-emerald-500/20' :
                    'bg-sky-500/20'
                  } ${form.color === c ? 'border-foreground scale-110 ring-1 ring-foreground/20' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="pt-3 gap-2">
          <Button variant="ghost" size="default" onClick={onClose} className="text-sm h-9" disabled={saving}>Cancelar</Button>
          <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9" onClick={() => void save()} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseCurl(curlStr: string) {
  const result: { method: string; url: string; headers: { key: string; value: string }[]; body?: string } = {
    method: 'GET', url: '', headers: [], body: undefined,
  };
  const methodMatch = curlStr.match(/-X\s+(GET|POST|PUT|PATCH|DELETE)/i);
  if (methodMatch) result.method = methodMatch[1].toUpperCase();
  const urlMatch = curlStr.match(/curl\s+(?:.*?\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/i);
  if (urlMatch) result.url = urlMatch[1];
  const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
  let hMatch;
  while ((hMatch = headerRegex.exec(curlStr)) !== null) {
    const colonIdx = hMatch[1].indexOf(':');
    if (colonIdx > 0) {
      result.headers.push({ key: hMatch[1].substring(0, colonIdx).trim(), value: hMatch[1].substring(colonIdx + 1).trim() });
    }
  }
  const bodyMatch = curlStr.match(/(?:--data-raw|--data|-d)\s+['"](.+?)['"]\s*(?:-|$|\s*\\?\s*$)/si)
    || curlStr.match(/(?:--data-raw|--data|-d)\s+'([\s\S]+?)'\s*/i)
    || curlStr.match(/(?:--data-raw|--data|-d)\s+"([\s\S]+?)"\s*/i);
  if (bodyMatch) {
    result.body = bodyMatch[1];
    if (!methodMatch) result.method = 'POST';
  }
  return result;
}

const sectionRailStyle: CSSProperties = {
  width: 1,
  background:
    'repeating-linear-gradient(to bottom, hsl(var(--primary)) 0px, hsl(var(--primary)) 6px, transparent 6px, transparent 14px)',
};

function MinimalExpandSection({
  title,
  icon,
  open,
  onOpenChange,
  headerExtra,
  children,
}: {
  title: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex w-8 shrink-0 flex-col items-center self-stretch pt-0.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card text-primary shadow-sm"
          aria-hidden
        >
          {icon}
        </div>
        <div className="mt-2 min-h-[0.5rem] w-px flex-1 rounded-full" style={sectionRailStyle} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left transition-colors hover:text-foreground"
          >
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {open
              ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
          {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
        </div>
        {open ? <div className="space-y-2 pb-0.5">{children}</div> : null}
      </div>
    </div>
  );
}

const ConsultationEditor = forwardRef(function ConsultationEditor(
  {
    consultation,
    providers,
    fieldTypes,
    onSave,
    onCancel,
    onTest,
    registerCardTestFn,
    registerNewConsultationTestFn,
  }: {
    consultation: ProviderConsultation;
    providers: Provider[];
    fieldTypes: ConsultationFieldType[];
    /** Mantido na assinatura por compatibilidade com chamadas; o histórico fica no toolbar do card. */
    testLog?: TestLogRow[];
    onSave: (data: Partial<ProviderConsultation>) => Promise<void>;
    onCancel: () => void;
    onTest: (input: ConsultationTestInput) => Promise<ApiProviderTestResult>;
    registerCardTestFn?: (productId: string, fn: (() => Promise<void>) | null) => void;
    registerNewConsultationTestFn?: (fn: (() => Promise<void>) | null) => void;
  },
  ref: Ref<ConsultationEditorHandle>,
) {
  const [form, setForm] = useState<Partial<ProviderConsultation>>(() => ({
    ...consultation,
  }));
  const [testJson, setTestJson] = useState(consultation.sampleResponse || '');
  const [bodyTemplateJson, setBodyTemplateJson] = useState(consultation.bodyTemplateJson || '');
  const [curlInput, setCurlInput] = useState('');
  const [paramsSectionOpen, setParamsSectionOpen] = useState(true);
  const [mappingSectionOpen, setMappingSectionOpen] = useState(true);

  const applyParsedCurl = (val: string) => {
    setCurlInput(val);
    if (!val.trim().toLowerCase().startsWith('curl')) return;
    const parsed = parseCurl(val);
    if (parsed.url) {
      const mp = providers.find((p) => parsed.url.startsWith(p.baseUrl));
      const endpoint = mp ? parsed.url.replace(mp.baseUrl, '') : parsed.url;
      const method = parsed.method === 'GET' ? 'GET' : 'POST';
      setForm((f) => ({
        ...f,
        method,
        endpoint,
        ...(mp ? { providerId: mp.id } : {}),
      }));
      if (parsed.body !== undefined && parsed.body !== '') {
        try {
          const asJson = JSON.parse(parsed.body) as unknown;
          setBodyTemplateJson(JSON.stringify(asJson, null, 2));
        } catch {
          setBodyTemplateJson(parsed.body);
        }
      }
      toast.success(`cURL parseado: ${parsed.method} ${endpoint}`);
    }
  };

  const formattedJson = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(testJson), null, 2);
    } catch {
      return testJson;
    }
  }, [testJson]);

  const typeFiltersForMapper = useMemo(() => {
    const stored = form.typeItemFilters ?? {};
    const out: Record<string, TypeItemFilterConfig> = {};
    for (const ft of fieldTypes) {
      const own = stored[ft.key];
      if (own !== undefined) {
        out[ft.key] = cloneTypeItemFilterConfig(own);
      } else {
        out[ft.key] = normalizeTypeItemFilterConfig(ft.typeItemFilters ?? []);
      }
    }
    return out;
  }, [fieldTypes, form.typeItemFilters]);

  const handleMapperTypeFiltersChange = useCallback((next: Record<string, TypeItemFilterConfig>) => {
    const cloned: Record<string, TypeItemFilterConfig> = {};
    for (const [k, config] of Object.entries(next)) {
      cloned[k] = cloneTypeItemFilterConfig(config);
    }
    setForm((f) => ({ ...f, typeItemFilters: cloned }));
  }, []);

  const baseUrl = providers.find((p) => p.id === form.providerId)?.baseUrl || '';
  const path = (form.endpoint || '').trim();
  const fullUrlLabel = baseUrl && path ? `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}` : baseUrl || path || '—';

  const loadResponseFromLog = useCallback((entry: TestLogRow) => {
    setTestJson(entry.responseJson);
    setForm((f) => ({ ...f, sampleResponse: entry.responseJson }));
    toast.success('JSON carregado do log');
  }, []);

  const applyProviderResponsePayload = (payload: unknown) => {
    if (payload === undefined || payload === null) return;
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    setTestJson(str);
    setForm((f) => ({ ...f, sampleResponse: str }));
  };

  const runTestInternal = useCallback(async () => {
    let extras: { bodyTemplate?: unknown } = {};
    try {
      extras = parseOptionalBodyTemplateJson(bodyTemplateJson);
    } catch {
      return;
    }
    try {
      let result: ApiProviderTestResult;
      if (consultation.id) {
        result = await onTest({ kind: 'saved', productId: consultation.id, ...extras });
      } else {
        const endpoint = (form.endpoint || '').trim();
        if (!form.providerId || !endpoint) {
          toast.error('Preencha provedor e endpoint para testar');
          return;
        }
        result = await onTest({
          kind: 'draft',
          providerId: form.providerId,
          endpointPath: endpoint,
          method: (form.method || 'POST') as 'GET' | 'POST',
          ...extras,
        });
      }
      applyProviderResponsePayload(result.response?.payload);
    } catch {
      /* onError da mutation */
    }
  }, [bodyTemplateJson, consultation.id, form.endpoint, form.method, form.providerId, onTest]);

  useEffect(() => {
    if (consultation.id) {
      registerCardTestFn?.(consultation.id, runTestInternal);
      return () => registerCardTestFn?.(consultation.id, null);
    }
    registerNewConsultationTestFn?.(runTestInternal);
    return () => registerNewConsultationTestFn?.(null);
  }, [consultation.id, registerCardTestFn, registerNewConsultationTestFn, runTestInternal]);

  useEffect(() => {
    setForm({
      ...consultation,
    });
    setTestJson(consultation.sampleResponse || '');
    setBodyTemplateJson(consultation.bodyTemplateJson || '');
    setCurlInput('');
  }, [
    consultation,
  ]);

  const handleSave = useCallback(() => {
    if (!form.name || !form.providerId || !form.endpoint) {
      toast.error('Preencha nome, provedor e endpoint');
      return;
    }
    try {
      parseOptionalBodyTemplateJson(bodyTemplateJson);
    } catch {
      return;
    }
    void onSave({
      ...form,
      sampleResponse: testJson,
      bodyTemplateJson,
      typeItemFilters: form.typeItemFilters,
    });
  }, [bodyTemplateJson, form, onSave, testJson]);

  useImperativeHandle(
    ref,
    () => ({
      save: handleSave,
      revert: onCancel,
      loadResponseFromLog,
    }),
    [handleSave, loadResponseFromLog, onCancel],
  );

  return (
    <div className="space-y-4">
      <MinimalExpandSection
        title="Parâmetros"
        icon={<Code2 className="h-3.5 w-3.5" />}
        open={paramsSectionOpen}
        onOpenChange={setParamsSectionOpen}
      >
        <div className="overflow-x-auto -mx-0.5 px-0.5">
          <div className="flex min-w-[58rem] items-end gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 cursor-pointer gap-1.5 px-2.5"
                >
                  <Link2 className="h-4 w-4" />
                  cURL
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Cole um cURL — método, URL, headers e corpo serão aplicados ao salvar os campos abaixo.
                </p>
                <textarea
                  value={curlInput}
                  onChange={(e) => applyParsedCurl(e.target.value)}
                  className="min-h-[5.5rem] w-full resize-y rounded-md border border-border bg-background p-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="curl -X POST 'https://…' -H '…' -d '{…}'"
                  spellCheck={false}
                />
              </PopoverContent>
            </Popover>
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Método</label>
                <Select value={form.method || 'POST'} onValueChange={(v) => setForm((f) => ({ ...f, method: v as 'GET' | 'POST' }))}>
                  <SelectTrigger className={`${selectTriggerCls} font-semibold`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>Provedor</label>
                <Select value={form.providerId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, providerId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>Nome</label>
                <Input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Consulta PF" className={inputCls} />
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>External ID</label>
                <Input value={form.externalId || ''} onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))} placeholder="CODIGO" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div className="min-w-0 space-y-1">
                <label className={labelCls}>Endpoint</label>
                <Input value={form.endpoint || ''} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} placeholder="/rota" className={`${inputCls} font-mono text-xs`} />
              </div>
              <div className="space-y-1">
                <label className={`${labelCls} normal-case tracking-normal`} title="Tarifa cobrada pelo provedor (custo admin)">
                  Preço de custo (R$)
                </label>
                <Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) }))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={`${labelCls} normal-case tracking-normal`} title="Valor debitado do cliente na carteira ao emitir a consulta">
                  Valor da consulta (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.consultationPrice ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, consultationPrice: parseFloat(e.target.value) }))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="truncate px-0.5 font-mono text-[11px] text-muted-foreground/90" title={fullUrlLabel}>
          {fullUrlLabel}
        </p>

        <div className="space-y-1.5">
          <label className={sectionLabelCls}>
            <Code2 className="h-4 w-4" /> Corpo da requisição (JSON)
          </label>
          <textarea
            value={bodyTemplateJson}
            onChange={(e) => setBodyTemplateJson(e.target.value)}
            className="scrollbar-thin h-28 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder={'{\n  "documento": "{{cpf}}"\n}'}
            spellCheck={false}
          />
        </div>
      </MinimalExpandSection>

      <MinimalExpandSection
        title="Mapeamento de retorno"
        icon={<Database className="h-3.5 w-3.5" />}
        open={mappingSectionOpen}
        onOpenChange={setMappingSectionOpen}
      >
        <JsonFieldMapper
          key={consultation.id || 'new-consultation'}
          json={formattedJson}
          onJsonChange={(v) => {
            setTestJson(v);
            setForm((f) => ({ ...f, sampleResponse: v }));
          }}
          fieldTypes={fieldTypes}
          mappings={form.fieldMappings || []}
          onMappingsChange={(m) => setForm((f) => ({ ...f, fieldMappings: m }))}
          typeFilters={typeFiltersForMapper}
          onTypeFiltersChange={handleMapperTypeFiltersChange}
        />
      </MinimalExpandSection>
    </div>
  );
});

const NewConsultationForm = forwardRef(function NewConsultationForm(
  {
    providerId,
    ...rest
  }: Omit<ComponentProps<typeof ConsultationEditor>, 'consultation'> & { providerId?: string },
  ref: Ref<ConsultationEditorHandle>,
) {
  const dummy: ProviderConsultation = {
    id: '',
    providerId: providerId || '',
    name: '',
    externalId: '',
    endpoint: '',
    method: 'POST',
    cost: 0,
    consultationPrice: 0,
    fieldMappings: [],
    status: 'active',
    sampleResponse: '',
    bodyTemplateJson: '',
    typeItemFilters: {},
    updatedAt: '',
  };
  return <ConsultationEditor ref={ref} consultation={dummy} {...rest} />;
});

function ConsultationTypeFiltersEditor({
  filters,
  onChange,
}: {
  filters: MappingItemFilter[];
  onChange: (next: MappingItemFilter[]) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground">Critérios desta consulta</span>
      </div>
      {filters.length === 0 && (
        <p className="text-xs italic text-muted-foreground">Nenhum critério. O preview exibe o trecho inteiro.</p>
      )}
      <div className="space-y-2">
        {filters.map((rule, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-2 rounded-md border border-border/80 bg-background/80 p-2"
          >
            <Input
              value={rule.field}
              onChange={(e) =>
                onChange(filters.map((x, i) => (i === idx ? { ...x, field: e.target.value } : x)))
              }
              placeholder="Campo (ex: INFORMANTE)"
              className="h-9 min-w-[6rem] flex-1 bg-background font-mono text-xs"
            />
            <Select
              value={rule.op}
              onValueChange={(v) =>
                onChange(filters.map((x, i) => (i === idx ? { ...x, op: v as MappingItemFilterOp } : x)))
              }
            >
              <SelectTrigger className="h-9 w-[9.5rem] shrink-0 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES_TAB_FILTER_OPS.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-xs">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={rule.value}
              onChange={(e) =>
                onChange(filters.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
              }
              placeholder="Valor"
              className="h-9 min-w-[6rem] flex-1 bg-background text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Remover critério"
              onClick={() => onChange(filters.filter((_, i) => i !== idx))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full text-xs"
        onClick={() => onChange([...filters, { field: '', op: 'eq', value: '' }])}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Adicionar critério
      </Button>
    </div>
  );
}

function LinkedConsultationCard({
  consultation: pc,
  provider: prov,
  fieldTypeKey,
  initialFilters,
  accessToken,
  onFiltersPersisted,
}: {
  consultation: ProviderConsultation;
  provider?: Provider;
  fieldTypeKey: string;
  initialFilters?: MappingItemFilter[];
  accessToken: string | null;
  onFiltersPersisted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState<MappingItemFilter[]>(() => (initialFilters ?? []).map((rule) => ({ ...rule })));
  const [savingFilters, setSavingFilters] = useState(false);
  const maps = pc.fieldMappings.filter((m) => m.fieldTypeKey === fieldTypeKey);
  const filterConfigForType = normalizeTypeItemFilterConfig(pc.typeItemFilters?.[fieldTypeKey]);
  const filterActive = countActiveTypeItemRules(buildSingleGroupTypeItemFilterConfig(filters, filterConfigForType)) > 0;

  const initialSignature = JSON.stringify(initialFilters ?? []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(initialSignature) as unknown;
      if (!Array.isArray(parsed)) {
        setFilters([]);
        return;
      }
      setFilters(
        parsed.map((rule) => {
          if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
            return { field: '', op: 'eq' as MappingItemFilterOp, value: '' };
          }
          const r = rule as Record<string, unknown>;
          const opRaw = typeof r.op === 'string' ? r.op : 'eq';
          const op = TYPES_TAB_FILTER_OPS.some((o) => o.value === opRaw)
            ? (opRaw as MappingItemFilterOp)
            : 'eq';
          return {
            field: typeof r.field === 'string' ? r.field : '',
            op,
            value: r.value == null ? '' : String(r.value),
          };
        }),
      );
    } catch {
      setFilters([]);
    }
  }, [initialSignature, pc.id, fieldTypeKey]);

  const persistFilters = async () => {
    setSavingFilters(true);
    try {
      const merged: Record<string, TypeItemFilterConfig> = {
        ...(pc.typeItemFilters ?? {}),
        [fieldTypeKey]: buildSingleGroupTypeItemFilterConfig(filters, filterConfigForType),
      };
      await patchProductApi(accessToken, pc.id, { typeItemFilters: merged });
      toast.success('Critérios salvos nesta consulta');
      onFiltersPersisted();
    } catch {
      toast.error('Não foi possível salvar os critérios');
    } finally {
      setSavingFilters(false);
    }
  };

  let jsonExcerpt = '';
  if (pc.sampleResponse && maps.length > 0) {
    try {
      const parts: { trecho: string; dados: unknown }[] = [];
      for (const m of maps) {
        const { text, hasData } = formatDeepFilteredValueAtPath(
          pc.sampleResponse,
          m.jsonPath,
          filters,
          '',
        );
        if (filterActive && !hasData) continue;
        let dados: unknown;
        try {
          dados = JSON.parse(text);
        } catch {
          dados = text;
        }
        parts.push({ trecho: m.jsonPath, dados });
      }
      if (parts.length === 0) {
        jsonExcerpt = filterActive ? 'Nenhum trecho corresponde aos critérios.' : '—';
      } else {
        jsonExcerpt = JSON.stringify(parts.length === 1 ? parts[0].dados : parts, null, 2) || '—';
      }
    } catch {
      jsonExcerpt = '—';
    }
  }

  return (
    <div className="rounded border border-border overflow-hidden bg-card">
      <div
        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        role="button"
        tabIndex={0}
      >
        <Database className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cardTitleCls}>{pc.name}</span>
            <span className="text-xs text-muted-foreground">{prov?.name}</span>
          </div>
          <code className={`${metaMonoCls} block mt-0.5`}>
            {maps.map((m) => m.jsonPath).join(' · ')}
          </code>
          {filters && filters.length > 0 && (
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              {filters.length} critério(s) de filtro no tipo
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-2.5 border-t border-border pt-2 space-y-2">
              <ConsultationTypeFiltersEditor filters={filters} onChange={setFilters} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs gradient-primary text-primary-foreground"
                  disabled={savingFilters}
                  onClick={(e) => {
                    e.stopPropagation();
                    void persistFilters();
                  }}
                >
                  {savingFilters ? 'Salvando…' : 'Salvar critérios'}
                </Button>
              </div>
              <pre className="text-sm font-mono text-foreground/80 bg-background rounded-md border border-border p-3 max-h-40 overflow-auto scrollbar-thin leading-relaxed">
                {jsonExcerpt || '—'}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ftColorClass(color: string, part: 'bg' | 'text' | 'border') {
  const map: Record<string, Record<string, string>> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
    info: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/30' },
  };
  return (map[color] || map.primary)[part];
}

async function syncMappings(
  token: string | null,
  productId: string,
  fieldTypes: ConsultationFieldType[],
  mappings: FieldMapping[],
  previous: ProviderConsultation | undefined,
) {
  const prevIds = Object.values(previous?.mappingIds ?? {});
  for (const id of prevIds) {
    await deleteMappingApi(token, id);
  }
  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const ft = fieldTypes.find((f) => f.key === m.fieldTypeKey);
    if (!ft) continue;
    await createMappingApi(token, {
      productId,
      canonicalFieldId: ft.id,
      sourcePath: m.jsonPath,
      uiStartLine: m.uiStartLine,
      uiEndLine: m.uiEndLine,
      sortOrder: i,
    });
  }
}

export default function IntegrationsPage() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [providerModal, setProviderModal] = useState<{ open: boolean; provider?: Provider }>({ open: false });
  const [fieldTypeModal, setFieldTypeModal] = useState<{ open: boolean; ft?: ConsultationFieldType }>({ open: false });
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [consultationPicker, setConsultationPicker] = useState<string | null>(null);
  const [newConsultationProviderId, setNewConsultationProviderId] = useState<string | undefined>(undefined);
  const [consultationEditorNonce, setConsultationEditorNonce] = useState(0);
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingFieldType, setSavingFieldType] = useState(false);
  const [importingDefaultFieldTypes, setImportingDefaultFieldTypes] = useState(false);
  const [integrationsTab, setIntegrationsTab] = useState<'providers' | 'consultations' | 'types'>('providers');

  const cardTestFnsRef = useRef<Record<string, () => Promise<void>>>({});
  const newConsultationTestRef = useRef<(() => Promise<void>) | null>(null);
  const consultationEditorRef = useRef<ConsultationEditorHandle | null>(null);
  const [selectedTestLogId, setSelectedTestLogId] = useState<string | undefined>(undefined);
  const [testLogSelectKey, setTestLogSelectKey] = useState(0);

  const registerCardTestFn = useCallback((productId: string, fn: (() => Promise<void>) | null) => {
    if (fn) cardTestFnsRef.current[productId] = fn;
    else delete cardTestFnsRef.current[productId];
  }, []);

  const registerNewConsultationTestFn = useCallback((fn: (() => Promise<void>) | null) => {
    newConsultationTestRef.current = fn;
  }, []);

  const enabled = !!accessToken && user?.backendRole === 'PLATFORM_ADMIN';

  const providersQuery = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => getProviders(accessToken),
    enabled,
  });

  const canonicalQuery = useQuery({
    queryKey: ['admin-canonical-fields'],
    queryFn: () => getCanonicalFields(accessToken),
    enabled,
  });

  const testLogsQuery = useQuery({
    queryKey: ['admin-test-logs'],
    queryFn: () => getTestLogs(accessToken),
    enabled,
  });

  const apiProviders = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const fieldTypes = useMemo(
    () => mapCanonicalToFieldTypes(canonicalQuery.data ?? []),
    [canonicalQuery.data],
  );

  const providers = useMemo(() => apiProviders.map(mapApiProvider), [apiProviders]);

  const consultations = useMemo(() => {
    const list: ProviderConsultation[] = [];
    for (const ap of apiProviders) {
      for (const p of ap.products) {
        list.push(mapApiProduct(p, ap.id));
      }
    }
    return list;
  }, [apiProviders]);
  const sortedConsultations = useMemo(
    () =>
      [...consultations].sort((a, b) => {
        const providerCompare = (providers.find((p) => p.id === a.providerId)?.name ?? '')
          .localeCompare(providers.find((p) => p.id === b.providerId)?.name ?? '', 'pt-BR');
        if (providerCompare !== 0) return providerCompare;
        return a.name.localeCompare(b.name, 'pt-BR');
      }),
    [consultations, providers],
  );

  const recentConsultations = useMemo(
    () =>
      [...consultations].sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
      ),
    [consultations],
  );

  useEffect(() => {
    if (integrationsTab !== 'consultations' || providersQuery.isLoading) return;

    if (consultationPicker != null && consultationPicker !== CONSULTATION_PICKER_NEW) {
      if (!consultations.some((c) => c.id === consultationPicker)) {
        setConsultationPicker(recentConsultations[0]?.id ?? CONSULTATION_PICKER_NEW);
        setConsultationEditorNonce((n) => n + 1);
      }
      return;
    }

    if (consultationPicker === null) {
      if (recentConsultations.length === 0) setConsultationPicker(CONSULTATION_PICKER_NEW);
      else setConsultationPicker(recentConsultations[0].id);
    }
  }, [
    integrationsTab,
    providersQuery.isLoading,
    consultations,
    consultationPicker,
    recentConsultations,
  ]);

  const testLog = useMemo(() => mapTestLogs(testLogsQuery.data ?? []), [testLogsQuery.data]);

  const testLogForPicker = useMemo(() => {
    const sorted = [...testLog].sort(
      (a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
    );
    if (consultationPicker === CONSULTATION_PICKER_NEW) {
      return sorted.filter((t) => t.productId == null);
    }
    if (consultationPicker == null) return [];
    return sorted.filter((t) => t.productId === consultationPicker);
  }, [consultationPicker, testLog]);

  const selectedTestLog = useMemo(
    () => testLogForPicker.find((entry) => entry.id === selectedTestLogId),
    [selectedTestLogId, testLogForPicker],
  );

  const prevConsultationPickerForLogsRef = useRef<string | null>(null);

  useEffect(() => {
    const consultationChanged = prevConsultationPickerForLogsRef.current !== consultationPicker;
    prevConsultationPickerForLogsRef.current = consultationPicker;

    if (!testLogForPicker.length) {
      setSelectedTestLogId(undefined);
      if (consultationChanged) setTestLogSelectKey((k) => k + 1);
      return;
    }

    if (consultationChanged) {
      setSelectedTestLogId(testLogForPicker[0].id);
      setTestLogSelectKey((k) => k + 1);
      return;
    }

    setSelectedTestLogId((prev) => {
      if (prev && testLogForPicker.some((e) => e.id === prev)) return prev;
      return testLogForPicker[0].id;
    });
  }, [consultationPicker, testLogForPicker]);

  const findApiProvider = (id: string) => apiProviders.find((p) => p.id === id);
  const findConsultation = (id: string) => consultations.find((c) => c.id === id);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-providers'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-test-logs'] });
  };

  const testMutation = useMutation({
    mutationFn: async (input: ConsultationTestInput) => {
      const payload: Parameters<typeof testProductApi>[2] = {
        context: {},
        ...(input.bodyTemplate !== undefined ? { bodyTemplate: input.bodyTemplate } : {}),
        ...(input.queryTemplate !== undefined ? { queryTemplate: input.queryTemplate } : {}),
        ...(input.headersTemplate !== undefined ? { headersTemplate: input.headersTemplate } : {}),
      };
      if (input.kind === 'saved') {
        return testProductApi(accessToken, input.productId, payload);
      }
      return testProductDraftApi(accessToken, {
        providerId: input.providerId,
        endpointPath: input.endpointPath,
        method: input.method,
        ...payload,
      });
    },
    onSuccess: () => {
      toast.success('Teste executado');
      void queryClient.invalidateQueries({ queryKey: ['admin-test-logs'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no teste'),
  });

  const handleSaveProvider = async (form: Partial<Provider>) => {
    setSavingProvider(true);
    try {
      const creds = pairsToCredentials(form.credentials || []);
      const isActive = form.status !== 'inactive';

      if (providerModal.provider) {
        const id = providerModal.provider.id;
        await patchProviderApi(accessToken, id, {
          name: form.name,
          baseUrl: form.baseUrl,
          authType: authToApi(form.authType || 'custom'),
          credentials: creds,
          isActive,
        });
        const balId = providerModal.provider.balanceOperationId;
        const recId = providerModal.provider.rechargeOperationId;
        if (balId && form.balanceEndpoint) {
          await patchOperationApi(accessToken, balId, { path: form.balanceEndpoint });
        }
        if (recId && form.rechargeEndpoint) {
          await patchOperationApi(accessToken, recId, { path: form.rechargeEndpoint });
        }
        toast.success('Provedor atualizado');
      } else {
        const slug = slugify(form.name || 'provedor');
        const created = await createProviderApi(accessToken, {
          name: form.name!,
          slug,
          baseUrl: form.baseUrl!,
          authType: authToApi(form.authType || 'custom'),
          credentials: creds,
        });
        await createOperationApi(accessToken, {
          providerId: created.id,
          operationType: 'BALANCE_CHECK',
          name: 'Saldo',
          path: form.balanceEndpoint || '/balance',
          method: 'GET',
        });
        await createOperationApi(accessToken, {
          providerId: created.id,
          operationType: 'RECHARGE',
          name: 'Recarga',
          path: form.rechargeEndpoint || '/recharge',
          method: 'POST',
        });
        toast.success('Provedor cadastrado');
      }
      invalidateAll();
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSaveFieldType = async (form: Partial<ConsultationFieldType>) => {
    setSavingFieldType(true);
    try {
      if (fieldTypeModal.ft) {
        await patchCanonicalFieldApi(accessToken, fieldTypeModal.ft.id, {
          label: form.label,
          description: form.description || null,
          uiItemFilters: form.typeItemFilters ?? [],
          reportFieldConfig: form.reportFieldConfig ?? null,
        });
        toast.success('Tipo atualizado');
      } else {
        await createCanonicalFieldApi(accessToken, {
          pathKey: form.key!,
          label: form.label!,
          dataType: 'object',
          description: form.description,
          uiItemFilters: form.typeItemFilters ?? [],
          reportFieldConfig: form.reportFieldConfig,
        });
        toast.success('Tipo cadastrado');
      }
      void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } finally {
      setSavingFieldType(false);
    }
  };

  const handleImportDefaultFieldTypes = async () => {
    setImportingDefaultFieldTypes(true);
    try {
      await importDefaultCanonicalSectionsApi(accessToken);
      toast.success('Tipos padrão importados');
      await queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Não foi possível importar os tipos padrão';
      toast.error(msg);
    } finally {
      setImportingDefaultFieldTypes(false);
    }
  };

  const handleSaveTypeReportFields = async (fieldType: ConsultationFieldType, reportFieldConfig: ConsultationFieldType['reportFieldConfig']) => {
    setSavingFieldType(true);
    try {
      await patchCanonicalFieldApi(accessToken, fieldType.id, {
        reportFieldConfig,
      });
      toast.success('Campos do tipo atualizados');
      await queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Não foi possível salvar os campos do tipo';
      toast.error(msg);
    } finally {
      setSavingFieldType(false);
    }
  };

  const saveConsultation = async (data: Partial<ProviderConsultation>, existingId?: string) => {
    let sampleResponse: unknown = undefined;
    if (data.sampleResponse !== undefined && data.sampleResponse !== '') {
      try {
        sampleResponse = JSON.parse(data.sampleResponse);
      } catch {
        sampleResponse = data.sampleResponse;
      }
    }

    let bodyTemplate: unknown | null | undefined = undefined;
    if (data.bodyTemplateJson !== undefined) {
      const raw = data.bodyTemplateJson.trim();
      if (!raw) {
        bodyTemplate = null;
      } else {
        try {
          bodyTemplate = JSON.parse(raw);
        } catch {
          toast.error('Corpo da requisição (JSON) inválido');
          return;
        }
      }
    }

    if (existingId) {
      const prev = findConsultation(existingId);
      const apiProd = apiProviders.flatMap((p) => p.products).find((pr) => pr.id === existingId);
      await patchProductApi(accessToken, existingId, {
        name: data.name,
        code: apiProd?.code ?? slugify(data.name || 'prod'),
        externalId: data.externalId || null,
        endpointPath: data.endpoint,
        method: data.method || 'POST',
        cost: data.cost ?? 0,
        consultationPrice: data.consultationPrice ?? data.cost ?? 0,
        isActive: data.status !== 'inactive',
        sampleResponse: sampleResponse === undefined ? undefined : sampleResponse,
        ...(bodyTemplate !== undefined ? { bodyTemplate } : {}),
        ...(data.typeItemFilters !== undefined ? { typeItemFilters: data.typeItemFilters } : {}),
      });
      await syncMappings(accessToken, existingId, fieldTypes, data.fieldMappings || [], prev);
      toast.success('Consulta atualizada');
    } else {
      if (!data.providerId) {
        toast.error('Selecione o provedor');
        return;
      }
      const code = slugify(data.externalId || data.name || `prod-${Date.now()}`);
      const created = await createProductApi(accessToken, {
        providerId: data.providerId,
        name: data.name!,
        code,
        externalId: data.externalId || null,
        endpointPath: data.endpoint!,
        method: data.method || 'POST',
        cost: data.cost ?? 0,
        consultationPrice: data.consultationPrice ?? data.cost ?? 0,
        isActive: data.status !== 'inactive',
        sampleResponse: sampleResponse ?? undefined,
        ...(bodyTemplate !== undefined && bodyTemplate !== null ? { bodyTemplate } : {}),
        ...(data.typeItemFilters !== undefined ? { typeItemFilters: data.typeItemFilters } : {}),
      });
      await syncMappings(accessToken, created.id, fieldTypes, data.fieldMappings || [], undefined);
      toast.success('Consulta cadastrada');
      setConsultationPicker(created.id);
    }
    invalidateAll();
    setNewConsultationProviderId(undefined);
  };

  const errToast = useRef(false);
  useEffect(() => {
    if (providersQuery.isError && !errToast.current) {
      errToast.current = true;
      toast.error('Erro ao carregar integrações');
    }
    if (!providersQuery.isError) errToast.current = false;
  }, [providersQuery.isError]);

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.baseUrl.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getLinkedConsultations = (fieldTypeKey: string) =>
    consultations.filter((c) => c.fieldMappings.some((m) => m.fieldTypeKey === fieldTypeKey));

  if (user?.backendRole !== 'PLATFORM_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integrações"
        subtitle="Provedores, consultas e mapeamento de dados"
        titleClassName="text-3xl font-bold tracking-tight"
        subtitleClassName="text-base text-muted-foreground mt-1.5"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className={`pl-9 w-52 h-9 ${inputCls}`}
          />
        </div>
      </PageHeader>

      {providersQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}

      <Tabs
        value={integrationsTab}
        onValueChange={(v) => setIntegrationsTab(v as 'providers' | 'consultations' | 'types')}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-10 bg-muted/50 p-1 rounded-lg gap-1 inline-flex w-fit max-w-full overflow-x-auto [scrollbar-width:thin]">
            <TabsTrigger value="providers" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Server className="w-4 h-4" /> Provedores
            </TabsTrigger>
            <TabsTrigger value="consultations" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Database className="w-4 h-4" /> Consultas
            </TabsTrigger>
            <TabsTrigger value="types" className="text-sm h-8 gap-2 px-4 rounded-md shrink-0">
              <Tag className="w-4 h-4" /> Tipos
            </TabsTrigger>
          </TabsList>
          {integrationsTab === 'providers' && (
            <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-4 shrink-0" onClick={() => setProviderModal({ open: true })}>
              <Plus className="w-4 h-4 mr-1.5" /> Provedor
            </Button>
          )}
          {integrationsTab === 'consultations' && (
            <Button
              size="default"
              className="gradient-primary text-primary-foreground text-sm h-9 px-4 shrink-0"
              onClick={() => {
                setConsultationPicker(CONSULTATION_PICKER_NEW);
                setNewConsultationProviderId(undefined);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Nova consulta
            </Button>
          )}
          {integrationsTab === 'types' && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                className="text-sm h-9 px-4 shrink-0"
                onClick={() => void handleImportDefaultFieldTypes()}
                disabled={importingDefaultFieldTypes}
              >
                <RefreshCcw className="w-4 h-4 mr-1.5" />
                {importingDefaultFieldTypes ? 'Importando…' : 'Importar tipos'}
              </Button>
              <Button size="default" className="gradient-primary text-primary-foreground text-sm h-9 px-4 shrink-0" onClick={() => setFieldTypeModal({ open: true })}>
                <Plus className="w-4 h-4 mr-1.5" /> Tipo
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="providers" className="space-y-2">
          <div className="space-y-1.5">
            {filteredProviders.map((prov, i) => {
              const provConsults = consultations.filter((c) => c.providerId === prov.id);
              const isExpanded = expandedProvider === prov.id;

              return (
                <motion.div key={prov.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <div className="bg-card rounded-md border border-border overflow-hidden">
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setExpandedProvider(isExpanded ? null : prov.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${prov.status === 'active' ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                        <Server className={`w-4 h-4 ${prov.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cardTitleCls}>{prov.name}</span>
                          <span className={`${subtleBadgeCls} ${prov.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                            {prov.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className={`${metaMonoCls} truncate mt-0.5`}>{prov.baseUrl}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{provConsults.length}</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-3 pb-3 border-t border-border pt-2.5 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-md bg-muted/30 border border-border p-2.5">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Saldo</p>
                                <code className="text-sm font-mono text-foreground break-all">{prov.balanceEndpoint || '—'}</code>
                              </div>
                              <div className="rounded-md bg-muted/30 border border-border p-2.5">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Recarga</p>
                                <code className="text-sm font-mono text-foreground break-all">{prov.rechargeEndpoint || '—'}</code>
                              </div>
                              <div className="rounded-md bg-muted/30 border border-border p-2.5">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Auth</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm text-foreground capitalize">{prov.authType}</span>
                                  <span className="text-xs text-muted-foreground">({prov.credentials.length})</span>
                                </div>
                              </div>
                            </div>

                            {provConsults.length > 0 && (
                              <div className="space-y-1">
                                <p className={labelCls}>Consultas</p>
                                {provConsults.map((pc) => (
                                  <div key={pc.id} className="flex items-center justify-between px-2.5 py-2 rounded-md bg-background border border-border hover:border-primary/20 transition-colors group">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Database className="w-4 h-4 text-primary flex-shrink-0" />
                                      <span className="text-sm font-medium text-foreground truncate">{pc.name}</span>
                                      <code className="text-xs font-mono text-muted-foreground">{pc.externalId}</code>
                                    </div>
                                    <button
                                      type="button"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                                      onClick={async () => {
                                        try {
                                          await deleteProductApi(accessToken, pc.id);
                                          toast.success('Removida');
                                          invalidateAll();
                                        } catch {
                                          toast.error('Não foi possível remover');
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                              <button
                                type="button"
                                className={`${linkActionCls} text-primary hover:text-primary/80`}
                                onClick={() => {
                                  setIntegrationsTab('consultations');
                                  setConsultationPicker(CONSULTATION_PICKER_NEW);
                                  setNewConsultationProviderId(prov.id);
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" /> Consulta
                              </button>
                              <span className="text-border hidden sm:inline">·</span>
                              <button type="button" className={`${linkActionCls} text-muted-foreground hover:text-foreground`} onClick={() => setProviderModal({ open: true, provider: prov })}>
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <span className="text-border hidden sm:inline">·</span>
                              <button
                                type="button"
                                className={`${linkActionCls} text-muted-foreground hover:text-destructive`}
                                onClick={async () => {
                                  try {
                                    await deleteProviderApi(accessToken, prov.id);
                                    toast.success('Removido');
                                    invalidateAll();
                                  } catch {
                                    toast.error('Não foi possível remover o provedor');
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remover
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

            {!providersQuery.isLoading && filteredProviders.length === 0 && (
              <div className="text-center py-12">
                <Server className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum provedor encontrado</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="space-y-2">
          {integrationsTab === 'consultations' && providersQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando consultas…</p>
          )}

          {integrationsTab === 'consultations' && !providersQuery.isLoading && consultationPicker !== null && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <div
                className={`bg-card rounded-md border p-4 ${
                  consultationPicker === CONSULTATION_PICKER_NEW ? 'border-2 border-primary/30' : 'border-border'
                }`}
              >
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Select
                      value={consultationPicker}
                      onValueChange={(v) => {
                        setConsultationPicker(v);
                        if (v !== CONSULTATION_PICKER_NEW) setNewConsultationProviderId(undefined);
                      }}
                    >
                      <SelectTrigger className={`h-9 w-full min-w-[12rem] flex-1 sm:max-w-lg ${selectTriggerCls}`}>
                        <SelectValue placeholder="Selecione uma consulta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CONSULTATION_PICKER_NEW}>Nova consulta</SelectItem>
                        {sortedConsultations.map((c) => {
                          const pv = providers.find((p) => p.id === c.providerId);
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} — {pv?.name ?? 'Provedor'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Select
                      key={testLogSelectKey}
                      value={selectedTestLogId}
                      disabled={testLogForPicker.length === 0}
                      onValueChange={(logId) => {
                        const entry = testLogForPicker.find((t) => t.id === logId);
                        if (entry) {
                          consultationEditorRef.current?.loadResponseFromLog(entry);
                          setSelectedTestLogId(logId);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full min-w-[11rem] sm:w-[min(100%,16rem)] cursor-pointer disabled:cursor-not-allowed">
                        <SelectValue
                          placeholder={
                            selectedTestLog
                              ? `${selectedTestLog.consultationName} · ${new Date(selectedTestLog.testedAt).toLocaleString('pt-BR')}`
                              : 'Carregar retorno do histórico…'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {testLogForPicker.map((entry) => {
                          const pv = providers.find((p) => p.id === entry.providerId);
                          return (
                            <SelectItem key={entry.id} value={entry.id} className="cursor-pointer">
                              <span className="font-medium">{entry.consultationName}</span>
                              <span className="text-muted-foreground">
                                {' '}
                                · {pv?.name ?? '—'} ·{' '}
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {new Date(entry.testedAt).toLocaleString('pt-BR')}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          className="gradient-primary h-9 w-9 shrink-0 cursor-pointer text-primary-foreground"
                          disabled={testMutation.isPending}
                          aria-label="Testar no provedor"
                          onClick={() => {
                            if (consultationPicker === CONSULTATION_PICKER_NEW) {
                              void newConsultationTestRef.current?.();
                            } else {
                              const run = cardTestFnsRef.current[consultationPicker];
                              if (run) void run();
                              else void testMutation.mutateAsync({ kind: 'saved', productId: consultationPicker });
                            }
                          }}
                        >
                          {testMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Play className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Testar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          className="gradient-primary h-9 w-9 shrink-0 cursor-pointer text-primary-foreground"
                          aria-label="Salvar consulta"
                          onClick={() => consultationEditorRef.current?.save()}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Salvar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0 cursor-pointer"
                          aria-label="Reverter alterações"
                          onClick={() => consultationEditorRef.current?.revert()}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Reverter alterações</TooltipContent>
                    </Tooltip>
                    {consultationPicker !== CONSULTATION_PICKER_NEW && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                            aria-label="Excluir consulta"
                            onClick={async () => {
                              const idToDelete = consultationPicker;
                              try {
                                await deleteProductApi(accessToken, idToDelete);
                                toast.success('Removida');
                                invalidateAll();
                                const rest = consultations.filter((c) => c.id !== idToDelete);
                                const sorted = [...rest].sort(
                                  (a, b) =>
                                    new Date(b.updatedAt || 0).getTime() -
                                    new Date(a.updatedAt || 0).getTime(),
                                );
                                setConsultationPicker(sorted[0]?.id ?? CONSULTATION_PICKER_NEW);
                                setConsultationEditorNonce((n) => n + 1);
                              } catch {
                                toast.error('Não foi possível remover');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Excluir consulta</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {consultationPicker === CONSULTATION_PICKER_NEW ? (
                  <NewConsultationForm
                    ref={consultationEditorRef}
                    key={`new-${newConsultationProviderId ?? 'none'}`}
                    providers={providers}
                    fieldTypes={fieldTypes}
                    testLog={testLog}
                    providerId={newConsultationProviderId}
                    registerNewConsultationTestFn={registerNewConsultationTestFn}
                    onTest={(input) => testMutation.mutateAsync(input)}
                    onSave={async (data) => saveConsultation(data)}
                    onCancel={() => {
                      if (sortedConsultations.length === 0) return;
                      setConsultationPicker(sortedConsultations[0].id);
                      setNewConsultationProviderId(undefined);
                    }}
                  />
                ) : (
                  <ConsultationEditor
                    ref={consultationEditorRef}
                    key={`${consultationPicker}-${consultationEditorNonce}`}
                    consultation={findConsultation(consultationPicker)!}
                    providers={providers}
                    fieldTypes={fieldTypes}
                    testLog={testLog}
                    registerCardTestFn={registerCardTestFn}
                    onTest={(input) => testMutation.mutateAsync(input)}
                    onSave={async (data) => saveConsultation(data, consultationPicker)}
                    onCancel={() => setConsultationEditorNonce((n) => n + 1)}
                  />
                )}
              </div>
            </motion.div>
          )}

        </TabsContent>

        <TabsContent value="types" className="mt-2 outline-none focus-visible:ring-0">
          <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm h-[clamp(22rem,calc(100vh-11.5rem),52rem)]">
            <aside className="flex w-[17.5rem] shrink-0 flex-col border-r border-border/80 bg-muted/20 sm:w-72">
              <div className="shrink-0 border-b border-border/70 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipos canônicos</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {fieldTypes.length} item{fieldTypes.length !== 1 ? 's' : ''} · lista rolável
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2.5 [scrollbar-width:thin]">
                <div className="flex flex-col gap-2">
                  {fieldTypes.map((ft, i) => {
                    const linked = getLinkedConsultations(ft.key);
                    const isSelected = selectedFieldType === ft.key;

                    return (
                      <motion.div key={ft.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                        <div
                          onClick={() => setSelectedFieldType(isSelected ? null : ft.key)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedFieldType(isSelected ? null : ft.key)}
                          role="button"
                          tabIndex={0}
                          className={`group/card relative flex cursor-pointer flex-col rounded-lg border text-left transition-all duration-200 ${
                            isSelected
                              ? `${ftColorClass(ft.color, 'bg')} ${ftColorClass(ft.color, 'border')} border-2 shadow-sm ring-1 ring-primary/10 hover:ring-primary/20`
                              : 'border-border/60 bg-card/90 hover:border-primary/25 hover:bg-background hover:shadow-sm'
                          } p-2.5`}
                        >
                          <div className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-px rounded-md border border-border/40 bg-background/90 p-px opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFieldTypeModal({ open: true, ft });
                              }}
                              aria-label={`Editar ${ft.label}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteCanonicalFieldApi(accessToken, ft.id);
                                  toast.success('Removido');
                                  void queryClient.invalidateQueries({ queryKey: ['admin-canonical-fields'] });
                                } catch {
                                  toast.error('Não foi possível remover (pode haver mapeamentos)');
                                }
                              }}
                              aria-label={`Remover ${ft.label}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex gap-2.5 pr-11">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${ftColorClass(ft.color, 'bg')}`}
                              aria-hidden
                            >
                              <Tag className={`h-3.5 w-3.5 ${ftColorClass(ft.color, 'text')}`} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-sm font-medium leading-tight text-foreground line-clamp-2">{ft.label}</p>
                              <code
                                className="block truncate font-mono text-[10px] leading-none text-muted-foreground/90"
                                title={ft.key}
                              >
                                {ft.key}
                              </code>
                            </div>
                          </div>

                          {ft.description ? (
                            <p className="mt-1.5 line-clamp-2 pl-[2.75rem] text-[11px] leading-relaxed text-muted-foreground/85">
                              {ft.description}
                            </p>
                          ) : null}

                          <div className="mt-2 flex justify-end">
                            <Badge
                              variant="secondary"
                              className="h-5 gap-1 border-0 px-2 py-0 text-[10px] font-medium tabular-nums text-muted-foreground transition-colors duration-200 group-hover/card:bg-secondary/90 group-hover/card:text-secondary-foreground"
                              title={`${linked.length} ${linked.length === 1 ? 'consulta vinculada' : 'consultas vinculadas'}`}
                            >
                              <Database className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                              {linked.length}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background/40">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-5 [scrollbar-width:thin]">
              {selectedFieldType ? (() => {
                const ft = fieldTypes.find((f) => f.key === selectedFieldType);
                const linked = getLinkedConsultations(selectedFieldType);
                if (!ft) return null;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className={`w-5 h-5 ${ftColorClass(ft.color, 'text')}`} />
                      <span className="text-base font-semibold text-foreground">{ft.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{linked.length} consultas</span>
                    </div>

                    <TypeReportFieldsConfig
                      fieldType={ft}
                      saving={savingFieldType}
                      onSave={async (nextConfig) => handleSaveTypeReportFields(ft, nextConfig)}
                    />

                    {linked.length === 0 ? (
                      <div className="text-center py-12 bg-card rounded-md border border-border">
                        <Database className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma consulta vinculada</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {linked.map((pc) => (
                          <LinkedConsultationCard
                            key={pc.id}
                            consultation={pc}
                            provider={providers.find((p) => p.id === pc.providerId)}
                            fieldTypeKey={selectedFieldType!}
                            initialFilters={linkedConsultationInitialFilters(pc, selectedFieldType, fieldTypes)}
                            accessToken={accessToken}
                            onFiltersPersisted={invalidateAll}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="flex min-h-[min(18rem,calc(100%-1rem))] flex-col items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/10 px-4 py-12 text-center">
                  <Tag className="mb-3 h-10 w-10 text-muted-foreground/20" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Nenhum tipo selecionado</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Escolha um tipo na barra lateral para editar campos de relatório e ver consultas vinculadas.
                  </p>
                </div>
              )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ProviderModal
        open={providerModal.open}
        onClose={() => setProviderModal({ open: false })}
        provider={providerModal.provider}
        onSave={handleSaveProvider}
        saving={savingProvider}
      />
      <FieldTypeModal
        open={fieldTypeModal.open}
        onClose={() => setFieldTypeModal({ open: false })}
        fieldType={fieldTypeModal.ft}
        onSave={handleSaveFieldType}
        saving={savingFieldType}
      />
    </div>
  );
}
