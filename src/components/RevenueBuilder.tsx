import { useState } from 'react';
import { revenueFromGrowth, revenueFromPriceVolume, revenueFromSegments, type RevenueSegment } from '../calc/revenue';

type Mode = 'growth' | 'pxv' | 'segments';

export default function RevenueBuilder({ years, onApply }: { years: number; onApply: (vals: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('growth');

  const [base, setBase] = useState(280);
  const [rates, setRates] = useState<number[]>(() => Array.from({ length: years }, (_, i) => (i === 0 ? 0 : 0.1)));

  const [prices, setPrices] = useState<number[]>(() => Array(years).fill(1000));
  const [volumes, setVolumes] = useState<number[]>(() => Array(years).fill(300));

  const [segments, setSegments] = useState<RevenueSegment[]>([{ name: 'Segment 1', vals: Array(years).fill(0) }]);

  function ensureLen<T>(arr: T[], fill: T): T[] {
    const copy = [...arr];
    while (copy.length < years) copy.push(fill);
    return copy.slice(0, years);
  }

  const preview =
    mode === 'growth' ? revenueFromGrowth(base, ensureLen(rates, 0.1)) :
    mode === 'pxv' ? revenueFromPriceVolume(ensureLen(prices, 1000), ensureLen(volumes, 300)) :
    revenueFromSegments(segments.map((s) => ({ ...s, vals: ensureLen(s.vals, 0) })), years);

  return (
    <div className="card">
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Omsetningsoppbygging <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— valgfritt</span></span>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            {(['growth', 'pxv', 'segments'] as Mode[]).map((m) => (
              <label key={m} style={{ fontSize: 12, display: 'flex', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={mode === m} onChange={() => setMode(m)} />
                {m === 'growth' ? 'Vekstrate-drevet' : m === 'pxv' ? 'Pris × Volum' : 'Segmenter (manuelt)'}
              </label>
            ))}
          </div>

          {mode === 'growth' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="pl-table">
                <thead><tr><th>Basis</th>{ensureLen(rates, 0.1).slice(1).map((_, i) => <th key={i}>År {i + 2} vekst %</th>)}</tr></thead>
                <tbody>
                  <tr>
                    <td><input type="number" value={base} onChange={(e) => setBase(+e.target.value)} /></td>
                    {ensureLen(rates, 0.1).slice(1).map((r, i) => (
                      <td key={i}><input type="number" step="0.5" value={r * 100}
                        onChange={(e) => setRates((old) => ensureLen(old, 0.1).map((v, j) => j === i + 1 ? +e.target.value / 100 : v))} /></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {mode === 'pxv' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="pl-table">
                <thead><tr><th></th>{Array.from({ length: years }, (_, i) => <th key={i}>År {i + 1}</th>)}</tr></thead>
                <tbody>
                  <tr>
                    <td>Pris</td>
                    {ensureLen(prices, 1000).map((p, i) => (
                      <td key={i}><input type="number" value={p} onChange={(e) => setPrices((old) => ensureLen(old, 1000).map((v, j) => j === i ? +e.target.value : v))} /></td>
                    ))}
                  </tr>
                  <tr>
                    <td>Volum (tusen)</td>
                    {ensureLen(volumes, 300).map((v, i) => (
                      <td key={i}><input type="number" value={v} onChange={(e) => setVolumes((old) => ensureLen(old, 300).map((x, j) => j === i ? +e.target.value : x))} /></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {mode === 'segments' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="pl-table">
                <thead><tr><th>Segment</th>{Array.from({ length: years }, (_, i) => <th key={i}>År {i + 1}</th>)}<th></th></tr></thead>
                <tbody>
                  {segments.map((seg, si) => (
                    <tr key={si}>
                      <td><input value={seg.name} onChange={(e) => setSegments((old) => old.map((s, j) => j === si ? { ...s, name: e.target.value } : s))} /></td>
                      {ensureLen(seg.vals, 0).map((v, i) => (
                        <td key={i}><input type="number" value={v}
                          onChange={(e) => setSegments((old) => old.map((s, j) => j === si ? { ...s, vals: ensureLen(s.vals, 0).map((x, k) => k === i ? +e.target.value : x) } : s))} /></td>
                      ))}
                      <td><button className="btn" onClick={() => setSegments((old) => old.filter((_, j) => j !== si))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn" style={{ marginTop: 8 }}
                onClick={() => setSegments((old) => [...old, { name: `Segment ${old.length + 1}`, vals: Array(years).fill(0) }])}>
                + Legg til segment
              </button>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn" style={{ color: 'var(--acc)', borderColor: 'var(--acc)' }}
              onClick={() => onApply(preview)}>
              Overfør til P&L →
            </button>
            <span style={{ fontSize: 11, color: 'var(--t-mid)' }}>
              Forhåndsvisning: {preview.map((v) => v.toFixed(0)).join(' / ')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
