import { describe, expect, it } from 'vitest';
import {
  findSollosCatalogProductById,
  SOLLOS_ADAPTIVE_SAMPLING_POLICY,
  SOLLOS_TARGET_PRODUCTS,
} from './sollosCatalog';

describe('Sollos master catalog', () => {
  it('keeps product names and known ids unique', () => {
    const names = SOLLOS_TARGET_PRODUCTS.map((product) => product.name);
    const ids = SOLLOS_TARGET_PRODUCTS.flatMap((product) =>
      product.productId ? [product.productId] : [],
    );

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SOLLOS_TARGET_PRODUCTS).toHaveLength(30);
    expect(ids).toHaveLength(30);
    expect(
      SOLLOS_TARGET_PRODUCTS.every((product) => product.officialSampleCount > 0),
    ).toBe(true);
  });

  it('finds only ids backed by evidence', () => {
    expect(findSollosCatalogProductById('1079')?.name).toBe(
      'COMPLETA BRASIL + SCORE CPF',
    );
    expect(findSollosCatalogProductById('676')?.name).toBe(
      'COMPLETA BRASIL PREMIUM PF/PJ',
    );
    expect(findSollosCatalogProductById('999999')).toBeNull();
  });

  it('uses safe adaptive sampling defaults', () => {
    expect(SOLLOS_ADAPTIVE_SAMPLING_POLICY).toMatchObject({
      minimumSamples: 10,
      targetSamples: 20,
      maximumSamples: 30,
      concurrency: 1,
      homologationOnly: true,
      automaticCataloging: false,
    });
  });

  it('keeps a completed homologation audit for every target product', () => {
    expect(
      SOLLOS_TARGET_PRODUCTS.every(
        (product) =>
          product.audit.samples > 0 &&
          product.audit.failedSamples === 0 &&
          product.audit.uniquePaths > 0 &&
          product.audit.blocked === false,
      ),
    ).toBe(true);
    expect(
      SOLLOS_TARGET_PRODUCTS.reduce(
        (total, product) => total + product.audit.samples,
        0,
      ),
    ).toBe(560);
    expect(findSollosCatalogProductById('1079')?.audit.result).toBe(
      'cataloged-and-revalidated',
    );
    expect(findSollosCatalogProductById('676')?.audit.result).toBe(
      'ready-for-manual-review',
    );
  });

  it('reports the real limitation when Sollos offers fewer than ten documents', () => {
    expect(findSollosCatalogProductById('2391')).toMatchObject({
      officialSampleCount: 7,
      sampleCoverage: 'limited',
    });
    expect(findSollosCatalogProductById('2392')).toMatchObject({
      officialSampleCount: 5,
      sampleCoverage: 'limited',
    });
    expect(findSollosCatalogProductById('676')).toMatchObject({
      officialSampleCount: 30,
      sampleCoverage: 'sufficient',
    });
  });
});
