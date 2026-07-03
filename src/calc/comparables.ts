/** Multippel-basert verdsettelse (komparative selskaper). Portert fra HTML-appens comps-logikk. */
export interface Comp {
  name: string;
  evEbitda: number;
  evRev: number;
}

export interface CompRange {
  lo: number;
  hi: number;
}

export interface CompsResult {
  compEbitdaEq: number; // midtpunkt egenkapitalverdi via EV/EBITDA (median-multippel)
  compRevEq: number;    // midtpunkt egenkapitalverdi via EV/Omsetning (median-multippel)
  ebRange: CompRange;   // spenn basert på min/maks peer-multippel
  revRange: CompRange;
}

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function comparablesValuation(
  comps: Comp[],
  lastEbitda: number,
  lastRevenue: number,
  netDebt: number,
  minority: number,
  otherAdj: number
): CompsResult {
  const ebMultiples = comps.map((c) => c.evEbitda);
  const revMultiples = comps.map((c) => c.evRev);
  const bridge = -netDebt - minority + otherAdj;

  const medEb = median(ebMultiples);
  const medRev = median(revMultiples);

  const minEb = Math.min(...ebMultiples), maxEb = Math.max(...ebMultiples);
  const minRev = Math.min(...revMultiples), maxRev = Math.max(...revMultiples);

  return {
    compEbitdaEq: lastEbitda * medEb + bridge,
    compRevEq: lastRevenue * medRev + bridge,
    ebRange: { lo: lastEbitda * minEb + bridge, hi: lastEbitda * maxEb + bridge },
    revRange: { lo: lastRevenue * minRev + bridge, hi: lastRevenue * maxRev + bridge },
  };
}
