import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  Factory,
  FileJson2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  ConsultationFieldType,
  Provider,
  ProviderConsultation,
  TestLogEntry,
} from '@/types/integrations';
import { testProductDraftApi } from '@/api/admin-integrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  buildDataContractReport,
  type BureauOccurrenceAudit,
  type DataContractReport,
} from './contract';
import { buildAutomaticDraftMapping } from './draftMapping';

type ContractAuditTabProps = {
  accessToken: string | null;
  providers: Provider[];
  consultations: ProviderConsultation[];
  fieldTypes: ConsultationFieldType[];
  testLogs: TestLogEntry[];
};

const SOLLOS_HOMOLOGATION_URL =
  'https://api.sollosconsultas.com.br/json/homologa.aspx';

function buildSollosHomologationBody(
  templateJson: string,
  productCode: string,
  document: string,
) {
  const jsonCompatibleTemplate = templateJson.replace(
    /:\s*`([\s\S]*?)`(?=\s*[,}])/g,
    (_match, value: string) => `: ${JSON.stringify(value)}`,
  );
  const parsed = JSON.parse(jsonCompatibleTemplate) as Record<string, unknown>;
  const parametros =
    parsed.Parametros && typeof parsed.Parametros === 'object'
      ? { ...(parsed.Parametros as Record<string, unknown>) }
      : {};

  return {
    ...parsed,
    CodigoProduto: productCode,
    Parametros: {
      ...parametros,
      TipoPessoa: document.length === 14 ? 'J' : 'F',
      CPFCNPJ: document,
    },
  };
}

const STEPS = [
  ['Produto', 'Escolha o tipo de consulta'],
  ['Amostra', 'Use um JSON de homologação'],
  ['Mapeamento', 'Separe cada dado na base correta'],
  ['Preview', 'Veja o resultado organizado'],
  ['Validação', 'Confira origem e destino'],
  ['Catalogação', 'Revise e aprove manualmente'],
] as const;

const BUREAU_LABELS = {
  serasa: 'Serasa · Base I',
  spc: 'SPC Brasil · Base II',
  'boa-vista': 'Boa Vista/SCPC · Base III',
  unknown: 'Base desconhecida',
} as const;

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Não informado';
  return String(value);
}

function JsonPanel({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: unknown;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-1 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileJson2 className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <pre className="max-h-[32rem] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-foreground [scrollbar-width:thin]">
          {JSON.stringify(value, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function EmptyGuidance({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-8 text-center">
      <Sparkles className="mx-auto h-7 w-7 text-primary" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ContractSummary({ report }: { report: DataContractReport }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {report.diagnostics.map((diagnostic) => {
        const Icon = diagnostic.status === 'ok' ? CheckCircle2 : AlertTriangle;
        return (
          <div
            key={diagnostic.stage}
            className={cn(
              'flex min-w-0 items-start gap-3 rounded-lg border p-4',
              diagnostic.status === 'ok'
                ? 'border-emerald-500/25 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/10',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                diagnostic.status === 'ok'
                  ? 'text-emerald-500'
                  : 'text-amber-500',
              )}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {diagnostic.stage}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {diagnostic.fingerprint}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {diagnostic.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BureauAudit({ items }: { items: BureauOccurrenceAudit[] }) {
  if (items.length === 0) {
    return (
      <EmptyGuidance
        title="Nenhuma pendência financeira encontrada nesta amostra"
        description="Isso é válido para consultas sem débitos. A esteira continuará conferindo os demais campos normalmente."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['BASE I', 'Serasa', 'DIVIDAS_SERASA'],
          ['BASE II', 'SPC Brasil', 'DIVIDAS_SPC'],
          ['BASE III', 'Boa Vista / SCPC', 'DIVIDAS_BOA_VISTA'],
        ].map(([base, bureau, target]) => (
          <div key={base} className="rounded-lg border border-border bg-muted/20 p-4">
            <Badge variant="outline">{base}</Badge>
            <p className="mt-2 font-semibold">{bureau}</p>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
              {target}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'grid gap-3 rounded-lg border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]',
              item.status === 'ok'
                ? 'border-emerald-500/25'
                : 'border-red-500/35 bg-red-500/5',
            )}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Origem Sollos
              </p>
              <p className="mt-1 font-semibold">{item.sourceBlock}</p>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {item.sourcePath}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Classificação automática
              </p>
              <p className="mt-1 font-semibold">{BUREAU_LABELS[item.bureau]}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.creditor} · Contrato {item.contract} · Valor{' '}
                {formatValue(item.amount)}
              </p>
            </div>
            <Badge
              className={cn(
                'h-fit justify-center',
                item.status === 'ok'
                  ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-red-500/15 text-red-600 hover:bg-red-500/15 dark:text-red-400',
              )}
            >
              {item.status === 'ok' ? 'Destino correto' : 'Bloqueado'}
            </Badge>
            <p
              className={cn(
                'text-xs lg:col-span-3',
                item.status === 'ok'
                  ? 'text-muted-foreground'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {item.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldLineage({ report }: { report: DataContractReport }) {
  return (
    <div className="space-y-2">
      {report.lineage.length === 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          Nenhum campo possui rastreabilidade completa. A catalogação continuará
          bloqueada.
        </div>
      ) : (
        report.lineage.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-lg border border-border p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto_minmax(0,0.8fr)_auto] lg:items-center"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold">
                {item.typeKey}.{item.targetKey}
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {item.sourcePath}
              </div>
            </div>
            <div className="min-w-0 rounded-md bg-muted/40 p-2">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                JSON Sollos
              </div>
              <div className="mt-1 truncate font-mono text-xs">
                {JSON.stringify(item.sourceValues)}
              </div>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
            <div className="min-w-0 rounded-md bg-muted/40 p-2">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                Preview
              </div>
              <div className="mt-1 truncate font-mono text-xs">
                {JSON.stringify(item.previewValues)}
              </div>
            </div>
            <Badge
              className={cn(
                'justify-center',
                item.status === 'ok'
                  ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400'
                  : item.status === 'not-applicable'
                    ? 'bg-muted text-muted-foreground hover:bg-muted'
                  : 'bg-red-500/15 text-red-600 hover:bg-red-500/15 dark:text-red-400',
              )}
            >
              {item.status === 'ok'
                ? 'Confere'
                : item.status === 'not-applicable'
                  ? 'Não se aplica'
                  : 'Ajustar'}
            </Badge>
            {item.status !== 'ok' && item.status !== 'not-applicable' ? (
              <p className="text-xs text-red-600 lg:col-span-5 dark:text-red-400">
                {item.message}
              </p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function WizardNavigation({
  step,
  canContinue,
  onPrevious,
  onNext,
  position,
}: {
  step: number;
  canContinue: boolean;
  onPrevious: () => void;
  onNext: () => void;
  position: 'top' | 'bottom';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        position === 'top' &&
          'border-b border-border bg-muted/15 px-5 py-3',
      )}
    >
      <Button
        variant="outline"
        size={position === 'top' ? 'sm' : 'default'}
        onClick={onPrevious}
        disabled={step === 1}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>
      <div className="text-center text-xs text-muted-foreground">
        {step < 6 ? `Etapa ${step} de 6` : 'Fim da esteira'}
      </div>
      <Button
        size={position === 'top' ? 'sm' : 'default'}
        onClick={onNext}
        disabled={step === 6 || !canContinue}
      >
        Continuar
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

export default function ContractAuditTab({
  accessToken,
  providers,
  consultations,
  fieldTypes,
  testLogs,
}: ContractAuditTabProps) {
  const [step, setStep] = useState(1);
  const [productCode, setProductCode] = useState(
    () => consultations[0]?.externalId ?? '',
  );
  const [sourceId, setSourceId] = useState('sample');
  const [testDocument, setTestDocument] = useState('');
  const [manualApproval, setManualApproval] = useState(false);
  const [draftRawJson, setDraftRawJson] = useState('');
  const [isRunningHomologation, setIsRunningHomologation] = useState(false);
  const [homologationError, setHomologationError] = useState('');

  const consultation =
    consultations.find((item) => item.externalId === productCode.trim()) ?? null;
  const sollosProvider = useMemo(
    () =>
      providers.find((provider) =>
        provider.name.toLowerCase().includes('sollos'),
      ) ?? null,
    [providers],
  );
  const draftMapping = useMemo(() => {
    if (consultation || !draftRawJson.trim() || !sollosProvider) return null;
    try {
      return buildAutomaticDraftMapping({
        rawJson: draftRawJson,
        productCode: productCode.trim(),
        providerId: sollosProvider.id,
        consultations,
        fieldTypes,
      });
    } catch {
      return null;
    }
  }, [
    consultation,
    consultations,
    draftRawJson,
    fieldTypes,
    productCode,
    sollosProvider,
  ]);
  const effectiveConsultation =
    consultation ?? draftMapping?.consultation ?? null;
  const effectiveFieldTypes = draftMapping?.fieldTypes ?? fieldTypes;
  const logsForConsultation = useMemo(
    () =>
      testLogs
        .filter((log) => log.productId === consultation?.id)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
        ),
    [consultation?.id, testLogs],
  );
  const selectedLog = logsForConsultation.find((log) => log.id === sourceId);
  const rawJson =
    draftRawJson || selectedLog?.responseJson || consultation?.sampleResponse || '';

  const result = useMemo(() => {
    if (!effectiveConsultation || !rawJson.trim()) {
      return { report: null, error: '' };
    }
    try {
      return {
        report: buildDataContractReport({
          rawJson,
          consultation: effectiveConsultation,
          fieldTypes: effectiveFieldTypes,
        }),
        error: '',
      };
    } catch (error) {
      return {
        report: null,
        error:
          error instanceof Error ? error.message : 'Falha ao analisar o contrato.',
      };
    }
  }, [effectiveConsultation, effectiveFieldTypes, rawJson]);

  const isReady =
    result.report?.diagnostics.every((item) => item.status === 'ok') ?? false;

  useEffect(() => {
    setManualApproval(false);
  }, [productCode, sourceId, draftRawJson]);

  useEffect(() => {
    setDraftRawJson('');
    setHomologationError('');
  }, [productCode]);

  const canContinue =
    step === 1
      ? productCode.trim().length > 0
      : step === 2
        ? Boolean(rawJson)
        : step < 6;

  function goToStep(nextStep: number) {
    setStep(Math.min(6, Math.max(1, nextStep)));
  }

  async function runSollosHomologation() {
    const document = testDocument.replace(/\D/g, '');
    if (document.length !== 11 && document.length !== 14) {
      setHomologationError('Informe um CPF com 11 números ou CNPJ com 14 números.');
      return;
    }

    const reference = consultations.find(
      (item) =>
        item.providerId === sollosProvider?.id && item.bodyTemplateJson?.trim(),
    );

    if (!sollosProvider || !reference?.bodyTemplateJson) {
      setHomologationError(
        'Não encontrei a configuração segura da Sollos para montar esta consulta.',
      );
      return;
    }

    setIsRunningHomologation(true);
    setHomologationError('');
    try {
      const bodyTemplate = buildSollosHomologationBody(
        reference.bodyTemplateJson,
        productCode.trim(),
        document,
      );
      const response = await testProductDraftApi(accessToken, {
        providerId: sollosProvider.id,
        endpointPath: SOLLOS_HOMOLOGATION_URL,
        method: 'POST',
        context: {
          document,
          documento: document,
          is_cpf: document.length === 11,
          is_cnpj: document.length === 14,
        },
        bodyTemplate,
        homologationOnly: true,
        persistLog: false,
      });

      if (
        response.response.statusCode < 200 ||
        response.response.statusCode >= 300
      ) {
        throw new Error(
          `A Sollos respondeu com status ${response.response.statusCode}.`,
        );
      }

      setDraftRawJson(JSON.stringify(response.response.payload, null, 2));
    } catch (error) {
      setHomologationError(
        error instanceof Error
          ? error.message
          : 'Não foi possível executar a consulta de homologação.',
      );
    } finally {
      setIsRunningHomologation(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border bg-gradient-to-r from-primary/10 via-card to-card p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
              <Factory className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Fábrica de Templates</h2>
                <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                  Somente homologação
                </Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Uma etapa por vez para trazer, organizar e provar os dados de um
                produto Sollos antes da catalogação.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Nada é salvo sem sua aprovação
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-6 gap-px bg-border">
            {STEPS.map(([title, description], index) => {
              const number = index + 1;
              const done = number < step;
              const active = number === step;
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => number <= step && goToStep(number)}
                  className={cn(
                    'min-w-0 bg-card p-3 text-left transition-colors',
                    active && 'bg-primary/10',
                    number <= step && 'cursor-pointer hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        done && 'border-emerald-500 bg-emerald-500 text-white',
                        active &&
                          'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : number}
                    </span>
                    <span className="truncate text-xs font-semibold">{title}</span>
                  </div>
                  <p className="mt-1 pl-9 text-[11px] text-muted-foreground">
                    {description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <Card className="min-h-[440px]">
        <CardHeader className="border-b border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Etapa {step} de 6
              </p>
              <CardTitle className="mt-1 text-xl">{STEPS[step - 1][0]}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {STEPS[step - 1][1]}
              </p>
            </div>
            {effectiveConsultation ? (
              <Badge variant="outline" className="px-3 py-1.5">
                Produto {effectiveConsultation.externalId} ·{' '}
                {consultation ? consultation.name : 'rascunho automático'}
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <WizardNavigation
          step={step}
          canContinue={canContinue}
          onPrevious={() => goToStep(step - 1)}
          onNext={() => goToStep(step + 1)}
          position="top"
        />

        <CardContent className="p-5">
          {step === 1 ? (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="font-semibold">Comece pelo ID do produto</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O ID define o contrato de dados. CPF ou CNPJ serve apenas para
                  obter uma amostra gratuita na homologação.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sollos-product-code">ID Sollos</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sollos-product-code"
                      value={productCode}
                      onChange={(event) => {
                        setProductCode(event.target.value.replace(/\D/g, ''));
                        setSourceId('sample');
                        setDraftRawJson('');
                      }}
                      className="pl-9 font-mono"
                      placeholder="Ex.: 1079"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Produtos já conhecidos</Label>
                  <Select
                    value={consultation?.externalId ?? ''}
                    onValueChange={(value) => {
                      setProductCode(value);
                      setSourceId('sample');
                      setDraftRawJson('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {consultations.map((item) => (
                        <SelectItem key={item.id} value={item.externalId}>
                          {item.externalId} — {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div
                className={cn(
                  'rounded-lg border p-4',
                  consultation
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-amber-500/30 bg-amber-500/10',
                )}
              >
                <p className="font-semibold">
                  {consultation ? 'Produto localizado' : 'Produto ainda não catalogado'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {consultation
                    ? 'Vamos reutilizar o cadastro e conferir novamente todo o contrato.'
                    : 'Na próxima etapa, informe um documento de teste da homologação para obter a primeira amostra.'}
                </p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto max-w-3xl space-y-5">
              {consultation ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Qual amostra deseja validar?</Label>
                    <Select value={sourceId} onValueChange={setSourceId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sample">JSON salvo no produto</SelectItem>
                        {logsForConsultation.map((log) => (
                          <SelectItem key={log.id} value={log.id}>
                            Homologação de{' '}
                            {new Date(log.testedAt).toLocaleString('pt-BR')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-4',
                      rawJson
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-amber-500/30 bg-amber-500/10',
                    )}
                  >
                    <Database className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">
                        {rawJson ? 'Amostra pronta' : 'Amostra não encontrada'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {rawJson
                          ? 'O JSON será usado somente para leitura e validação.'
                          : 'Informe abaixo um documento gratuito da homologação para obter uma nova amostra.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
              {!rawJson ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="homolog-document">
                      CPF ou CNPJ de teste da Sollos
                    </Label>
                    <Input
                      id="homolog-document"
                      value={testDocument}
                      onChange={(event) =>
                        setTestDocument(event.target.value.replace(/\D/g, ''))
                      }
                      placeholder="Somente números"
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    onClick={() => void runSollosHomologation()}
                    disabled={
                      isRunningHomologation ||
                      (testDocument.length !== 11 && testDocument.length !== 14)
                    }
                    className="w-full sm:w-auto"
                  >
                    {isRunningHomologation
                      ? 'Consultando a homologação...'
                      : 'Executar consulta gratuita na homologação'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Esta ação consulta somente a homologação e não cataloga nem
                    grava o produto automaticamente.
                  </p>
                  {homologationError ? (
                    <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {homologationError}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {draftRawJson ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-semibold">Amostra recebida da homologação</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        O JSON está apenas nesta esteira. Confira-o e clique em
                        Continuar para iniciar o mapeamento.
                      </p>
                    </div>
                  </div>
                  <JsonPanel
                    title="JSON original Sollos"
                    subtitle="Resposta bruta recebida na homologação."
                    value={JSON.parse(draftRawJson)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            draftMapping ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        Mapeamento provisório criado automaticamente
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A fábrica comparou o novo JSON com os contratos já
                        catalogados. Isto ainda é um rascunho e não foi salvo.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {draftMapping.coverage.coveredLeafPaths}/
                      {draftMapping.coverage.totalLeafPaths} caminhos catalogados
                    </Badge>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.4fr)_minmax(10rem,0.8fr)] gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Tipo de destino</span>
                    <span>Bloco encontrado no JSON</span>
                    <span>Resultado</span>
                  </div>
                  <div className="max-h-[28rem] overflow-y-auto">
                    {draftMapping.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.typeKey}
                        className="grid grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.4fr)_minmax(10rem,0.8fr)] gap-3 border-b border-border/60 px-4 py-3 text-sm last:border-b-0"
                      >
                        <span className="font-medium">
                          {suggestion.typeLabel}
                        </span>
                        <span className="break-all font-mono text-xs text-muted-foreground">
                          {suggestion.sourcePath ?? 'Não reconhecido nesta amostra'}
                        </span>
                        <div>
                          <Badge
                            variant="outline"
                            className={cn(
                              suggestion.confidence === 'high' &&
                                'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                              suggestion.confidence === 'review' &&
                                'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
                              suggestion.confidence === 'new' &&
                                'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
                            )}
                          >
                            {suggestion.confidence === 'high'
                              ? 'Correspondência forte'
                              : suggestion.confidence === 'review'
                                ? 'Revisar'
                                : suggestion.confidence === 'new'
                                  ? 'Novo tipo provisório'
                                : 'Não encontrado'}
                          </Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {suggestion.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.report ? (
                  <BureauAudit items={result.report.bureauAudit} />
                ) : null}
              </div>
            ) : result.report ? (
              <BureauAudit items={result.report.bureauAudit} />
            ) : (
              <EmptyGuidance
                title="Primeiro precisamos de uma amostra"
                description="Volte à etapa anterior e selecione um JSON homologado para iniciar o mapeamento automático."
              />
            )
          ) : null}

          {step === 4 ? (
            result.report ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <p className="font-semibold">DE → PARA</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    À esquerda está o JSON original. À direita, exatamente o que
                    será entregue ao Preview e à Templates Drawer.
                  </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <JsonPanel
                    title="DE · JSON original Sollos"
                    subtitle="Resposta bruta, preservada sem alteração."
                    value={result.report.de}
                  />
                  <JsonPanel
                    title="PARA · Preview organizado"
                    subtitle="Dados separados por tipos e campos canônicos."
                    value={result.report.para}
                  />
                </div>
              </div>
            ) : (
              <EmptyGuidance
                title="Preview ainda indisponível"
                description="Sem uma amostra válida não existe conteúdo seguro para organizar."
              />
            )
          ) : null}

          {step === 5 ? (
            result.report ? (
              <div className="space-y-6">
                <ContractSummary report={result.report} />
                <div>
                  <h3 className="font-semibold">Prova campo por campo</h3>
                  <p className="mb-3 mt-1 text-sm text-muted-foreground">
                    Cada linha mostra o caminho de origem e o valor que chegou ao
                    Preview.
                  </p>
                  <FieldLineage report={result.report} />
                </div>
              </div>
            ) : (
              <EmptyGuidance
                title="Nada para validar ainda"
                description="A validação começa automaticamente assim que uma amostra válida é selecionada."
              />
            )
          ) : null}

          {step === 6 ? (
            <div className="mx-auto max-w-4xl space-y-5">
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-5',
                  isReady
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-amber-500/30 bg-amber-500/10',
                )}
              >
                <ShieldCheck
                  className={cn(
                    'mt-0.5 h-6 w-6',
                    isReady ? 'text-emerald-500' : 'text-amber-500',
                  )}
                />
                <div>
                  <h3 className="font-semibold">
                    {isReady
                      ? 'Validações automáticas concluídas'
                      : 'Catalogação bloqueada com segurança'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isReady
                      ? 'O sistema não encontrou divergências. A decisão final continua sendo sua.'
                      : 'Existem campos ausentes, valores divergentes ou ocorrências na base incorreta. Volte à validação para ver exatamente onde ajustar.'}
                  </p>
                </div>
              </div>

              {result.report ? <ContractSummary report={result.report} /> : null}

              <label
                className={cn(
                  'flex items-start gap-3 rounded-lg border border-border p-4',
                  !isReady && 'cursor-not-allowed opacity-60',
                )}
              >
                <Checkbox
                  checked={manualApproval}
                  disabled={!isReady}
                  onCheckedChange={(checked) => setManualApproval(checked === true)}
                />
                <span>
                  <span className="block text-sm font-semibold">
                    Revisei o resumo e autorizo a catalogação
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Esta confirmação nunca será marcada automaticamente.
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-2 sm:items-end">
                <Button disabled>
                  {isReady && manualApproval
                    ? 'Gravação segura ainda não conectada'
                    : 'Catalogar produto manualmente'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  A gravação definitiva será conectada somente após validarmos
                  esta esteira com um produto novo de homologação.
                </p>
              </div>
            </div>
          ) : null}

          {result.error ? (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              {result.error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <WizardNavigation
        step={step}
        canContinue={canContinue}
        onPrevious={() => goToStep(step - 1)}
        onNext={() => goToStep(step + 1)}
        position="bottom"
      />
    </div>
  );
}
