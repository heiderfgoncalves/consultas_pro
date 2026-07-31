import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  auditRadarPronampeLineage,
  buildRadarPronampeMappedData,
  readPath,
} from './brasilcred-radar-pronampe.mapper';
import {
  BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT,
  BRASILCRED_RADAR_PRONAMPE_TYPES,
} from './brasilcred-template-products';

type Sample = { document: string; status: string; response: Record<string, unknown> };

const samples: Sample[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../../prisma/brasilcred-radar-pronampe-samples.json'),
    'utf-8',
  ),
).samples;

/** Todos os caminhos folha presentes numa resposta. */
function leafPaths(value: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => leafPaths(item, `${prefix}[*]`, out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      leafPaths(
        (value as Record<string, unknown>)[key],
        prefix ? `${prefix}.${key}` : key,
        out,
      );
    }
    return out;
  }
  out.add(prefix);
  return out;
}

test('as amostras reais foram preservadas', () => {
  assert.ok(samples.length >= 7, 'esperado ao menos 7 amostras oficiais');
  for (const sample of samples) {
    assert.equal(sample.response.product, 'financial_radar_pronampe');
    assert.equal(sample.response.product_name, 'Radar PRONAMPE (CNPJ)');
  }
});

test('cobertura 100%: todo caminho da origem tem destino no PARA', () => {
  const mapeados = new Set(
    BRASILCRED_RADAR_PRONAMPE_TYPES.flatMap((type) =>
      type.fields.map((field) => field.sourcePath),
    ),
  );
  assert.equal(mapeados.size, BRASILCRED_RADAR_PRONAMPE_LEAF_COUNT);

  for (const sample of samples) {
    const reais = leafPaths(sample.response);
    const semDestino = [...reais].filter((p) => !mapeados.has(p));
    assert.deepEqual(
      semDestino,
      [],
      `[${sample.document}] caminhos sem destino: ${semDestino.join(', ')}`,
    );
  }
});

test('nenhum mapeamento aponta para caminho inexistente', () => {
  const observados = new Set<string>();
  samples.forEach((s) => leafPaths(s.response).forEach((p) => observados.add(p)));
  for (const type of BRASILCRED_RADAR_PRONAMPE_TYPES) {
    for (const field of type.fields) {
      assert.ok(
        observados.has(field.sourcePath),
        `${type.key}.${field.key} aponta para ${field.sourcePath}, ausente em todas as amostras`,
      );
    }
  }
});

test('contrato origem -> Preview: nenhum valor diverge', () => {
  let conferidos = 0;
  for (const sample of samples) {
    for (const item of auditRadarPronampeLineage(sample.response)) {
      assert.notEqual(
        item.status,
        'divergente',
        `[${sample.document}] ${item.typeKey}.${item.fieldKey}: origem ${JSON.stringify(item.sourceValue)} virou ${JSON.stringify(item.previewValue)}`,
      );
      if (item.status === 'ok') conferidos += 1;
    }
  }
  assert.ok(conferidos > 200, `esperado mais de 200 valores conferidos, obtido ${conferidos}`);
});

test('bloco ausente na origem some do PARA, em vez de virar campo vazio', () => {
  const semScore = samples.find((s) => readPath(s.response, 'score') === undefined);
  assert.ok(semScore, 'esperada ao menos uma amostra sem bloco score');
  const mapped = buildRadarPronampeMappedData(semScore.response);
  assert.equal(mapped.PRONAMPE_SCORE_CREDITO, undefined);
  // Os blocos presentes continuam intactos na mesma amostra.
  assert.notEqual(mapped.PRONAMPE_CADASTRO_RECEITA, undefined);
});

test('codigos da Receita viram o texto que o cliente le', () => {
  for (const sample of samples) {
    const mapped = buildRadarPronampeMappedData(sample.response) as Record<
      string,
      Record<string, unknown>
    >;
    const receita = mapped.PRONAMPE_CADASTRO_RECEITA;
    const porte = readPath(sample.response, 'company.size');
    if (porte === '01') assert.equal(receita.porte, 'Microempresa (ME)');
    if (porte === '03') assert.equal(receita.porte, 'Empresa de Pequeno Porte (EPP)');
    if (readPath(sample.response, 'company.registration_status') === '2') {
      assert.equal(receita.situacao_cadastral, 'Ativa');
    }
    assert.ok(
      receita.optante_simples === 'Sim' || receita.optante_simples === 'Não',
      'optante pelo Simples deve ser Sim/Não, nunca true/false',
    );
  }
});

test('sócios chegam mascarados — nenhum CPF completo no PARA', () => {
  for (const sample of samples) {
    const mapped = buildRadarPronampeMappedData(sample.response) as Record<
      string,
      Record<string, unknown>[]
    >;
    for (const socio of mapped.PRONAMPE_QUADRO_SOCIETARIO ?? []) {
      const doc = String(socio.documento_mascarado ?? '');
      assert.ok(doc.includes('*'), `documento de sócio sem máscara: ${doc}`);
      assert.equal(
        /^\d{11}$/.test(doc.replace(/\D/g, '')),
        false,
        'documento de sócio não pode ser um CPF completo',
      );
    }
  }
});
