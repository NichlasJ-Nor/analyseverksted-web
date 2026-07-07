import { useState } from 'react';
import {
  parseHistoricalPaste, computeHistoricalStats, projectRevenueFromHistory, type HistoricalRow,
} from '../calc/historicalImport';

export default function HistoricalImportTool({ years, onApplyRevenue }: { years: number; onApplyRevenue: (vals: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<HistoricalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function analyze() {
    setError(null);
    const parsed = parseHistoricalPaste(raw);
    if (parsed.length < 2) {
      setError('Trenger minst 2 dataår. Sjekk at dataene er tabulatorseparert (kopiert fra Excel).');
      setRows(null);
      return;
    }
    setRows(parsed);
  }

  const stats = rows ? computeHistoricalStats(rows) : null;

  function applyToDcf() {
    if (!rows || !stats) return;
    const lastRev = rows[rows.length - 1].rev;
    const projected = projectRevenueFromHistory(lastRev, stats.revCagr, years);
    onApplyRevenue(projected);
  }

  return (
    <div className="card">
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Historisk regnskap-import <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— valgfritt</span></span>
      </div>
      {open && (
        <>
          <p style={{ fontSize: 12, color: 'var(--t-mid)', marginBottom: 10 }}>
            Lim inn historiske regnskapsdata fra Excel (tab-separert). Første kolonne er år, deretter Omsetning, EBITDA, EBIT, Nettoresultat (de tre siste er valgfrie).
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'År\tOmsetning\tEBITDA\tEBIT\tNettoresultat\n2021\t200\t30\t20\t15\n2022\t220\t35\t24\t18\n2023\t250\t40\t28\t20'}
            style={{ width: '100%', minHeight: 90, fontFamily: 'monospace', fontSize: 12, background: '#182828', border: '1px solid #2e4444', borderRadius: 6, color: 'var(--t-body)', padding: 8 }}
          />
          <button className="btn" style={{ marginTop: 8 }} onClick={analyze}>Analyser historisk data</button>

          {error && <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 8 }}>{error}</p>}

          {rows && stats && (
            <>
              <div style={{ overflowX: 'auto', marginTop: 14 }}>
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>År</th><th>Omsetning</th><th>Vekst</th>
                      {rows[0].ebitda !== null && <><th>EBITDA</th><th>EBITDA-%</th></>}
                      {rows[0].ebit !== null && <><th>EBIT</th><th>EBIT-%</th></>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const growth = i === 0 ? null : r.rev / rows[i - 1].rev - 1;
                      return (
                        <tr key={i} className="calc-row">
                          <td style={{ fontWeight: 600 }}>{r.year}</td>
                          <td className="calc-value">{r.rev.toFixed(1)}</td>
                          <td className="calc-value" style={{ color: growth === null ? 'var(--t-mid)' : growth >= 0 ? 'var(--acc)' : 'var(--neg)' }}>
                            {growth === null ? '—' : (growth * 100).toFixed(1) + '%'}
                          </td>
                          {r.ebitda !== null && <><td className="calc-value">{r.ebitda.toFixed(1)}</td><td className="calc-value">{((r.ebitda / r.rev) * 100).toFixed(1)}%</td></>}
                          {r.ebit !== null && <><td className="calc-value">{r.ebit.toFixed(1)}</td><td className="calc-value">{((r.ebit / r.rev) * 100).toFixed(1)}%</td></>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ background: '#1a2e2e', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--t-mid)' }}>Omsetning CAGR</div>
                  <div style={{ color: 'var(--acc)', fontWeight: 700, fontSize: 15 }}>{(stats.revCagr * 100).toFixed(1)}%</div>
                </div>
                {stats.avgEbitdaMargin !== null && (
                  <div style={{ background: '#1a2e2e', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--t-mid)' }}>Snitt EBITDA-margin</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{(stats.avgEbitdaMargin * 100).toFixed(1)}%</div>
                  </div>
                )}
                {stats.avgEbitMargin !== null && (
                  <div style={{ background: '#1a2e2e', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--t-mid)' }}>Snitt EBIT-margin</div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{(stats.avgEbitMargin * 100).toFixed(1)}%</div>
                  </div>
                )}
                <div style={{ background: '#1a2e2e', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--t-mid)' }}>Historiske år</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{stats.years}</div>
                </div>
              </div>

              <button className="btn" style={{ color: 'var(--acc)', borderColor: 'var(--acc)', marginTop: 12 }} onClick={applyToDcf}>
                Overfør CAGR-projeksjon til P&L →
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
