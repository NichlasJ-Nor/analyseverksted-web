/**
 * Monte Carlo-simulering. Portert fra HTML-appens sampling-/tornado-/Spearman-logikk.
 * Utelatt i denne porteringen (bevisst scope-kutt): GBM-modellering og gruppekorrelasjon
 * (Gaussisk copula) mellom items — kun uavhengige trekk per item/hendelse.
 */
import { npvFromT0, irr as irrFn } from './finance';

export type DistType = 'triangular' | 'pert' | 'normal' | 'uniform' | 'lognormal';
export type SimMode = 'single' | 'npv';
export type Timing = 'upfront' | 'terminal' | 'annual';

export interface McItem {
  name: string;
  opt: number;  // optimistisk / P10
  ml: number;   // mest sannsynlig
  pess: number; // pessimistisk / P90
  timing: Timing;
}

export interface McEvent {
  name: string;
  prob: number; // sannsynlighet 0-1
  opt: number;
  ml: number;
  pess: number;
  year: number; // hvilket år hendelsen kan inntreffe (0..N)
}

function normalSample(): number {
  return Math.sqrt(-2 * Math.log(Math.random() || 1e-12)) * Math.cos(2 * Math.PI * Math.random());
}

function gammaSample(shape: number): number {
  if (shape < 1) return gammaSample(1 + shape) * Math.pow(Math.random(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do { x = normalSample(); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function triangularFromU(u: number, a: number, m: number, b: number): number {
  if (a >= b) return a;
  const fc = (m - a) / (b - a);
  return u < fc ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m));
}

export function pertSample(a: number, m: number, b: number): number {
  if (a >= b) return a;
  const mu = (a + 4 * m + b) / 6;
  const r = b - a;
  const alpha = ((mu - a) / r) * (((mu - a) * (b - mu)) / (r * r / 36 + 1e-9) - 1);
  if (alpha <= 0 || !isFinite(alpha)) return triangularFromU(Math.random(), a, m, b);
  const beta = (alpha * (b - mu)) / (mu - a);
  if (beta <= 0 || !isFinite(beta)) return triangularFromU(Math.random(), a, m, b);
  const ga = gammaSample(alpha), gb = gammaSample(beta);
  return a + (ga / (ga + gb)) * r;
}

/** Beasley-Springer-Moro rasjonell approksimasjon av invers normal-CDF. */
export function probit(p: number): number {
  p = Math.max(1e-10, Math.min(1 - 1e-10, p));
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734e0, 4.374664141464968, -1.420469056227661e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plo = 0.02425, phi_ = 1 - plo;
  let q: number;
  if (p < plo) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= phi_) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Trekker én verdi for et item/event, gitt fordelingstype. */
export function sampleValue(dist: DistType, a: number, m: number, b: number): number {
  const u = Math.random();
  switch (dist) {
    case 'triangular': return triangularFromU(u, a, m, b);
    case 'uniform': return a + u * (b - a);
    case 'normal': {
      const sigma = (b - a) / 6;
      return m + sigma * probit(u);
    }
    case 'lognormal': {
      const sigmaLn = (Math.log(Math.max(b, 1e-9)) - Math.log(Math.max(a, 1e-9))) / 3.29;
      const muLn = Math.log(Math.max(m, 1e-9));
      return Math.exp(muLn + sigmaLn * probit(u));
    }
    case 'pert':
    default:
      return pertSample(a, m, b);
  }
}

export interface SimulationResult {
  results: Float64Array;      // NPV (mode='npv') eller total (mode='single') per iterasjon
  sortedResults: Float64Array;
  irrs: Float64Array | null;  // kun mode='npv'
  irrValidCount: number;
  samples: Float64Array[];    // per item, for Spearman
}

export function runSimulation(
  items: McItem[], events: McEvent[], dist: DistType, mode: SimMode, numSims: number, years: number, rate: number
): SimulationResult {
  const results = new Float64Array(numSims);
  const irrs = mode === 'npv' ? new Float64Array(numSims) : null;
  let irrValidCount = 0;
  const samples = items.map(() => new Float64Array(numSims));

  for (let i = 0; i < numSims; i++) {
    if (mode === 'single') {
      let total = 0;
      items.forEach((it, j) => {
        const v = sampleValue(dist, it.opt, it.ml, it.pess);
        samples[j][i] = v;
        total += v;
      });
      events.forEach((ev) => {
        if (Math.random() < ev.prob) total += sampleValue(dist, ev.opt, ev.ml, ev.pess);
      });
      results[i] = total;
    } else {
      const cf = new Float64Array(years + 1);
      items.forEach((it, j) => {
        const v = sampleValue(dist, it.opt, it.ml, it.pess);
        samples[j][i] = v;
        if (it.timing === 'upfront') cf[0] += v;
        else if (it.timing === 'terminal') cf[years] += v;
        else { for (let t = 1; t <= years; t++) cf[t] += v; }
      });
      events.forEach((ev) => {
        if (Math.random() < ev.prob) {
          const v = sampleValue(dist, ev.opt, ev.ml, ev.pess);
          const y = Math.min(Math.max(0, Math.floor(ev.year)), years);
          cf[y] += v;
        }
      });
      const cfArr = Array.from(cf);
      results[i] = npvFromT0(cfArr, rate);
      const rr = irrFn(cfArr);
      if (rr !== null && isFinite(rr)) { irrs![i] = rr; irrValidCount++; } else { irrs![i] = NaN; }
    }
  }

  const sortedResults = Float64Array.from(results);
  sortedResults.sort();
  return { results, sortedResults, irrs, irrValidCount, samples };
}

/** Forventningsverdi (uten simulering) for tornado-baseline: bruker mest-sannsynlig-verdiene. */
function baseValue(items: McItem[], events: McEvent[], mode: SimMode, years: number, rate: number): number {
  if (mode === 'single') {
    return items.reduce((s, it) => s + it.ml, 0) + events.reduce((s, ev) => s + ev.prob * ev.ml, 0);
  }
  const cf = new Array(years + 1).fill(0);
  items.forEach((it) => {
    if (it.timing === 'upfront') cf[0] += it.ml;
    else if (it.timing === 'terminal') cf[years] += it.ml;
    else { for (let t = 1; t <= years; t++) cf[t] += it.ml; }
  });
  events.forEach((ev) => {
    const y = Math.min(Math.max(0, Math.floor(ev.year)), years);
    cf[y] += ev.prob * ev.ml;
  });
  return npvFromT0(cf, rate);
}

export interface TornadoRow {
  name: string;
  lo: number;
  hi: number;
  swing: number;
  base: number;
}

/** One-at-a-time tornado-sensitivitet: bytter ett item/event sin ml-verdi med opt/pess, holder resten fast. */
export function computeTornado(items: McItem[], events: McEvent[], mode: SimMode, years: number, rate: number): TornadoRow[] {
  const base = baseValue(items, events, mode, years, rate);
  const rows: TornadoRow[] = [];

  items.forEach((it, i) => {
    const withVal = (val: number) => {
      const swapped = items.map((x, j) => (j === i ? { ...x, ml: val } : x));
      return baseValue(swapped, events, mode, years, rate);
    };
    const opt = withVal(it.opt);
    const pess = withVal(it.pess);
    rows.push({ name: it.name, lo: Math.min(opt, pess), hi: Math.max(opt, pess), swing: Math.abs(opt - pess), base });
  });

  events.forEach((ev, i) => {
    const withVal = (val: number) => {
      const swapped = events.map((x, j) => (j === i ? { ...x, ml: val } : x));
      return baseValue(items, swapped, mode, years, rate);
    };
    const opt = withVal(ev.opt);
    const pess = withVal(ev.pess);
    const swing = Math.abs(opt - pess);
    if (swing > 1e-9) rows.push({ name: `${ev.name} (p=${Math.round(ev.prob * 100)}%)`, lo: Math.min(opt, pess), hi: Math.max(opt, pess), swing, base });
  });

  return rows.sort((a, b) => b.swing - a.swing).slice(0, 14);
}

function rankArray(arr: Float64Array): Float64Array {
  const n = arr.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[a] - arr[b]);
  const ranks = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && arr[idx[j]] === arr[idx[j + 1]]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k]] = r;
    i = j + 1;
  }
  return ranks;
}

function pearsonOnRanks(rx: Float64Array, ry: Float64Array): number {
  const n = rx.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += rx[i]; my += ry[i]; }
  mx /= n; my /= n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const ex = rx[i] - mx, ey = ry[i] - my;
    num += ex * ey; dx2 += ex * ex; dy2 += ey * ey;
  }
  return dx2 > 0 && dy2 > 0 ? num / Math.sqrt(dx2 * dy2) : 0;
}

export interface SpearmanRow {
  name: string;
  rs: number;
  r2: number;
  sharePct: number; // andel av forklart variansdekomponering
}

/** B3: rangerer items etter Spearman rank-korrelasjon mot simuleringsresultatet (variansdekomponering). */
export function computeSpearman(results: Float64Array, samples: Float64Array[], items: McItem[]): SpearmanRow[] {
  const ry = rankArray(results);
  const rsAll = items.map((_, j) => pearsonOnRanks(rankArray(samples[j]), ry));
  const sumR2 = rsAll.reduce((s, rs) => s + rs * rs, 0);
  const out = items.map((it, j) => {
    const rs = rsAll[j];
    const r2 = rs * rs;
    return { name: it.name, rs, r2, sharePct: sumR2 > 0 ? (r2 / sumR2) * 100 : 0 };
  });
  return out.sort((a, b) => b.r2 - a.r2);
}
