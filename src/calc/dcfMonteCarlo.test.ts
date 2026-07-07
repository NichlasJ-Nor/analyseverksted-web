import { describe, it, expect } from 'vitest';
import { runDcfMonteCarlo, type DcfMcInput } from './dcfMonteCarlo';

const base: DcfMcInput = {
  fcf: [100, 110, 120],
  wacc: 0.10,
  g: 0.02,
  terminalMethod: 'gordon',
  exitMultiple: 8,
  lastEbitda: 150,
  fcfPessPct: -0.3,
  fcfOptPct: 0.3,
  waccPessPp: 0.03,
  waccOptPp: 0.03,
  gPessPp: 0.01,
  gOptPp: 0.01,
};

describe('runDcfMonteCarlo', () => {
  it('produserer riktig antall gyldige simuleringer', () => {
    const r = runDcfMonteCarlo(base, 2000);
    expect(r.evs.length).toBeGreaterThan(1900); // nesten alle bør være gyldige (wacc>g holder nesten alltid)
  });

  it('evs er sortert stigende', () => {
    const r = runDcfMonteCarlo(base, 500);
    for (let i = 1; i < r.evs.length; i++) expect(r.evs[i]).toBeGreaterThanOrEqual(r.evs[i - 1]);
  });

  it('persentilene er monotont økende: p10 <= p25 <= p50 <= p75 <= p90', () => {
    const r = runDcfMonteCarlo(base, 2000);
    expect(r.p10).toBeLessThanOrEqual(r.p25);
    expect(r.p25).toBeLessThanOrEqual(r.p50);
    expect(r.p50).toBeLessThanOrEqual(r.p75);
    expect(r.p75).toBeLessThanOrEqual(r.p90);
  });

  it('baseEv er beregnet uten støy og er finite', () => {
    const r = runDcfMonteCarlo(base, 500);
    expect(r.baseEv).not.toBeNull();
    expect(isFinite(r.baseEv!)).toBe(true);
  });

  it('probAboveBase er en gyldig prosentandel', () => {
    const r = runDcfMonteCarlo(base, 2000);
    expect(r.probAboveBase).not.toBeNull();
    expect(r.probAboveBase!).toBeGreaterThanOrEqual(0);
    expect(r.probAboveBase!).toBeLessThanOrEqual(100);
  });
});
