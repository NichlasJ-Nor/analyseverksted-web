import { useState } from 'react';
import { calcAssetPlan, type Asset } from '../calc/assetPlan';

export default function AssetPlanTool({
  years, onApplyDa, onApplyCapex,
}: {
  years: number;
  onApplyDa: (daPerYear: Record<number, number>) => void;
  onApplyCapex: (capexPerYear: Record<number, number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([{ name: 'Eiendel 1', cost: 20, yr: 0, life: 5 }]);

  function update(i: number, field: keyof Asset, value: string) {
    setAssets(assets.map((a, ai) => (ai !== i ? a : { ...a, [field]: field === 'name' ? value : +value })));
  }

  const plan = assets.length > 0 ? calcAssetPlan(assets, years) : null;

  return (
    <div className="card">
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Aktivaplan — CapEx &amp; avskrivninger <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— valgfritt</span></span>
      </div>
      {open && (
        <>
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table className="pl-table">
              <thead><tr><th>Eiendel</th><th>Kost</th><th>Investeringsår</th><th>Brukstid (år)</th><th>Årl. avskr.</th><th></th></tr></thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr key={i} className="calc-row">
                    <td><input value={a.name} onChange={(e) => update(i, 'name', e.target.value)} style={{ width: 130 }} /></td>
                    <td><input type="number" value={a.cost} onChange={(e) => update(i, 'cost', e.target.value)} style={{ width: 80 }} /></td>
                    <td>
                      <select value={a.yr} onChange={(e) => update(i, 'yr', e.target.value)}>
                        {Array.from({ length: years + 1 }, (_, y) => <option key={y} value={y}>År {y}</option>)}
                      </select>
                    </td>
                    <td><input type="number" min={1} max={30} value={a.life} onChange={(e) => update(i, 'life', e.target.value)} style={{ width: 70 }} /></td>
                    <td className="calc-value">{a.life > 0 ? (a.cost / a.life).toFixed(1) : '—'}</td>
                    <td>
                      {assets.length > 1 && (
                        <button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)', fontSize: 11, padding: '2px 8px' }}
                          onClick={() => setAssets(assets.filter((_, ai) => ai !== i))}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn" onClick={() => setAssets([...assets, { name: `Eiendel ${assets.length + 1}`, cost: 20, yr: 0, life: 5 }])}>
            + Legg til eiendel
          </button>

          {plan && (
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table className="pl-table">
                <thead><tr><th></th>{plan.years.map((y) => <th key={y}>År {y}</th>)}</tr></thead>
                <tbody>
                  <tr className="calc-row" style={{ fontWeight: 700 }}>
                    <td>Total D&amp;A per år</td>
                    {plan.years.map((y) => <td key={y} className="calc-value" style={{ color: 'var(--acc)' }}>{plan.daPerYear[y].toFixed(1)}</td>)}
                  </tr>
                  <tr className="calc-row" style={{ fontWeight: 700 }}>
                    <td>Total CapEx per år (investeringsår)</td>
                    {plan.years.map((y) => <td key={y} className="calc-value" style={{ color: '#a78bfa' }}>{(plan.capexPerYear[y] ?? 0).toFixed(1)}</td>)}
                  </tr>
                </tbody>
              </table>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn" style={{ color: 'var(--acc)', borderColor: 'var(--acc)' }} onClick={() => onApplyDa(plan.daPerYear)}>
                  Overfør D&amp;A til P&amp;L →
                </button>
                <button className="btn" style={{ color: '#a78bfa', borderColor: '#a78bfa' }} onClick={() => onApplyCapex(plan.capexPerYear)}>
                  Overfør CapEx til P&amp;L →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
