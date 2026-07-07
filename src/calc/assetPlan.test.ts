import { describe, it, expect } from 'vitest';
import { calcAssetPlan, type Asset } from './assetPlan';

describe('calcAssetPlan', () => {
  it('sprer kost lineært over brukstiden, med start året etter investeringsåret', () => {
    const assets: Asset[] = [{ name: 'Maskin', cost: 100, yr: 0, life: 5 }];
    const r = calcAssetPlan(assets);
    expect(r.daPerYear[1]).toBeCloseTo(20, 6);
    expect(r.daPerYear[5]).toBeCloseTo(20, 6);
    expect(r.daPerYear[6]).toBeUndefined(); // utenfor brukstiden, ikke i years-listen (maxYr=5)
  });

  it('CapEx registreres i investeringsåret, ikke spredt', () => {
    const assets: Asset[] = [{ name: 'Maskin', cost: 100, yr: 2, life: 5 }];
    const r = calcAssetPlan(assets);
    expect(r.capexPerYear[2]).toBe(100);
    expect(r.capexPerYear[0]).toBe(0);
  });

  it('summerer flere eiendeler som overlapper i samme år', () => {
    const assets: Asset[] = [
      { name: 'A', cost: 100, yr: 0, life: 5 }, // 20/år i år 1-5
      { name: 'B', cost: 60, yr: 1, life: 3 },  // 20/år i år 2-4
    ];
    const r = calcAssetPlan(assets);
    expect(r.daPerYear[1]).toBeCloseTo(20, 6);
    expect(r.daPerYear[2]).toBeCloseTo(40, 6);
    expect(r.daPerYear[4]).toBeCloseTo(40, 6);
    expect(r.daPerYear[5]).toBeCloseTo(20, 6);
  });

  it('respekterer minYears selv uten eiendeler med lang brukstid', () => {
    const r = calcAssetPlan([{ name: 'Kort', cost: 10, yr: 0, life: 1 }], 5);
    expect(r.years[r.years.length - 1]).toBe(5);
  });
});
