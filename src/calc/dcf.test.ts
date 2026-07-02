import { describe, it, expect } from 'vitest';
import { wacc, dcf } from './dcf';
import { npvFromT0 } from './finance';

describe('wacc', () => {
  it('CAPM + vektet snitt etter skatt', () => {
    const r = wacc({ rf: 0.04, erp: 0.05, beta: 1.0, kd: 0.05, debtWeight: 0.3, tax: 0.22 });
    expect(r.ke).toBeCloseTo(0.09, 6);
    expect(r.kdAfterTax).toBeCloseTo(0.039, 6);
    // 0.09*0.7 + 0.039*0.3 = 0.063 + 0.0117 = 0.0747
    expect(r.wacc).toBeCloseTo(0.0747, 6);
  });
});

describe('dcf (Gordon-vekst)', () => {
  const base = dcf({
    fcf: [100, 100, 100, 100, 100],
    wacc: 0.10,
    g: 0.02,
    terminalMethod: 'gordon' as const,
  });

  it('PV av prognose-FCF', () => {
    expect(base.pvFcf).toBeCloseTo(379.08, 1);
  });
  it('terminalverdi = FCF·(1+g)/(WACC−g)', () => {
    expect(base.terminalValue).toBeCloseTo(1275, 0); // 100*1.02/0.08
  });
  it('EV = PV(FCF) + PV(terminal)', () => {
    // pvTV = 1275/1.1^5 = 791.68 → ev ≈ 1170.76
    expect(base.ev).toBeCloseTo(1170.76, 0);
  });
  it('kaster feil når g ≥ WACC', () => {
    expect(() => dcf({ fcf: [100], wacc: 0.05, g: 0.06, terminalMethod: 'gordon' })).toThrow();
  });
});

describe('dcf IRR-fiks', () => {
  it('uten I₀ blir IRR ≈ WACC (per definisjon)', () => {
    const r = dcf({ fcf: [100, 100, 100], wacc: 0.10, g: 0.02, terminalMethod: 'gordon' });
    expect(r.irr!).toBeCloseTo(0.10, 2);
  });
  it('med I₀ under EV gir IRR høyere enn WACC', () => {
    const r = dcf({ fcf: [100, 100, 100], wacc: 0.10, g: 0.02, terminalMethod: 'gordon', i0: 500 });
    // Betaler mindre enn intrinsisk verdi → avkastning over kravet
    expect(r.irr!).toBeGreaterThan(0.10);
  });
  it('npv = ev − i0', () => {
    const r = dcf({ fcf: [100, 100, 100], wacc: 0.10, g: 0.02, terminalMethod: 'gordon', i0: 500 });
    expect(r.npv).toBeCloseTo(r.ev - 500, 6);
  });
});

describe('dcf (exit-multippel)', () => {
  it('terminalverdi = EBITDA · multippel', () => {
    const r = dcf({
      fcf: [50, 50, 50], wacc: 0.10, g: 0.02,
      terminalMethod: 'exit', exitMultiple: 8, lastEbitda: 100,
    });
    expect(r.terminalValue).toBeCloseTo(800, 6);
    // pvFcf = 50*(1/1.1+1/1.21+1/1.331)=50*2.48685=124.34; pvTV=800/1.331=601.05
    expect(r.ev).toBeCloseTo(725.39, 1);
  });
});

describe('sanity: EV med i0=0 gir IRR som nuller ut strømmen', () => {
  it('IRR-strøm summerer til ~0 ved funnet rente', () => {
    const r = dcf({ fcf: [80, 90, 100], wacc: 0.11, g: 0.025, terminalMethod: 'gordon', i0: 400 });
    const tv = r.terminalValue;
    const stream = [-400, 80, 90, 100 + tv];
    expect(npvFromT0(stream, r.irr!)).toBeCloseTo(0, 2);
  });
});
