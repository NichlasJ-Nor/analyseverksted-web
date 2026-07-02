import { describe, it, expect } from 'vitest';
import { npvFromT0, npv, irr, payback, percentile, mean } from './finance';

describe('npvFromT0', () => {
  it('diskonterer med år 0 udiskontert', () => {
    // -100 + 50/1.1 + 50/1.21 + 50/1.331 = 24.343
    expect(npvFromT0([-100, 50, 50, 50], 0.1)).toBeCloseTo(24.343, 2);
  });
  it('rate 0 gir ren sum', () => {
    expect(npvFromT0([-100, 50, 50, 50], 0)).toBeCloseTo(50, 6);
  });
});

describe('npv (i0 + år 1..n)', () => {
  it('gir samme som npvFromT0 med utlegg i år 0', () => {
    expect(npv(100, [50, 50, 50], 0.1)).toBeCloseTo(24.343, 2);
  });
});

describe('irr', () => {
  it('finner renten der NPV = 0', () => {
    const cf = [-100, 50, 50, 50];
    const r = irr(cf)!;
    expect(r).not.toBeNull();
    expect(npvFromT0(cf, r)).toBeCloseTo(0, 4);
  });
  it('returnerer null når alle strømmer er positive', () => {
    expect(irr([100, 50, 50])).toBeNull();
  });
  it('håndterer kjent case ≈ 23.4%', () => {
    expect(irr([-100, 50, 50, 50])!).toBeCloseTo(0.2338, 3);
  });
});

describe('payback', () => {
  it('interpolerer innen kryssingsåret', () => {
    expect(payback(100, [50, 50, 50])).toBeCloseTo(2, 6);
  });
  it('returnerer null hvis aldri tilbakebetalt', () => {
    expect(payback(100, [10, 10, 10])).toBeNull();
  });
});

describe('percentile', () => {
  const sorted = Array.from({ length: 101 }, (_, i) => i); // 0..100
  it('median', () => expect(percentile(sorted, 50)).toBeCloseTo(50, 6));
  it('p10', () => expect(percentile(sorted, 10)).toBeCloseTo(10, 6));
  it('p90', () => expect(percentile(sorted, 90)).toBeCloseTo(90, 6));
});

describe('mean', () => {
  it('gjennomsnitt', () => expect(mean([1, 2, 3, 4])).toBeCloseTo(2.5, 6));
});
