import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import '../lib/chartSetup';
import { useScenarioStore } from '../store/scenarioStore';
import { computeScenario, type ScenarioResult } from '../calc/scenario';
import type { TerminalMethod } from '../calc/dcf';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

const COLORS = { bear: '#e05a52', base: '#52ebb0', bull: '#e6a817' } as const;
const IDS = ['bear', 'base', 'bull'] as const;

export default function ScenarioPage() {
  const s = useScenarioStore();
  const nYears = s.base.fcfs.length;

  const { results, error } = useMemo<{ results: Record<'bear' | 'base' | 'bull', ScenarioResult> | null; error: string | null }>(() => {
    try {
      const globals = { netDebt: s.netDebt, shares: s.shares, tvMethod: s.tvMethod, exitMultiple: s.exitMultiple };
      return {
        results: {
          bear: computeScenario(s.bear, globals),
          base: computeScenario(s.base, globals),
          bull: computeScenario(s.bull, globals),
        },
        error: null,
      };
    } catch (e) {
      return { results: null, error: e instanceof Error ? e.message : 'Ukjent feil' };
    }
  }, [s.bear, s.base, s.bull, s.netDebt, s.shares, s.tvMethod, s.exitMultiple]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="card">
        <div className="card-title">Scenarioanalyse — Bear / Base / Bull</div>
        <div className="settings-row" style={{ marginBottom: 14 }}>
          <div className="field"><label>Valuta</label><input value={s.currency} onChange={(e) => s.setCurrency(e.target.value)} style={{ width: 80 }} /></div>
          <div className="field"><label>Netto gjeld</label><input type="number" value={s.netDebt} onChange={(e) => s.setNetDebt(+e.target.value)} style={{ width: 90 }} /></div>
          <div className="field"><label>Antall aksjer (tusen)</label><input type="number" value={s.shares} onChange={(e) => s.setShares(+e.target.value)} style={{ width: 90 }} /></div>
          <div className="field"><label>Terminalverdi-metode</label>
            <select value={s.tvMethod} onChange={(e) => s.setTvMethod(e.target.value as TerminalMethod)}>
              <option value="gordon">Gordon-vekst</option>
              <option value="exit">Exit-multiple</option>
            </select>
          </div>
          {s.tvMethod === 'exit' && (
            <div className="field"><label>Exit-multiple</label><input type="number" step="0.5" value={s.exitMultiple} onChange={(e) => s.setExitMultiple(+e.target.value)} style={{ width: 70 }} /></div>
          )}
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn" onClick={s.addYear}>+ År</button>
            <button className="btn" style={{ marginLeft: 6 }} onClick={s.removeYear}>− År</button>
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn" style={{ color: 'var(--acc)', borderColor: 'var(--acc)' }} onClick={s.syncFromBase}>
              ↙ Generer Bear/Bull fra Base
            </button>
          </div>
        </div>

        {IDS.map((id) => (
          <div key={id} style={{ marginBottom: 16, borderLeft: `3px solid ${COLORS[id]}`, paddingLeft: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 8, flexWrap: 'wrap' }}>
              <input value={s[id].name} onChange={(e) => s.setScenarioField(id, 'name', e.target.value)}
                style={{ fontSize: 15, fontWeight: 700, color: COLORS[id], background: 'transparent', border: 'none', borderBottom: '1px solid #3a5555', width: 120 }} />
              <div className="field"><label>WACC (%)</label><input type="number" step="0.1" value={(s[id].wacc * 100).toFixed(1)} onChange={(e) => s.setScenarioField(id, 'wacc', +e.target.value / 100)} style={{ width: 80 }} /></div>
              <div className="field"><label>Terminal g (%)</label><input type="number" step="0.1" value={(s[id].g * 100).toFixed(1)} onChange={(e) => s.setScenarioField(id, 'g', +e.target.value / 100)} style={{ width: 80 }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: nYears }, (_, yi) => (
                <div key={yi} className="field">
                  <label style={{ fontSize: 10 }}>År {yi + 1}</label>
                  <input type="number" step="0.1" value={s[id].fcfs[yi] ?? 0} onChange={(e) => s.setScenarioFcf(id, yi, +e.target.value)} style={{ width: 70 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>{error}</div>
      )}

      {results && (
        <>
          <div className="stats-row">
            {IDS.map((id) => {
              const r = results[id];
              return (
                <div key={id} className="stat" style={{ borderTop: `3px solid ${COLORS[id]}` }}>
                  <div className="lbl" style={{ color: COLORS[id], fontWeight: 700, letterSpacing: '.05em' }}>{r.name.toUpperCase()}</div>
                  <div className="val" style={{ color: COLORS[id] }}>{fmt(r.ev, s.currency)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-mid)', marginTop: 6 }}>Egenkapital</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(r.equity, s.currency)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-mid)', marginTop: 4 }}>Per aksje</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-body)' }}>{fmt(r.perShare, s.currency.replace('M', ''))}</div>
                  <div style={{ fontSize: 10, color: 'var(--t-mid)', marginTop: 6 }}>TV: {r.tvPct.toFixed(0)}% av EV | WACC {(r.wacc * 100).toFixed(1)}% | g {(r.g * 100).toFixed(1)}%</div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="card-title">Enterprise Value per scenario</div>
            <div style={{ height: 220 }}>
              <Bar
                data={{
                  labels: IDS.map((id) => results[id].name),
                  datasets: [{
                    data: IDS.map((id) => results[id].ev),
                    backgroundColor: IDS.map((id) => COLORS[id] + 'cc'),
                    borderColor: IDS.map((id) => COLORS[id]),
                    borderWidth: 2,
                    borderRadius: 6,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#c8e6e6', font: { weight: 600 } }, grid: { display: false } },
                    y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Dekomponering: PV FCF vs. PV terminalverdi</div>
            <div style={{ height: 220 }}>
              <Bar
                data={{
                  labels: IDS.map((id) => results[id].name),
                  datasets: [
                    { label: 'PV prognoseFCF', data: IDS.map((id) => results[id].pvFcf), backgroundColor: 'rgba(82,235,176,.6)', borderRadius: 4 },
                    { label: 'PV terminalverdi', data: IDS.map((id) => results[id].pvTv), backgroundColor: 'rgba(230,168,23,.6)', borderRadius: 4 },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'top', labels: { color: '#c8e6e6' } } },
                  scales: {
                    x: { stacked: true, ticks: { color: '#c8e6e6' }, grid: { display: false } },
                    y: { stacked: true, ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Sammendrag</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="pl-table">
                <thead><tr><th>Metrikk</th>{IDS.map((id) => <th key={id} style={{ color: COLORS[id] }}>{results[id].name}</th>)}</tr></thead>
                <tbody>
                  <tr className="calc-row"><td>Enterprise Value</td>{IDS.map((id) => <td key={id} className="calc-value" style={{ fontWeight: 700 }}>{fmt(results[id].ev, s.currency)}</td>)}</tr>
                  <tr className="calc-row"><td>PV prognoseFCF</td>{IDS.map((id) => <td key={id} className="calc-value">{fmt(results[id].pvFcf, s.currency)}</td>)}</tr>
                  <tr className="calc-row"><td>PV terminalverdi</td>{IDS.map((id) => <td key={id} className="calc-value">{fmt(results[id].pvTv, s.currency)}</td>)}</tr>
                  <tr className="calc-row"><td>TV-andel av EV</td>{IDS.map((id) => <td key={id} className="calc-value">{results[id].tvPct.toFixed(1)}%</td>)}</tr>
                  <tr className="calc-row"><td>Egenkapitalverdi</td>{IDS.map((id) => <td key={id} className="calc-value" style={{ fontWeight: 700 }}>{fmt(results[id].equity, s.currency)}</td>)}</tr>
                  <tr className="calc-row"><td>Verdi per aksje</td>{IDS.map((id) => <td key={id} className="calc-value">{fmt(results[id].perShare, s.currency.replace('M', ''))}</td>)}</tr>
                  <tr className="calc-row"><td>WACC</td>{IDS.map((id) => <td key={id} className="calc-value">{(results[id].wacc * 100).toFixed(1)}%</td>)}</tr>
                  <tr className="calc-row"><td>Terminal vekst (g)</td>{IDS.map((id) => <td key={id} className="calc-value">{(results[id].g * 100).toFixed(1)}%</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
