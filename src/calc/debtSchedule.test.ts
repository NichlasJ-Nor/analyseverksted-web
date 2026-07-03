import { describe, it, expect } from 'vitest';
import { computeDebtSchedule } from './debtSchedule';

describe('annuitetslån', () => {
  it('konstant terminbeløp (rente+avdrag) hvert år', () => {
    const { rows, finalBalance } = computeDebtSchedule({ principal: 100, rate: 0.05, years: 5, type: 'annuity' });
    const payments = rows.map((r) => r.interest + r.principal);
    payments.forEach((p) => expect(p).toBeCloseTo(payments[0], 6));
    expect(finalBalance).toBeCloseTo(0, 4);
  });
});

describe('serielån', () => {
  it('konstant avdrag, avtagende rente', () => {
    const { rows, finalBalance } = computeDebtSchedule({ principal: 100, rate: 0.05, years: 5, type: 'serial' });
    rows.forEach((r) => expect(r.principal).toBeCloseTo(20, 6));
    expect(rows[0].interest).toBeGreaterThan(rows[4].interest);
    expect(finalBalance).toBeCloseTo(0, 6);
  });
});

describe('bullet', () => {
  it('kun renter til siste år, hele gjelden forfaller da', () => {
    const { rows, finalBalance } = computeDebtSchedule({ principal: 100, rate: 0.05, years: 3, type: 'bullet' });
    expect(rows[0].principal).toBe(0);
    expect(rows[1].principal).toBe(0);
    expect(rows[2].principal).toBeCloseTo(100, 6);
    expect(finalBalance).toBeCloseTo(0, 6);
  });
});
