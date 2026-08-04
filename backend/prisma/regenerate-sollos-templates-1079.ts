import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { renderTemplateToHtml } from '../src/lib/template-engine/renderTemplateToHtml';
import type { ReportTemplate } from '../src/lib/template-engine/template';
import {
  composeReport,
  type ComposerField,
  type ComposerSection,
} from '../src/modules/templates/consultas-pro-1079-composer';
import type { ConsultasProBrandReference } from '../src/modules/templates/consultas-pro-report-builder.service';
import { SOLLOS_TEMPLATE_PRODUCTS } from '../src/modules/templates/sollos-template-products';
import {
  buildTypeKeyedData,
  parseTypeItemFiltersRecord,
} from '../src/modules/providers/canonical-builder.service';
import {
  pivotValue,
  PIVOT_ROWS_PREFIX,
} from '../src/modules/templates/pivot-parallel-arrays';

/**
 * Regenera os relatorios Sollos no padrao 1079, usando o compositor da matriz.
 *
 * O produto 1079 e a matriz visual e NUNCA e regravado: ele so e lido, como
 * referencia de marca e de componentes. Os demais recebem o mesmo acabamento,
 * com as secoes variando conforme o contrato de dados de cada um.
 */
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const only = process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1];

/** Trava dura: o 1079 nunca entra na lista de regravacao. */
const MATRIX_PRODUCT_ID = '1079';

type FieldSpec = { key: string; label: string; dataType?: string };

function fieldsOf(config: unknown): FieldSpec[] {
  const parsed = (config ?? {}) as Record<string, unknown>;
  const list = Array.isArray(parsed.fields) ? parsed.fields : [];
  return list
    .filter(
      (field): field is Record<string, unknown> =>
        Boolean(field) && typeof field === 'object',
    )
    .map((field) => ({
      key: String(field.key ?? ''),
      label: String(field.label ?? field.key ?? ''),
      dataType: field.dataType ? String(field.dataType) : undefined,
    }))
    .filter((field) => field.key);
}

const norm = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();

/** Remove prefixos tecnicos de catalogacao ("Novo · ") do titulo da secao. */
const cleanTitle = (label: string) =>
  label.replace(/^\s*novo\s*[·:.\-]\s*/i, '').trim() || label;

const isMoney = (field: FieldSpec) =>
  /CURRENCY|MONEY/.test(norm(field.dataType ?? '')) ||
  /VALOR|TOTAL|LIMITE|SALDO|DIVIDA/.test(norm(field.label));

const isScoreType = (key: string) => /SCORE|RATING|PONTU/.test(norm(key));
const isDebtType = (key: string) =>
  /DIVIDA|PENDENCIA|PROTEST|CHEQUE|ACAO|RESTRI|OCORRENCIA|NEGATIV/.test(norm(key));

/**
 * Tipos que sao envelope tecnico do provedor, nao conteudo de cliente:
 * cabecalhos de retorno, controle, protocolo, metadados de requisicao. Ficam
 * fora do corpo do relatorio, como o gerador original ja fazia.
 */
const isTechnicalType = (key: string) =>
  /(^|_)(HEADER|CONTROLE|PROTOCOLO?L?|REQUISICAO|DADOS_RETORNADOS|INFORMACOES_RETORNO|TEMPO_RESPOSTA|RETORNO)($|_)/.test(
    norm(key),
  );

/**
 * Campos que nunca vao ao cliente: chaves de acesso, hashes, versoes, dados de
 * teste/homologacao e rotulos genericos sem significado de negocio.
 */
const TECHNICAL_FIELD = /(BASE64|HTML|JSON|RAW|HASH|TOKEN|ENDPOINT|WEBHOOK|CHAVE|VERSAO|PROTOCOL|TERMINAL|CLIENTE|SOLICITANTE|CODIGO_RETORNO|STATUS_RETORNO|TESTE|DEBUG|TIMESTAMP)/;
const GENERIC_LABEL = /^(TESTE|TESTE ?2|FONTE|STATUS|FINAL|INTERVALO|CODIGO|VERSAO|TERMINAL|N\/D|-)$/;

const isTechnicalField = (field: FieldSpec) => {
  const label = norm(field.label);
  const key = norm(field.key);
  return (
    TECHNICAL_FIELD.test(label) ||
    TECHNICAL_FIELD.test(key) ||
    GENERIC_LABEL.test(label.trim())
  );
};

function expr(typeKey: string, field: FieldSpec, collection: boolean): string {
  const path = collection
    ? `$${typeKey}[0].${field.key}`
    : `$${typeKey}.${field.key}`;
  return isMoney(field) ? `{{toCurrency ${path}}}` : `{{safeText ${path}}}`;
}

async function loadBrandReference(): Promise<ConsultasProBrandReference> {
  const candidates = await prisma.template.findMany({
    where: { name: { contains: 'COMPLETA BRASIL + SCORE CPF', mode: 'insensitive' } },
    select: { id: true, layout: true },
  });
  const reference = candidates.find((candidate) => {
    const layout = candidate.layout as unknown as ReportTemplate | null;
    return layout?.elements?.some(
      (element) =>
        element.type === 'image' &&
        typeof element.data?.src === 'string' &&
        element.data.src.startsWith('data:image/'),
    );
  });
  if (!reference?.layout) throw new Error('Matriz 1079 nao encontrada.');
  return {
    templateId: reference.id,
    layout: reference.layout as unknown as ReportTemplate,
  };
}

async function main() {
  const brandReference = await loadBrandReference();
  const alvos = SOLLOS_TEMPLATE_PRODUCTS.filter(
    (product) =>
      product.productId !== MATRIX_PRODUCT_ID &&
      !product.preserveExistingTemplate &&
      (!only || product.productId === only),
  );
  console.log(
    `Matriz 1079: ${brandReference.templateId} (somente leitura)\n` +
      `Produtos a regenerar: ${alvos.length}\n`,
  );

  let ok = 0;
  let vazios = 0;
  const falhas: string[] = [];

  for (const spec of alvos) {
    const product = await prisma.providerProduct.findFirst({
      where: { externalId: spec.productId },
      include: { mappings: { include: { canonicalField: true } } },
    });
    if (!product) {
      falhas.push(`${spec.productId}: produto ausente`);
      continue;
    }

    const ativos = product.mappings.filter((mapping) => mapping.isActive);
    const tipos = [
      ...new Map(
        ativos.map((mapping) => [
          mapping.canonicalField.pathKey,
          mapping.canonicalField,
        ]),
      ).values(),
    ];

    // O PARA e montado tipo a tipo, como no gerador original da Fabrica.
    const sampleResponse = JSON.stringify(product.sampleResponse ?? {});
    const filtros = parseTypeItemFiltersRecord(product.typeItemFilters);
    const mapped: Record<string, unknown> = {};
    for (const tipo of tipos) {
      const doTipo = ativos.filter(
        (mapping) => mapping.canonicalField.pathKey === tipo.pathKey,
      );
      if (doTipo.length === 0) continue;
      try {
        mapped[tipo.pathKey] = buildTypeKeyedData({
          sampleResponse,
          trechoMappings: doTipo.map((mapping) => ({
            fieldTypeKey: tipo.pathKey,
            jsonPath: mapping.sourcePath,
            label: mapping.canonicalField.label,
          })) as never,
          fieldType: {
            id: tipo.id,
            key: tipo.pathKey,
            label: tipo.label,
            reportFieldConfig: tipo.reportFieldConfig,
          } as never,
          typeItemFilterConfig: (filtros?.[tipo.pathKey] ?? {}) as never,
        });
      } catch {
        mapped[tipo.pathKey] = null;
      }
    }

    const sections: ComposerSection[] = [];
    const kpis: ComposerField[] = [];
    let scoreExpression: string | null = null;

    for (const tipo of tipos) {
      // Envelope tecnico do provedor nao vira secao de cliente.
      if (isTechnicalType(tipo.pathKey)) continue;

      const fields = fieldsOf(tipo.reportFieldConfig).filter(
        (field) => !isTechnicalField(field),
      );
      if (fields.length === 0) continue;
      const collection = Array.isArray(mapped[tipo.pathKey]);

      if (isScoreType(tipo.pathKey) && !scoreExpression) {
        const scoreField =
          fields.find((field) => /SCORE|PONTU/.test(norm(field.key))) ?? fields[0];
        scoreExpression = collection
          ? `$${tipo.pathKey}[0].${scoreField.key}`
          : `$${tipo.pathKey}.${scoreField.key}`;
        continue;
      }

      if (isDebtType(tipo.pathKey) && collection) {
        sections.push({
          kind: 'table',
          table: {
            title: cleanTitle(tipo.label).toUpperCase(),
            icon: 'AlertTriangle',
            arrayPath: `$${tipo.pathKey}`,
            emptyMessage: 'Nenhuma ocorrência localizada nesta consulta.',
            // Ate 6 colunas; o HTML fluido acomoda a largura.
            columns: fields.slice(0, 6).map((field) => ({
              label: field.label,
              path: field.key,
              ...(isMoney(field) ? { format: 'currency' } : {}),
            })),
          },
        });
        const money = fields.find(isMoney);
        if (money && kpis.length < 3) {
          kpis.push({
            label: cleanTitle(tipo.label),
            value: `{{sum($${tipo.pathKey}[*].${money.key})}}`,
            hint: 'Soma dos apontamentos',
          });
        }
        continue;
      }

      // Tipos com campos-array paralelos (SCR, historico, e-mails) viram tabela,
      // nunca JSON cru num cartao. Cada grupo de comprimento e uma tabela propria,
      // para nao misturar as 5 faixas de atraso com os 60 meses de historico.
      const pivot = collection ? null : pivotValue(mapped[tipo.pathKey]);
      if (pivot && pivot.groups.length > 0) {
        const byKey = new Map(fields.map((f) => [f.key, f.label]));
        // Escalares com valor viram cartoes acima das tabelas.
        const scalarFields = fields.filter((f) => pivot.scalars.includes(f.key));
        if (scalarFields.length > 0) {
          sections.push({
            kind: 'fields',
            title: cleanTitle(tipo.label).toUpperCase(),
            icon: 'FileText',
            items: scalarFields.map((field) => ({
              label: field.label,
              value: expr(tipo.pathKey, field, false),
            })),
          });
        }
        const multiGroup = pivot.groups.length > 1;
        for (const group of pivot.groups) {
          const cols = group.fields
            .filter((k) => byKey.has(k))
            .map((k) => ({ label: byKey.get(k)!, key: k }));
          if (cols.length === 0) continue;
          // Fatia em blocos de ate 5 colunas para caber na largura A4.
          for (let i = 0; i < cols.length; i += 5) {
            const slice = cols.slice(i, i + 5);
            const parts: string[] = [];
            if (multiGroup) parts.push(`${group.length} registros`);
            if (cols.length > 5) parts.push(`${Math.floor(i / 5) + 1}`);
            const suffix = parts.length ? ` (${parts.join(' · ')})` : '';
            sections.push({
              kind: 'table',
              table: {
                title: cleanTitle(tipo.label).toUpperCase() + suffix,
                icon: 'FileText',
                arrayPath: `$${tipo.pathKey}${PIVOT_ROWS_PREFIX}${group.index}`,
                emptyMessage: 'Sem registros nesta consulta.',
                columns: slice.map((c) => ({ label: c.label, path: c.key })),
              },
            });
          }
        }
        continue;
      }

      sections.push({
        kind: 'fields',
        title: cleanTitle(tipo.label).toUpperCase(),
        icon: 'FileText',
        // Sem corte de rotulo/valor: o grid HTML quebra o texto.
        items: fields.map((field) => ({
          label: field.label,
          value: expr(tipo.pathKey, field, collection),
        })),
      });
    }

    if (kpis.length > 0) {
      sections.unshift({
        kind: 'kpis',
        title: 'RESUMO FINANCEIRO',
        icon: 'Wallet',
        items: kpis,
      });
    }
    // Score entra logo apos o resumo, como na matriz — mas so quando o produto
    // realmente apura score. Produto sem score nao ganha uma secao vazia.
    if (scoreExpression) {
      sections.splice(kpis.length > 0 ? 1 : 0, 0, {
        kind: 'score-block',
        scoreExpression,
      });
    } else {
      vazios += 1;
    }

    if (sections.length < 1) {
      falhas.push(`${spec.productId}: sem tipos utilizaveis`);
      continue;
    }

    const identityType = tipos.find((tipo) =>
      /DADOS_PESSOAIS|IDENTIFICA|CADASTR|EMPRESA/.test(norm(tipo.pathKey)),
    );
    const identityFields = identityType ? fieldsOf(identityType.reportFieldConfig) : [];
    const nameField = identityFields.find((field) =>
      /NOME|RAZAO/.test(norm(`${field.key} ${field.label}`)),
    );
    const docField = identityFields.find((field) =>
      /DOCUMENTO|CPF|CNPJ/.test(norm(`${field.key} ${field.label}`)),
    );

    const layout = composeReport({
      templateId: `sollos-template-${spec.productId}`,
      productName: spec.productName,
      reportKind: spec.personType === 'PJ' ? 'Empresarial' : 'Pessoal',
      identity: {
        nameExpression:
          nameField && identityType
            ? `{{safeText $${identityType.pathKey}.${nameField.key}}}`
            : '{{safeText cliente.nome}}',
        documentExpression:
          docField && identityType
            ? `{{formatCpfCnpj $${identityType.pathKey}.${docField.key}}}`
            : '{{formatCpfCnpj cliente.documento}}',
      },
      sections,
      brandReference,
      metadata: {
        provider: 'sollos',
        product: spec.productId,
        personType: spec.personType,
      },
    });

    for (const frame of layout.frames) {
      const html = renderTemplateToHtml(layout, frame.id, mapped).html;
      const pending = html.match(/\{\{[^}]+\}\}/g);
      if (pending) {
        falhas.push(`${spec.productId}: expressao pendente ${pending[0].slice(0, 40)}`);
      }
    }

    console.log(
      `[${spec.productId}] ${spec.productName.slice(0, 34).padEnd(34)} ` +
        `${layout.frames.length}p ${String(layout.elements.length).padStart(3)}el ` +
        `${sections.length} secoes${scoreExpression ? '' : ' (sem score)'}`,
    );

    if (apply) {
      if (spec.productId === MATRIX_PRODUCT_ID) {
        throw new Error('Tentativa de regravar a matriz 1079 — abortado.');
      }
      await prisma.template.update({
        where: { id: `sollos-template-${spec.productId}` },
        data: { layout: layout as unknown as Prisma.InputJsonValue },
      });
    }
    ok += 1;
  }

  console.log(
    `\nRegenerados: ${ok}/${alvos.length} | sem score: ${vazios} | falhas: ${falhas.length}`,
  );
  falhas.slice(0, 10).forEach((falha) => console.log('  !', falha));
  if (!apply) console.log('\nDry-run. Use --apply para gravar.');
}

main()
  .catch((error) => {
    console.error('FALHOU:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
