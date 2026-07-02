/**
 * Resultatregnskap → Fri kontantstrøm (FCF).
 * Portert fra recalcPL() i den verifiserte HTML-appen.
 */

export interface PLYearInput {
  rev: number;    // Omsetning
  cogs: number;   // Varekostnad (negativt tall)
  opex: number;   // Faste driftskostnader (negativt tall)
  da: number;     // Avskrivninger (negativt tall)
  capex: number;  // CapEx (negativt tall)
  dwc: number;    // Δ Arbeidskapital (negativt = kapital bindes)
}

export interface PLYearResult extends PLYearInput {
  gross: number;      // Bruttofortjeneste
  ebitda: number;
  ebitdaPct: number;
  ebit: number;
  tax: number;
  nopat: number;
  fcf: number;
}

/**
 * Beregner én rad i P&L-tabellen. taxRate er desimal (0.22 = 22%).
 * carryLoss er fremført underskudd fra tidligere år (0 hvis ikke i bruk);
 * returnerer oppdatert carryLoss slik at neste år kan bruke den.
 */
export function calcPLYear(
  input: PLYearInput,
  taxRate: number,
  carryLoss = 0,
  useCarryforward = false
): { result: PLYearResult; carryLoss: number } {
  const { rev, cogs, opex, da, capex, dwc } = input;
  const gross = rev + cogs;
  const ebitda = gross + opex;
  const ebitdaPct = rev !== 0 ? (ebitda / rev) * 100 : 0;
  const ebit = ebitda + da;

  let taxableEbit = ebit;
  let newCarryLoss = carryLoss;
  if (useCarryforward) {
    if (ebit < 0) {
      newCarryLoss += -ebit;
    } else {
      const used = Math.min(newCarryLoss, ebit);
      newCarryLoss -= used;
      taxableEbit = ebit - used;
    }
  }
  const tax = taxableEbit > 0 ? -taxableEbit * taxRate : 0;
  const nopat = ebit + tax;
  const fcf = nopat + -da + capex + dwc;

  return {
    result: { ...input, gross, ebitda, ebitdaPct, ebit, tax, nopat, fcf },
    carryLoss: newCarryLoss,
  };
}

/** Beregner alle år i P&L-tabellen sekvensielt (for skattefremføring). */
export function calcPLYears(
  years: PLYearInput[],
  taxRate: number,
  useCarryforward = false
): PLYearResult[] {
  let carryLoss = 0;
  return years.map((y) => {
    const { result, carryLoss: next } = calcPLYear(y, taxRate, carryLoss, useCarryforward);
    carryLoss = next;
    return result;
  });
}
