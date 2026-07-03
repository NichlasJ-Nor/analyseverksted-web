import { useState } from 'react';
import { comparablesValuation, type Comp } from '../calc/comparables';
import FootballChart from './FootballChart';

export default function ComparablesTool({
  lastEbitda, lastRevenue, netDebt, minority, otherAdj,
  dcfEq, dcfWacc, dcfG, fcf, terminalMethod, exitMultiple, cur,
}: {
  lastEbitda: number;
  lastRevenue: number;
  netDebt: number;
  minority: number;
  otherAdj: number;
  dcfEq: number;
  dcfWacc: number;
  dcfG: number;
  fcf: number[];
  terminalMethod: 'gordon' | 'exit';
  exitMultiple: number;
  cur: string;
}) {
  const [open, setOpen] = useState(false);
  const [comps, setComps] = useState<Comp[]>([
    { name: 'Peer 1', evEbitda: 8, evRev: 1.5 },
    { name: 'Peer 2', evEbitda: 10, evRev: 2.0 },
    { name: 'Peer 3', evEbitda: 12, evRev: 2.5 },
  ]);

  function update(i: number, field: keyof Comp, value: string) {
    setComps(comps.map((c, ci) => (ci !== i ? c : { ...c, [field]: field === 'name' ? value : +value })));
  }

  const result = comps.length >= 2
    ? comparablesValuation(comps, lastEbitda, lastRevenue, netDebt, minority, otherAdj)
    : null;

  return (
    <div className="card">
      <div className="card-title" style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'} Komparative selskaper (multippel-verdsettelse) <span style={{ color: 'var(--t-mid)', fontWeight: 400, fontSize: 11 }}>— valgfritt</span></span>
      </div>
      {open && (
        <>
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table className="pl-table">
              <thead><tr><th>Selskap</th><th>EV/EBITDA</th><th>EV/Omsetning</th><th></th></tr></thead>
              <tbody>
                {comps.map((c, i) => (
                  <tr key={i} className="calc-row">
                    <td><input value={c.name} onChange={(e) => update(i, 'name', e.target.value)} style={{ width: 110 }} /></td>
                    <td><input type="number" step="0.1" value={c.evEbitda} onChange={(e) => update(i, 'evEbitda', e.target.value)} style={{ width: 70 }} /></td>
                    <td><input type="number" step="0.1" value={c.evRev} onChange={(e) => update(i, 'evRev', e.target.value)} style={{ width: 70 }} /></td>
                    <td>
                      <button className="btn" style={{ color: 'var(--neg)', borderColor: 'var(--neg)' }}
                        onClick={() => setComps(comps.filter((_, ci) => ci !== i))}>Fjern</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn" onClick={() => setComps([...comps, { name: `Peer ${comps.length + 1}`, evEbitda: 10, evRev: 2 }])}>
            + Legg til selskap
          </button>

          {result && (
            <div style={{ marginTop: 16 }}>
              <FootballChart
                dcfEq={dcfEq}
                dcfWacc={dcfWacc}
                dcfG={dcfG}
                fcf={fcf}
                netDebt={netDebt}
                minority={minority}
                otherAdj={otherAdj}
                terminalMethod={terminalMethod}
                exitMultiple={exitMultiple}
                lastEbitda={lastEbitda}
                compEbEq={result.compEbitdaEq}
                compRevEq={result.compRevEq}
                ebRange={result.ebRange}
                revRange={result.revRange}
                cur={cur}
              />
            </div>
          )}
          {comps.length < 2 && (
            <p style={{ fontSize: 12, color: 'var(--t-mid)', marginTop: 10 }}>Legg til minst 2 selskaper for å vise spennet.</p>
          )}
        </>
      )}
    </div>
  );
}
