import { describe, it, expect } from 'vitest';
import { calcPLYear, calcPLYears } from './pl';

const base = { rev: 280, cogs: -140, opex: -80, da: -15, capex: -20, dwc: -5 };

describe('calcPLYear', () => {
  it('bygger opp fra omsetning til FCF', () => {
    const { result } = calcPLYear(base, 0.22);
    expect(result.gross).toBeCloseTo(140, 6);   // 280 - 140
    expect(result.ebitda).toBeCloseTo(60, 6);   // 140 - 80
    expect(result.ebit).toBeCloseTo(45, 6);     // 60 - 15
    expect(result.tax).toBeCloseTo(-9.9, 6);    // -45*0.22
    expect(result.nopat).toBeCloseTo(35.1, 6);  // 45 - 9.9
    // fcf = nopat + 15 (tilbakeført D&A) - 20 (capex) - 5 (dwc)
    expect(result.fcf).toBeCloseTo(25.1, 6);
  });

  it('null skatt ved negativ EBIT uten fremføring', () => {
    const { result } = calcPLYear({ ...base, opex: -300 }, 0.22);
    expect(result.ebit).toBeLessThan(0);
    expect(result.tax).toBe(0);
  });
});

describe('calcPLYears med skattefremføring', () => {
  it('fremfører underskudd til påfølgende lønnsomt år', () => {
    const years = [
      { ...base, opex: -300 }, // stort underskudd år 1
      { ...base },             // lønnsomt år 2 — skal bruke fremført underskudd
    ];
    const results = calcPLYears(years, 0.22, true);
    expect(results[0].tax).toBe(0);
    // år 2 EBIT er 45, underskudd fra år 1 var stort → skatt bør reduseres til 0
    expect(results[1].tax).toBe(0);
  });

  it('uten fremføring beskattes hvert år isolert', () => {
    const years = [{ ...base, opex: -300 }, { ...base }];
    const results = calcPLYears(years, 0.22, false);
    expect(results[1].tax).toBeCloseTo(-9.9, 6);
  });
});
