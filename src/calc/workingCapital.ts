/** Arbeidskapital-modeller — portert fra HTML-appens B6-modul. */

/** ΔWC som % av omsetningsvekst. Positiv vekst → negativ ΔWC (kapital bindes). */
export function wcFromPercent(revenues: number[], pct: number): number[] {
  return revenues.map((rev, i) => (i === 0 ? 0 : -pct * (rev - revenues[i - 1])));
}

export interface DsoInputs {
  dso: number; // dager utestående (kundefordringer)
  dpo: number; // dager leverandørgjeld
  dio: number; // dager varelager
}

/** ΔWC fra DSO/DPO/DIO. cogs oppgis som positive tall (absoluttverdi). */
export function wcFromDso(
  revenues: number[],
  cogsAbs: number[],
  { dso, dpo, dio }: DsoInputs
): { nwc: number[]; dwc: number[] } {
  const nwc = revenues.map((rev, i) => (dso * rev) / 365 + (dio * cogsAbs[i]) / 365 - (dpo * cogsAbs[i]) / 365);
  const dwc = nwc.map((v, i) => (i === 0 ? 0 : -(v - nwc[i - 1])));
  return { nwc, dwc };
}

export interface WcDetailLine {
  name: string;
  sign: 1 | -1; // 1 = eiendel (kundefordringer/varelager), -1 = gjeld (leverandørgjeld)
  vals: number[];
}

/** ΔWC fra manuelt innlagte balanseposter. */
export function wcFromDetail(lines: WcDetailLine[], years: number): { nwc: number[]; dwc: number[] } {
  const nwc = Array.from({ length: years }, (_, i) =>
    lines.reduce((sum, l) => sum + l.sign * (l.vals[i] || 0), 0)
  );
  const dwc = nwc.map((v, i) => (i === 0 ? 0 : -(v - nwc[i - 1])));
  return { nwc, dwc };
}
