import { describe, it, expect } from 'vitest';
import {
  triangularFromU, pertSample, probit, runSimulation, computeTornado, computeSpearman,
  type McItem, type McEvent,
} from './montecarlo';

describe('triangularFromU', () => {
  it('returnerer a ved u=0 og b ved u=1', () => {
    expect(triangularFromU(0, 10, 20, 40)).toBeCloseTo(10, 6);
    expect(triangularFromU(1, 10, 20, 40)).toBeCloseTo(40, 6);
  });
  it('returnerer a hvis a>=b (degenerert fordeling)', () => {
    expect(triangularFromU(0.5, 10, 10, 10)).toBe(10);
  });
});

describe('pertSample', () => {
  it('faller tilbake til triangularFromU hvis a>=b', () => {
    expect(pertSample(5, 5, 5)).toBe(5);
  });
  it('gir verdier innenfor [a,b]', () => {
    for (let i = 0; i < 50; i++) {
      const v = pertSample(10, 20, 40);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(40);
    }
  });
});

describe('probit', () => {
  it('probit(0.5) er ca 0', () => {
    expect(probit(0.5)).toBeCloseTo(0, 2);
  });
});

const items: McItem[] = [
  { name: 'Omsetning', opt: 80, ml: 100, pess: 130, timing: 'annual' },
  { name: 'Kostnad', opt: -60, ml: -50, pess: -40, timing: 'annual' },
];

describe('runSimulation', () => {
  it('gir riktig antall iterasjoner og samples per item (single mode)', () => {
    const r = runSimulation(items, [], 'triangular', 'single', 1000, 5, 0.1);
    expect(r.results.length).toBe(1000);
    expect(r.samples.length).toBe(items.length);
    expect(r.samples[0].length).toBe(1000);
  });

  it('npv-mode produserer gyldige IRR-tellinger', () => {
    const withInvestment: McItem[] = [...items, { name: 'Investering', opt: -220, ml: -200, pess: -180, timing: 'upfront' }];
    const r = runSimulation(withInvestment, [], 'pert', 'npv', 500, 5, 0.1);
    expect(r.irrs).not.toBeNull();
    expect(r.irrValidCount).toBeGreaterThan(0);
  });

  it('sortedResults er sortert stigende', () => {
    const r = runSimulation(items, [], 'normal', 'single', 200, 5, 0.1);
    for (let i = 1; i < r.sortedResults.length; i++) {
      expect(r.sortedResults[i]).toBeGreaterThanOrEqual(r.sortedResults[i - 1]);
    }
  });
});

describe('computeTornado', () => {
  it('rangerer items etter swing (deterministisk, ingen tilfeldighet)', () => {
    const rows = computeTornado(items, [], 'single', 5, 0.1);
    expect(rows.length).toBe(2);
    // Omsetning har swing = 130-80=50, Kostnad har swing = -40-(-60)=20
    expect(rows[0].name).toBe('Omsetning');
    expect(rows[0].swing).toBeCloseTo(50, 6);
  });

  it('inkluderer hendelser med ikke-null swing', () => {
    const events: McEvent[] = [{ name: 'Risiko', prob: 0.3, opt: 0, ml: -10, pess: -30, year: 2 }];
    const rows = computeTornado(items, events, 'npv', 5, 0.1);
    expect(rows.some((r) => r.name.includes('Risiko'))).toBe(true);
  });
});

describe('computeSpearman', () => {
  it('item som er perfekt korrelert med resultatet får rs nær 1', () => {
    const n = 200;
    const samples = [new Float64Array(n)];
    const results = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      samples[0][i] = i;
      results[i] = i * 2 + 5;
    }
    const rows = computeSpearman(results, samples, [{ name: 'X', opt: 0, ml: 0, pess: 0, timing: 'annual' }]);
    expect(rows[0].rs).toBeCloseTo(1, 4);
  });
});
