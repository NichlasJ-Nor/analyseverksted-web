import { useState } from 'react';
import { wcFromPercent, wcFromDso, wcFromDetail, type WcDetailLine } from '../calc/workingCapital';

type Mode = 'pct' | 'dso' | 'detail';

export default function WorkingCapitalTool({
  revenues, cogsAbs, years, onApply,
}: {
  revenues: number[];
  cogsAbs: number[];
  years: number;
  onApply: (dwc: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('pct');
  const [pct, setPct] = useState(0.08);
  const [dso, setDso] = useState(45);
  const [dpo, setDpo] = useState(30);
  const [dio, setDio] = useState(30);
  const [lines, setLines] = useState<WcDetailLine[]>([
    { name: 'Kundefordringer', sign: 1, vals: Array(years).fill(0) },
    { name: 'Varelager', sign: 1, vals: Array(years).fill(0) },
    { name: 'Leverandørgjeld', sign: -1, vals: Array(years).fill(0) },
  ]);

  function ensureLen(arr: number[]): number[] {
    const c = [...arr];
    while (c.length < years) c.push(0);
    return c.slice(0, years);
  }

  const dwc =
    mode === 'pct' ? wcFromPercent(revenues, pct) :
    mode === 'dso' ? wcFromDso(revenues, cogsAbs, { dso, dpo, dio }).dwc :
    wcFromDetail(lines.map((l) => ({ ...l, vals: ensureLen(l.vals) })), years).dwc;

  return (
    <div className="card">
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Arbeidskapital-modell <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— valgfritt</span></span>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            {(['pct', 'dso', 'detail'] as Mode[]).map((m) => (
              <label key={m} style={{ fontSize: 12, display: 'flex', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={mode === m} onChange={() => setMode(m)} />
                {m === 'pct' ? '% av omsetningsvekst' : m === 'dso' ? 'DSO / DPO / DIO' : 'Detaljert (balanseposter)'}
              </label>
            ))}
          </div>

          {mode === 'pct' && (
            <div className="field" style={{ maxWidth: 160 }}>
              <label>WC som % av omsetning</label>
              <input type="number" step="0.5" value={pct * 100} onChange={(e) => setPct(+e.target.value / 100)} />
            </div>
          )}

          {mode === 'dso' && (
            <div className="settings-row">
              <div className="field"><label>DSO (dager)</label><input type="number" value={dso} onChange={(e) => setDso(+e.target.value)} style={{ width: 80 }} /></div>
              <div className="field"><label>DPO (dager)</label><input type="number" value={dpo} onChange={(e) => setDpo(+e.target.value)} style={{ width: 80 }} /></div>
              <div className="field"><label>DIO (dager)</label><input type="number" value={dio} onChange={(e) => setDio(+e.target.value)} style={{ width: 80 }} /></div>
            </div>
          )}

          {mode === 'detail' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="pl-table">
                <thead><tr><th>Post</th><th>Type</th>{Array.from({ length: years }, (_, i) => <th key={i}>År {i + 1}</th>)}</tr></thead>
                <tbody>
                  {lines.map((l, li) => (
                    <tr key={li}>
                      <td><input value={l.name} onChange={(e) => setLines((old) => old.map((x, j) => j === li ? { ...x, name: e.target.value } : x))} /></td>
                      <td>
                        <select value={l.sign} onChange={(e) => setLines((old) => old.map((x, j) => j === li ? { ...x, sign: +e.target.value as 1 | -1 } : x))}>
                          <option value={1}>Eiendel (+)</option>
                          <option value={-1}>Gjeld (−)</option>
                        </select>
                      </td>
                      {ensureLen(l.vals).map((v, i) => (
                        <td key={i}><input type="number" value={v}
                          onChange={(e) => setLines((old) => old.map((x, j) => j === li ? { ...x, vals: ensureLen(x.vals).map((y, k) => k === i ? +e.target.value : y) } : x))} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn" style={{ marginTop: 8 }}
                onClick={() => setLines((old) => [...old, { name: 'Post', sign: 1, vals: Array(years).fill(0) }])}>
                + Legg til post
              </button>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => onApply(dwc)}>
              Overfør til P&L →
            </button>
            <span style={{ fontSize: 11, color: 'var(--t-mid)' }}>ΔWC: {dwc.map((v) => v.toFixed(1)).join(' / ')}</span>
          </div>
        </>
      )}
    </div>
  );
}
