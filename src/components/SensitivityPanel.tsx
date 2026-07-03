import { useState } from 'react';
import { sensitivityWaccVsG, sensitivityWaccVsFcf, breakeven, type EquityAtInput } from '../calc/dcfAnalysis';

function heatColor(v: number, min: number, max: number): string {
  if (!isFinite(v)) return 'transparent';
  if (v < 0) return 'rgba(224,90,82,0.25)';
  const t = max === min ? 0.5 : (v - min) / (max - min);
  const r = Math.round(224 + (82 - 224) * t);
  const g = Math.round(90 + (235 - 90) * t);
  const b = Math.round(82 + (176 - 82) * t);
  return `rgba(${r},${g},${b},${(0.1 + 0.28 * t).toFixed(2)})`;
}

export default function SensitivityPanel({
  input, ev, cur,
}: {
  input: EquityAtInput;
  ev: number;
  cur: string;
}) {
  const [axis, setAxis] = useState<'wg' | 'wf'>('wg');

  const grid = axis === 'wg'
    ? sensitivityWaccVsG(input, input.wacc, input.g)
    : sensitivityWaccVsFcf(input, input.wacc);

  const flat = grid.values.flat().filter((v) => isFinite(v));
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  const be = breakeven(input, ev);

  return (
    <div className="card">
      <div className="card-title">Sensitivitet og breakeven</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className={`btn ${axis === 'wg' ? '' : ''}`} style={axis === 'wg' ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
          onClick={() => setAxis('wg')}>WACC × g</button>
        <button className="btn" style={axis === 'wf' ? { color: 'var(--acc)', borderColor: 'var(--acc)' } : {}}
          onClick={() => setAxis('wf')}>WACC × FCF-margin</button>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 10px', color: 'var(--t-mid)' }}>{grid.rowLabel} \ {grid.colLabel}</th>
              {grid.cols.map((c, i) => (
                <th key={i} style={{ padding: '4px 10px', color: 'var(--t-mid)', textAlign: 'right' }}>
                  {axis === 'wg' ? (c * 100).toFixed(1) + '%' : (c === 1 ? 'basis' : (c > 1 ? '+' : '') + ((c - 1) * 100).toFixed(0) + '%')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((r, ri) => (
              <tr key={ri}>
                <td style={{ padding: '4px 10px', color: 'var(--t-mid)' }}>{(r * 100).toFixed(1)}%</td>
                {grid.values[ri].map((v, ci) => (
                  <td key={ci} style={{
                    padding: '4px 10px', textAlign: 'right',
                    background: heatColor(v, min, max),
                    fontWeight: ri === 2 && ci === 2 ? 700 : 400,
                  }}>
                    {isFinite(v) ? v.toFixed(0) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-row">
        <div className={`stat ${be.fcfDownsidePct !== null && be.fcfDownsidePct > 20 ? 'accent' : 'warn'}`}>
          <div className="lbl">FCF kan falle maks</div>
          <div className="val">{be.fcfDownsidePct !== null ? be.fcfDownsidePct.toFixed(1) + '%' : '—'}</div>
        </div>
        <div className="stat">
          <div className="lbl">Maks WACC (breakeven)</div>
          <div className="val">{be.maxWacc !== null ? (be.maxWacc * 100).toFixed(1) + '%' : `> ${((input.wacc + 0.5) * 100).toFixed(0)}%`}</div>
        </div>
        {input.terminalMethod === 'gordon' && (
          <div className="stat">
            <div className="lbl">Min terminal vekst (g)</div>
            <div className="val">{be.minG !== null ? (be.minG * 100).toFixed(1) + '%' : '—'}</div>
          </div>
        )}
        <div className="stat">
          <div className="lbl">Maks kjøpspris (I₀ = EV)</div>
          <div className="val">{be.maxBuyPrice.toFixed(1)} {cur}</div>
        </div>
      </div>
    </div>
  );
}
