import { describe, it, expect } from 'vitest';
import { calcNPV, calcPayback, evaluateAlternative, rateSensitivity, breakevenInvest, scenarioInvest } from './invest';

const alt = { name: 'Alt A', i0: 100, cfs: [30, 40, 50, 50] };

describe('calcNPV', () => {
  it('diskonterer kontantstrømmer fra år 1 og trekker fra I0', () => {
    const npv = calcNPV(100, [110], 0.1);
    expect(npv).toBeCloseTo(0, 6);
  });
});

describe('calcPayback', () => {
  it('interpolerer lineært mellom årene kumulativ CF krysser 0', () => {
    // -100, +50 -> cum -50; +50 -> cum 0 nøyaktig ved t=1 (år 2)
    expect(calcPayback(100, [50, 50])).toBeCloseTo(2, 6);
  });
  it('returnerer null hvis I0 aldri betales tilbake', () => {
    expect(calcPayback(100, [10, 10])).toBeNull();
  });
});

describe('evaluateAlternative', () => {
  it('beregner npv/irr/payback/cumCFs konsistent', () => {
    const r = evaluateAlternative(alt, 0.1);
    expect(r.npv).toBeCloseTo(calcNPV(alt.i0, alt.cfs, 0.1), 6);
    expect(r.cumCFs).toEqual([-70, -30, 20, 70]);
    expect(r.irr).not.toBeNull();
  });
});

describe('rateSensitivity', () => {
  it('gir en rad per positiv rate og npv per alternativ', () => {
    const rows = rateSensitivity([alt], 0.1);
    expect(rows.every((row) => row.rate > 0)).toBe(true);
    expect(rows.find((row) => row.rate === 0.1)!.npvByAlt[0]).toBeCloseTo(calcNPV(alt.i0, alt.cfs, 0.1), 6);
  });
});

describe('breakevenInvest', () => {
  it('maxI0 er nåverdien av fremtidige kontantstrømmer', () => {
    const b = breakevenInvest(alt, 0.1);
    const pv = alt.cfs.reduce((s, cf, t) => s + cf / Math.pow(1.1, t + 1), 0);
    expect(b.maxI0).toBeCloseTo(pv, 6);
    expect(b.buffer).toBeCloseTo(pv - alt.i0, 6);
  });
});

describe('scenarioInvest', () => {
  it('bull gir høyere NPV enn bear', () => {
    const s = scenarioInvest(alt, 0.1);
    expect(s.bull.npv).toBeGreaterThan(s.base.npv);
    expect(s.base.npv).toBeGreaterThan(s.bear.npv);
  });
});
