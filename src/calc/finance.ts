/**
 * Grunnleggende finansfunksjoner.
 *
 * Portert direkte fra den verifiserte HTML-appen (monte_carlo_finansiell.html).
 * Alle funksjoner er rene (ingen DOM-avhengighet) og enhetstestet i finance.test.ts.
 */

/**
 * Netto nåverdi der cashflows[0] er år 0 (ingen diskontering av første element).
 * Brukes for IRR-strømmer der indeks 0 er investeringsutlegget.
 */
export function npvFromT0(cashflows: number[], rate: number): number {
  let sum = 0;
  for (let t = 0; t < cashflows.length; t++) {
    sum += cashflows[t] / Math.pow(1 + rate, t);
  }
  return sum;
}

/**
 * Netto nåverdi med investering i0 i dag (år 0, udiskontert) og
 * kontantstrømmer i årene 1..n (diskontert). Dette er varianten som brukes
 * i Investeringsanalyse og Portefølje.
 */
export function npv(i0: number, cashflows: number[], rate: number): number {
  return cashflows.reduce(
    (sum, cf, t) => sum + cf / Math.pow(1 + rate, t + 1),
    -i0
  );
}

/**
 * Internrente (IRR) via Newton-Raphson med bisection som reserveløsning.
 * Returnerer null hvis ingen løsning finnes (f.eks. bare positive/negative strømmer).
 * cashflows[0] er år 0.
 */
export function irr(cashflows: number[]): number | null {
  // Newton-Raphson
  let r = 0.1;
  for (let i = 0; i < 60; i++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const d = Math.pow(1 + r, t);
      f += cashflows[t] / d;
      df -= (t * cashflows[t]) / (d * (1 + r));
    }
    if (Math.abs(df) < 1e-12) break;
    const dr = f / df;
    r -= dr;
    if (!isFinite(r) || r <= -0.99) {
      r = 0.1;
      break;
    }
    if (Math.abs(dr) < 1e-7) return r;
  }
  // Bisection-reserveløsning
  let lo = -0.9;
  let hi = 5;
  let flo = npvFromT0(cashflows, lo);
  const fhi = npvFromT0(cashflows, hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const fm = npvFromT0(cashflows, mid);
    if (fm * flo < 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fm;
    }
    if (hi - lo < 1e-6) return (lo + hi) / 2;
  }
  return null;
}

/**
 * Tilbakebetalingstid (udiskontert) med lineær interpolasjon innen året
 * der akkumulert kontantstrøm krysser null. Returnerer null hvis den
 * aldri betaler seg tilbake innen horisonten.
 */
export function payback(i0: number, cashflows: number[]): number | null {
  let cum = -i0;
  for (let t = 0; t < cashflows.length; t++) {
    const prev = cum;
    cum += cashflows[t];
    if (cum >= 0 && prev < 0) return t + -prev / cashflows[t];
  }
  return null;
}

/**
 * Persentil via lineær interpolasjon. `sorted` må være stigende sortert.
 * p er i intervallet 0–100.
 */
export function percentile(sorted: number[], p: number): number {
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** Aritmetisk gjennomsnitt. */
export function mean(values: number[]): number {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return s / values.length;
}
