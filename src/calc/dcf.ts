/**
 * WACC og DCF-verdsettelse.
 * Portert fra den verifiserte HTML-appen, inkludert feilrettingen der
 * implisitt IRR nå bruker faktisk kjøpspris (I₀) i stedet for EV.
 */
import { irr } from './finance';

export interface WaccInput {
  rf: number;    // risikofri rente (desimal, f.eks. 0.04)
  erp: number;   // aksjepremie (desimal)
  beta: number;
  kd: number;    // gjeldskostnad før skatt (desimal)
  debtWeight: number; // gjeldsandel (desimal, 0–1)
  tax: number;   // skattesats (desimal)
}

export interface WaccResult {
  ke: number;    // egenkapitalkostnad
  kdAfterTax: number; // gjeldskostnad etter skatt
  wacc: number;
}

/** WACC via CAPM for egenkapital + vektet snitt med gjeld etter skatt. */
export function wacc(input: WaccInput): WaccResult {
  const equityWeight = 1 - input.debtWeight;
  const ke = input.rf + input.beta * input.erp;
  const kdAfterTax = input.kd * (1 - input.tax);
  const w = ke * equityWeight + kdAfterTax * input.debtWeight;
  return { ke, kdAfterTax, wacc: w };
}

export type TerminalMethod = 'gordon' | 'exit';

export interface DcfInput {
  fcf: number[];          // fri kontantstrøm for årene 1..n
  wacc: number;           // desimal
  g: number;              // terminal vekstrate (desimal)
  terminalMethod: TerminalMethod;
  exitMultiple?: number;  // brukt ved 'exit'
  lastEbitda?: number;    // brukt ved 'exit'
  netDebt?: number;
  minority?: number;
  otherAdj?: number;
  i0?: number;            // kjøpspris; 0 = ingen (EV blir da intrinsisk verdi)
}

export interface DcfResult {
  pvFcf: number;
  terminalValue: number;
  pvTerminal: number;
  ev: number;
  equity: number;
  tvPctOfEv: number;
  npv: number;            // EV − I₀
  irr: number | null;     // basert på I₀ (eller EV hvis I₀ = 0)
}

/**
 * Full DCF-verdsettelse. Kaster feil hvis Gordon-vekst brukes med g ≥ WACC
 * (da divergerer terminalverdien).
 */
export function dcf(input: DcfInput): DcfResult {
  const {
    fcf, wacc: w, g, terminalMethod,
    exitMultiple = 8, lastEbitda = 0,
    netDebt = 0, minority = 0, otherAdj = 0, i0 = 0,
  } = input;

  if (fcf.length < 1) throw new Error('Trenger minst ett prognoseår med FCF.');

  const n = fcf.length;
  let pvFcf = 0;
  for (let i = 0; i < n; i++) {
    pvFcf += fcf[i] / Math.pow(1 + w, i + 1);
  }

  let terminalValue: number;
  if (terminalMethod === 'exit') {
    terminalValue = lastEbitda * exitMultiple;
  } else {
    if (w <= g) throw new Error('WACC må være høyere enn terminal vekstrate (g).');
    terminalValue = (fcf[n - 1] * (1 + g)) / (w - g);
  }
  const pvTerminal = terminalValue / Math.pow(1 + w, n);

  const ev = pvFcf + pvTerminal;
  const equity = ev - netDebt - minority + otherAdj;
  const tvPctOfEv = ev !== 0 ? (pvTerminal / ev) * 100 : 0;
  const npv = ev - i0;

  // IRR: bruk faktisk kjøpspris (I₀) som utlegg. Faller tilbake til EV kun
  // når I₀ ikke er satt (da blir IRR ≈ WACC per definisjon).
  const outflow = i0 > 0 ? i0 : ev;
  const irrCashflows = [
    -outflow,
    ...fcf.map((cf, i) => (i === n - 1 ? cf + terminalValue : cf)),
  ];

  return {
    pvFcf, terminalValue, pvTerminal, ev, equity, tvPctOfEv, npv,
    irr: irr(irrCashflows),
  };
}
