import { useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import '../lib/chartSetup';
import { usePortfolioStore } from '../store/portfolioStore';
import {
  evaluatePfProject, checkDependencies, summarizePortfolio, portfolioRateSensitivity,
  capmRanking, budgetOptimisation,
} from '../calc/portfolio';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

const COLORS = ['#52ebb0', '#e6a817', '#5c8a8a', '#e05a52', '#a78bfa', '#3cb4c8', '#c86432', '#64c864'];

export default function PortfolioPage() {
  const s = usePortfolioStore();
  const nYears = s.projects[0]?.cfs.length ?? 0;

  const withRate = useMemo(
    () => s.projects.map((p) => ({ ...p, rate: p.rate || s.globalRate })),
    [s.projects, s.globalRate]
  );
  const active = useMemo(() => withRate.filter((p) => p.active), [withRate]);
  const results = useMemo(() => active.map(evaluatePfProject), [active]);
  const summary = useMemo(() => summarizePortfolio(results), [results]);
  const warnings = useMemo(() => checkDependencies(active, withRate), [active, withRate]);
  const sensRows = useMemo(() => portfolioRateSensitivity(results, s.globalRate), [results, s.globalRate]);
  const capmRanked = useMemo(() => capmRanking(results, s.rf, s.erp), [results, s.rf, s.erp]);
  const budgetResult = useMemo(
    () => (s.budget > 0 ? budgetOptimisation(results, s.budget) : null),
    [results, s.budget]
  );
  const maxYears = Math.max(...active.map((p) => p.cfs.length), 0);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="card">
        <div className="card-title">Prosjektportefølje</div>
        <div className="settings-row" style={{ marginBottom: 14 }}>
          <div className="field"><label>Avkastningskrav, standard (%)</label>
            <input type="number" step="0.1" value={s.globalRate * 100} onChange={(e) => s.setGlobalRate(+e.target.value / 100)} style={{ width: 90 }} />
          </div>
          <div className="field"><label>Valuta</label>
            <input value={s.currency} onChange={(e) => s.setCurrency(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field"><label>Budsjettramme (0 = av)</label>
            <input type="number" value={s.budget} onChange={(e) => s.setBudget(+e.target.value)} style={{ width: 100 }} />
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn" onClick={s.addYear}>+ År</button>
            <button className="btn" style={{ marginLeft: 6 }} onClick={s.removeYear}>− År</button>
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn" onClick={s.addProject}>+ Prosjekt</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead>
              <tr>
                <th>Aktiv</th><th>Prosjekt</th><th>Kategori</th><th>I₀</th><th>Krav (%)</th><th>β</th>
                {Array.from({ length: nYears }, (_, i) => <th key={i}>År {i + 1}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.projects.map((p) => (
                <tr key={p.id} className="calc-row" style={!p.active ? { opacity: 0.45 } : {}}>
                  <td><input type="checkbox" checked={p.active} onChange={() => s.toggleActive(p.id)} /></td>
                  <td><input value={p.name} onChange={(e) => s.setProjectField(p.id, 'name', e.target.value)} style={{ width: 120 }} /></td>
                  <td><input value={p.cat} onChange={(e) => s.setProjectField(p.id, 'cat', e.target.value)} style={{ width: 90 }} /></td>
                  <td><input type="number" value={p.i0} onChange={(e) => s.setProjectField(p.id, 'i0', +e.target.value)} style={{ width: 70 }} /></td>
                  <td><input type="number" step="0.1" value={(p.rate * 100).toFixed(1)} onChange={(e) => s.setProjectField(p.id, 'rate', +e.target.value / 100)} style={{ width: 60 }} /></td>
                  <td><input type="number" step="0.1" value={p.beta} onChange={(e) => s.setProjectField(p.id, 'beta', +e.target.value)} style={{ width: 55 }} /></td>
                  {p.cfs.map((cf, yi) => (
                    <td key={yi}><input type="number" value={cf} onChange={(e) => s.setCf(p.id, yi, +e.target.value)} style={{ width: 65 }} /></td>
                  ))}
                  <td>
                    {s.projects.length > 1 && (
                      <button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }} onClick={() => s.removeProject(p.id)}>Fjern</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: 'var(--t-mid)', marginTop: 10 }}>
          β brukes kun i CAPM-rangeringen nedenfor. Avhengigheter og eksklusjonsgrupper settes ikke i tabellen ennå — kommer i en senere iterasjon.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--warn)', background: '#2a1e00' }}>
          <b style={{ color: 'var(--warn)' }}>⚠ Avhengighetsadvarsler</b>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, fontSize: 13 }}>
            {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
          </ul>
        </div>
      )}

      <div className="stats-row">
        <div className={`stat ${summary.totalNPV > 0 ? 'accent' : 'neg'}`}>
          <div className="lbl">Total portefølje-NPV</div>
          <div className="val">{fmt(summary.totalNPV, s.currency)}</div>
        </div>
        <div className="stat">
          <div className="lbl">Totalt investert (I₀)</div>
          <div className="val">{fmt(summary.totalI0, s.currency)}</div>
        </div>
        <div className="stat accent">
          <div className="lbl">Lønnsomme prosjekter</div>
          <div className="val">{summary.profitableCount} / {results.length}</div>
        </div>
        <div className="stat">
          <div className="lbl">Beste prosjekt</div>
          <div className="val">{summary.ranked[0]?.name ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Rangering</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Rang</th><th>Prosjekt</th><th>Kategori</th><th>I₀</th><th>NPV</th><th>IRR</th><th>Payback</th><th>Status</th></tr></thead>
            <tbody>
              {summary.ranked.map((r, i) => (
                <tr key={r.id} className="calc-row" style={i === 0 ? { background: '#1a3333' } : {}}>
                  <td>#{i + 1}</td>
                  <td style={{ fontWeight: i === 0 ? 700 : 400 }}>{r.name}</td>
                  <td>{r.cat}</td>
                  <td className="calc-value">{fmt(r.i0, s.currency)}</td>
                  <td className="calc-value" style={{ color: r.npv > 0 ? 'var(--acc)' : 'var(--neg)', fontWeight: 700 }}>{fmt(r.npv, s.currency)}</td>
                  <td className="calc-value">{r.irr !== null ? (r.irr * 100).toFixed(1) + '%' : '—'}</td>
                  <td className="calc-value">{r.payback !== null ? r.payback.toFixed(1) + ' år' : '> horisont'}</td>
                  <td style={{ color: r.npv > 0 ? 'var(--acc)' : 'var(--neg)' }}>{r.npv > 0 ? '✓ Lønnsom' : '✗ Ulønnsom'}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #3a5555', fontWeight: 700 }}>
                <td colSpan={3}>TOTAL PORTEFØLJE</td>
                <td className="calc-value">{fmt(summary.totalI0, s.currency)}</td>
                <td className="calc-value" style={{ color: summary.totalNPV > 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(summary.totalNPV, s.currency)}</td>
                <td colSpan={3}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">NPV per prosjekt</div>
        <div style={{ height: 220 }}>
          <Bar
            data={{
              labels: summary.ranked.map((r) => r.name),
              datasets: [{
                data: summary.ranked.map((r) => r.npv),
                backgroundColor: summary.ranked.map((r, i) => (r.npv >= 0 ? COLORS[i % COLORS.length] : 'rgba(224,90,82,0.7)')),
                borderRadius: 4,
              }],
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
              },
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Stablet FCF per prosjekt per år</div>
        <div style={{ height: 240 }}>
          <Bar
            data={{
              labels: Array.from({ length: maxYears }, (_, i) => `År ${i + 1}`),
              datasets: results.map((r, i) => ({
                label: r.name,
                data: Array.from({ length: maxYears }, (_, t) => (t < r.cfs.length ? r.cfs[t] : 0)),
                backgroundColor: COLORS[i % COLORS.length],
                borderRadius: 2,
              })),
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { position: 'top', labels: { color: '#c8e6e6' } } },
              scales: {
                x: { stacked: true, ticks: { color: '#8aafaf' }, grid: { display: false } },
                y: { stacked: true, ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
              },
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Akkumulert portefølje-kontantstrøm</div>
        <div style={{ height: 220 }}>
          <Line
            data={{
              labels: ['År 0', ...Array.from({ length: maxYears }, (_, i) => `År ${i + 1}`)],
              datasets: [{
                label: 'Akkumulert FCF',
                data: [-summary.totalI0, ...Array.from({ length: maxYears }, (_, t) => {
                  let sum = -summary.totalI0;
                  for (let i = 0; i <= t; i++) results.forEach((r) => { if (i < r.cfs.length) sum += r.cfs[i]; });
                  return sum;
                })],
                borderColor: '#52ebb0',
                backgroundColor: 'rgba(82,235,176,.1)',
                fill: true,
                tension: 0.3,
              }],
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#8aafaf' }, grid: { display: false } },
                y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
              },
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Sensitivitet — avkastningskrav</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Krav</th>{results.map((r) => <th key={r.id}>{r.name}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {sensRows.map((row, ri) => {
                const isBasis = Math.abs(row.rate - s.globalRate) < 1e-9;
                return (
                  <tr key={ri} className="calc-row" style={isBasis ? { background: '#1a3333' } : {}}>
                    <td>{isBasis ? '▶ ' : ''}{(row.rate * 100).toFixed(1)}%</td>
                    {row.npvByProject.map((v, i) => (
                      <td key={i} className="calc-value" style={{ color: v > 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(v, s.currency)}</td>
                    ))}
                    <td className="calc-value" style={{ fontWeight: 700, color: row.total > 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(row.total, s.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Risikojustert rangering (CAPM)</div>
        <div className="settings-row" style={{ marginBottom: 12 }}>
          <div className="field"><label>Risikofri rente (%)</label><input type="number" step="0.1" value={s.rf * 100} onChange={(e) => s.setRf(+e.target.value / 100)} style={{ width: 80 }} /></div>
          <div className="field"><label>Aksjepremie / ERP (%)</label><input type="number" step="0.1" value={s.erp * 100} onChange={(e) => s.setErp(+e.target.value / 100)} style={{ width: 80 }} /></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Prosjekt</th><th>β</th><th>CAPM-rente</th><th>NPV (std.)</th><th>NPV (CAPM)</th><th>Std. rang</th><th>CAPM rang</th><th>Endring</th></tr></thead>
            <tbody>
              {capmRanked.map((r) => {
                const delta = r.stdRank - r.capmRank;
                return (
                  <tr key={r.id} className="calc-row">
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="calc-value">{r.beta.toFixed(2)}</td>
                    <td className="calc-value">{(r.capmRate * 100).toFixed(1)}%</td>
                    <td className="calc-value" style={{ color: r.npv >= 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(r.npv, s.currency)}</td>
                    <td className="calc-value" style={{ color: r.capmNPV >= 0 ? 'var(--acc)' : 'var(--neg)', fontWeight: 600 }}>{fmt(r.capmNPV, s.currency)}</td>
                    <td className="calc-value">#{r.stdRank}</td>
                    <td className="calc-value">#{r.capmRank}</td>
                    <td className="calc-value" style={{ color: delta > 0 ? 'var(--acc)' : delta < 0 ? 'var(--neg)' : 'var(--t-mid)' }}>
                      {delta === 0 ? '—' : delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {budgetResult && (
        <div className="card" style={{ borderLeft: '3px solid #a78bfa' }}>
          <div className="card-title" style={{ color: '#a78bfa' }}>Budsjettoptimalisering (knapsack)</div>
          <p style={{ fontSize: 12, color: 'var(--t-mid)', marginBottom: 10 }}>
            Budsjett: {fmt(s.budget, s.currency)} · Metode: {budgetResult.method === 'exact' ? 'eksakt (uttømmende søk)' : 'approksimert (PI-rangering)'}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="pl-table">
              <thead><tr><th>Prosjekt</th><th>I₀</th><th>NPV</th><th>IRR</th></tr></thead>
              <tbody>
                {budgetResult.selected.map((p) => (
                  <tr key={p.id} className="calc-row">
                    <td style={{ color: 'var(--acc)', fontWeight: 600 }}>✓ {p.name}</td>
                    <td className="calc-value">{fmt(p.i0, s.currency)}</td>
                    <td className="calc-value" style={{ color: p.npv >= 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(p.npv, s.currency)}</td>
                    <td className="calc-value">{p.irr !== null ? (p.irr * 100).toFixed(1) + '%' : '—'}</td>
                  </tr>
                ))}
                {budgetResult.excluded.map((p) => (
                  <tr key={p.id} className="calc-row" style={{ opacity: 0.45 }}>
                    <td>✗ {p.name}</td>
                    <td className="calc-value">{fmt(p.i0, s.currency)}</td>
                    <td className="calc-value">{fmt(p.npv, s.currency)}</td>
                    <td className="calc-value">{p.irr !== null ? (p.irr * 100).toFixed(1) + '%' : '—'}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #3a5555', fontWeight: 700 }}>
                  <td style={{ color: '#a78bfa' }}>Optimal kombinasjon</td>
                  <td className="calc-value">{fmt(budgetResult.totalI0, s.currency)}</td>
                  <td className="calc-value" style={{ color: 'var(--acc)' }}>{fmt(budgetResult.totalNPV, s.currency)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--t-mid)' }}>
            <span>Ubrukt budsjett: <b style={{ color: 'var(--warn)' }}>{fmt(budgetResult.unutilised, s.currency)}</b></span>
            <span>Valgte: <b>{budgetResult.selected.length} av {results.length}</b></span>
          </div>
        </div>
      )}
    </div>
  );
}
