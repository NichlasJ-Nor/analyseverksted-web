import { describe, it, expect } from 'vitest';
import { equityAt, sensitivityWaccVsG, sensitivityWaccVsFcf, breakeven } from './dcfAnalysis';
import { dcf } from './dcf';

const baseInput = {
  fcf: [100, 100, 100, 100, 100],
  wacc: 0.10,
  g: 0.02,
  terminalMethod: 'gordon' as const,
  exitMultiple: 8,
  lastEbitda: 0,
  netDebt: 30,
  minority: 0,
  otherAdj: 0,
};

describe('equityAt', () => {
  it('stemmer med dcf()-modulens equity for basisverdiene', () => {
    const r = dcf(baseInput);
    expect(equityAt(baseInput)).toBeCloseTo(r.equity, 6);
  });
  it('gir NaN når g >= wacc (Gordon-vekst divergerer)', () => {
    expect(equityAt({ ...baseInput, wacc: 0.02, g: 0.03 })).toBeNaN();
  });
  it('fcfScale skalerer kontantstrømmene proporsjonalt', () => {
    const full = equityAt(baseInput);
    const halfFcf = equityAt({ ...baseInput, fcfScale: 0.5 });
    // Halvert FCF gir lavere (men ikke nødvendigvis halvert, pga netto gjeld) egenkapital
    expect(halfFcf).toBeLessThan(full);
  });
});

describe('sensitivityWaccVsG', () => {
  it('midtcellen er lik basisverdien', () => {
    const grid = sensitivityWaccVsG(baseInput, 0.10, 0.02);
    expect(grid.values[2][2]).toBeCloseTo(equityAt(baseInput), 6);
  });
  it('høyere WACC gir lavere verdi (alt annet likt)', () => {
    const grid = sensitivityWaccVsG(baseInput, 0.10, 0.02);
    expect(grid.values[0][2]).toBeGreaterThan(grid.values[4][2]);
  });
  it('høyere g gir høyere verdi (alt annet likt)', () => {
    const grid = sensitivityWaccVsG(baseInput, 0.10, 0.02);
    expect(grid.values[2][4]).toBeGreaterThan(grid.values[2][0]);
  });
});

describe('sensitivityWaccVsFcf', () => {
  it('+20% FCF gir høyere verdi enn -20%', () => {
    const grid = sensitivityWaccVsFcf(baseInput, 0.10);
    expect(grid.values[2][4]).toBeGreaterThan(grid.values[2][0]);
  });
});

describe('breakeven', () => {
  it('maxBuyPrice = EV', () => {
    const ev = 800;
    const b = breakeven(baseInput, ev);
    expect(b.maxBuyPrice).toBe(ev);
  });
  it('finner maxWacc der egenkapital krysser null', () => {
    // Høy netto gjeld relativt til FCF sikrer at egenkapitalen faktisk blir
    // negativ et sted i søkeintervallet [wacc, wacc+0.5].
    const highDebtInput = { ...baseInput, netDebt: 700 };
    const ev = equityAt(highDebtInput) + highDebtInput.netDebt;
    const b = breakeven(highDebtInput, ev);
    expect(b.maxWacc).not.toBeNull();
    expect(equityAt({ ...highDebtInput, wacc: b.maxWacc! })).toBeCloseTo(0, 1);
  });
  it('returnerer null når egenkapitalen forblir positiv i hele søkeintervallet', () => {
    const b = breakeven(baseInput, equityAt(baseInput) + baseInput.netDebt);
    expect(b.maxWacc).toBeNull();
  });
  it('fcfDownsidePct er null når ev <= 0', () => {
    const b = breakeven(baseInput, 0);
    expect(b.fcfDownsidePct).toBeNull();
  });
});
