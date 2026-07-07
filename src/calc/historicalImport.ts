/**
 * D1: Historisk regnskap-import. Portert fra HTML-appens parseHistoricalData()/applyHistoricalToDCF().
 */
export interface HistoricalRow {
  year: number;
  rev: number;
  ebitda: number | null;
  ebit: number | null;
  ni: number | null;
}

/** Parser tab-separert innliming (fra Excel): År, Omsetning, [EBITDA], [EBIT], [Nettoresultat]. */
export function parseHistoricalPaste(raw: string): HistoricalRow[] {
  const lines = raw.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const firstCells = lines[0].split('\t');
  const hasHeader = isNaN(+firstCells[0]);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: HistoricalRow[] = dataLines.map((l) => {
    const c = l.split('\t').map((v) => v.replace(/[^\d.,-]/g, '').replace(',', '.'));
    return {
      year: +c[0] || 0,
      rev: +c[1] || 0,
      ebitda: c[2] !== undefined && c[2] !== '' ? +c[2] || null : null,
      ebit: c[3] !== undefined && c[3] !== '' ? +c[3] || null : null,
      ni: c[4] !== undefined && c[4] !== '' ? +c[4] || null : null,
    };
  }).filter((r) => r.year > 0);

  return rows;
}

export interface HistoricalStats {
  revCagr: number;           // desimal
  avgEbitdaMargin: number | null; // desimal
  avgEbitMargin: number | null;
  years: number;
}

export function computeHistoricalStats(rows: HistoricalRow[]): HistoricalStats {
  const n = rows.length;
  const revCagr = n >= 2 && rows[0].rev > 0 ? Math.pow(rows[n - 1].rev / rows[0].rev, 1 / (n - 1)) - 1 : 0;

  const ebitdaRows = rows.filter((r) => r.ebitda !== null && r.rev);
  const avgEbitdaMargin = ebitdaRows.length
    ? ebitdaRows.reduce((s, r) => s + r.ebitda! / r.rev, 0) / ebitdaRows.length
    : null;

  const ebitRows = rows.filter((r) => r.ebit !== null && r.rev);
  const avgEbitMargin = ebitRows.length
    ? ebitRows.reduce((s, r) => s + r.ebit! / r.rev, 0) / ebitRows.length
    : null;

  return { revCagr, avgEbitdaMargin, avgEbitMargin, years: n };
}

/** Projiserer omsetning for `years` fremtidige år fra siste historiske år, med konstant CAGR. */
export function projectRevenueFromHistory(lastRev: number, revCagr: number, years: number): number[] {
  const out: number[] = [];
  let rev = lastRev;
  for (let t = 0; t < years; t++) {
    rev = rev * (1 + revCagr);
    out.push(rev);
  }
  return out;
}
