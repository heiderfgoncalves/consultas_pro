import { describe, expect, it } from 'vitest';
import {
  coerceBooleanForReport,
  parseCurrencyBrlToNumber,
  parsePercentToAbsolutePercent,
  formatAbsolutePercentBrDisplay,
} from '@/lib/reportFieldValueCoercion';

describe('parseCurrencyBrlToNumber', () => {
  it('parseia R$ e vírgula decimal', () => {
    expect(parseCurrencyBrlToNumber('R$ 231,19')).toBeCloseTo(231.19);
    expect(parseCurrencyBrlToNumber('1.231,19')).toBeCloseTo(1231.19);
  });
});

describe('parsePercentToAbsolutePercent', () => {
  it('fração sem % vira pontos percentuais', () => {
    expect(parsePercentToAbsolutePercent('0.9')).toBeCloseTo(90);
    expect(parsePercentToAbsolutePercent('0,9')).toBeCloseTo(90);
  });
  it('com % é absoluto explícito', () => {
    expect(parsePercentToAbsolutePercent('0.9%')).toBeCloseTo(0.9);
    expect(parsePercentToAbsolutePercent('0,9%')).toBeCloseTo(0.9);
  });
  it('valor >1 sem % é absoluto', () => {
    expect(parsePercentToAbsolutePercent('10.1')).toBeCloseTo(10.1);
    expect(parsePercentToAbsolutePercent('10,1')).toBeCloseTo(10.1);
  });
});

describe('formatAbsolutePercentBrDisplay', () => {
  it('inteiro sem casas forçadas', () => {
    expect(formatAbsolutePercentBrDisplay(90)).toMatch(/90%/);
  });
  it('decimal com 2 casas', () => {
    expect(formatAbsolutePercentBrDisplay(0.9)).toContain('%');
    expect(formatAbsolutePercentBrDisplay(10.1)).toContain('%');
  });
});

describe('coerceBooleanForReport', () => {
  it('aceita variantes', () => {
    expect(coerceBooleanForReport(true)).toBe(true);
    expect(coerceBooleanForReport(false)).toBe(false);
    expect(coerceBooleanForReport(1)).toBe(true);
    expect(coerceBooleanForReport(0)).toBe(false);
    expect(coerceBooleanForReport('true')).toBe(true);
    expect(coerceBooleanForReport('FALSE')).toBe(false);
    expect(coerceBooleanForReport('0')).toBe(false);
  });
});
