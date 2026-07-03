import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import '../lib/chartSetup';
import { useDcfStore } from '../store/dcfStore';
import { calcPLYears, type PLYearInput } from '../calc/pl';
import { wacc as calcWacc, dcf } from '../calc/dcf';
import RevenueBuilder from '../components/RevenueBuilder';
import WorkingCapitalTool from '../components/WorkingCapitalTool';
import DebtScheduleTool from '../components/DebtScheduleTool';
import SensitivityPanel from '../components/SensitivityPanel';

const ROW_LABELS: { key: keyof PLYearInput; label: string; sign: 1 | -1 }[] = [
  { key: 'rev', label: 'Omsetning', sign: 1 },
  { key: 'cogs', label: 'Varekostnad (COGS)', sign: -1 },
  { key: 'opex', label: 'Faste driftskostnader', sign: -1 },
  { key: 'da', label: 'Avskrivninger (D&A)', sign: -1 },
  { key: 'capex', label: 'CapEx', sign: -1 },
  { key: 'dwc', label: 'Δ Arbeidskapital', sign: -1 },
];

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

export default function DcfPage() {
  const s = useDcfStore();
  const [waccInputs, setWaccInputs] = useState({
    rf: 0.038, erp: 0.05, beta: 1.0, kd: 0.05, debtWeight: 0.2,
  });

  const waccResult = useMemo(
    () => calcWacc({ ...waccInputs, tax: s.taxRate }),
    [waccInputs, s.taxRate]
  );

  const plResults = useMemo(
    () => calcPLYears(s.years, s.taxRate),
    [s.years, s.taxRate]
  );

  const [result, setResult] = useState<ReturnType<typeof dcf> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runDcf() {
    setError(null);
    try {
      const lastEbitda = plResults[plResults.length - 1]?.ebitda ?? 0;
      const r = dcf({
        fcf: plResults.map((y) => y.fcf),
        wacc: s.wacc,
        g: s.terminalGrowth,
        terminalMethod: s.terminalMethod,
        exitMultiple: s.exitMultiple,
        lastEbitda,
        netDebt: s.netDebt,
        minority: s.minority,
        otherAdj: s.otherAdj,
        i0: s.i0,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukjent feil');
      setResult(null);
    }
  }

  const perShare = result ? result.equity / (s.shares / 1000) : 0;

  return (
    <div className="container">
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Verdsettelse / DCF</h1>
      <p className="info" style={{ marginBottom: 20 }}>
        Bygg opp fri kontantstrøm fra resultatregnskapet og beregn selskapsverdi.
      </p>

      {/* WACC-kalkulator */}
      <div className="card">
        <div className="card-title">
          <span>WACC-kalkulator</span>
          <button className="btn" onClick={() => s.setField('wacc', waccResult.wacc)}>
            Bruk beregnet WACC ({(waccResult.wacc * 100).toFixed(1)}%) →
          </button>
        </div>
        <div className="settings-row">
          <div className="field">
            <label>Risikofri rente (%)</label>
            <input type="number" step="0.1" value={waccInputs.rf * 100}
              onChange={(e) => setWaccInputs((w) => ({ ...w, rf: +e.target.value / 100 }))} />
          </div>
          <div className="field">
            <label>ERP (%)</label>
            <input type="number" step="0.1" value={waccInputs.erp * 100}
              onChange={(e) => setWaccInputs((w) => ({ ...w, erp: +e.target.value / 100 }))} />
          </div>
          <div className="field">
            <label>Beta</label>
            <input type="number" step="0.05" value={waccInputs.beta}
              onChange={(e) => setWaccInputs((w) => ({ ...w, beta: +e.target.value }))} />
          </div>
          <div className="field">
            <label>Gjeldskostnad (%)</label>
            <input type="number" step="0.1" value={waccInputs.kd * 100}
              onChange={(e) => setWaccInputs((w) => ({ ...w, kd: +e.target.value / 100 }))} />
          </div>
          <div className="field">
            <label>Gjeldsandel (%)</label>
            <input type="number" step="1" value={waccInputs.debtWeight * 100}
              onChange={(e) => setWaccInputs((w) => ({ ...w, debtWeight: +e.target.value / 100 }))} />
          </div>
          <div className="field">
            <label>Ke / Kd(1−t) / WACC</label>
            <div style={{ fontSize: 13, color: 'var(--t-body)', padding: '7px 0' }}>
              {(waccResult.ke * 100).toFixed(1)}% / {(waccResult.kdAfterTax * 100).toFixed(1)}% /{' '}
              <b style={{ color: 'var(--acc)' }}>{(waccResult.wacc * 100).toFixed(1)}%</b>
            </div>
          </div>
        </div>
      </div>

      {/* Innstillinger */}
      <div className="card">
        <div className="card-title">Innstillinger</div>
        <div className="settings-row">
          <div className="field">
            <label>Valuta</label>
            <input value={s.currency} onChange={(e) => s.setField('currency', e.target.value)} style={{ width: 80 }} />
          </div>
          <div className="field">
            <label>WACC (%)</label>
            <input type="number" step="0.1" value={s.wacc * 100}
              onChange={(e) => s.setField('wacc', +e.target.value / 100)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>Skattesats (%)</label>
            <input type="number" step="1" value={s.taxRate * 100}
              onChange={(e) => s.setField('taxRate', +e.target.value / 100)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>Terminalmetode</label>
            <select value={s.terminalMethod} onChange={(e) => s.setField('terminalMethod', e.target.value as 'gordon' | 'exit')}>
              <option value="gordon">Gordon-vekst</option>
              <option value="exit">Exit-multippel</option>
            </select>
          </div>
          {s.terminalMethod === 'gordon' ? (
            <div className="field">
              <label>Terminal vekst g (%)</label>
              <input type="number" step="0.25" value={s.terminalGrowth * 100}
                onChange={(e) => s.setField('terminalGrowth', +e.target.value / 100)} style={{ width: 90 }} />
            </div>
          ) : (
            <div className="field">
              <label>Exit EV/EBITDA</label>
              <input type="number" step="0.5" value={s.exitMultiple}
                onChange={(e) => s.setField('exitMultiple', +e.target.value)} style={{ width: 90 }} />
            </div>
          )}
          <div className="field">
            <label>Netto gjeld</label>
            <input type="number" value={s.netDebt} onChange={(e) => s.setField('netDebt', +e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>Minoritet</label>
            <input type="number" value={s.minority} onChange={(e) => s.setField('minority', +e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>Andre justeringer</label>
            <input type="number" value={s.otherAdj} onChange={(e) => s.setField('otherAdj', +e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>Aksjer (tusen)</label>
            <input type="number" value={s.shares} onChange={(e) => s.setField('shares', +e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label>Kjøpspris (I₀)</label>
            <input type="number" value={s.i0} onChange={(e) => s.setField('i0', +e.target.value)} style={{ width: 100 }} />
          </div>
        </div>
      </div>

      <RevenueBuilder
        years={s.years.length}
        onApply={(vals) => vals.forEach((v, i) => s.setYearField(i, 'rev', v))}
      />
      <WorkingCapitalTool
        years={s.years.length}
        revenues={s.years.map((y) => y.rev)}
        cogsAbs={s.years.map((y) => Math.abs(y.cogs))}
        onApply={(dwc) => dwc.forEach((v, i) => s.setYearField(i, 'dwc', v))}
      />
      <DebtScheduleTool
        years={s.years.length}
        onApplyNetDebt={(finalBalance) => s.setField('netDebt', finalBalance)}
      />

      {/* P&L-tabell */}
      <div className="card">
        <div className="card-title">
          <span>Resultatregnskap → Fri kontantstrøm</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={s.addYear}>+ År</button>
            <button className="btn" onClick={s.removeYear}>− År</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead>
              <tr>
                <th></th>
                {s.years.map((_, i) => <th key={i}>År {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROW_LABELS.map(({ key, label }) => (
                <tr key={key}>
                  <td>{label}</td>
                  {s.years.map((y, i) => (
                    <td key={i}>
                      <input
                        type="number"
                        value={y[key]}
                        onChange={(e) => s.setYearField(i, key, +e.target.value || 0)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="calc-row">
                <td>Bruttofortjeneste</td>
                {plResults.map((r, i) => <td key={i} className="calc-value">{r.gross.toFixed(1)}</td>)}
              </tr>
              <tr className="calc-row">
                <td>EBITDA</td>
                {plResults.map((r, i) => <td key={i} className="calc-value">{r.ebitda.toFixed(1)}</td>)}
              </tr>
              <tr className="calc-row">
                <td>EBIT</td>
                {plResults.map((r, i) => <td key={i} className="calc-value">{r.ebit.toFixed(1)}</td>)}
              </tr>
              <tr className="calc-row">
                <td>Skatt</td>
                {plResults.map((r, i) => <td key={i} className="calc-value">{r.tax.toFixed(1)}</td>)}
              </tr>
              <tr className="calc-row" style={{ fontWeight: 700 }}>
                <td style={{ color: 'var(--acc)' }}>Fri kontantstrøm (FCF)</td>
                {plResults.map((r, i) => <td key={i} className="calc-value" style={{ color: 'var(--acc)' }}>{r.fcf.toFixed(1)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '28px 0' }}>
        <button className="btn-run" onClick={runDcf}>▶ Beregn verdsettelse</button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--neg)', color: 'var(--neg)' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {result.tvPctOfEv > 80 && (
            <div className="card" style={{
              borderColor: result.tvPctOfEv > 90 ? 'var(--neg)' : 'var(--warn)',
              background: result.tvPctOfEv > 90 ? '#2a0a0a' : '#2a1e00',
            }}>
              <b style={{ color: result.tvPctOfEv > 90 ? 'var(--neg)' : 'var(--warn)' }}>
                TV-advarsel: Terminalverdi = {result.tvPctOfEv.toFixed(0)}% av EV
              </b>
              <p style={{ fontSize: 12.5, color: 'var(--t-body)', marginTop: 6 }}>
                {result.tvPctOfEv > 90
                  ? 'Terminalverdien dominerer fullstendig. Verdsettelsen er ekstremt sensitiv for WACC og g.'
                  : 'Over 80% av EV stammer fra kontantstrømmer utenfor prognoseperioden. Vurder å forlenge perioden eller sjekk terminal-antagelsene.'}
              </p>
            </div>
          )}

          <div className="stats-row">
            <div className="stat accent">
              <div className="lbl">Enterprise Value</div>
              <div className="val">{fmt(result.ev, s.currency)}</div>
            </div>
            <div className="stat">
              <div className="lbl">Egenkapitalverdi</div>
              <div className="val">{fmt(result.equity, s.currency)}</div>
            </div>
            <div className="stat">
              <div className="lbl">Verdi per aksje</div>
              <div className="val">{fmt(perShare, s.currency.replace('M', ''))}</div>
            </div>
            <div className={`stat ${result.tvPctOfEv > 80 ? 'warn' : ''}`}>
              <div className="lbl">PV terminalverdi</div>
              <div className="val">{result.tvPctOfEv.toFixed(0)}%</div>
            </div>
            <div className={`stat ${s.i0 > 0 ? (result.npv >= 0 ? 'accent' : 'neg') : ''}`}>
              <div className="lbl">{s.i0 > 0 ? 'NPV (EV − I₀)' : 'Enterprise Value = NPV'}</div>
              <div className="val">{fmt(result.npv, s.currency)}</div>
            </div>
            <div className="stat">
              <div className="lbl">{s.i0 > 0 ? 'IRR (kjøpspris)' : 'Implisitt IRR'}</div>
              <div className="val">{result.irr !== null ? (result.irr * 100).toFixed(1) + '%' : 'N/A'}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Fri kontantstrøm per år</div>
            <div style={{ height: 260 }}>
              <Bar
                data={{
                  labels: plResults.map((_, i) => `År ${i + 1}`),
                  datasets: [{
                    label: `FCF (${s.currency})`,
                    data: plResults.map((r) => r.fcf),
                    backgroundColor: plResults.map((r) =>
                      r.fcf >= 0 ? 'rgba(82,235,176,0.7)' : 'rgba(224,90,82,0.7)'
                    ),
                    borderRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                    y: { ticks: { color: '#8aafaf' }, grid: { color: '#2e4444' } },
                  },
                }}
              />
            </div>
          </div>

          <SensitivityPanel
            input={{
              fcf: plResults.map((r) => r.fcf),
              wacc: s.wacc,
              g: s.terminalGrowth,
              terminalMethod: s.terminalMethod,
              exitMultiple: s.exitMultiple,
              lastEbitda: plResults[plResults.length - 1]?.ebitda ?? 0,
              netDebt: s.netDebt,
              minority: s.minority,
              otherAdj: s.otherAdj,
            }}
            ev={result.ev}
            cur={s.currency}
          />
        </>
      )}
    </div>
  );
}
