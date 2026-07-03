/**
 * Sensitivitet og breakeven-analyse for DCF.
 * Portert fra HTML-appens B10 (sensitivitetstabell) og B13 (breakeven).
 */
import type { TerminalMethod } from './dcf';

export interface EquityAtInput {
  fcf: number[];
  wacc: number;
  g: number;
  terminalMethod: TerminalMethod;
  exitMultiple: number;
  lastEbitda: number;
  netDebt: number;
  minority: number;
  otherAdj: number;
  fcfScale?: number; // multipliser alle FCF med denne faktoren (default 1)
}

/** Egenkapitalverdi for et gitt sett WACC/g/FCF-skalering. NaN hvis Gordon-vekst divergerer. */
export function equityAt(input: EquityAtInput): number {
  const { fcf, wacc, g, terminalMethod, exitMultiple, lastEbitda, netDebt, minority, otherAdj, fcfScale = 1 } = input;
  const scaled = fcf.map((v) => v * fcfScale);
  const n = scaled.length;
  let pv = 0;
  for (let i = 0; i < n; i++) pv += scaled[i] / Math.pow(1 + wacc, i + 1);

  let tv: number;
  if (terminalMethod === 'exit') {
    tv = lastEbitda * exitMultiple * fcfScale;
  } else {
    if (wacc <= g) return NaN;
    tv = (scaled[n - 1] * (1 + g)) / (wacc - g);
  }
  pv += tv / Math.pow(1 + wacc, n);
  return pv - netDebt - minority + otherAdj;
}

export interface SensitivityGrid {
  rowLabel: string;
  colLabel: string;
  rows: number[];
  cols: number[];
  values: number[][]; // values[row][col]
}

/** WACC (rader) × terminal vekst g (kolonner), ±2pp / ±1pp rundt basis. */
export function sensitivityWaccVsG(base: Omit<EquityAtInput, 'wacc' | 'g'>, baseWacc: number, baseG: number): SensitivityGrid {
  const rows = [baseWacc - 0.02, baseWacc - 0.01, baseWacc, baseWacc + 0.01, baseWacc + 0.02];
  const cols = [baseG - 0.01, baseG - 0.005, baseG, baseG + 0.005, baseG + 0.01];
  const values = rows.map((w) => cols.map((g) => equityAt({ ...base, wacc: w, g })));
  return { rowLabel: 'WACC', colLabel: 'g', rows, cols, values };
}

/** WACC (rader) × FCF-skalering ±20% (kolonner). */
export function sensitivityWaccVsFcf(base: Omit<EquityAtInput, 'wacc' | 'fcfScale'>, baseWacc: number): SensitivityGrid {
  const rows = [baseWacc - 0.02, baseWacc - 0.01, baseWacc, baseWacc + 0.01, baseWacc + 0.02];
  const cols = [0.8, 0.9, 1.0, 1.1, 1.2];
  const values = rows.map((w) => cols.map((f) => equityAt({ ...base, wacc: w, fcfScale: f })));
  return { rowLabel: 'WACC', colLabel: 'FCF', rows, cols, values };
}

export interface BreakevenResult {
  fcfDownsidePct: number | null; // hvor mye FCF kan falle (%) før egenkapital = 0
  maxWacc: number | null;        // høyeste WACC før egenkapital = 0
  minG: number | null;           // laveste g før egenkapital = 0 (kun Gordon)
  maxBuyPrice: number;           // = EV (breakeven kjøpspris for NPV = 0)
}

/** Finner x der f(x) krysser 0, gitt at f er monoton på [lo, hi] og fortegn skifter. */
function bisect(f: (x: number) => number, lo: number, hi: number, iterations = 60): number | null {
  let flo = f(lo);
  const fhi = f(hi);
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
  let a = lo, b = hi;
  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (fm * flo < 0) b = mid; else { a = mid; flo = fm; }
    if (b - a < 1e-6) break;
  }
  return (a + b) / 2;
}

export function breakeven(input: EquityAtInput, ev: number): BreakevenResult {
  const { netDebt, minority, otherAdj } = input;
  const fcfDownsidePct = ev > 0 ? (1 - (netDebt + minority - otherAdj) / ev) * 100 : null;

  const maxWacc = bisect(
    (w) => equityAt({ ...input, wacc: w }),
    input.wacc,
    input.wacc + 0.5
  );

  let minG: number | null = null;
  if (input.terminalMethod !== 'exit' && equityAt(input) > 0) {
    minG = bisect(
      (g) => equityAt({ ...input, g }),
      -0.05,
      input.wacc - 0.001
    );
  }

  return { fcfDownsidePct, maxWacc, minG, maxBuyPrice: ev };
}
