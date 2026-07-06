/**
 * Investeringsanalyse: NPV/IRR/payback per alternativ, sensitivitet, breakeven, scenarioer.
 * Portert fra HTML-appens calcNPV/calcPayback/runInv-familien.
 */
import { irr } from './finance';

export interface InvestAlternative {
  name: string;
  i0: number;
  cfs: number[]; // fri kontantstrøm år 1..n
}

export interface InvestResult extends InvestAlternative {
  npv: number;
  irr: number | null;
  payback: number | null; // år, null hvis aldri betalt tilbake
  cumCFs: number[];
}

export function calcNPV(i0: number, cfs: number[], r: number): number {
  return cfs.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t + 1), -i0);
}

/** Lineær interpolasjon mellom årene der kumulativ (udiskontert) kontantstrøm krysser 0. */
export function calcPayback(i0: number, cfs: number[]): number | null {
  let cum = -i0;
  for (let t = 0; t < cfs.length; t++) {
    const prev = cum;
    cum += cfs[t];
    if (cum >= 0 && prev < 0) return t + -prev / cfs[t];
  }
  return null;
}

export function evaluateAlternative(alt: InvestAlternative, r: number): InvestResult {
  const npv = calcNPV(alt.i0, alt.cfs, r);
  const irrVal = irr([-alt.i0, ...alt.cfs]);
  const payback = calcPayback(alt.i0, alt.cfs);
  const cumCFs: number[] = [];
  let cum = -alt.i0;
  alt.cfs.forEach((cf) => { cum += cf; cumCFs.push(cum); });
  return { ...alt, npv, irr: irrVal, payback, cumCFs };
}

export interface RateSensitivityRow {
  rate: number;
  npvByAlt: number[]; // samme rekkefølge som alts
}

/** NPV for hvert alternativ ved avkastningskrav r + hver offset. */
export function rateSensitivity(alts: InvestAlternative[], r: number, offsets = [-0.05, -0.03, -0.01, 0, 0.01, 0.03, 0.05]): RateSensitivityRow[] {
  return offsets
    .map((offset) => r + offset)
    .filter((rate) => rate > 0)
    .map((rate) => ({ rate, npvByAlt: alts.map((a) => calcNPV(a.i0, a.cfs, rate)) }));
}

export interface BreakevenInvestResult {
  maxI0: number;        // PV av fremtidige CF: maks kjøpspris for NPV = 0
  buffer: number;       // maxI0 - i0 (positiv = betaler under verdi)
  minFcfPct: number | null; // andel av PV(CF) som kreves for å dekke I0 (i0 / maxI0 * 100)
}

export function breakevenInvest(alt: InvestAlternative, r: number): BreakevenInvestResult {
  const pvCFs = alt.cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t + 1), 0);
  const maxI0 = pvCFs;
  const buffer = maxI0 - alt.i0;
  const minFcfPct = pvCFs > 0 ? (alt.i0 / pvCFs) * 100 : null;
  return { maxI0, buffer, minFcfPct };
}

export interface InvestScenario {
  npv: number;
  irr: number | null;
  pct: number; // FCF-sjokk i %
}

export interface InvestScenarioSet {
  bear: InvestScenario;
  base: InvestScenario;
  bull: InvestScenario;
}

/** Bear/Base/Bull: FCF skaleres med (1 + bearPct/bullPct). */
export function scenarioInvest(alt: InvestAlternative, r: number, bearPct = -0.2, bullPct = 0.2): InvestScenarioSet {
  const bearCFs = alt.cfs.map((cf) => cf * (1 + bearPct));
  const bullCFs = alt.cfs.map((cf) => cf * (1 + bullPct));
  return {
    bear: { npv: calcNPV(alt.i0, bearCFs, r), irr: irr([-alt.i0, ...bearCFs]), pct: bearPct * 100 },
    base: { npv: calcNPV(alt.i0, alt.cfs, r), irr: irr([-alt.i0, ...alt.cfs]), pct: 0 },
    bull: { npv: calcNPV(alt.i0, bullCFs, r), irr: irr([-alt.i0, ...bullCFs]), pct: bullPct * 100 },
  };
}
