/**
 * A1: Monte Carlo-simulering på DCF-modellen. Portert fra HTML-appens runDCFMC().
 * Perturberer FCF-skala, WACC og terminal vekst (g) samtidig via PERT-fordeling og
 * beregner spennet i EV.
 */
import type { TerminalMethod } from './dcf';

export interface DcfMcInput {
  fcf: number[];
  wacc: number;
  g: number;
  terminalMethod: TerminalMethod;
  exitMultiple: number;
  lastEbitda: number;
  fcfPessPct: number;  // f.eks. -0.30 (FCF kan falle 30%)
  fcfOptPct: number;   // f.eks. +0.30
  waccPessPp: number;  // f.eks. 0.03 (WACC kan øke 3pp i pessimistisk scenario)
  waccOptPp: number;   // f.eks. 0.03 (WACC kan falle 3pp i optimistisk scenario)
  gPessPp: number;     // f.eks. 0.01 (g kan falle 1pp)
  gOptPp: number;      // f.eks. 0.01 (g kan øke 1pp)
}

/** PERT via Box-Muller-tilnærming (identisk med HTML-originalens forenklede pertSample). */
function pertSample(min: number, ml: number, max: number): number {
  if (min >= max) return ml;
  const mu = (min + 4 * ml + max) / 6;
  const sig = (max - min) / 6;
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return Math.max(min, Math.min(max, mu + sig * z));
}

function calcEv(fcf: number[], wacc: number, g: number, terminalMethod: TerminalMethod, exitMultiple: number, lastEbitda: number): number | null {
  if (!fcf.length || wacc <= g) return null;
  let pvFcf = 0;
  fcf.forEach((cf, i) => { pvFcf += cf / Math.pow(1 + wacc, i + 1); });
  const n = fcf.length;
  const tv = terminalMethod === 'exit' ? lastEbitda * exitMultiple : (fcf[n - 1] * (1 + g)) / (wacc - g);
  return pvFcf + tv / Math.pow(1 + wacc, n);
}

export interface DcfMcResult {
  evs: number[]; // sortert stigende
  baseEv: number | null;
  mean: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  probAboveBase: number | null; // % av simuleringer >= basis-EV
}

export function runDcfMonteCarlo(input: DcfMcInput, numSims: number): DcfMcResult {
  const {
    fcf, wacc, g, terminalMethod, exitMultiple, lastEbitda,
    fcfPessPct, fcfOptPct, waccPessPp, waccOptPp, gPessPp, gOptPp,
  } = input;

  const evs: number[] = [];
  for (let i = 0; i < numSims; i++) {
    const scale = 1 + pertSample(fcfPessPct, 0, fcfOptPct);
    const wDelta = pertSample(-waccOptPp, 0, waccPessPp);
    const gDelta = pertSample(-gPessPp, 0, gOptPp);
    const simFcf = fcf.map((cf) => cf * scale);
    const simEbitda = lastEbitda * scale;
    const ev = calcEv(simFcf, wacc + wDelta, g + gDelta, terminalMethod, exitMultiple, simEbitda);
    if (ev !== null && isFinite(ev)) evs.push(ev);
  }
  evs.sort((a, b) => a - b);

  if (evs.length === 0) {
    return { evs, baseEv: null, mean: NaN, p10: NaN, p25: NaN, p50: NaN, p75: NaN, p90: NaN, probAboveBase: null };
  }

  const pct = (p: number) => evs[Math.max(0, Math.min(evs.length - 1, Math.floor((p / 100) * evs.length)))];
  const mean = evs.reduce((s, v) => s + v, 0) / evs.length;
  const baseEv = calcEv(fcf, wacc, g, terminalMethod, exitMultiple, lastEbitda);
  const probAboveBase = baseEv !== null ? (evs.filter((v) => v >= baseEv).length / evs.length) * 100 : null;

  return {
    evs, baseEv, mean,
    p10: pct(10), p25: pct(25), p50: pct(50), p75: pct(75), p90: pct(90),
    probAboveBase,
  };
}
