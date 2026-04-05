import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  Gauge,
  Loader2,
  PauseCircle,
  RefreshCw,
  Save,
  ScrollText,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getIntegrationSettings,
  patchIntegrationSettings,
  type EffectiveIntegrationSettings,
  type IntegrationSettingsAdminResponse,
} from '@/api/admin-integration-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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

type IntegrationsSettingsTabProps = {
  accessToken: string | null;
  enabled: boolean;
};

export default function IntegrationsSettingsTab({ accessToken, enabled }: IntegrationsSettingsTabProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['admin-integration-settings'],
    queryFn: () => getIntegrationSettings(accessToken),
    enabled: enabled && !!accessToken,
  });

  const [draft, setDraft] = useState<EffectiveIntegrationSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(mapResponseToForm(settingsQuery.data));
    }
  }, [settingsQuery.data]);

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
      toast.success('Configurações salvas');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Erro ao salvar');
    },
  });

  if (settingsQuery.isLoading || !draft) {
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

  return (
    <div className="space-y-3 max-w-3xl pb-20">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/90 bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="text-foreground/80">Tenant</span>
        <code className={cn(metaMonoCls, 'rounded bg-muted/50 px-1.5 py-0.5 text-foreground')}>{tenantSlug}</code>
        <span className="hidden sm:inline text-muted-foreground/80">·</span>
        <span className="text-muted-foreground">Políticas aplicadas às empresas deste tenant.</span>
      </div>

      <SectionShell
        icon={<Gauge className="h-4 w-4" strokeWidth={2} />}
        title="Filas e prioridade"
        description="Prioridade do job ao enfileirar consultas (BullMQ: valor maior tende a ser processado antes)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prioridade" hint="Faixa sugerida −20 a 20.">
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
          <Field label="Concorrência do worker" hint="Somente leitura; variável CONSULTATION_WORKER_CONCURRENCY no worker.">
            <Input
              type="text"
              readOnly
              value={String(workerConcurrency)}
              className={cn(inputCls, 'bg-muted/40 tabular-nums max-w-[8rem] cursor-default')}
            />
          </Field>
        </div>
      </SectionShell>

      <SectionShell
        icon={<RefreshCw className="h-4 w-4" strokeWidth={2} />}
        title="Falhas e retentativas"
        description="Reexecução por item do provedor, com limite de tentativas, backoff e janela de tempo."
      >
        <div className="rounded-md border border-border/60 bg-muted/20 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
            <Field label="Tentativas por item" hint="Inclui a primeira chamada.">
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
                <SelectTrigger className={cn(inputCls, 'cursor-pointer w-full')}>
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
            <Field label="Atraso máximo (ms)">
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
            <Field label="Janela máxima (ms)" hint="Tempo total desde o início do item; depois disso não há novas tentativas." className="sm:col-span-2">
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
            <Field label="Jitter (0–0,5)" className="sm:col-span-2">
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
          <Label className="text-xs font-medium text-foreground">Se todos os itens falharem</Label>
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
          <p className="text-[11px] text-muted-foreground pt-0.5">
            Com sucesso parcial, o status permanece <span className="font-medium text-foreground/90">Parcial</span>.
          </p>
        </div>
      </SectionShell>

      <SectionShell
        icon={<Timer className="h-4 w-4" strokeWidth={2} />}
        title="Operação e provedor"
        description="Timeout, pausa de emissão e telemetria de testes."
      >
        <div className="space-y-4">
          <Field label="Timeout (ms)" hint="Vazio = produto ou PROVIDER_REQUEST_TIMEOUT_MS.">
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

          <Separator className="bg-border/60" />

          <div className="space-y-2.5">
            <div className={switchRowCls}>
              <div className="flex items-start gap-2.5 min-w-0">
                <PauseCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                <div className="space-y-0.5">
                  <Label htmlFor="pause-new" className="text-sm font-medium cursor-pointer">
                    Pausar novas consultas
                  </Label>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Bloqueia criação para empresas do tenant (sem debitar saldo).
                  </p>
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
                <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                <div className="space-y-0.5">
                  <Label htmlFor="verbose-test" className="text-sm font-medium cursor-pointer">
                    Log verbose em testes de provedor
                  </Label>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Registra detalhes no servidor (nível debug / LOG_LEVEL).
                  </p>
                </div>
              </div>
              <Switch
                id="verbose-test"
                className="cursor-pointer shrink-0"
                checked={draft.verboseProviderTestLogs}
                onCheckedChange={(v) => setDraft((d) => (d ? { ...d, verboseProviderTestLogs: v } : d))}
              />
            </div>
          </div>

          <Separator className="bg-border/60" />

          <Field
            label="Limite req/min"
            hint="Reservado — persistido; rate limit global ainda não aplicado no worker."
          >
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

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:sticky md:bottom-4 md:left-auto md:right-auto md:max-w-3xl md:rounded-lg md:border md:shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-3 py-3 md:px-4">
          <Button
            type="button"
            size="default"
            className="gradient-primary text-primary-foreground cursor-pointer h-9 px-4 text-sm shadow-sm transition-opacity duration-200"
            disabled={saveMutation.isPending}
            onClick={() => void saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4 mr-2" aria-hidden />
            )}
            {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
