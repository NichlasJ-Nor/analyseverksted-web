import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { runDcfMonteCarlo, type DcfMcResult } from '../calc/dcfMonteCarlo';
import type { TerminalMethod } from '../calc/dcf';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

export default function DcfMonteCarloPanel({
  fcf, wacc, g, terminalMethod, exitMultiple, lastEbitda, cur,
}: {
  fcf: number[];
  wacc: number;
  g: number;
  terminalMethod: TerminalMethod;
  exitMultiple: number;
  lastEbitda: number;
  cur: string;
}) {
  const [open, setOpen] = useState(false);
  const [numSims, setNumSims] = useState(5000);
  const [fcfPess, setFcfPess] = useState(-0.30);
  const [fcfOpt, setFcfOpt] = useState(0.30);
  const [waccPess, setWaccPess] = useState(0.03);
  const [waccOpt, setWaccOpt] = useState(0.03);
  const [gPess, setGPess] = useState(0.01);
  const [gOpt, setGOpt] = useState(0.01);
  const [result, setResult] = useState<DcfMcResult | null>(null);
  const [running, setRunning] = useState(false);

  function run() {
    setRunning(true);
    setTimeout(() => {
      const r = runDcfMonteCarlo({
        fcf, wacc, g, terminalMethod, exitMultiple, lastEbitda,
        fcfPessPct: fcfPess, fcfOptPct: fcfOpt,
        waccPessPp: waccPess, waccOptPp: waccOpt,
        gPessPp: gPess, gOptPp: gOpt,
      }, numSims);
      setResult(r);
      setRunning(false);
    }, 10);
  }

  let histLabels: string[] = [];
  let histCounts: number[] = [];
  let histColors: string[] = [];
  if (result && result.evs.length > 0) {
    const nBins = 40;
    const min = result.evs[0];
    const max = result.evs[result.evs.length - 1];
    const width = (max - min) / nBins || 1;
    histCounts = new Array(nBins).fill(0);
    result.evs.forEach((v) => {
      const bin = Math.min(nBins - 1, Math.max(0, Math.floor((v - min) / width)));
      histCounts[bin]++;
    });
    histLabels = Array.from({ length: nBins }, (_, i) => (min + (i + 0.5) * width).toFixed(0));
    histColors = histLabels.map((l) => {
      const v = +l;
      if (v < result.p10) return 'rgba(224,90,82,.75)';
      if (v < result.p50) return 'rgba(230,168,23,.70)';
      if (v < result.p90) return 'rgba(82,235,176,.65)';
      return 'rgba(82,235,176,.9)';
    });
  }

  return (
    <div className="card" style={{ borderLeft: '3px solid #52ebb0' }}>
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Monte Carlo på DCF-modellen <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— usikkerhet i FCF, WACC og terminal vekst</span></span>
      </div>
      {open && (
        <>
          <p style={{ fontSize: 12, color: 'var(--t-mid)', marginBottom: 12 }}>
            Simulerer {numSims.toLocaleString('no')} scenarioer der FCF skaleres og WACC/g varieres samtidig (PERT-fordeling), for å vise spennet i Enterprise Value rundt basisverdien.
          </p>
          <div className="settings-row" style={{ marginBottom: 14 }}>
            <div className="field"><label>Antall simuleringer</label>
              <select value={numSims} onChange={(e) => setNumSims(+e.target.value)}>
                {[1000, 5000, 10000, 20000].map((n) => <option key={n} value={n}>{n.toLocaleString('no')}</option>)}
              </select>
            </div>
            <div className="field"><label>FCF pessimistisk (%)</label><input type="number" value={fcfPess * 100} onChange={(e) => setFcfPess(+e.target.value / 100)} style={{ width: 80 }} /></div>
            <div className="field"><label>FCF optimistisk (%)</label><input type="number" value={fcfOpt * 100} onChange={(e) => setFcfOpt(+e.target.value / 100)} style={{ width: 80 }} /></div>
            <div className="field"><label>WACC pessimistisk (+pp)</label><input type="number" step="0.5" value={waccPess * 100} onChange={(e) => setWaccPess(+e.target.value / 100)} style={{ width: 80 }} /></div>
            <div className="field"><label>WACC optimistisk (−pp)</label><input type="number" step="0.5" value={waccOpt * 100} onChange={(e) => setWaccOpt(+e.target.value / 100)} style={{ width: 80 }} /></div>
            <div className="field"><label>g pessimistisk (−pp)</label><input type="number" step="0.25" value={gPess * 100} onChange={(e) => setGPess(+e.target.value / 100)} style={{ width: 80 }} /></div>
            <div className="field"><label>g optimistisk (+pp)</label><input type="number" step="0.25" value={gOpt * 100} onChange={(e) => setGOpt(+e.target.value / 100)} style={{ width: 80 }} /></div>
          </div>
          <button className="btn" style={{ color: 'var(--acc)', borderColor: 'var(--acc)' }} onClick={run} disabled={running}>
            {running ? 'Simulerer…' : `Kjør ${numSims.toLocaleString('no')} simuleringer`}
          </button>

          {result && result.evs.length > 0 && (
            <>
              <div className="stats-row" style={{ marginTop: 16 }}>
                <div className="stat"><div className="lbl">P10 (pessimistisk)</div><div className="val" style={{ color: 'var(--neg)' }}>{fmt(result.p10, cur)}</div></div>
                <div className="stat"><div className="lbl">P25</div><div className="val" style={{ color: 'var(--warn)' }}>{fmt(result.p25, cur)}</div></div>
                <div className="stat accent"><div className="lbl">P50 (median)</div><div className="val">{fmt(result.p50, cur)}</div></div>
                <div className="stat"><div className="lbl">P75</div><div className="val" style={{ color: 'var(--acc)' }}>{fmt(result.p75, cur)}</div></div>
                <div className="stat"><div className="lbl">P90 (optimistisk)</div><div className="val" style={{ color: 'var(--acc)' }}>{fmt(result.p90, cur)}</div></div>
                <div className="stat"><div className="lbl">Sannsynlighet ≥ basis-EV</div><div className="val">{result.probAboveBase !== null ? result.probAboveBase.toFixed(1) + '%' : 'N/A'}</div></div>
              </div>
              <div style={{ height: 260, marginTop: 12 }}>
                <Bar
                  data={{
                    labels: histLabels,
                    datasets: [{ data: histCounts, backgroundColor: histColors, borderRadius: 1 }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { title: (items) => `EV ≈ ${fmt(+histLabels[items[0].dataIndex], cur)}`, label: (item) => `Frekvens: ${item.raw} scenarioer` } },
                    },
                    scales: {
                      x: { ticks: { color: '#8aafaf', maxTicksLimit: 10 }, grid: { display: false } },
                      y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                    },
                  }}
                />
              </div>
              {result.baseEv !== null && (
                <p style={{ fontSize: 11, color: 'var(--t-mid)', marginTop: 8 }}>Basis-EV (uten støy): {fmt(result.baseEv, cur)}</p>
              )}
            </>
          )}
          {result && result.evs.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--neg)', marginTop: 12 }}>Ingen gyldige simuleringer — sjekk at WACC &gt; g i alle scenarioer.</p>
          )}
        </>
      )}
    </div>
  );
}
