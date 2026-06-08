import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Database,
  Gauge,
  Loader2,
  PauseCircle,
  RefreshCw,
  Save,
  ScrollText,
  Search,
  Server,
  Timer,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getIntegrationSettings,
  patchIntegrationSettings,
  type EffectiveIntegrationSettings,
  type IntegrationSettingsAdminResponse,
} from '@/api/admin-integration-settings';
import { patchProductApi } from '@/api/admin-integrations';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { applyProductOverridesPreview } from '@/lib/product-integration-preview';
import { cn } from '@/lib/utils';
import type { ProductIntegrationOverrides, Provider, ProviderConsultation } from '@/types/integrations';

const inputCls = 'h-9 text-sm bg-background placeholder:text-muted-foreground border-border';
const cardTitleCls = 'text-sm font-semibold text-foreground tracking-tight';
const metaMonoCls = 'text-[11px] font-mono text-muted-foreground leading-tight';

function cloneEffective(e: EffectiveIntegrationSettings): EffectiveIntegrationSettings {
  return {
    ...e,
    executionRetry: { ...e.executionRetry },
  };
}

function mapResponseToForm(data: IntegrationSettingsAdminResponse): EffectiveIntegrationSettings {
  return cloneEffective(data.effective);
}

type SectionShellProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
};

function SectionShell({ icon, title, description, children }: SectionShellProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden transition-colors duration-200">
      <div className="flex items-start gap-3 border-b border-border/70 px-4 py-3 bg-muted/20">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className={cardTitleCls}>{title}</h3>
          {description ? <p className="text-xs text-muted-foreground leading-snug">{description}</p> : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

function Field({ label, hint, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p> : null}
    </div>
  );
}

type ConsultationOverrideFormProps = {
  accessToken: string | null;
  consultation: ProviderConsultation;
  providerName: string;
  tenantEffective: EffectiveIntegrationSettings;
  onSaved: () => void;
};

function ConsultationOverrideForm({
  accessToken,
  consultation,
  providerName,
  tenantEffective,
  onSaved,
}: ConsultationOverrideFormProps) {
  const io = consultation.integrationOverrides ?? {};

  const [usePriority, setUsePriority] = useState(() => io.queueJobPriority !== undefined);
  const [priority, setPriority] = useState(() => io.queueJobPriority ?? tenantEffective.queueJobPriority);

  const [useRetry, setUseRetry] = useState(() => io.executionRetry != null && Object.keys(io.executionRetry).length > 0);
  const [retryMax, setRetryMax] = useState(() => io.executionRetry?.maxAttempts ?? tenantEffective.executionRetry.maxAttempts);
  const [retryBackoff, setRetryBackoff] = useState<'fixed' | 'exponential'>(
    () => io.executionRetry?.backoffType ?? tenantEffective.executionRetry.backoffType,
  );
  const [retryInitial, setRetryInitial] = useState(
    () => io.executionRetry?.initialDelayMs ?? tenantEffective.executionRetry.initialDelayMs,
  );
  const [retryMaxDelay, setRetryMaxDelay] = useState(
    () => io.executionRetry?.maxDelayMs ?? tenantEffective.executionRetry.maxDelayMs,
  );
  const [retryWindow, setRetryWindow] = useState(
    () => io.executionRetry?.maxRetryWindowMs ?? tenantEffective.executionRetry.maxRetryWindowMs,
  );
  const [retryJitter, setRetryJitter] = useState(
    () => io.executionRetry?.jitterRatio ?? tenantEffective.executionRetry.jitterRatio,
  );

  const [useOnExhausted, setUseOnExhausted] = useState(() => io.onExhausted !== undefined);
  const [onExhausted, setOnExhausted] = useState<EffectiveIntegrationSettings['onExhausted']>(
    () => io.onExhausted ?? tenantEffective.onExhausted,
  );

  const [useTimeout, setUseTimeout] = useState(() => io.providerTimeoutOverrideMs !== undefined);
  const [timeoutMs, setTimeoutMs] = useState<number | ''>(
    () =>
      io.providerTimeoutOverrideMs ??
      tenantEffective.providerTimeoutOverrideMs ??
      '',
  );

  useEffect(() => {
    const nextIo = consultation.integrationOverrides ?? {};
    setUsePriority(nextIo.queueJobPriority !== undefined);
    setPriority(nextIo.queueJobPriority ?? tenantEffective.queueJobPriority);
    setUseRetry(nextIo.executionRetry != null && Object.keys(nextIo.executionRetry).length > 0);
    setRetryMax(nextIo.executionRetry?.maxAttempts ?? tenantEffective.executionRetry.maxAttempts);
    setRetryBackoff(nextIo.executionRetry?.backoffType ?? tenantEffective.executionRetry.backoffType);
    setRetryInitial(nextIo.executionRetry?.initialDelayMs ?? tenantEffective.executionRetry.initialDelayMs);
    setRetryMaxDelay(nextIo.executionRetry?.maxDelayMs ?? tenantEffective.executionRetry.maxDelayMs);
    setRetryWindow(nextIo.executionRetry?.maxRetryWindowMs ?? tenantEffective.executionRetry.maxRetryWindowMs);
    setRetryJitter(nextIo.executionRetry?.jitterRatio ?? tenantEffective.executionRetry.jitterRatio);
    setUseOnExhausted(nextIo.onExhausted !== undefined);
    setOnExhausted(nextIo.onExhausted ?? tenantEffective.onExhausted);
    setUseTimeout(nextIo.providerTimeoutOverrideMs !== undefined);
    setTimeoutMs(
      nextIo.providerTimeoutOverrideMs ??
        tenantEffective.providerTimeoutOverrideMs ??
        '',
    );
  }, [consultation.id, consultation.integrationOverrides, tenantEffective]);

  const buildOverridesFromForm = useCallback((): ProductIntegrationOverrides | null => {
    const next: ProductIntegrationOverrides = {
      ...(consultation.integrationOverrides ? { ...consultation.integrationOverrides } : {}),
    };
    if (usePriority) next.queueJobPriority = priority;
    else delete next.queueJobPriority;

    if (useRetry) {
      next.executionRetry = {
        maxAttempts: retryMax,
        backoffType: retryBackoff,
        initialDelayMs: retryInitial,
        maxDelayMs: retryMaxDelay,
        maxRetryWindowMs: retryWindow,
        jitterRatio: retryJitter,
      };
    } else delete next.executionRetry;

    if (useOnExhausted) next.onExhausted = onExhausted;
    else delete next.onExhausted;

    if (useTimeout) {
      next.providerTimeoutOverrideMs =
        timeoutMs === '' || timeoutMs === null ? null : Number(timeoutMs);
    } else delete next.providerTimeoutOverrideMs;

    return Object.keys(next).length ? next : null;
  }, [
    consultation.integrationOverrides,
    usePriority,
    priority,
    useRetry,
    retryMax,
    retryBackoff,
    retryInitial,
    retryMaxDelay,
    retryWindow,
    retryJitter,
    useOnExhausted,
    onExhausted,
    useTimeout,
    timeoutMs,
  ]);

  const preview = useMemo(
    () => applyProductOverridesPreview(tenantEffective, buildOverridesFromForm()),
    [tenantEffective, buildOverridesFromForm],
  );

  const saveProduct = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error('Sessão inválida');
      const body = buildOverridesFromForm();
      await patchProductApi(accessToken, consultation.id, {
        integrationOverrides: body,
      });
    },
    onSuccess: () => {
      toast.success('Consulta atualizada');
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao salvar'),
  });

  const accTriggerCls =
    'py-2.5 text-sm font-medium hover:no-underline [&[data-state=open]>svg]:rotate-90 transition-transform';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-gradient-to-br from-card to-muted/15 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-foreground leading-tight truncate">{consultation.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Server className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span className="truncate max-w-[12rem] sm:max-w-md">{providerName}</span>
                </span>
                <span className="text-border">·</span>
                <code className={cn(metaMonoCls, 'truncate max-w-[200px] text-foreground/80')}>{consultation.endpoint}</code>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={consultation.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5 font-medium">
                  {consultation.status === 'active' ? 'Ativa' : 'Inativa'}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 tabular-nums font-normal gap-1">
                  <Gauge className="h-3 w-3" />
                  Fila efetiva: {preview.queueJobPriority}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 cursor-pointer text-xs"
              disabled={saveProduct.isPending}
              onClick={() => {
                setUsePriority(false);
                setUseRetry(false);
                setUseOnExhausted(false);
                setUseTimeout(false);
                void (async () => {
                  if (!accessToken) return;
                  try {
                    await patchProductApi(accessToken, consultation.id, { integrationOverrides: null });
                    toast.success('Overrides removidos — herdando do tenant');
                    onSaved();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Erro ao redefinir');
                  }
                })();
              }}
            >
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              Herdar tudo do tenant
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 gradient-primary text-primary-foreground cursor-pointer text-xs"
              disabled={saveProduct.isPending}
              onClick={() => void saveProduct.mutate()}
            >
              {saveProduct.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Salvar consulta
            </Button>
          </div>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['priority', 'retry']} className="space-y-2">
        <AccordionItem value="priority" className="rounded-lg border border-border bg-card px-4 data-[state=open]:shadow-sm">
          <AccordionTrigger className={accTriggerCls}>
            <span className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary shrink-0" />
              Prioridade na fila
              {usePriority ? (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  personalizado
                </Badge>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Sobrescrever prioridade</Label>
                <p className="text-xs text-muted-foreground">
                  Tenant base: <span className="font-mono tabular-nums">{tenantEffective.queueJobPriority}</span> — o job da
                  consulta composta usa o <span className="font-medium">maior</span> valor entre os produtos.
                </p>
              </div>
              <Switch
                className="cursor-pointer shrink-0"
                checked={usePriority}
                onCheckedChange={(v) => {
                  setUsePriority(v);
                  if (v) setPriority(io.queueJobPriority ?? tenantEffective.queueJobPriority);
                }}
              />
            </div>
            {usePriority ? (
              <Field label="Prioridade desta consulta" hint="Mesmo intervalo −20 … 20.">
                <Input
                  type="number"
                  min={-20}
                  max={20}
                  className={cn(inputCls, 'tabular-nums max-w-[8rem]')}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) || 0)}
                />
              </Field>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="retry" className="rounded-lg border border-border bg-card px-4 data-[state=open]:shadow-sm">
          <AccordionTrigger className={accTriggerCls}>
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary shrink-0" />
              Retentativas por item
              {useRetry ? (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  personalizado
                </Badge>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Política própria de retentativa</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, estes valores substituem o bloco de retentativas do tenant só para esta consulta.
                </p>
              </div>
              <Switch className="cursor-pointer shrink-0" checked={useRetry} onCheckedChange={setUseRetry} />
            </div>
            {useRetry ? (
              <div className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border/80 bg-muted/10 p-3 sm:p-4">
                <Field label="Tentativas">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    className={cn(inputCls, 'tabular-nums')}
                    value={retryMax}
                    onChange={(e) => setRetryMax(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  />
                </Field>
                <Field label="Backoff">
                  <Select
                    value={retryBackoff}
                    onValueChange={(v: 'fixed' | 'exponential') => setRetryBackoff(v)}
                  >
                    <SelectTrigger className={cn(inputCls, 'cursor-pointer')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" className="cursor-pointer">
                        Fixo
                      </SelectItem>
                      <SelectItem value="exponential" className="cursor-pointer">
                        Exponencial
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Atraso inicial (ms)">
                  <Input
                    type="number"
                    min={0}
                    className={cn(inputCls, 'tabular-nums')}
                    value={retryInitial}
                    onChange={(e) => setRetryInitial(Math.max(0, Number(e.target.value) || 0))}
                  />
                </Field>
                <Field label="Atraso máx. (ms)">
                  <Input
                    type="number"
                    min={1000}
                    className={cn(inputCls, 'tabular-nums')}
                    value={retryMaxDelay}
                    onChange={(e) => setRetryMaxDelay(Math.max(1000, Number(e.target.value) || 1000))}
                  />
                </Field>
                <Field label="Janela máx. (ms)" className="sm:col-span-2">
                  <Input
                    type="number"
                    min={1000}
                    className={cn(inputCls, 'tabular-nums sm:max-w-xs')}
                    value={retryWindow}
                    onChange={(e) => setRetryWindow(Math.max(1000, Number(e.target.value) || 1000))}
                  />
                </Field>
                <Field label="Jitter" className="sm:col-span-2">
                  <Input
                    type="number"
                    step={0.05}
                    min={0}
                    max={0.5}
                    className={cn(inputCls, 'tabular-nums max-w-[10rem]')}
                    value={retryJitter}
                    onChange={(e) => setRetryJitter(Math.min(0.5, Math.max(0, Number(e.target.value) || 0)))}
                  />
                </Field>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fail" className="rounded-lg border border-border bg-card px-4 data-[state=open]:shadow-sm">
          <AccordionTrigger className={accTriggerCls}>
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
              Quando esgotar tentativas
              {useOnExhausted ? (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  personalizado
                </Badge>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                Aplica-se quando <span className="font-medium text-foreground">este item</span> falha após todas as
                tentativas. Consulta só marca revisão manual se algum item exigir.
              </p>
              <Switch className="cursor-pointer shrink-0" checked={useOnExhausted} onCheckedChange={setUseOnExhausted} />
            </div>
            {useOnExhausted ? (
              <Select
                value={onExhausted}
                onValueChange={(v: EffectiveIntegrationSettings['onExhausted']) => setOnExhausted(v)}
              >
                <SelectTrigger className={cn(inputCls, 'cursor-pointer max-w-lg')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fail" className="cursor-pointer">
                    Falhar consulta
                  </SelectItem>
                  <SelectItem value="partial_ok" className="cursor-pointer">
                    Falhar (mensagem padrão)
                  </SelectItem>
                  <SelectItem value="require_manual_review" className="cursor-pointer">
                    Falhar — revisão manual
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="timeout" className="rounded-lg border border-border bg-card px-4 data-[state=open]:shadow-sm">
          <AccordionTrigger className={accTriggerCls}>
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary shrink-0" />
              Timeout do provedor
              {useTimeout ? (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  personalizado
                </Badge>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border/70 bg-muted/20 px-3 py-3">
              <p className="text-xs text-muted-foreground">
                Sobre o timeout do produto e do tenant. Ative para forçar um limite só nesta rota.
              </p>
              <Switch className="cursor-pointer shrink-0" checked={useTimeout} onCheckedChange={setUseTimeout} />
            </div>
            {useTimeout ? (
              <Field label="Timeout (ms)" hint="Vazio ou 0 para sem override explícito — use limpar para herdar.">
                <Input
                  type="number"
                  min={1000}
                  max={300_000}
                  placeholder="Ex: 45000"
                  className={cn(inputCls, 'tabular-nums sm:max-w-xs')}
                  value={timeoutMs === null ? '' : timeoutMs}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTimeoutMs(v === '' ? '' : Math.min(300_000, Math.max(1000, Number(v) || 0)));
                  }}
                />
              </Field>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        Preview efetivo (fila): prioridade {preview.queueJobPriority}, tentativas máx. {preview.executionRetry.maxAttempts}.
      </p>
    </div>
  );
}

type IntegrationsSettingsTabProps = {
  accessToken: string | null;
  enabled: boolean;
  providers: Provider[];
  consultations: ProviderConsultation[];
};

export default function IntegrationsSettingsTab({
  accessToken,
  enabled,
  providers,
  consultations,
}: IntegrationsSettingsTabProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['admin-integration-settings'],
    queryFn: () => getIntegrationSettings(accessToken),
    enabled: enabled && !!accessToken,
  });

  const [draft, setDraft] = useState<EffectiveIntegrationSettings | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(mapResponseToForm(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  const tenantEffective = settingsQuery.data?.effective;

  const sortedList = useMemo(() => {
    return [...consultations].sort((a, b) => {
      const pa = providers.find((p) => p.id === a.providerId)?.name ?? '';
      const pb = providers.find((p) => p.id === b.providerId)?.name ?? '';
      const c = pa.localeCompare(pb, 'pt-BR');
      if (c !== 0) return c;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [consultations, providers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedList;
    return sortedList.filter((c) => {
      const pn = (providers.find((p) => p.id === c.providerId)?.name ?? '').toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        pn.includes(q) ||
        c.endpoint.toLowerCase().includes(q) ||
        c.externalId.toLowerCase().includes(q)
      );
    });
  }, [sortedList, search, providers]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId == null || !filtered.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!accessToken || !draft) throw new Error('Sessão inválida');
      return patchIntegrationSettings(accessToken, {
        executionRetry: draft.executionRetry,
        onExhausted: draft.onExhausted,
        queueJobPriority: draft.queueJobPriority,
        pauseNewConsultations: draft.pauseNewConsultations,
        providerTimeoutOverrideMs: draft.providerTimeoutOverrideMs,
        verboseProviderTestLogs: draft.verboseProviderTestLogs,
        maxProviderRequestsPerMinute: draft.maxProviderRequestsPerMinute,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-integration-settings'], data);
      setDraft(mapResponseToForm(data));
      toast.success('Padrão do tenant salvo');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao salvar');
    },
  });

  const selected = selectedId ? consultations.find((c) => c.id === selectedId) : undefined;
  const providerName = selected ? providers.find((p) => p.id === selected.providerId)?.name ?? '—' : '';

  if (settingsQuery.isLoading || !draft || !tenantEffective) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8" role="status">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        Carregando configurações…
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar</AlertTitle>
        <AlertDescription>Não foi possível carregar as configurações de integração.</AlertDescription>
      </Alert>
    );
  }

  const workerConcurrency = settingsQuery.data?.workerConcurrency ?? 5;
  const tenantSlug = settingsQuery.data?.tenantSlug ?? '—';

  const switchRowCls =
    'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/80 bg-muted/25 px-3.5 py-3 transition-colors duration-200 hover:bg-muted/35';

  const labelCls = 'text-xs font-medium text-foreground';

  return (
    <div className="space-y-4 pb-24">
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border/70 px-3 py-2.5 bg-muted/20">
              <h3 className={cn(cardTitleCls, 'flex items-center gap-2')}>
                <Database className="h-4 w-4 text-primary" />
                Consultas
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Selecione uma consulta para políticas específicas. O job na fila usa a maior prioridade entre os produtos.
              </p>
            </div>
            <div className="p-2 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nome, provedor, rota…"
                  className={cn(inputCls, 'h-8 pl-8 text-xs')}
                />
              </div>
            </div>
            <ScrollArea className="h-[min(52vh,420px)]">
              <ul className="p-2 space-y-1">
                {filtered.map((c) => {
                  const pn = providers.find((p) => p.id === c.providerId)?.name ?? '';
                  const eff = applyProductOverridesPreview(tenantEffective, c.integrationOverrides);
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          'w-full rounded-lg border text-left px-3 py-2.5 transition-all duration-200 cursor-pointer',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          active
                            ? 'border-primary bg-primary/8 shadow-sm'
                            : 'border-border/90 bg-card hover:bg-muted/40 hover:border-border',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                              c.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            <Database className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <Server className="h-3 w-3 shrink-0 opacity-70" />
                              <span className="truncate">{pn}</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <Badge variant="outline" className="text-[10px] h-5 tabular-nums font-normal gap-0.5 px-1.5">
                                P{eff.queueJobPriority}
                              </Badge>
                              {c.integrationOverrides != null && Object.keys(c.integrationOverrides).length > 0 ? (
                                <Badge className="text-[10px] h-5 font-normal bg-primary/15 text-primary border-0">
                                  overrides
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma consulta encontrada.</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {selected && accessToken ? (
            <ConsultationOverrideForm
              key={selected.id}
              accessToken={accessToken}
              consultation={selected}
              providerName={providerName}
              tenantEffective={tenantEffective}
              onSaved={() => void queryClient.invalidateQueries({ queryKey: ['admin-providers'] })}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Selecione uma consulta na lista.
            </div>
          )}

          <Separator className="bg-border/70" />

          <SectionShell
            icon={<Building2 className="h-4 w-4" strokeWidth={2} />}
            title="Padrão do tenant"
            description="Vale para todas as consultas onde não houver override. Empresas ligadas a este tenant."
          >
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/90 bg-muted/15 px-3 py-2 text-xs text-muted-foreground mb-4">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-foreground/80">Tenant</span>
              <code className={cn(metaMonoCls, 'rounded bg-muted/50 px-1.5 py-0.5 text-foreground')}>{tenantSlug}</code>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prioridade base" hint="−20 … 20">
                <Input
                  type="number"
                  min={-20}
                  max={20}
                  className={cn(inputCls, 'tabular-nums max-w-[8rem]')}
                  value={draft.queueJobPriority}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, queueJobPriority: Number(e.target.value) || 0 } : d,
                    )
                  }
                />
              </Field>
              <Field label="Concorrência worker" hint="CONSULTATION_WORKER_CONCURRENCY">
                <Input
                  type="text"
                  readOnly
                  value={String(workerConcurrency)}
                  className={cn(inputCls, 'bg-muted/40 tabular-nums max-w-[8rem] cursor-default')}
                />
              </Field>
            </div>

            <Separator className="my-4 bg-border/60" />

            <div className="rounded-md border border-border/60 bg-muted/20 p-3 sm:p-4 space-y-3">
              <p className={cn(labelCls, 'text-sm')}>Retentativas (tenant)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tentativas">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    className={cn(inputCls, 'tabular-nums')}
                    value={draft.executionRetry.maxAttempts}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              executionRetry: {
                                ...d.executionRetry,
                                maxAttempts: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </Field>
                <Field label="Backoff">
                  <Select
                    value={draft.executionRetry.backoffType}
                    onValueChange={(v: 'fixed' | 'exponential') =>
                      setDraft((d) =>
                        d ? { ...d, executionRetry: { ...d.executionRetry, backoffType: v } } : d,
                      )
                    }
                  >
                    <SelectTrigger className={cn(inputCls, 'cursor-pointer')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" className="cursor-pointer">
                        Fixo
                      </SelectItem>
                      <SelectItem value="exponential" className="cursor-pointer">
                        Exponencial
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Atraso inicial (ms)">
                  <Input
                    type="number"
                    min={0}
                    className={cn(inputCls, 'tabular-nums')}
                    value={draft.executionRetry.initialDelayMs}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              executionRetry: {
                                ...d.executionRetry,
                                initialDelayMs: Math.max(0, Number(e.target.value) || 0),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </Field>
                <Field label="Atraso máx. (ms)">
                  <Input
                    type="number"
                    min={1000}
                    className={cn(inputCls, 'tabular-nums')}
                    value={draft.executionRetry.maxDelayMs}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              executionRetry: {
                                ...d.executionRetry,
                                maxDelayMs: Math.max(1000, Number(e.target.value) || 1000),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </Field>
                <Field label="Janela máx. (ms)" className="sm:col-span-2">
                  <Input
                    type="number"
                    min={1000}
                    className={cn(inputCls, 'tabular-nums sm:max-w-xs')}
                    value={draft.executionRetry.maxRetryWindowMs}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              executionRetry: {
                                ...d.executionRetry,
                                maxRetryWindowMs: Math.max(1000, Number(e.target.value) || 1000),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </Field>
                <Field label="Jitter" className="sm:col-span-2">
                  <Input
                    type="number"
                    step={0.05}
                    min={0}
                    max={0.5}
                    className={cn(inputCls, 'tabular-nums max-w-[10rem]')}
                    value={draft.executionRetry.jitterRatio}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              executionRetry: {
                                ...d.executionRetry,
                                jitterRatio: Math.min(0.5, Math.max(0, Number(e.target.value) || 0)),
                              },
                            }
                          : d,
                      )
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Label className={labelCls}>Se todos os itens falharem (tenant)</Label>
              <Select
                value={draft.onExhausted}
                onValueChange={(v: EffectiveIntegrationSettings['onExhausted']) =>
                  setDraft((d) => (d ? { ...d, onExhausted: v } : d))
                }
              >
                <SelectTrigger className={cn(inputCls, 'cursor-pointer max-w-lg')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fail" className="cursor-pointer">
                    Falhar consulta
                  </SelectItem>
                  <SelectItem value="partial_ok" className="cursor-pointer">
                    Falhar (mensagem padrão)
                  </SelectItem>
                  <SelectItem value="require_manual_review" className="cursor-pointer">
                    Falhar — revisão manual
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-4 bg-border/60" />

            <div className="space-y-3">
              <Field label="Timeout (ms)" hint="Override global de chamada ao provedor.">
                <Input
                  type="number"
                  min={1000}
                  max={300_000}
                  placeholder="Padrão"
                  className={cn(inputCls, 'tabular-nums sm:max-w-xs')}
                  value={draft.providerTimeoutOverrideMs ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            providerTimeoutOverrideMs:
                              v === '' ? null : Math.min(300_000, Math.max(1000, Number(v) || 1000)),
                          }
                        : d,
                    );
                  }}
                />
              </Field>
              <div className={switchRowCls}>
                <div className="flex items-start gap-2.5 min-w-0">
                  <PauseCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <Label htmlFor="pause-new" className="text-sm font-medium cursor-pointer">
                      Pausar novas consultas
                    </Label>
                    <p className="text-xs text-muted-foreground">Bloqueia criação no tenant.</p>
                  </div>
                </div>
                <Switch
                  id="pause-new"
                  className="cursor-pointer shrink-0"
                  checked={draft.pauseNewConsultations}
                  onCheckedChange={(v) => setDraft((d) => (d ? { ...d, pauseNewConsultations: v } : d))}
                />
              </div>
              <div className={switchRowCls}>
                <div className="flex items-start gap-2.5 min-w-0">
                  <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <Label htmlFor="verbose-test" className="text-sm font-medium cursor-pointer">
                      Log verbose em testes de provedor
                    </Label>
                    <p className="text-xs text-muted-foreground">Debug no servidor.</p>
                  </div>
                </div>
                <Switch
                  id="verbose-test"
                  className="cursor-pointer shrink-0"
                  checked={draft.verboseProviderTestLogs}
                  onCheckedChange={(v) => setDraft((d) => (d ? { ...d, verboseProviderTestLogs: v } : d))}
                />
              </div>
              <Field label="Limite req/min (reservado)">
                <Input
                  type="number"
                  min={0}
                  max={10_000}
                  placeholder="Sem limite"
                  className={cn(inputCls, 'tabular-nums sm:max-w-xs')}
                  value={draft.maxProviderRequestsPerMinute ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            maxProviderRequestsPerMinute: v === '' ? null : Math.max(0, Number(v) || 0),
                          }
                        : d,
                    );
                  }}
                />
              </Field>
            </div>
          </SectionShell>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:sticky md:bottom-4 md:left-auto md:right-auto md:max-w-none md:rounded-lg md:border md:shadow-md md:mx-0">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-3 py-3 md:px-4">
          <Button
            type="button"
            size="default"
            className="gradient-primary text-primary-foreground cursor-pointer h-9 px-4 text-sm shadow-sm"
            disabled={saveMutation.isPending}
            onClick={() => void saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar padrão do tenant
          </Button>
        </div>
      </div>
    </div>
  );
}
