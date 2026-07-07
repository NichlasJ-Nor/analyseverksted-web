import { describe, it, expect } from 'vitest';
import { parseHistoricalPaste, computeHistoricalStats, projectRevenueFromHistory } from './historicalImport';

describe('parseHistoricalPaste', () => {
  it('parser tab-separert data med header', () => {
    const raw = 'År\tOmsetning\tEBITDA\tEBIT\tNettoresultat\n2021\t200\t30\t20\t15\n2022\t220\t35\t24\t18\n2023\t250\t40\t28\t20';
    const rows = parseHistoricalPaste(raw);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual({ year: 2021, rev: 200, ebitda: 30, ebit: 20, ni: 15 });
  });

  it('parser data uten header (første celle er tall)', () => {
    const raw = '2021\t200\n2022\t220';
    const rows = parseHistoricalPaste(raw);
    expect(rows.length).toBe(2);
    expect(rows[1].rev).toBe(220);
  });

  it('takler norsk tallformat med komma som desimaltegn', () => {
    const raw = '2021\t200,5\n2022\t220,25';
    const rows = parseHistoricalPaste(raw);
    expect(rows[0].rev).toBeCloseTo(200.5, 6);
  });

  it('returnerer tom liste for tom input', () => {
    expect(parseHistoricalPaste('')).toEqual([]);
  });
});

describe('computeHistoricalStats', () => {
  it('beregner CAGR korrekt over flere år', () => {
    const rows = [
      { year: 2021, rev: 100, ebitda: null, ebit: null, ni: null },
      { year: 2022, rev: 110, ebitda: null, ebit: null, ni: null },
      { year: 2023, rev: 121, ebitda: null, ebit: null, ni: null },
    ];
    const stats = computeHistoricalStats(rows);
    expect(stats.revCagr).toBeCloseTo(0.10, 4);
  });

  it('beregner gjennomsnittlig EBITDA-margin når data finnes', () => {
    const rows = [
      { year: 2021, rev: 100, ebitda: 20, ebit: null, ni: null },
      { year: 2022, rev: 200, ebitda: 30, ebit: null, ni: null },
    ];
    const stats = computeHistoricalStats(rows);
    expect(stats.avgEbitdaMargin).toBeCloseTo((0.2 + 0.15) / 2, 6);
  });

  it('returnerer null for marginer uten data', () => {
    const rows = [{ year: 2021, rev: 100, ebitda: null, ebit: null, ni: null }];
    const stats = computeHistoricalStats(rows);
    expect(stats.avgEbitdaMargin).toBeNull();
  });
});

describe('projectRevenueFromHistory', () => {
  it('projiserer med konstant vekstrate', () => {
    const vals = projectRevenueFromHistory(100, 0.1, 3);
    expect(vals[0]).toBeCloseTo(110, 6);
    expect(vals[1]).toBeCloseTo(121, 6);
    expect(vals[2]).toBeCloseTo(133.1, 6);
  });
});
