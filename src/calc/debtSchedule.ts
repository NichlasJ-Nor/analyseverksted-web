/** Gjeldsplan/amortisering — portert fra HTML-appens B7-modul. */

export type DebtType = 'annuity' | 'serial' | 'bullet';

export interface DebtScheduleRow {
  year: number;
  openingBalance: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface DebtScheduleInput {
  principal: number;   // gjeld ved oppstart (D0)
  rate: number;         // rente per år (desimal)
  years: number;         // løpetid
  type: DebtType;
  startYear?: number;    // offset for radetiketten (default 0)
}

export function computeDebtSchedule(input: DebtScheduleInput): {
  rows: DebtScheduleRow[];
  finalBalance: number;
} {
  const { principal: D0, rate, years, type, startYear = 0 } = input;
  const rows: DebtScheduleRow[] = [];
  let balance = D0;

  const annuityPayment = rate > 0
    ? (D0 * rate * Math.pow(1 + rate, years)) / (Math.pow(1 + rate, years) - 1)
    : D0 / years;

  for (let y = 1; y <= years; y++) {
    const opening = balance;
    const interest = opening * rate;
    let principalPmt: number;
    if (type === 'annuity') {
      principalPmt = annuityPayment - interest;
    } else if (type === 'serial') {
      principalPmt = D0 / years;
    } else {
      principalPmt = y === years ? D0 : 0;
    }
    principalPmt = Math.min(principalPmt, opening);
    balance = opening - principalPmt;
    rows.push({ year: startYear + y, openingBalance: opening, interest, principal: principalPmt, closingBalance: balance });
  }

  return { rows, finalBalance: balance };
}
