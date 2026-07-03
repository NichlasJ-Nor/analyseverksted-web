import { describe, it, expect } from 'vitest';
import { revenueFromGrowth, revenueFromPriceVolume, revenueFromSegments } from './revenue';

describe('revenueFromGrowth', () => {
  it('holder år 0 uendret og forrenter deretter', () => {
    const r = revenueFromGrowth(100, [0, 0.1, 0.1]);
    expect(r[0]).toBeCloseTo(100, 6);
    expect(r[1]).toBeCloseTo(110, 6);
    expect(r[2]).toBeCloseTo(121, 6);
  });
});

describe('revenueFromPriceVolume', () => {
  it('pris × volum (tusen) / 1000', () => {
    // 1000 kr × 3000 (i tusen enheter) / 1000 = 3 000 000... skal gi MNOK-skala
    expect(revenueFromPriceVolume([1000], [3000])).toEqual([3000]);
  });
});

describe('revenueFromSegments', () => {
  it('summerer på tvers av segmenter per år', () => {
    const segs = [
      { name: 'A', vals: [10, 20] },
      { name: 'B', vals: [5, 5] },
    ];
    expect(revenueFromSegments(segs, 2)).toEqual([15, 25]);
  });
  it('behandler manglende år som 0', () => {
    const segs = [{ name: 'A', vals: [10] }];
    expect(revenueFromSegments(segs, 3)).toEqual([10, 0, 0]);
  });
});
