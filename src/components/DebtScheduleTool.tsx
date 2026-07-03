import { useState } from 'react';
import { computeDebtSchedule, type DebtType } from '../calc/debtSchedule';

export default function DebtScheduleTool({
  years, onApplyNetDebt,
}: {
  years: number;
  onApplyNetDebt: (finalBalance: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [principal, setPrincipal] = useState(100);
  const [rate, setRate] = useState(0.05);
  const [type, setType] = useState<DebtType>('annuity');
  const n = Math.min(years, 30);

  const { rows, finalBalance } = computeDebtSchedule({ principal, rate, years: n, type });

  return (
    <div className="card">
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Gjeldsplan / amortisering <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— valgfritt</span></span>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
            {(['annuity', 'serial', 'bullet'] as DebtType[]).map((t) => (
              <label key={t} style={{ fontSize: 12, display: 'flex', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={type === t} onChange={() => setType(t)} />
                {t === 'annuity' ? 'Annuitetslån' : t === 'serial' ? 'Serielån' : 'Bullet'}
              </label>
            ))}
          </div>
          <div className="settings-row" style={{ marginBottom: 14 }}>
            <div className="field"><label>Gjeld ved oppstart</label><input type="number" value={principal} onChange={(e) => setPrincipal(+e.target.value)} style={{ width: 110 }} /></div>
            <div className="field"><label>Rente (%)</label><input type="number" step="0.1" value={rate * 100} onChange={(e) => setRate(+e.target.value / 100)} style={{ width: 90 }} /></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="pl-table">
              <thead><tr><th>År</th><th>Inng. gjeld</th><th>Renter</th><th>Avdrag</th><th>Utg. gjeld</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year} className="calc-row">
                    <td style={{ color: 'var(--acc)' }}>{r.year}</td>
                    <td className="calc-value">{r.openingBalance.toFixed(1)}</td>
                    <td className="calc-value">{r.interest.toFixed(1)}</td>
                    <td className="calc-value">{r.principal.toFixed(1)}</td>
                    <td className="calc-value">{r.closingBalance.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn" style={{ color: '#a78bfa', borderColor: '#a78bfa' }}
              onClick={() => onApplyNetDebt(finalBalance)}>
              Bruk sluttsaldo ({finalBalance.toFixed(1)}) som Netto gjeld →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
