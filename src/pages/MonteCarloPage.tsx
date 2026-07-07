import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import '../lib/chartSetup';
import { useMonteCarloStore } from '../store/monteCarloStore';
import { percentile, mean } from '../calc/finance';
import {
  runSimulation, computeTornado, computeSpearman, type DistType, type SimMode, type Timing,
} from '../calc/montecarlo';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

const DIST_LABELS: Record<DistType, string> = {
  triangular: 'Triangulær', pert: 'PERT', normal: 'Normal', uniform: 'Uniform', lognormal: 'Lognormal',
};
const TIMING_LABELS: Record<Timing, string> = { upfront: 'Opprinnelig (år 0)', terminal: 'Terminalt (siste år)', annual: 'Årlig' };

export default function MonteCarloPage() {
  const s = useMonteCarloStore();
  const [result, setResult] = useState<ReturnType<typeof runSimulation> | null>(null);
  const [running, setRunning] = useState(false);

  function run() {
    setRunning(true);
    setTimeout(() => {
      const r = runSimulation(s.items, s.events, s.dist, s.mode, s.numSims, s.years, s.rate);
      setResult(r);
      setRunning(false);
    }, 10);
  }

  const p10 = result ? percentile(Array.from(result.sortedResults), 10) : 0;
  const p50 = result ? percentile(Array.from(result.sortedResults), 50) : 0;
  const p85 = result ? percentile(Array.from(result.sortedResults), 85) : 0;
  const p90 = result ? percentile(Array.from(result.sortedResults), 90) : 0;
  const avg = result ? mean(Array.from(result.results)) : 0;
  const negShare = result ? (Array.from(result.results).filter((v) => v < 0).length / result.results.length) * 100 : 0;

  const tornado = computeTornado(s.items, s.events, s.mode, s.years, s.rate);
  const spearman = result ? computeSpearman(result.results, result.samples, s.items) : [];

  let histLabels: string[] = [];
  let histCounts: number[] = [];
  if (result) {
    const nBins = 30;
    const min = result.sortedResults[0];
    const max = result.sortedResults[result.sortedResults.length - 1];
    const width = (max - min) / nBins || 1;
    histCounts = new Array(nBins).fill(0);
    result.results.forEach((v) => {
      const bin = Math.min(nBins - 1, Math.max(0, Math.floor((v - min) / width)));
      histCounts[bin]++;
    });
    histLabels = Array.from({ length: nBins }, (_, i) => (min + i * width).toFixed(0));
  }

  const scurveStep = Math.max(1, Math.floor((result?.sortedResults.length ?? 1) / 200));
  const scurvePoints = result
    ? Array.from(result.sortedResults).filter((_, i) => i % scurveStep === 0).map((v, i) => ({ x: v, y: ((i * scurveStep) / result.sortedResults.length) * 100 }))
    : [];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="card">
        <div className="card-title">Monte Carlo-simulering</div>
        <div className="settings-row" style={{ marginBottom: 14 }}>
          <div className="field"><label>Antall simuleringer</label>
            <select value={s.numSims} onChange={(e) => s.setNumSims(+e.target.value)}>
              {[1000, 5000, 10000, 50000].map((n) => <option key={n} value={n}>{n.toLocaleString('no')}</option>)}
            </select>
          </div>
          <div className="field"><label>Fordeling</label>
            <select value={s.dist} onChange={(e) => s.setDist(e.target.value as DistType)}>
              {Object.entries(DIST_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label>Modus</label>
            <select value={s.mode} onChange={(e) => s.setMode(e.target.value as SimMode)}>
              <option value="single">Enkelt utfall (sum)</option>
              <option value="npv">NPV over tid</option>
            </select>
          </div>
          {s.mode === 'npv' && (
            <>
              <div className="field"><label>År</label><input type="number" value={s.years} onChange={(e) => s.setYears(+e.target.value)} style={{ width: 70 }} /></div>
              <div className="field"><label>Diskonteringsrente (%)</label><input type="number" step="0.1" value={s.rate * 100} onChange={(e) => s.setRate(+e.target.value / 100)} style={{ width: 80 }} /></div>
            </>
          )}
          <div className="field"><label>Valuta</label><input value={s.currency} onChange={(e) => s.setCurrency(e.target.value)} style={{ width: 80 }} /></div>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table className="pl-table">
            <thead>
              <tr>
                <th>Item</th><th>Opt. (P10)</th><th>Mest sannsynlig</th><th>Pess. (P90)</th>
                {s.mode === 'npv' && <th>Tidspunkt</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((it, i) => (
                <tr key={i} className="calc-row">
                  <td><input value={it.name} onChange={(e) => s.setItemField(i, 'name', e.target.value)} style={{ width: 140 }} /></td>
                  <td><input type="number" value={it.opt} onChange={(e) => s.setItemField(i, 'opt', +e.target.value)} style={{ width: 80 }} /></td>
                  <td><input type="number" value={it.ml} onChange={(e) => s.setItemField(i, 'ml', +e.target.value)} style={{ width: 80 }} /></td>
                  <td><input type="number" value={it.pess} onChange={(e) => s.setItemField(i, 'pess', +e.target.value)} style={{ width: 80 }} /></td>
                  {s.mode === 'npv' && (
                    <td>
                      <select value={it.timing} onChange={(e) => s.setItemField(i, 'timing', e.target.value)}>
                        {Object.entries(TIMING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  )}
                  <td>{s.items.length > 1 && <button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }} onClick={() => s.removeItem(i)}>Fjern</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" style={{ marginTop: 8 }} onClick={s.addItem}>+ Item</button>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table className="pl-table">
            <thead><tr><th>Hendelse (risiko)</th><th>Sannsynlighet (%)</th><th>Opt.</th><th>Mest sannsynlig</th><th>Pess.</th>{s.mode === 'npv' && <th>År</th>}<th></th></tr></thead>
            <tbody>
              {s.events.map((ev, i) => (
                <tr key={i} className="calc-row">
                  <td><input value={ev.name} onChange={(e) => s.setEventField(i, 'name', e.target.value)} style={{ width: 140 }} /></td>
                  <td><input type="number" value={ev.prob * 100} onChange={(e) => s.setEventField(i, 'prob', +e.target.value / 100)} style={{ width: 70 }} /></td>
                  <td><input type="number" value={ev.opt} onChange={(e) => s.setEventField(i, 'opt', +e.target.value)} style={{ width: 70 }} /></td>
                  <td><input type="number" value={ev.ml} onChange={(e) => s.setEventField(i, 'ml', +e.target.value)} style={{ width: 70 }} /></td>
                  <td><input type="number" value={ev.pess} onChange={(e) => s.setEventField(i, 'pess', +e.target.value)} style={{ width: 70 }} /></td>
                  {s.mode === 'npv' && <td><input type="number" value={ev.year} onChange={(e) => s.setEventField(i, 'year', +e.target.value)} style={{ width: 55 }} /></td>}
                  <td><button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }} onClick={() => s.removeEvent(i)}>Fjern</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" style={{ marginTop: 8 }} onClick={s.addEvent}>+ Hendelse</button>
        </div>

        <button className="btn" style={{ color: 'var(--acc)', borderColor: 'var(--acc)', fontSize: 14, padding: '8px 20px' }} onClick={run} disabled={running}>
          {running ? 'Simulerer…' : `Kjør ${s.numSims.toLocaleString('no')} simuleringer`}
        </button>
      </div>

      {result && (
        <>
          <div className="stats-row">
            <div className="stat"><div className="lbl">P10 (pessimistisk)</div><div className="val" style={{ color: 'var(--neg)' }}>{fmt(p10, s.currency)}</div></div>
            <div className="stat accent"><div className="lbl">P50 (median)</div><div className="val">{fmt(p50, s.currency)}</div></div>
            <div className="stat"><div className="lbl">Gjennomsnitt</div><div className="val">{fmt(avg, s.currency)}</div></div>
            <div className="stat warn"><div className="lbl">P85 — styringsramme</div><div className="val">{fmt(p85, s.currency)}</div></div>
            <div className="stat"><div className="lbl">P90 — stresstest</div><div className="val">{fmt(p90, s.currency)}</div></div>
            <div className={`stat ${negShare > 20 ? 'neg' : ''}`}><div className="lbl">Andel negative utfall</div><div className="val">{negShare.toFixed(1)}%</div></div>
          </div>

          {result.irrValidCount > 0 && (
            <p style={{ fontSize: 12, color: 'var(--t-mid)', margin: '0 0 12px' }}>
              Gyldig IRR beregnet for {result.irrValidCount} av {result.results.length} iterasjoner ({((result.irrValidCount / result.results.length) * 100).toFixed(0)}%).
            </p>
          )}

          <div className="card">
            <div className="card-title">Sannsynlighetsfordeling (histogram)</div>
            <div style={{ height: 240 }}>
              <Bar
                data={{
                  labels: histLabels,
                  datasets: [{
                    data: histCounts,
                    backgroundColor: histLabels.map((l) => (+l < 0 ? 'rgba(224,90,82,0.7)' : 'rgba(82,235,176,0.6)')),
                    borderRadius: 1,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#8aafaf', maxTicksLimit: 10 }, grid: { display: false } },
                    y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">S-kurve — kumulativ sannsynlighet</div>
            <div style={{ height: 220 }}>
              <Line
                data={{
                  datasets: [{
                    label: 'P(X ≤ x)',
                    data: scurvePoints,
                    borderColor: '#52ebb0',
                    backgroundColor: 'transparent',
                    pointRadius: 0,
                    tension: 0,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { type: 'linear', ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                    y: { ticks: { color: '#8aafaf', callback: (v) => v + '%' }, grid: { color: '#2e4444' } },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Tornado — driverbasert sensitivitet</div>
            <div style={{ height: Math.max(160, tornado.length * 30) }}>
              <Bar
                data={{
                  labels: tornado.map((t) => t.name),
                  datasets: [
                    { data: tornado.map((t) => t.lo), backgroundColor: 'transparent', borderWidth: 0, barPercentage: 0.5 },
                    { data: tornado.map((t) => t.hi - t.lo), backgroundColor: 'rgba(82,235,176,.5)', borderRadius: 3, barPercentage: 0.5 },
                  ],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => (ctx.datasetIndex === 1 ? `${fmt(tornado[ctx.dataIndex].lo, s.currency)} — ${fmt(tornado[ctx.dataIndex].hi, s.currency)}` : '') } },
                  },
                  scales: {
                    x: { stacked: true, ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                    y: { stacked: true, ticks: { color: '#e8f5f5' }, grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>

          {spearman.length > 1 && (
            <div className="card">
              <div className="card-title">Spearman rank-korrelasjon (variansdekomponering)</div>
              {spearman.map((sp, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px 90px', alignItems: 'center', gap: 10, fontSize: 12.5, marginBottom: 6 }}>
                  <div style={{ color: 'var(--t-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sp.name}</div>
                  <div style={{ background: '#1a2e2e', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.abs(sp.sharePct))}%`, background: sp.rs >= 0 ? 'var(--acc)' : 'var(--neg)', borderRadius: 4 }} />
                  </div>
                  <div style={{ color: sp.rs >= 0 ? 'var(--acc)' : 'var(--neg)', fontWeight: 600, textAlign: 'right' }}>r = {sp.rs >= 0 ? '+' : ''}{sp.rs.toFixed(3)}</div>
                  <div style={{ color: 'var(--t-mid)', textAlign: 'right' }}>{sp.sharePct.toFixed(1)}% varians</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
