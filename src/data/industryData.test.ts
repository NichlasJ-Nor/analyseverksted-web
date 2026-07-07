import { describe, it, expect } from 'vitest';
import { INDUSTRY_REFERENCES, INDUSTRY_COMPS, REF_RF } from './industryData';

describe('industryData', () => {
  it('REF_RF er en rimelig desimalrente', () => {
    expect(REF_RF).toBeGreaterThan(0);
    expect(REF_RF).toBeLessThan(0.1);
  });

  it('alle referanser har positiv beta og ERP', () => {
    INDUSTRY_REFERENCES.forEach((r) => {
      expect(r.beta).toBeGreaterThan(0);
      expect(r.erp).toBeGreaterThan(0);
      expect(r.key).toBeTruthy();
    });
  });

  it('alle bransjer med comps har minst 2 selskaper', () => {
    Object.values(INDUSTRY_COMPS).forEach((peers) => {
      expect(peers.length).toBeGreaterThanOrEqual(2);
      peers.forEach((p) => {
        expect(p.evEbitda).toBeGreaterThan(0);
        expect(p.evRev).toBeGreaterThan(0);
      });
    });
  });

  it('de fleste referanse-bransjene har tilhørende comps', () => {
    const keysWithComps = INDUSTRY_REFERENCES.filter((r) => INDUSTRY_COMPS[r.key]);
    expect(keysWithComps.length).toBeGreaterThan(10);
  });
});
