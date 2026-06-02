import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRoles } from '../../core/auth';
import { ok } from '../../core/http';
import { normalizeProviderPayload } from '../providers/normalization.service';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const templateKeySchema = z.enum(['DIVIDAS_SIMPLES', 'BACEN_SIMPLES', 'PREMIUM']);
const documentTypeSchema = z.enum(['CPF', 'CNPJ']);

const stageSchema = z.object({
  id: z.string().optional(),
  providerProductId: z.string().nullable().optional(),
  productCode: z.string().min(1),
  stageName: z.string().min(1),
  role: z.string().min(1),
  onFailure: z.string().min(1),
  priority: z.number().int().nonnegative(),
  enabled: z.boolean().default(true),
  isFallback: z.boolean().default(false),
  mergeInto: z.string().nullable().optional(),
});

const putConfigSchema = z.object({
  templateKey: templateKeySchema,
  documentType: documentTypeSchema,
  displayName: z.string().min(1),
  stages: z.array(stageSchema),
});

const previewSchema = z.object({
  templateKey: templateKeySchema,
  documentType: documentTypeSchema,
  stageSelections: z.array(z.object({
    stageId: z.string().optional(),
    providerProductId: z.string().optional(),
    productCode: z.string(),
    enabled: z.boolean().default(true),
    selectedPoolId: z.string().optional(),
  })),
});

const importSchema = z.object({
  rootPath: z.string().default('/fluxo-inteligente-app/logs/consultation/sollos/import'),
});

const debtMarkerRegex = /(pend[eê]n|d[íi]vid|protest|restri|negativ|apontament)/i;
const noDebtMarkerRegex = /(sem\s+restr|n[aã]o\s+consta\s+restr|nada\s+consta)/i;

function normalizeDocKind(doc: string): 'CPF' | 'CNPJ' | null {
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) return 'CPF';
  if (clean.length === 14) return 'CNPJ';
  return null;
}

function extractCandidateDocuments(content: string): string[] {
  const docs = new Set<string>();
  const compact = content.replace(/\s+/g, ' ');

  const patterns = [
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    /\b\d{11}\b/g,
    /\b\d{14}\b/g,
  ];

  for (const pattern of patterns) {
    const found = compact.match(pattern) ?? [];
    for (const item of found) {
      const digits = item.replace(/\D/g, '');
      if (digits.length === 11 || digits.length === 14) docs.add(digits);
    }
  }

  return [...docs];
}

function inferHasDebt(content: string): boolean {
  if (noDebtMarkerRegex.test(content)) return false;
  return debtMarkerRegex.test(content);
}

function inferProductCodeFromFile(fileName: string): string | null {
  const match = fileName.match(/(\d{3,4})(?=\.(?:html|mhtml)$)/i);
  return match?.[1] ?? null;
}

function defaultStages(templateKey: 'DIVIDAS_SIMPLES' | 'BACEN_SIMPLES' | 'PREMIUM', documentType: 'CPF' | 'CNPJ') {
  if (templateKey === 'BACEN_SIMPLES') {
    return [
      { productCode: '1080', stageName: 'Bacen SCR + Score', role: 'main', onFailure: 'fail', priority: 0, enabled: true, isFallback: false, mergeInto: null },
    ];
  }

  if (templateKey === 'DIVIDAS_SIMPLES' && documentType === 'CPF') {
    return [
      { productCode: '2502', stageName: 'Protestos (padrão)', role: 'main', onFailure: 'skip_to_fallback', priority: 0, enabled: true, isFallback: false, mergeInto: 'main' },
      { productCode: '1723', stageName: 'Protestos (fallback)', role: 'fallback', onFailure: 'skip_to_fallback', priority: 1, enabled: true, isFallback: true, mergeInto: 'main' },
      { productCode: '1079', stageName: 'Completa CPF', role: 'main', onFailure: 'skip_to_fallback', priority: 2, enabled: true, isFallback: false, mergeInto: 'main' },
      { productCode: '676', stageName: 'Completa PF/PJ (fallback)', role: 'fallback', onFailure: 'queue', priority: 3, enabled: true, isFallback: true, mergeInto: 'main' },
    ];
  }

  if (templateKey === 'DIVIDAS_SIMPLES' && documentType === 'CNPJ') {
    return [
      { productCode: '676', stageName: 'Completa PF/PJ', role: 'main', onFailure: 'queue', priority: 0, enabled: true, isFallback: false, mergeInto: 'main' },
    ];
  }

  if (templateKey === 'PREMIUM' && documentType === 'CPF') {
    return [
      { productCode: '2502', stageName: 'Protestos (padrão)', role: 'main', onFailure: 'skip_to_fallback', priority: 0, enabled: true, isFallback: false, mergeInto: 'main' },
      { productCode: '1723', stageName: 'Protestos (fallback)', role: 'fallback', onFailure: 'skip_to_fallback', priority: 1, enabled: true, isFallback: true, mergeInto: 'main' },
      { productCode: '1079', stageName: 'Completa CPF', role: 'main', onFailure: 'skip_to_fallback', priority: 2, enabled: true, isFallback: false, mergeInto: 'main' },
      { productCode: '676', stageName: 'Completa PF/PJ (fallback)', role: 'fallback', onFailure: 'queue', priority: 3, enabled: true, isFallback: true, mergeInto: 'main' },
      { productCode: '1080', stageName: 'Bacen SCR + Score', role: 'addon', onFailure: 'fail', priority: 4, enabled: true, isFallback: false, mergeInto: 'main' },
    ];
  }

  return [
    { productCode: '676', stageName: 'Completa PF/PJ', role: 'main', onFailure: 'queue', priority: 0, enabled: true, isFallback: false, mergeInto: 'main' },
    { productCode: '1080', stageName: 'Bacen SCR + Score', role: 'addon', onFailure: 'fail', priority: 1, enabled: true, isFallback: false, mergeInto: 'main' },
  ];
}

function toNumber(val: unknown): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const clean = String(val)
    .replace(/[^\d,.-]/g, '')
    .trim();
  if (!clean) return 0;
  if (clean.includes(',') && clean.includes('.')) {
    const noPoints = clean.replace(/\./g, '');
    const withDot = noPoints.replace(',', '.');
    const num = Number(withDot);
    return Number.isNaN(num) ? 0 : num;
  }
  if (clean.includes(',')) {
    const withDot = clean.replace(',', '.');
    const num = Number(withDot);
    return Number.isNaN(num) ? 0 : num;
  }
  const num = Number(clean);
  return Number.isNaN(num) ? 0 : num;
}

function getRowValue(row: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) {
      return toNumber(row[k]);
    }
  }
  // Se não encontrar por chave exata, busca por substring insensível a maiúsculas/minúsculas
  for (const [key, val] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('valor') ||
      lowerKey.includes('vr') ||
      lowerKey.includes('vlr') ||
      lowerKey.includes('val') ||
      lowerKey.includes('deb') ||
      lowerKey.includes('div')
    ) {
      return toNumber(val);
    }
  }
  return 0;
}

function sumFieldDynamic(items: Array<Record<string, unknown>>): number {
  return items.reduce((acc, row) => acc + getRowValue(row, ['Vr Dívida', 'Valor Protesto', 'valor_divida', 'valor', 'val', 'vr_divida', 'vlr_divida']), 0);
}

function makeFingerprint(row: Record<string, unknown>, fields: string[]): string {
  const parts = fields.map((f) => {
    if (row[f] !== undefined) return String(row[f] ?? '');
    const foundKey = Object.keys(row).find((k) => k.toLowerCase() === f.toLowerCase());
    return foundKey ? String(row[foundKey] ?? '') : '';
  });
  const joined = parts.join('::');
  if (joined.replace(/:/g, '').trim() === '') {
    // Se não encontrou nenhuma das chaves mapeadas para fingerprint, gera a partir de todo o objeto ordenado
    return Object.keys(row)
      .sort()
      .map((k) => `${k}:${row[k]}`)
      .join(',');
  }
  return joined;
}

function dedupByFields(items: Array<Record<string, unknown>>, fields: string[]) {
  const seen = new Set<string>();
  const out: Array<Record<string, unknown>> = [];
  for (const row of items) {
    const fp = makeFingerprint(row, fields);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(row);
  }
  return out;
}

function buildPreviewFromPayload(payload: unknown) {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;

  // Função auxiliar para achar uma chave por padrão regex
  const findArrayKey = (pattern: RegExp, defaultKey: string): Array<Record<string, unknown>> => {
    if (Array.isArray(root[defaultKey])) return root[defaultKey] as Array<Record<string, unknown>>;
    const lowerDefault = defaultKey.toLowerCase();
    if (Array.isArray(root[lowerDefault])) return root[lowerDefault] as Array<Record<string, unknown>>;

    for (const [key, value] of Object.entries(root)) {
      if (pattern.test(key) && Array.isArray(value)) {
        return value as Array<Record<string, unknown>>;
      }
    }
    return [];
  };

  const findObjectKey = (pattern: RegExp, defaultKey: string): Record<string, unknown> | null => {
    if (root[defaultKey] && typeof root[defaultKey] === 'object' && !Array.isArray(root[defaultKey])) {
      return root[defaultKey] as Record<string, unknown>;
    }
    const lowerDefault = defaultKey.toLowerCase();
    if (root[lowerDefault] && typeof root[lowerDefault] === 'object' && !Array.isArray(root[lowerDefault])) {
      return root[lowerDefault] as Record<string, unknown>;
    }

    for (const [key, value] of Object.entries(root)) {
      if (pattern.test(key) && value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    }
    return null;
  };

  const refin = findArrayKey(/(refin|pefin)/i, 'REFIN/PEFIN');
  const spc = findArrayKey(/spc/i, 'SPC');
  const scpc = findArrayKey(/scpc/i, 'SCPC');
  const protesto = findArrayKey(/(protesto|protestos)/i, 'Protesto');
  const bacen = findObjectKey(/(bacen|scr)/i, 'Bacen');

  const mergedDebts = [
    ...refin.map((x) => ({ ...x, __group: 'refin' })),
    ...spc.map((x) => ({ ...x, __group: 'spc' })),
    ...scpc.map((x) => ({ ...x, __group: 'scpc' })),
    ...protesto.map((x) => ({ ...x, __group: 'protesto' })),
  ];

  const grossTotal = sumFieldDynamic(refin) + sumFieldDynamic(spc) + sumFieldDynamic(scpc) + sumFieldDynamic(protesto);
  const deduped = dedupByFields(mergedDebts, ['Contrato', 'Origem', 'Nome', 'Data', 'Dt Ocorr', 'Vr Dívida', 'Valor Protesto', 'contrato', 'origem', 'nome', 'data', 'dt_ocorr', 'valor']);
  const uniqueTotal = deduped.reduce((acc, row) => acc + getRowValue(row, ['Vr Dívida', 'Valor Protesto', 'valor_divida', 'valor', 'val', 'vr_divida']), 0);

  // Acha score em root ou bacen de forma flexível
  let score = toNumber(root.score ?? root.Score ?? root.pontuacao);
  if (score === 0) {
    for (const [key, value] of Object.entries(root)) {
      if (key.toLowerCase().includes('score')) {
        if (typeof value === 'number' || typeof value === 'string') {
          score = toNumber(value);
          break;
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          const subScore = (value as Record<string, unknown>).pontuacao ?? (value as Record<string, unknown>).score ?? (value as Record<string, unknown>).valor;
          if (subScore !== undefined) {
            score = toNumber(subScore);
            break;
          }
        }
      }
    }
  }
  if (score === 0 && bacen) {
    const subScore = bacen.score ?? bacen.pontuacao;
    if (subScore && typeof subScore === 'object') {
      score = toNumber((subScore as Record<string, unknown>).pontuacao ?? (subScore as Record<string, unknown>).score ?? (subScore as Record<string, unknown>).valor);
    } else if (subScore) {
      score = toNumber(subScore);
    }
  }

  // Nome do cliente e documento
  const clientName = String(
    root.Nome ??
    root.NOME ??
    root.nome ??
    root.clientName ??
    root.razao_social ??
    root.RazaoSocial ??
    '-'
  );

  let document = '-';
  if (root.HEADER && typeof root.HEADER === 'object') {
    const headerParams = (root.HEADER as any).PARAMETROS || (root.HEADER as any).parametros || {};
    document = String(headerParams.CPFCNPJ ?? headerParams.CPF_CNPJ ?? headerParams.cpf ?? headerParams.cnpj ?? '-');
  }
  if (document === '-') {
    document = String(root.cpf ?? root.cnpj ?? root.documento ?? root.CPF ?? root.CNPJ ?? root.document ?? '-');
  }

  return {
    clientName,
    document,
    score,
    hasBacen: !!bacen,
    counts: {
      refinPefin: refin.length,
      spc: spc.length,
      scpc: scpc.length,
      protesto: protesto.length,
      deduped: deduped.length,
    },
    totals: {
      grossTotal,
      uniqueTotal,
    },
    byBureau: {
      refinPefin: refin,
      spc,
      scpc,
      protesto,
      bacen,
    },
  };
}

export async function registerTemplatesMvpAdminRoutes(app: FastifyInstance) {
  const adminOnly = { preHandler: [authenticate, requireRoles(['PLATFORM_ADMIN'])] };

  app.get('/admin/templates-mvp/config', adminOnly, async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const templateKey = templateKeySchema.parse(q.templateKey ?? 'DIVIDAS_SIMPLES');
    const documentType = documentTypeSchema.parse(q.documentType ?? 'CPF');

    const prisma = app.prisma as any;
    let config = await prisma.templateMvpConfig.findUnique({
      where: { templateKey_documentType: { templateKey, documentType } },
      include: { stages: { orderBy: { priority: 'asc' } } },
    });

    if (!config) {
      config = await prisma.templateMvpConfig.create({
        data: {
          templateKey,
          documentType,
          displayName: `${templateKey} (${documentType})`,
          stages: {
            create: defaultStages(templateKey, documentType),
          },
        },
        include: { stages: { orderBy: { priority: 'asc' } } },
      });
    }

    return ok(reply, config);
  });

  app.put('/admin/templates-mvp/config', adminOnly, async (request, reply) => {
    const payload = putConfigSchema.parse(request.body);
    const prisma = app.prisma as any;

    const existing = await prisma.templateMvpConfig.findUnique({
      where: { templateKey_documentType: { templateKey: payload.templateKey, documentType: payload.documentType } },
      include: { stages: true },
    });

    const config = existing
      ? await prisma.templateMvpConfig.update({
          where: { id: existing.id },
          data: { displayName: payload.displayName },
        })
      : await prisma.templateMvpConfig.create({
          data: {
            templateKey: payload.templateKey,
            documentType: payload.documentType,
            displayName: payload.displayName,
          },
        });

    await prisma.templateMvpRuleStage.deleteMany({ where: { configId: config.id } });

    await prisma.templateMvpRuleStage.createMany({
      data: payload.stages.map((stage) => ({
        configId: config.id,
        providerProductId: stage.providerProductId ?? null,
        productCode: stage.productCode,
        stageName: stage.stageName,
        role: stage.role,
        onFailure: stage.onFailure,
        priority: stage.priority,
        enabled: stage.enabled,
        isFallback: stage.isFallback,
        mergeInto: stage.mergeInto ?? null,
      })),
    });

    const fresh = await prisma.templateMvpConfig.findUnique({
      where: { id: config.id },
      include: { stages: { orderBy: { priority: 'asc' } } },
    });

    return ok(reply, fresh);
  });

  app.get('/admin/templates-mvp/test-pool', adminOnly, async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const providerProductId = q.providerProductId;
    const prisma = app.prisma as any;
    const where = providerProductId ? { providerProductId } : undefined;

    const rows = await prisma.templateMvpTestPool.findMany({
      where,
      include: {
        providerProduct: {
          select: { id: true, name: true, code: true, externalId: true },
        },
      },
      orderBy: [{ documentType: 'asc' }, { document: 'asc' }],
    });

    return ok(reply, rows);
  });

  app.post('/admin/templates-mvp/test-pool/import', adminOnly, async (request, reply) => {
    const payload = importSchema.parse(request.body ?? {});
    const prisma = app.prisma as any;

    const entries = await fs.readdir(payload.rootPath, { withFileTypes: true });
    const files = entries.filter((f) => f.isFile() && /homolog/i.test(f.name) && /\.(?:html|mhtml)$/i.test(f.name));

    const products = await prisma.providerProduct.findMany({
      where: { externalId: { not: null } },
      select: { id: true, externalId: true },
    });

    const byExternalId = new Map<string, string>();
    for (const p of products) {
      if (p.externalId) byExternalId.set(String(p.externalId), p.id);
    }

    let imported = 0;
    let ignored = 0;

    for (const file of files) {
      const productCode = inferProductCodeFromFile(file.name);
      if (!productCode) {
        ignored += 1;
        continue;
      }

      const providerProductId = byExternalId.get(productCode);
      if (!providerProductId) {
        ignored += 1;
        continue;
      }

      const fullPath = path.join(payload.rootPath, file.name);
      const content = await fs.readFile(fullPath, 'utf8');
      const docs = extractCandidateDocuments(content);
      const hasDebt = inferHasDebt(content);

      if (docs.length === 0) {
        ignored += 1;
        continue;
      }

      for (const doc of docs) {
        const kind = normalizeDocKind(doc);
        if (!kind) continue;

        await prisma.templateMvpTestPool.upsert({
          where: {
            providerProductId_document_sourceFile: {
              providerProductId,
              document: doc,
              sourceFile: file.name,
            },
          },
          create: {
            providerProductId,
            document: doc,
            documentType: kind,
            hasDebt,
            sourceFile: file.name,
            payload: null,
            metadata: { parser: 'html-homolog-v1' },
          },
          update: {
            documentType: kind,
            hasDebt,
            metadata: { parser: 'html-homolog-v1' },
          },
        });
        imported += 1;
      }
    }

    return ok(reply, { imported, ignored, scannedFiles: files.length });
  });

  app.post('/admin/templates-mvp/preview', adminOnly, async (request, reply) => {
    const payload = previewSchema.parse(request.body);
    const prisma = app.prisma as any;

    const products = await prisma.providerProduct.findMany({
      where: {
        OR: [
          ...payload.stageSelections.map((s) => (s.providerProductId ? { id: s.providerProductId } : null)).filter(Boolean),
          ...payload.stageSelections.map((s) => ({ externalId: s.productCode })),
        ],
      },
      include: { mappings: { include: { canonicalField: true }, orderBy: { sortOrder: 'asc' } } },
    });

    const byId = new Map(products.map((p: any) => [p.id, p]));
    const byCode = new Map(products.map((p: any) => [String(p.externalId ?? ''), p]));

    const pickedPayloads: any[] = [];
    const usedStages: any[] = [];

    for (const stage of payload.stageSelections.filter((s) => s.enabled)) {
      const product: any = (stage.providerProductId && byId.get(stage.providerProductId)) || byCode.get(stage.productCode);
      if (!product) continue;

      let sourcePayload: unknown = null;
      if (stage.selectedPoolId) {
        const pool = await prisma.templateMvpTestPool.findUnique({ where: { id: stage.selectedPoolId } });
        sourcePayload = pool?.payload ?? null;
      }

      if (!sourcePayload) sourcePayload = product.sampleResponse ?? null;
      if (!sourcePayload) continue;

      const normalized = normalizeProviderPayload(sourcePayload, product.mappings ?? []);
      pickedPayloads.push(normalized);
      usedStages.push({
        stageId: stage.stageId ?? null,
        productId: product.id,
        productCode: stage.productCode,
        productName: product.name,
      });
    }

    const merged = pickedPayloads.reduce((acc, cur) => {
      if (!cur || typeof cur !== 'object') return acc;
      return { ...acc, ...(cur as Record<string, unknown>) };
    }, {} as Record<string, unknown>);

    const preview = buildPreviewFromPayload(merged);

    return ok(reply, {
      templateKey: payload.templateKey,
      documentType: payload.documentType,
      usedStages,
      mergedPayload: merged,
      preview,
    });
  });
}
