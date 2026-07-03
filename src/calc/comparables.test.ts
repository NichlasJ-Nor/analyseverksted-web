import { describe, it, expect } from 'vitest';
import { comparablesValuation } from './comparables';

const comps = [
  { name: 'A', evEbitda: 8, evRev: 1.5 },
  { name: 'B', evEbitda: 10, evRev: 2.0 },
  { name: 'C', evEbitda: 12, evRev: 2.5 },
];

describe('comparablesValuation', () => {
  it('bruker median-multippel for midtpunkt', () => {
    const r = comparablesValuation(comps, 100, 300, 0, 0, 0);
    expect(r.compEbitdaEq).toBeCloseTo(100 * 10, 6);
    expect(r.compRevEq).toBeCloseTo(300 * 2.0, 6);
  });

  it('spenn bruker faktisk min/maks blant peer-multiplene', () => {
    const r = comparablesValuation(comps, 100, 300, 0, 0, 0);
    expect(r.ebRange.lo).toBeCloseTo(100 * 8, 6);
    expect(r.ebRange.hi).toBeCloseTo(100 * 12, 6);
    expect(r.revRange.lo).toBeCloseTo(300 * 1.5, 6);
    expect(r.revRange.hi).toBeCloseTo(300 * 2.5, 6);
  });

  it('trekker fra netto gjeld/minoritet og legger til andre justeringer', () => {
    const r = comparablesValuation(comps, 100, 300, 50, 10, 5);
    expect(r.compEbitdaEq).toBeCloseTo(100 * 10 - 50 - 10 + 5, 6);
  });
});
