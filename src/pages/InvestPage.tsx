import { useMemo, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import '../lib/chartSetup';
import { useInvestStore } from '../store/investStore';
import {
  evaluateAlternative, rateSensitivity, breakevenInvest, scenarioInvest,
} from '../calc/invest';
import InvestWaterfallChart from '../components/InvestWaterfallChart';
import { usePortfolioStore } from '../store/portfolioStore';
import { useUiStore } from '../store/uiStore';
import Tip from '../components/Tip';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

const ALT_COLORS = ['#52ebb0', '#e6a817', '#5c8a8a', '#e05a52', '#a78bfa', '#3cb4c8'];

export default function InvestPage() {
  const s = useInvestStore();
  const [waterfallIdx, setWaterfallIdx] = useState(0);
  const setTool = useUiStore((u) => u.setTool);

  function sendToPortfolio(altIndex: number) {
    const a = s.alternatives[altIndex];
    usePortfolioStore.getState().importProject({ name: a.name, i0: a.i0, cfs: a.cfs, rate: s.rate });
    setTool('portfolio');
  }

  const results = useMemo(
    () => s.alternatives.map((a) => evaluateAlternative(a, s.rate)),
    [s.alternatives, s.rate]
  );

  const ranked = useMemo(() => [...results].sort((a, b) => b.npv - a.npv), [results]);
  const sensRows = useMemo(() => rateSensitivity(s.alternatives, s.rate), [s.alternatives, s.rate]);
  const breakevens = useMemo(() => s.alternatives.map((a) => breakevenInvest(a, s.rate)), [s.alternatives, s.rate]);
  const scenarios = useMemo(() => s.alternatives.map((a) => scenarioInvest(a, s.rate)), [s.alternatives, s.rate]);

  const interp = useMemo(() => {
    const best = ranked[0];
    const allNeg = results.every((r) => r.npv < 0);
    const allPos = results.every((r) => r.npv > 0);
    if (results.length === 1) {
      const r = results[0];
      let txt = `${r.name} har NPV = ${fmt(r.npv, s.currency)}. `;
      txt += r.npv > 0
        ? `Investeringen er lønnsom — fremtidige kontantstrømmer er verdt mer enn I₀ (${fmt(r.i0, s.currency)}) når diskontert med ${(s.rate * 100).toFixed(1)}%.`
        : r.npv < 0
        ? `Investeringen er ulønnsom — fremtidige kontantstrømmer dekker ikke I₀ (${fmt(r.i0, s.currency)}) til ${(s.rate * 100).toFixed(1)}% avkastningskrav.`
        : 'Investeringen går akkurat i null — IRR = avkastningskrav.';
      if (r.irr !== null) txt += ` IRR = ${(r.irr * 100).toFixed(1)}% vs. krav ${(s.rate * 100).toFixed(1)}%.`;
      return txt;
    }
    if (allNeg) {
      return `Ingen av alternativene er lønnsomme til ${(s.rate * 100).toFixed(1)}% avkastningskrav. Vurder å sette ned kravet, reforhandle investering, eller øke inntektspotensialet.`;
    }
    let txt = `${best.name} er det beste alternativet med høyest NPV (${fmt(best.npv, s.currency)}).`;
    txt += allPos ? ` Alle alternativene er lønnsomme, men ${best.name} skaper mest verdi.` : ' Velg dette fremfor alternativer med negativ NPV.';
    if (best.irr !== null) txt += ` IRR = ${(best.irr * 100).toFixed(1)}% vs. krav ${(s.rate * 100).toFixed(1)}%.`;
    return txt;
  }, [results, ranked, s.rate, s.currency]);

  const nYears = s.alternatives[0]?.cfs.length ?? 0;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="card">
        <div className="card-title"><span>Investeringsanalyse — NPV-kalkulator <span className="badge">Netto nåverdi</span></span></div>
        <div className="settings-row" style={{ marginBottom: 14 }}>
          <div className="field"><label>Avkastningskrav (%)</label>
            <input type="number" step="0.1" value={s.rate * 100} onChange={(e) => s.setRate(+e.target.value / 100)} style={{ width: 90 }} />
          </div>
          <div className="field"><label>Valuta</label>
            <input value={s.currency} onChange={(e) => s.setCurrency(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn" onClick={s.addYear}>+ År</button>
            <button className="btn" style={{ marginLeft: 6 }} onClick={s.removeYear}>− År</button>
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn" onClick={s.addAlternative}>+ Alternativ</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead>
              <tr>
                <th>Alternativ</th>
                <th>I₀</th>
                {Array.from({ length: nYears }, (_, i) => <th key={i}>År {i + 1}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {s.alternatives.map((a, ai) => (
                <tr key={ai} className="calc-row">
                  <td><input value={a.name} onChange={(e) => s.setAltField(ai, 'name', e.target.value)} style={{ width: 120 }} /></td>
                  <td><input type="number" value={a.i0} onChange={(e) => s.setAltField(ai, 'i0', +e.target.value)} style={{ width: 80 }} /></td>
                  {a.cfs.map((cf, yi) => (
                    <td key={yi}><input type="number" value={cf} onChange={(e) => s.setAltCf(ai, yi, +e.target.value)} style={{ width: 70 }} /></td>
                  ))}
                  <td>
                    {s.alternatives.length > 1 && (
                      <button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }} onClick={() => s.removeAlternative(ai)}>Fjern</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="interp">{interp}</div>

      <div className="card">
        <div className="card-title">Sammenligning</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr>
              <th>Alternativ</th>
              <th><Tip text="Netto nåverdi. Positivt = lønnsomt. Ranger alternativer etter NPV — høyest NPV er best (ved lik risiko).">NPV</Tip></th>
              <th><Tip text={`Internrente. Sammenlign mot avkastningskravet (${(s.rate * 100).toFixed(1)}%): IRR over kravet = lønnsom.`}>IRR</Tip></th>
              <th><Tip text="Antall år til du har fått tilbake den initielle investeringen (udiskontert). Kortere = lavere risiko." align="left">Tilbakebet.</Tip></th>
              <th>I₀</th><th>Vurdering</th><th></th>
            </tr></thead>
            <tbody>
              {results.map((r, i) => {
                const isBest = ranked[0].name === r.name && results.length > 1;
                const verdict = r.npv > 0
                  ? (r.irr !== null && r.irr > s.rate ? 'Lønnsom — IRR > krav' : 'Lønnsom')
                  : r.npv === 0 ? 'Går i null' : 'Ulønnsom';
                const col = r.npv > 0 ? 'var(--acc)' : r.npv === 0 ? 'var(--warn)' : 'var(--neg)';
                return (
                  <tr key={i} className="calc-row">
                    <td style={{ color: ALT_COLORS[i % ALT_COLORS.length], fontWeight: 600 }}>
                      {r.name} {isBest && <span style={{ background: 'var(--acc)', color: '#0d1a1a', borderRadius: 4, padding: '1px 6px', fontSize: 10, marginLeft: 4 }}>BESTE</span>}
                    </td>
                    <td className="calc-value" style={{ color: col, fontWeight: 700 }}>{fmt(r.npv, s.currency)}</td>
                    <td className="calc-value">{r.irr !== null ? (r.irr * 100).toFixed(1) + '%' : '—'}</td>
                    <td className="calc-value">{r.payback !== null ? r.payback.toFixed(1) + ' år' : `> ${r.cfs.length} år`}</td>
                    <td className="calc-value">{fmt(r.i0, s.currency)}</td>
                    <td style={{ color: col }}>{verdict}</td>
                    <td>
                      <button className="btn" style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
                        onClick={() => sendToPortfolio(i)} title="Send dette alternativet til Prosjektportefølje">
                        → Portefølje
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">NPV per alternativ</div>
        <div style={{ height: 220 }}>
          <Bar
            data={{
              labels: results.map((r) => r.name),
              datasets: [{
                data: results.map((r) => r.npv),
                backgroundColor: results.map((r, i) => (r.npv >= 0 ? ALT_COLORS[i % ALT_COLORS.length] : 'rgba(224,90,82,0.7)')),
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
        <div className="card-title">Kumulativ kontantstrøm</div>
        <div style={{ height: 220 }}>
          <Line
            data={{
              labels: ['År 0', ...Array.from({ length: nYears }, (_, i) => `År ${i + 1}`)],
              datasets: results.map((r, i) => ({
                label: r.name,
                data: [-r.i0, ...r.cumCFs],
                borderColor: ALT_COLORS[i % ALT_COLORS.length],
                backgroundColor: 'transparent',
                tension: 0.2,
              })),
            }}
            options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { labels: { color: '#c8e6e6' } } },
              scales: {
                x: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
              },
            }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Kontantstrøm-waterfall</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {s.alternatives.map((a, i) => (
            <button key={i} className="btn" style={waterfallIdx === i ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
              onClick={() => setWaterfallIdx(i)}>{a.name}</button>
          ))}
        </div>
        {s.alternatives[waterfallIdx] && (
          <InvestWaterfallChart i0={s.alternatives[waterfallIdx].i0} cfs={s.alternatives[waterfallIdx].cfs} cur={s.currency} />
        )}
      </div>

      <div className="card">
        <div className="card-title"><span>Sensitivitetsanalyse — avkastningskrav <span className="badge">Avkastningskrav</span></span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Avkastningskrav</th>{s.alternatives.map((a, i) => <th key={i}>{a.name}</th>)}</tr></thead>
            <tbody>
              {sensRows.map((row, ri) => {
                const isBasis = Math.abs(row.rate - s.rate) < 1e-9;
                return (
                  <tr key={ri} className="calc-row" style={isBasis ? { background: '#1a3333' } : {}}>
                    <td>{isBasis ? '▶ ' : ''}{(row.rate * 100).toFixed(1)}%{isBasis ? ' (basis)' : ''}</td>
                    {row.npvByAlt.map((v, i) => (
                      <td key={i} className="calc-value" style={{ color: v > 0 ? 'var(--acc)' : v < 0 ? 'var(--neg)' : 'var(--warn)' }}>{fmt(v, s.currency)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ borderLeft: '3px solid #a78bfa' }}>
        <div className="card-title" style={{ color: '#a78bfa' }}><span>Breakeven-analyse <span className="badge">per alternativ</span></span></div>
        <p style={{ fontSize: 12, color: 'var(--t-mid)', marginBottom: 10 }}>
          Maks kjøpspris (I₀) for NPV = 0, og minimum FCF-andel som dekker investeringen til {(s.rate * 100).toFixed(1)}% avkastningskrav.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Alternativ</th><th>Maks I₀ (NPV=0)</th><th>Nåv. buffer</th><th>Min FCF-andel</th></tr></thead>
            <tbody>
              {breakevens.map((b, i) => (
                <tr key={i} className="calc-row">
                  <td>{s.alternatives[i].name}</td>
                  <td className="calc-value">{fmt(b.maxI0, s.currency)}</td>
                  <td className="calc-value" style={{ color: b.buffer > 0 ? 'var(--acc)' : 'var(--neg)' }}>{b.buffer >= 0 ? '+' : ''}{fmt(b.buffer, s.currency)}</td>
                  <td className="calc-value">{b.minFcfPct !== null ? b.minFcfPct.toFixed(1) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Scenarioer per alternativ</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead>
              <tr>
                <th>Alternativ</th>
                <th style={{ color: 'var(--neg)' }}>Bear NPV</th>
                <th>Base NPV</th>
                <th style={{ color: 'var(--acc)' }}>Bull NPV</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((sc, i) => (
                <tr key={i} className="calc-row">
                  <td>{s.alternatives[i].name}</td>
                  <td className="calc-value" style={{ color: sc.bear.npv >= 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(sc.bear.npv, s.currency)}</td>
                  <td className="calc-value" style={{ fontWeight: 700 }}>{fmt(sc.base.npv, s.currency)}</td>
                  <td className="calc-value" style={{ color: sc.bull.npv >= 0 ? 'var(--acc)' : 'var(--neg)' }}>{fmt(sc.bull.npv, s.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
