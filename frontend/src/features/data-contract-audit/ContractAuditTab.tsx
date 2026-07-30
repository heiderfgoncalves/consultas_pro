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
import {
  catalogSollosProductApi,
  getSollosFactoryDraftApi,
  testProductDraftApi,
  upsertSollosFactoryDraftApi,
  type ApiSollosFactoryDraft,
} from '@/api/admin-integrations';
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
import {
  buildAutomaticDraftMapping,
  type AutomaticDraftMapping,
} from './draftMapping';
import {
  findSollosCatalogProductById,
  SOLLOS_ADAPTIVE_SAMPLING_POLICY,
} from './sollosCatalog';
import { getSollosOfficialSamples } from './sollosHomologationSamples';
import {
  addSollosSampleExecution,
  buildRepresentativeSollosPayload,
  collectSollosStructuralPaths,
  summarizeSollosSampling,
  type SollosSampleExecution,
} from './sollosSampling';
import { validateSollosSampleBatch } from './sollosBatchValidation';

type ContractAuditTabProps = {
  accessToken: string | null;
  providers: Provider[];
  consultations: ProviderConsultation[];
  fieldTypes: ConsultationFieldType[];
  testLogs: TestLogEntry[];
  onCataloged?: () => void | Promise<void>;
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
  quod: 'QUOD · Base IV',
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

function BureauAudit({
  items,
  onReprocess,
}: {
  items: BureauOccurrenceAudit[];
  onReprocess?: () => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyGuidance
        title="Nenhuma pendência financeira encontrada nesta amostra"
        description="Isso é válido para consultas sem débitos. A esteira continuará conferindo os demais campos normalmente."
      />
    );
  }

  const blockedItems = items.filter((item) => item.status !== 'ok');

  return (
    <div className="space-y-3">
      {blockedItems.length > 0 ? (
        <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">
                A Fábrica precisa corrigir {blockedItems.length}{' '}
                {blockedItems.length === 1 ? 'mapeamento' : 'mapeamentos'}
              </p>
              <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">
                Você não precisa editar o JSON. A base foi reconhecida, mas a
                dívida ainda não apareceu no bloco correto do Preview.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Clique no botão ao lado. Enquanto algum cartão permanecer
                vermelho, não catalogue este produto. Se continuar vermelho
                após o reprocessamento, volte à etapa 2 e gere outra amostra;
                a Fábrica manterá o produto bloqueado até conseguir provar os
                dados.
              </p>
            </div>
            {onReprocess ? (
              <Button
                type="button"
                variant="destructive"
                className="shrink-0"
                onClick={onReprocess}
              >
                Reprocessar correção automática
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['BASE I', 'Serasa', 'DIVIDAS_SERASA'],
          ['BASE II', 'SPC Brasil', 'DIVIDAS_SPC'],
          ['BASE III', 'Boa Vista / SCPC', 'DIVIDAS_BOA_VISTA'],
          ['BASE IV', 'QUOD', 'DIVIDAS_QUOD'],
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
            {item.status !== 'ok' ? (
              <div className="rounded-md border border-red-500/25 bg-background/60 p-3 text-xs lg:col-span-3">
                <p className="font-semibold">O que aconteceu?</p>
                <p className="mt-1 text-muted-foreground">
                  A dívida foi reconhecida como{' '}
                  <strong>{BUREAU_LABELS[item.bureau]}</strong> e deveria aparecer
                  em{' '}
                  <code className="font-mono">
                    {item.expectedTypeKey ?? 'um novo destino ainda não definido'}
                  </code>
                  , mas seus valores não chegaram ao Preview.
                </p>
                <p className="mt-2 font-semibold">O que você deve fazer?</p>
                <p className="mt-1 text-muted-foreground">
                  Clique em “Reprocessar correção automática” acima. Você não
                  deve editar caminhos ou JSON manualmente.
                </p>
              </div>
            ) : null}
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
  onCataloged,
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
  const [reviewedSuggestions, setReviewedSuggestions] = useState<Set<string>>(
    () => new Set(),
  );
  const [mappingRevision, setMappingRevision] = useState(0);
  const [sampleExecutions, setSampleExecutions] = useState<
    SollosSampleExecution[]
  >([]);
  const [samplingGoal, setSamplingGoal] = useState(
    SOLLOS_ADAPTIVE_SAMPLING_POLICY.maximumSamples,
  );
  const [isCataloging, setIsCataloging] = useState(false);
  const [catalogingError, setCatalogingError] = useState('');
  const [catalogedProductId, setCatalogedProductId] = useState('');
  const [storedDraft, setStoredDraft] =
    useState<ApiSollosFactoryDraft | null>(null);
  const [isLoadingStoredDraft, setIsLoadingStoredDraft] = useState(false);
  const [storedDraftError, setStoredDraftError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const consultation =
    consultations.find((item) => item.externalId === productCode.trim()) ?? null;
  const catalogProduct = findSollosCatalogProductById(productCode);
  const officialSamples = useMemo(
    () => getSollosOfficialSamples(productCode),
    [productCode],
  );
  const samplingSummary = useMemo(
    () =>
      summarizeSollosSampling(
        sampleExecutions,
        Math.min(
          SOLLOS_ADAPTIVE_SAMPLING_POLICY.minimumSamples,
          officialSamples.length,
        ),
        SOLLOS_ADAPTIVE_SAMPLING_POLICY.consecutiveStableSamplesToStop,
      ),
    [officialSamples.length, sampleExecutions],
  );
  const samplingGoals = useMemo(
    () =>
      [
        ...new Set(
          [
            SOLLOS_ADAPTIVE_SAMPLING_POLICY.minimumSamples,
            SOLLOS_ADAPTIVE_SAMPLING_POLICY.targetSamples,
            SOLLOS_ADAPTIVE_SAMPLING_POLICY.maximumSamples,
          ].map((goal) => Math.min(goal, officialSamples.length)),
        ),
      ].filter((goal) => goal > 0),
    [officialSamples.length],
  );
  const sollosProvider = useMemo(
    () =>
      providers.find((provider) =>
        provider.name.toLowerCase().includes('sollos'),
      ) ?? null,
    [providers],
  );
  const storedDraftMapping = useMemo<AutomaticDraftMapping | null>(() => {
    if (!storedDraft) return null;
    return {
      consultation: {
        id: `factory-draft-${storedDraft.externalId}`,
        providerId: storedDraft.providerId,
        name: `${storedDraft.productName} · rascunho preparado`,
        externalId: storedDraft.externalId,
        endpoint: '/json/homologa.aspx',
        method: 'POST',
        cost: 0,
        consultationPrice: 0,
        fieldMappings: storedDraft.fieldMappings,
        typeItemFilters: storedDraft.typeItemFilters ?? {},
        sampleResponse: JSON.stringify(
          storedDraft.representativeResponse,
          null,
          2,
        ),
        updatedAt: storedDraft.updatedAt,
        status: 'inactive',
      },
      suggestions: storedDraft.suggestions,
      fieldTypes: storedDraft.fieldTypes,
      coverage: {
        totalLeafPaths: storedDraft.totalLeafPathCount,
        coveredLeafPaths: storedDraft.coveredLeafPathCount,
        uncoveredLeafPaths:
          storedDraft.coveredLeafPathCount === storedDraft.totalLeafPathCount
            ? []
            : storedDraft.sampleValidations.flatMap(
                (sample) => sample.uncoveredLeafPaths,
              ),
        newTypeCount: storedDraft.suggestions.filter(
          (suggestion) => suggestion.confidence === 'new',
        ).length,
      },
    };
  }, [storedDraft]);
  const draftMapping = useMemo(() => {
    if (!draftRawJson.trim() || !sollosProvider) return null;
    if (storedDraftMapping && sampleExecutions.length === 0) {
      return storedDraftMapping;
    }
    void mappingRevision;
    try {
      return buildAutomaticDraftMapping({
        rawJson: draftRawJson,
        productCode: productCode.trim(),
        productName: catalogProduct?.name,
        providerId: sollosProvider.id,
        consultations,
        fieldTypes,
      });
    } catch {
      return null;
    }
  }, [
    catalogProduct?.name,
    consultations,
    draftRawJson,
    fieldTypes,
    mappingRevision,
    productCode,
    sampleExecutions.length,
    sollosProvider,
    storedDraftMapping,
  ]);
  const effectiveConsultation =
    draftMapping?.consultation ?? consultation ?? null;
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
  const batchValidation = useMemo(() => {
    if (!effectiveConsultation || sampleExecutions.length === 0) return null;
    return validateSollosSampleBatch({
      executions: sampleExecutions,
      consultation: effectiveConsultation,
      fieldTypes: effectiveFieldTypes,
    });
  }, [effectiveConsultation, effectiveFieldTypes, sampleExecutions]);

  const pendingSuggestionReviews =
    draftMapping?.suggestions.filter(
      (item) =>
        (item.confidence === 'new' || item.confidence === 'review') &&
        !reviewedSuggestions.has(item.typeKey),
    ) ?? [];
  const samplingIsSufficient = draftMapping
    ? storedDraft?.status === 'READY_FOR_MANUAL_REVIEW' &&
        sampleExecutions.length === 0
      ? true
      : catalogProduct?.sampleCoverage === 'limited'
        ? officialSamples.length > 0 &&
          samplingSummary.attempted >= officialSamples.length &&
          samplingSummary.succeeded > 0
        : samplingSummary.canStopSafely
    : true;
  const completePathCoverage =
    (draftMapping?.coverage.totalLeafPaths ?? 0) > 0 &&
    draftMapping?.coverage.coveredLeafPaths ===
      draftMapping?.coverage.totalLeafPaths;
  const completeBatchValidation = draftMapping
    ? sampleExecutions.length > 0
      ? batchValidation?.allValid === true
      : storedDraft?.status === 'READY_FOR_MANUAL_REVIEW'
    : batchValidation?.allValid ?? Boolean(result.report);
  const isReady =
    (result.report?.diagnostics.every((item) => item.status === 'ok') ?? false) &&
    pendingSuggestionReviews.length === 0 &&
    samplingIsSufficient &&
    (draftMapping ? completePathCoverage : true) &&
    completeBatchValidation;

  useEffect(() => {
    setManualApproval(false);
  }, [productCode, sourceId, draftRawJson]);

  useEffect(() => {
    setDraftRawJson('');
    setHomologationError('');
    setReviewedSuggestions(new Set());
    setMappingRevision(0);
    setSampleExecutions([]);
    setSamplingGoal(SOLLOS_ADAPTIVE_SAMPLING_POLICY.maximumSamples);
    setCatalogingError('');
    setCatalogedProductId('');
    setStoredDraft(null);
    setStoredDraftError('');
    setIsSavingDraft(false);
  }, [productCode]);

  useEffect(() => {
    const externalId = productCode.replace(/\D/g, '');
    if (!sollosProvider || !catalogProduct || !externalId) return;
    let cancelled = false;
    setIsLoadingStoredDraft(true);
    setStoredDraftError('');

    void getSollosFactoryDraftApi(
      accessToken,
      sollosProvider.id,
      externalId,
    )
      .then((draft) => {
        if (cancelled) return;
        setStoredDraft(draft);
        if (draft) {
          setDraftRawJson(
            JSON.stringify(draft.representativeResponse, null, 2),
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setStoredDraftError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar o rascunho preparado.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStoredDraft(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    catalogProduct,
    consultation,
    productCode,
    sollosProvider,
  ]);

  const canContinue =
    step === 1
      ? productCode.trim().length > 0
      : step === 2
        ? Boolean(rawJson)
        : step < 6;

  function goToStep(nextStep: number) {
    setStep(Math.min(6, Math.max(1, nextStep)));
  }

  function reprocessAutomaticMapping() {
    setReviewedSuggestions(new Set());
    setMappingRevision((current) => current + 1);
  }

  async function executeSollosHomologation(document: string) {
    const reference = consultations.find(
      (item) =>
        item.providerId === sollosProvider?.id && item.bodyTemplateJson?.trim(),
    );

    if (!sollosProvider || !reference?.bodyTemplateJson) {
      throw new Error(
        'Não encontrei a configuração segura da Sollos para montar esta consulta.',
      );
    }

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

    return response.response.payload;
  }

  async function runSollosHomologation() {
    const document = testDocument.replace(/\D/g, '');
    if (document.length !== 11 && document.length !== 14) {
      setHomologationError('Informe um CPF com 11 números ou CNPJ com 14 números.');
      return;
    }

    setIsRunningHomologation(true);
    setHomologationError('');
    try {
      const payload = await executeSollosHomologation(document);
      setDraftRawJson(JSON.stringify(payload, null, 2));
      setSampleExecutions([
        {
          document,
          expectedStatus: 'CONCLUIDO',
          success: true,
          payload,
          discoveredPathCount: 0,
          newPathCount: 0,
        },
      ]);
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

  async function runSollosOfficialBatch() {
    if (!catalogProduct || officialSamples.length === 0) {
      setHomologationError(
        'Este ID ainda não possui documentos oficiais na lista de homologação.',
      );
      return;
    }

    setIsRunningHomologation(true);
    setHomologationError('');
    setDraftRawJson('');
    let executions: SollosSampleExecution[] = [];
    const goal = Math.min(
      samplingGoal,
      SOLLOS_ADAPTIVE_SAMPLING_POLICY.maximumSamples,
      officialSamples.length,
    );

    try {
      for (const sample of officialSamples.slice(0, goal)) {
        try {
          const payload = await executeSollosHomologation(sample.document);
          executions = addSollosSampleExecution(executions, sample, {
            success: true,
            payload,
          });
        } catch (error) {
          executions = addSollosSampleExecution(executions, sample, {
            success: false,
            error:
              error instanceof Error ? error.message : 'Falha na homologação.',
          });
        }
        setSampleExecutions(executions);
      }

      const payloads = executions.flatMap((execution) =>
        execution.success && execution.payload ? [execution.payload] : [],
      );
      if (payloads.length === 0) {
        throw new Error(
          'Nenhuma amostra oficial retornou um JSON válido. Confira a conexão da Sollos.',
        );
      }

      setDraftRawJson(
        JSON.stringify(buildRepresentativeSollosPayload(payloads), null, 2),
      );
    } catch (error) {
      setHomologationError(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o lote de homologação.',
      );
    } finally {
      setIsRunningHomologation(false);
    }
  }

  async function saveSollosFactoryDraft() {
    if (
      !sollosProvider ||
      !catalogProduct ||
      !draftMapping ||
      !batchValidation?.allValid ||
      draftMapping.coverage.coveredLeafPaths !==
        draftMapping.coverage.totalLeafPaths ||
      !draftRawJson.trim()
    ) {
      setStoredDraftError(
        'O rascunho só pode ser salvo após validar todas as amostras, caminhos e valores.',
      );
      return;
    }

    const mappedKeys = new Set(
      draftMapping.consultation.fieldMappings.map(
        (mapping) => mapping.fieldTypeKey,
      ),
    );
    const structuralPaths = [
      ...new Set(
        sampleExecutions.flatMap((execution) =>
          execution.success && execution.payload
            ? collectSollosStructuralPaths(execution.payload)
            : [],
        ),
      ),
    ].sort();

    setIsSavingDraft(true);
    setStoredDraftError('');
    try {
      const saved = await upsertSollosFactoryDraftApi(accessToken, {
        providerId: sollosProvider.id,
        externalId: catalogProduct.productId,
        productName: catalogProduct.name,
        officialSampleCount: officialSamples.length,
        attemptedSamples: batchValidation.attemptedSamples,
        successfulSamples: batchValidation.successfulSamples,
        failedSamples: batchValidation.failedSamples,
        validSamples: batchValidation.validSamples,
        invalidSamples: batchValidation.invalidSamples,
        uniquePathCount: structuralPaths.length,
        totalLeafPathCount: batchValidation.observedLeafPaths.length,
        coveredLeafPathCount: batchValidation.coveredLeafPaths,
        representativeResponse: JSON.parse(draftRawJson),
        fieldTypes: draftMapping.fieldTypes.filter((fieldType) =>
          mappedKeys.has(fieldType.key),
        ),
        fieldMappings: draftMapping.consultation.fieldMappings,
        typeItemFilters:
          draftMapping.consultation.typeItemFilters ?? {},
        suggestions: draftMapping.suggestions,
        structuralPaths,
        sampleValidations: batchValidation.samples,
      });
      setStoredDraft(saved);
    } catch (error) {
      setStoredDraftError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o rascunho técnico.',
      );
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function catalogApprovedProduct() {
    if (
      !manualApproval ||
      !isReady ||
      !draftMapping ||
      !sollosProvider ||
      !catalogProduct
    ) {
      setCatalogingError(
        'Conclua as validações e confirme a aprovação antes de catalogar.',
      );
      return;
    }

    const reference = consultations.find(
      (item) =>
        item.providerId === sollosProvider.id && item.bodyTemplateJson?.trim(),
    );
    if (!reference?.bodyTemplateJson) {
      setCatalogingError(
        'A configuração segura de requisição da Sollos não foi localizada.',
      );
      return;
    }

    let bodyTemplate: unknown;
    try {
      bodyTemplate = JSON.parse(
        reference.bodyTemplateJson.replace(
          /:\s*`([\s\S]*?)`(?=\s*[,}])/g,
          (_match, value: string) => `: ${JSON.stringify(value)}`,
        ),
      );
    } catch {
      setCatalogingError(
        'A configuração segura de requisição da Sollos está inválida.',
      );
      return;
    }

    const mappedKeys = new Set(
      draftMapping.consultation.fieldMappings.map(
        (mapping) => mapping.fieldTypeKey,
      ),
    );
    const mappedTypes = draftMapping.fieldTypes.filter((fieldType) =>
      mappedKeys.has(fieldType.key),
    );

    setIsCataloging(true);
    setCatalogingError('');
    try {
      const created = await catalogSollosProductApi(accessToken, {
        providerId: sollosProvider.id,
        manualApproval: true,
        product: {
          name: catalogProduct.name,
          externalId: catalogProduct.productId,
          endpointPath: SOLLOS_HOMOLOGATION_URL,
          method: 'POST',
          bodyTemplate,
          sampleResponse: JSON.parse(draftRawJson),
          typeItemFilters: draftMapping.consultation.typeItemFilters,
        },
        fieldTypes: mappedTypes.map((fieldType) => ({
          key: fieldType.key,
          label: fieldType.label,
          description: fieldType.description,
          uiItemFilters: fieldType.typeItemFilters,
          reportFieldConfig: fieldType.reportFieldConfig,
        })),
        fieldMappings: draftMapping.consultation.fieldMappings,
        samplingEvidence: {
          attempted:
            batchValidation?.attemptedSamples ??
            storedDraft?.attemptedSamples ??
            samplingSummary.attempted,
          succeeded:
            batchValidation?.successfulSamples ??
            storedDraft?.successfulSamples ??
            samplingSummary.succeeded,
          failed:
            batchValidation?.failedSamples ??
            storedDraft?.failedSamples ??
            samplingSummary.failed,
          uniquePathCount:
            storedDraft?.uniquePathCount ??
            samplingSummary.uniquePathCount,
          officialSampleCount: officialSamples.length,
        },
      });
      setCatalogedProductId(created.id);
      await onCataloged?.();
    } catch (error) {
      setCatalogingError(
        error instanceof Error
          ? error.message
          : 'Não foi possível catalogar o produto.',
      );
    } finally {
      setIsCataloging(false);
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
                    : catalogProduct
                      ? `${catalogProduct.name} já está no Catálogo Mestre com status “${catalogProduct.status}”. Na próxima etapa, a Fábrica continuará a preparação pela homologação.`
                      : 'Este ID ainda não foi comprovado no Catálogo Mestre. Na próxima etapa, a homologação será usada para identificá-lo sem salvar nada automaticamente.'}
                </p>
              </div>
              {catalogProduct ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Produto esperado</p>
                      <p className="mt-1 font-semibold">{catalogProduct.name}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Pessoa</p>
                      <p className="mt-1 font-semibold">{catalogProduct.personType}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Plano de amostragem
                      </p>
                      <p className="mt-1 font-semibold">
                        {catalogProduct.officialSampleCount} oficiais disponíveis
                      </p>
                    </div>
                    <div
                      className={cn(
                        'rounded-lg border p-3',
                        catalogProduct.sampleCoverage === 'sufficient'
                          ? 'border-emerald-500/25 bg-emerald-500/5'
                          : 'border-amber-500/30 bg-amber-500/10',
                      )}
                    >
                      <p className="text-xs text-muted-foreground">
                        Cobertura documental
                      </p>
                      <p className="mt-1 font-semibold">
                        {catalogProduct.sampleCoverage === 'sufficient'
                          ? 'Amostragem suficiente'
                          : 'Amostragem oficial limitada'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">
                          Evidência histórica do Catálogo Mestre
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Referência anterior: {catalogProduct.audit.samples}{' '}
                          amostras oficiais,{' '}
                          {catalogProduct.audit.failedSamples} falhas,{' '}
                          {catalogProduct.audit.uniquePaths} caminhos,{' '}
                          {catalogProduct.audit.validatedFields} campos e{' '}
                          {catalogProduct.audit.validatedOccurrences} ocorrências
                          conferidos até o Preview.
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <Badge variant="outline">Referência anterior</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {catalogProduct.audit.auditedAt
                            .split('-')
                            .reverse()
                            .join('/')}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      A Fábrica mantém este resultado antigo somente para
                      comparação. O rascunho integral mais recente aparece
                      abaixo.
                    </p>
                  </div>
                  {isLoadingStoredDraft ? (
                    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                      Procurando um rascunho completo já preparado para este ID...
                    </div>
                  ) : storedDraft ? (
                    <div
                      className={cn(
                        'rounded-lg border p-4',
                        storedDraft.status === 'READY_FOR_MANUAL_REVIEW'
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-amber-500/30 bg-amber-500/10',
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">
                            Rascunho completo carregado
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Versão {storedDraft.version}: {' '}
                            {storedDraft.successfulSamples} JSONs validados
                            individualmente, {storedDraft.coveredLeafPathCount}/
                            {storedDraft.totalLeafPathCount} caminhos com destino
                            e {storedDraft.invalidSamples} amostras divergentes.
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            storedDraft.status === 'READY_FOR_MANUAL_REVIEW'
                              ? 'bg-primary/15 text-primary hover:bg-primary/15'
                              : 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300',
                          )}
                        >
                          {storedDraft.status === 'READY_FOR_MANUAL_REVIEW'
                            ? 'Pronto para sua auditoria'
                            : 'Precisa de ajuste'}
                        </Badge>
                      </div>
                      <p className="mt-3 border-t border-primary/20 pt-3 text-xs text-muted-foreground">
                        Este é um rascunho da Fábrica, separado do catálogo
                        definitivo. Você ainda precisa revisar as sugestões e
                        aprovar manualmente.
                      </p>
                    </div>
                  ) : null}
                  {storedDraftError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {storedDraftError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto max-w-3xl space-y-5">
              {storedDraft && sampleExecutions.length === 0 ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <p className="font-semibold">
                    Trabalho preparado anteriormente carregado
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A amostra estrutural, os tipos e os mapeamentos da versão{' '}
                    {storedDraft.version} já estão disponíveis. Você pode
                    continuar para auditar ou executar novamente o lote oficial
                    para atualizar as evidências.
                  </p>
                </div>
              ) : null}
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
              {catalogProduct && officialSamples.length > 0 ? (
                <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        Homologação automática recomendada
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A Fábrica executa documentos oficiais variados, mede
                        novos caminhos e monta uma amostra consolidada para o
                        mapeamento. Isso também permite revalidar produtos já
                        catalogados sem alterar o cadastro atual.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {officialSamples.length} documentos oficiais
                    </Badge>
                  </div>

                  {catalogProduct.sampleCoverage === 'limited' ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                      A Sollos publicou somente {officialSamples.length}{' '}
                      documentos para este produto. A Fábrica executará todos,
                      mas manterá a limitação visível na revisão final.
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full space-y-1.5 sm:max-w-[15rem]">
                      <Label>Quantidade de amostras</Label>
                      <Select
                        value={String(
                          Math.min(samplingGoal, officialSamples.length),
                        )}
                        onValueChange={(value) =>
                          setSamplingGoal(Number(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {samplingGoals.map((goal) => (
                            <SelectItem key={goal} value={String(goal)}>
                              {goal} {goal === 1 ? 'amostra' : 'amostras'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void runSollosOfficialBatch()}
                      disabled={isRunningHomologation}
                      className="w-full sm:w-auto"
                    >
                      {isRunningHomologation
                        ? `Executando ${samplingSummary.attempted}/${Math.min(
                            samplingGoal,
                            officialSamples.length,
                          )}...`
                        : 'Executar lote oficial'}
                    </Button>
                  </div>

                  {sampleExecutions.length > 0 ? (
                    <div className="space-y-3">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (samplingSummary.attempted /
                                Math.min(
                                  samplingGoal,
                                  officialSamples.length,
                                )) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="grid gap-2 text-center text-xs sm:grid-cols-4">
                        <div className="rounded-md border border-border bg-background/70 p-2">
                          <strong>{samplingSummary.succeeded}</strong>
                          <span className="ml-1 text-muted-foreground">
                            válidas
                          </span>
                        </div>
                        <div className="rounded-md border border-border bg-background/70 p-2">
                          <strong>{samplingSummary.failed}</strong>
                          <span className="ml-1 text-muted-foreground">
                            falhas
                          </span>
                        </div>
                        <div className="rounded-md border border-border bg-background/70 p-2">
                          <strong>{samplingSummary.uniquePathCount}</strong>
                          <span className="ml-1 text-muted-foreground">
                            caminhos
                          </span>
                        </div>
                        <div className="rounded-md border border-border bg-background/70 p-2">
                          <strong>{samplingSummary.stableTailCount}</strong>
                          <span className="ml-1 text-muted-foreground">
                            estáveis
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!rawJson ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="font-semibold">Ou execute uma amostra manual</p>
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
                {draftMapping.coverage.uncoveredLeafPaths.length > 0 ? (
                  <div className="rounded-lg border border-red-500/35 bg-red-500/10 p-4">
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      {draftMapping.coverage.uncoveredLeafPaths.length} caminho(s)
                      ainda não possuem destino no Preview
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A Fábrica bloqueou o avanço seguro. Estes caminhos precisam
                      ser incorporados ao rascunho:
                    </p>
                    <div className="mt-3 max-h-36 space-y-1 overflow-auto font-mono text-xs">
                      {draftMapping.coverage.uncoveredLeafPaths.map((path) => (
                        <p key={path}>{path}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    [
                      'Verde',
                      'Reaproveitado',
                      'Nenhuma ação: veio de um template Sollos já aprovado.',
                      'border-emerald-500/30 bg-emerald-500/10',
                    ],
                    [
                      'Roxo',
                      'Novo tipo',
                      'Revise o caminho e clique em Aprovar sugestão.',
                      'border-violet-500/30 bg-violet-500/10',
                    ],
                    [
                      'Amarelo',
                      'Previsto sem dados',
                      'Confirme que o recurso deve permanecer previsto.',
                      'border-amber-500/30 bg-amber-500/10',
                    ],
                    [
                      'Vermelho',
                      'Bloqueio real',
                      'A ocorrência não chegou ao Preview; não avance sem corrigir.',
                      'border-red-500/30 bg-red-500/10',
                    ],
                  ].map(([color, title, description, className]) => (
                    <div
                      key={color}
                      className={cn('rounded-lg border p-3', className)}
                    >
                      <p className="text-xs font-semibold uppercase">{color}</p>
                      <p className="mt-1 font-semibold">{title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  ))}
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
                          {suggestion.confidence === 'new' ||
                          suggestion.confidence === 'review' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                reviewedSuggestions.has(suggestion.typeKey)
                                  ? 'outline'
                                  : 'default'
                              }
                              className="mt-2 h-7 text-xs"
                              onClick={() =>
                                setReviewedSuggestions((current) => {
                                  const next = new Set(current);
                                  if (next.has(suggestion.typeKey)) {
                                    next.delete(suggestion.typeKey);
                                  } else {
                                    next.add(suggestion.typeKey);
                                  }
                                  return next;
                                })
                              }
                            >
                              {reviewedSuggestions.has(suggestion.typeKey)
                                ? 'Confirmado'
                                : suggestion.confidence === 'new'
                                  ? 'Aprovar sugestão'
                                  : 'Manter como previsto'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.report ? (
                  <BureauAudit
                    items={result.report.bureauAudit}
                    onReprocess={reprocessAutomaticMapping}
                  />
                ) : null}
              </div>
            ) : result.report ? (
              <BureauAudit
                items={result.report.bureauAudit}
                onReprocess={reprocessAutomaticMapping}
              />
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
                {sampleExecutions.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Amostras válidas', samplingSummary.succeeded],
                      ['Falhas isoladas', samplingSummary.failed],
                      ['Caminhos únicos', samplingSummary.uniquePathCount],
                      ['Amostras estáveis', samplingSummary.stableTailCount],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-border bg-muted/20 p-3"
                      >
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-1 text-xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {batchValidation ? (
                  <div
                    className={cn(
                      'rounded-xl border p-4',
                      batchValidation.allValid
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-red-500/35 bg-red-500/10',
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          Validação integral, JSON por JSON
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {batchValidation.validSamples}/
                          {batchValidation.attemptedSamples} amostras corretas,{' '}
                          {batchValidation.coveredLeafPaths}/
                          {batchValidation.observedLeafPaths.length} caminhos
                          com destino, {batchValidation.validatedFieldCount}{' '}
                          valores de campos e{' '}
                          {batchValidation.validatedOccurrenceCount}{' '}
                          ocorrências conferidos.
                        </p>
                      </div>
                      {draftMapping ? (
                        <Button
                          type="button"
                          disabled={
                            !batchValidation.allValid ||
                            isSavingDraft ||
                            draftMapping.coverage.coveredLeafPaths !==
                              draftMapping.coverage.totalLeafPaths
                          }
                          onClick={() => void saveSollosFactoryDraft()}
                        >
                          {isSavingDraft
                            ? 'Salvando rascunho...'
                            : storedDraft
                              ? 'Atualizar rascunho técnico'
                              : 'Salvar rascunho técnico'}
                        </Button>
                      ) : null}
                    </div>
                    {batchValidation.allValid ? (
                      <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-200">
                        Todas as estruturas e todos os valores observados
                        chegaram ao Preview. Salvar aqui não cataloga nem ativa o
                        produto.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {batchValidation.samples
                          .filter((sample) => !sample.valid)
                          .map((sample) => (
                            <div
                              key={sample.sampleNumber}
                              className="rounded-md border border-red-500/25 bg-background/50 p-3 text-xs"
                            >
                              <p className="font-semibold">
                                Amostra {sample.sampleNumber} bloqueada
                              </p>
                              {sample.errors.map((error) => (
                                <p
                                  key={error}
                                  className="mt-1 text-muted-foreground"
                                >
                                  {error}
                                </p>
                              ))}
                              {sample.invalidFieldPaths.length > 0 ? (
                                <div className="mt-2 rounded-md bg-red-500/10 p-2 font-mono text-[11px] text-red-700 dark:text-red-300">
                                  {sample.invalidFieldPaths
                                    .slice(0, 8)
                                    .map((path) => (
                                      <p key={path}>{path}</p>
                                    ))}
                                  {sample.invalidFieldPaths.length > 8 ? (
                                    <p>
                                      + {sample.invalidFieldPaths.length - 8}{' '}
                                      campo(s) divergente(s)
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              {sample.invalidOccurrencePaths.length > 0 ? (
                                <div className="mt-2 rounded-md bg-red-500/10 p-2 font-mono text-[11px] text-red-700 dark:text-red-300">
                                  {sample.invalidOccurrencePaths
                                    .slice(0, 8)
                                    .map((path) => (
                                      <p key={path}>{path}</p>
                                    ))}
                                  {sample.invalidOccurrencePaths.length > 8 ? (
                                    <p>
                                      +{' '}
                                      {sample.invalidOccurrencePaths.length -
                                        8}{' '}
                                      ocorrência(s) divergente(s)
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    )}
                    {storedDraftError ? (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                        {storedDraftError}
                      </p>
                    ) : storedDraft &&
                      storedDraft.status === 'READY_FOR_MANUAL_REVIEW' ? (
                      <p className="mt-3 text-sm text-primary">
                        Rascunho versão {storedDraft.version} guardado na
                        Fábrica e pronto para sua auditoria manual.
                      </p>
                    ) : null}
                  </div>
                ) : storedDraft ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="font-semibold">
                      Evidência integral carregada do rascunho
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {storedDraft.validSamples}/
                      {storedDraft.attemptedSamples} JSONs validados e{' '}
                      {storedDraft.coveredLeafPathCount}/
                      {storedDraft.totalLeafPathCount} caminhos comprovados.
                      Reexecute o lote oficial se quiser atualizar esta versão.
                    </p>
                  </div>
                ) : null}
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

              {sampleExecutions.length > 0 ? (
                <div
                  className={cn(
                    'rounded-lg border p-4',
                    samplingSummary.canStopSafely ||
                      catalogProduct?.sampleCoverage === 'limited'
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-amber-500/30 bg-amber-500/10',
                  )}
                >
                  <p className="font-semibold">Resumo da amostragem</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {samplingSummary.succeeded} JSONs válidos,{' '}
                    {samplingSummary.uniquePathCount} caminhos estruturais e{' '}
                    {samplingSummary.stableTailCount} amostras finais sem novos
                    caminhos.
                  </p>
                  {catalogProduct?.sampleCoverage === 'limited' ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Cobertura limitada pela própria lista oficial: foram
                      executados todos os documentos disponíveis.
                    </p>
                  ) : !samplingSummary.canStopSafely ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      A estrutura ainda não estabilizou. Volte à etapa 2 e
                      execute um lote maior antes de aprovar.
                    </p>
                  ) : null}
                </div>
              ) : storedDraft ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <p className="font-semibold">
                    Rascunho técnico versão {storedDraft.version}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {storedDraft.successfulSamples} JSONs oficiais,{' '}
                    {storedDraft.uniquePathCount} caminhos estruturais e{' '}
                    {storedDraft.coveredLeafPathCount}/
                    {storedDraft.totalLeafPathCount} caminhos de dados com
                    destino comprovado.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    O rascunho continua separado do catálogo definitivo até sua
                    aprovação abaixo.
                  </p>
                </div>
              ) : null}

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
                <Button
                  type="button"
                  disabled={
                    !isReady ||
                    !manualApproval ||
                    isCataloging ||
                    Boolean(catalogedProductId) ||
                    !draftMapping
                  }
                  onClick={() => void catalogApprovedProduct()}
                >
                  {catalogedProductId
                    ? 'Produto catalogado com segurança'
                    : isCataloging
                      ? 'Catalogando...'
                      : 'Catalogar produto manualmente'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  O produto nasce inativo e só é gravado junto com seus tipos e
                  mapeamentos depois desta confirmação.
                </p>
                {catalogingError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {catalogingError}
                  </p>
                ) : null}
                {catalogedProductId ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Gravação concluída sem ativar cobranças ou produção.
                  </p>
                ) : null}
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
