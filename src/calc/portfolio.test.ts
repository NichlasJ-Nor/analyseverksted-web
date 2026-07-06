import { describe, it, expect } from 'vitest';
import {
  evaluatePfProject, checkDependencies, summarizePortfolio, portfolioRateSensitivity,
  capmRanking, budgetOptimisation, type PfProject,
} from './portfolio';

function proj(overrides: Partial<PfProject>): PfProject {
  return {
    id: 'p1', name: 'P1', cat: 'Vekst', i0: 100, cfs: [40, 40, 40, 40],
    rate: 0.1, beta: 1, active: true, deps: [], exclGroup: null,
    ...overrides,
  };
}

describe('evaluatePfProject', () => {
  it('beregner npv/irr/payback/cumCFs', () => {
    const r = evaluatePfProject(proj({}));
    expect(r.npv).toBeGreaterThan(0);
    expect(r.irr).not.toBeNull();
    expect(r.cumCFs).toEqual([-60, -20, 20, 60]);
  });
});

describe('checkDependencies', () => {
  it('varsler når et avhengig prosjekt ikke er aktivt', () => {
    const a = proj({ id: 'a', name: 'A' });
    const b = proj({ id: 'b', name: 'B', deps: ['a'] });
    const warnings = checkDependencies([b], [a, b]); // 'a' finnes, men er ikke aktiv
    expect(warnings.some((w) => w.message.includes('A'))).toBe(true);
  });
  it('varsler når flere i samme eksklusjonsgruppe er aktive', () => {
    const a = proj({ id: 'a', name: 'A', exclGroup: 'g1' });
    const b = proj({ id: 'b', name: 'B', exclGroup: 'g1' });
    const warnings = checkDependencies([a, b]);
    expect(warnings.some((w) => w.message.includes('g1'))).toBe(true);
  });
  it('ingen varsler når alt er konsistent', () => {
    const a = proj({ id: 'a', name: 'A' });
    expect(checkDependencies([a])).toHaveLength(0);
  });
});

describe('summarizePortfolio', () => {
  it('summerer NPV/I0 og rangerer etter NPV', () => {
    const a = evaluatePfProject(proj({ id: 'a', name: 'A', i0: 100, cfs: [80, 80] }));
    const b = evaluatePfProject(proj({ id: 'b', name: 'B', i0: 50, cfs: [10, 10] }));
    const sum = summarizePortfolio([a, b]);
    expect(sum.totalI0).toBe(150);
    expect(sum.ranked[0].name).toBe('A');
  });
});

describe('portfolioRateSensitivity', () => {
  it('gir total NPV per rate-rad', () => {
    const a = evaluatePfProject(proj({ id: 'a' }));
    const rows = portfolioRateSensitivity([a], 0.1);
    const basis = rows.find((r) => r.rate === 0.1)!;
    expect(basis.total).toBeCloseTo(a.npv, 6);
  });
});

describe('capmRanking', () => {
  it('lav beta gir lavere CAPM-krav og dermed relativt bedre CAPM-NPV', () => {
    const low = evaluatePfProject(proj({ id: 'low', name: 'Low', beta: 0.5 }));
    const high = evaluatePfProject(proj({ id: 'high', name: 'High', beta: 1.5 }));
    const ranked = capmRanking([low, high], 0.04, 0.05);
    const lowR = ranked.find((r) => r.name === 'Low')!;
    const highR = ranked.find((r) => r.name === 'High')!;
    expect(lowR.capmNPV).toBeGreaterThan(highR.capmNPV);
  });
});

describe('budgetOptimisation', () => {
  it('velger kombinasjonen med høyest NPV innenfor budsjett (eksakt søk)', () => {
    const a = evaluatePfProject(proj({ id: 'a', name: 'A', i0: 60, cfs: [100] }));
    const b = evaluatePfProject(proj({ id: 'b', name: 'B', i0: 60, cfs: [90] }));
    const c = evaluatePfProject(proj({ id: 'c', name: 'C', i0: 40, cfs: [50] }));
    const res = budgetOptimisation([a, b, c], 100);
    expect(res.method).toBe('exact');
    // a+c koster 100, npv = a.npv + c.npv; b+c koster 100 også; velger den med høyest total
    const npvAC = a.npv + c.npv;
    const npvBC = b.npv + c.npv;
    expect(res.totalNPV).toBeCloseTo(Math.max(npvAC, npvBC), 6);
    expect(res.totalI0).toBeLessThanOrEqual(100);
  });

  it('respekterer avhengigheter (velger ikke B uten A)', () => {
    const a = evaluatePfProject(proj({ id: 'a', name: 'A', i0: 100, cfs: [1] })); // dårlig NPV
    const b = evaluatePfProject(proj({ id: 'b', name: 'B', i0: 20, cfs: [100], deps: ['a'] }));
    const res = budgetOptimisation([a, b], 20); // budsjett dekker kun B, men B krever A
    expect(res.selected.find((p) => p.id === 'b')).toBeUndefined();
  });
});
