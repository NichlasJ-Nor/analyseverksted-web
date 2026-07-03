import { describe, it, expect } from 'vitest';
import { wcFromPercent, wcFromDso, wcFromDetail } from './workingCapital';

describe('wcFromPercent', () => {
  it('år 0 er alltid 0, deretter -pct*vekst', () => {
    const dwc = wcFromPercent([100, 120, 110], 0.08);
    expect(dwc[0]).toBe(0);
    expect(dwc[1]).toBeCloseTo(-0.08 * 20, 6);
    expect(dwc[2]).toBeCloseTo(-0.08 * -10, 6); // omsetningsfall frigjør kapital
  });
});

describe('wcFromDso', () => {
  it('beregner NWC og ΔWC korrekt', () => {
    const { nwc, dwc } = wcFromDso([365, 365], [365, 365], { dso: 30, dpo: 20, dio: 10 });
    // NWC = 30*365/365 + 10*365/365 - 20*365/365 = 30+10-20 = 20 (konstant her)
    expect(nwc[0]).toBeCloseTo(20, 6);
    expect(nwc[1]).toBeCloseTo(20, 6);
    expect(dwc[0]).toBe(0);
    expect(dwc[1]).toBeCloseTo(0, 6); // ingen endring i NWC-nivå
  });
});

describe('wcFromDetail', () => {
  it('eiendeler (+) og gjeld (-) nettes riktig', () => {
    const lines = [
      { name: 'Kundefordringer', sign: 1 as const, vals: [50, 60] },
      { name: 'Leverandørgjeld', sign: -1 as const, vals: [20, 20] },
    ];
    const { nwc, dwc } = wcFromDetail(lines, 2);
    expect(nwc).toEqual([30, 40]);
    expect(dwc[1]).toBeCloseTo(-10, 6); // NWC økte med 10 → kapital bindes
  });
});
