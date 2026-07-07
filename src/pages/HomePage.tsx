import { useMemo } from 'react';
import { useDcfStore } from '../store/dcfStore';
import { useInvestStore } from '../store/investStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { useScenarioStore } from '../store/scenarioStore';
import { useMonteCarloStore } from '../store/monteCarloStore';
import { useUiStore, type Tool } from '../store/uiStore';
import { calcPLYears } from '../calc/pl';
import { dcf } from '../calc/dcf';
import { evaluateAlternative } from '../calc/invest';
import { evaluatePfProject, summarizePortfolio } from '../calc/portfolio';
import { computeScenario } from '../calc/scenario';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

interface DashRow { label: string; value: string }
interface DashSection { title: string; color: string; icon: string; tool: Tool; rows: DashRow[] }

const ICONS: Record<string, string> = {
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  layers: '<path d="M12 2 20.5 6.75 12 11.5 3.5 6.75 12 2Z"/><path d="m3.5 11.75 8.5 4.75 8.5-4.75"/><path d="m3.5 16.75 8.5 4.75 8.5-4.75"/>',
  scale: '<path d="M12 3v18"/><path d="M5 8h14"/><path d="M5 8 2 15h6l-3-7Z"/><path d="M19 8l-3 7h6l-3-7Z"/>',
};

function Icon({ name, color }: { name: string; color: string }) {
  return (
    <svg style={{ width: 15, height: 15, verticalAlign: -2, color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  );
}

export default function HomePage() {
  const dcfState = useDcfStore();
  const invState = useInvestStore();
  const pfState = usePortfolioStore();
  const scenState = useScenarioStore();
  const mcState = useMonteCarloStore();
  const setTool = useUiStore((u) => u.setTool);

  const sections = useMemo<DashSection[]>(() => {
    const out: DashSection[] = [];

    try {
      const plResults = calcPLYears(dcfState.years, dcfState.taxRate);
      const lastEbitda = plResults[plResults.length - 1]?.ebitda ?? 0;
      const d = dcf({
        fcf: plResults.map((y) => y.fcf),
        wacc: dcfState.wacc,
        g: dcfState.terminalGrowth,
        terminalMethod: dcfState.terminalMethod,
        exitMultiple: dcfState.exitMultiple,
        lastEbitda,
        netDebt: dcfState.netDebt,
        minority: dcfState.minority,
        otherAdj: dcfState.otherAdj,
        i0: dcfState.i0,
      });
      out.push({
        title: 'Verdsettelse / DCF', color: '#52ebb0', icon: 'trend', tool: 'dcf',
        rows: [
          { label: 'Enterprise Value', value: fmt(d.ev, dcfState.currency) },
          { label: 'Egenkapitalverdi', value: fmt(d.equity, dcfState.currency) },
          { label: 'WACC', value: (dcfState.wacc * 100).toFixed(1) + '%' },
          { label: 'Terminal g', value: (dcfState.terminalGrowth * 100).toFixed(1) + '%' },
          { label: 'IRR', value: d.irr !== null ? (d.irr * 100).toFixed(1) + '%' : '—' },
          { label: 'TV-andel', value: d.tvPctOfEv.toFixed(0) + '%' },
        ],
      });
    } catch {
      // WACC <= g e.l. — utelat DCF-kortet stille, samme som HTML-originalen
    }

    if (mcState.lastSummary) {
      const m = mcState.lastSummary;
      out.push({
        title: 'Monte Carlo', color: '#e6a817', icon: 'dice', tool: 'montecarlo',
        rows: [
          { label: 'P50 (median)', value: fmt(m.p50, m.unit) },
          { label: 'P85', value: fmt(m.p85, m.unit) },
          { label: 'P90', value: fmt(m.p90, m.unit) },
          { label: 'Forventningsverdi', value: fmt(m.mean, m.unit) },
          { label: 'Simuleringer', value: m.n.toLocaleString('no') },
          { label: 'Sannsynlighet ≥ 0', value: m.probPos !== null ? m.probPos.toFixed(1) + '%' : '—' },
        ],
      });
    }

    if (invState.alternatives.length > 0) {
      const results = invState.alternatives.map((a) => evaluateAlternative(a, invState.rate));
      const best = [...results].sort((a, b) => b.npv - a.npv)[0];
      const profitable = results.filter((r) => r.npv > 0).length;
      out.push({
        title: 'Investeringsanalyse', color: '#5c8a8a', icon: 'coins', tool: 'invest',
        rows: [
          { label: 'Beste alternativ', value: best.name },
          { label: 'Beste NPV', value: fmt(best.npv, invState.currency) },
          { label: 'Beste IRR', value: best.irr !== null ? (best.irr * 100).toFixed(1) + '%' : '—' },
          { label: 'Antall alternativer', value: String(results.length) },
          { label: 'Lønnsomme', value: `${profitable} av ${results.length}` },
          { label: 'Avkastningskrav', value: (invState.rate * 100).toFixed(1) + '%' },
        ],
      });
    }

    if (pfState.projects.length > 0) {
      const active = pfState.projects.filter((p) => p.active).map((p) => ({ ...p, rate: p.rate || pfState.globalRate }));
      if (active.length > 0) {
        const results = active.map(evaluatePfProject);
        const summary = summarizePortfolio(results);
        out.push({
          title: 'Prosjektportefølje', color: '#8a52eb', icon: 'layers', tool: 'portfolio',
          rows: [
            { label: 'Antall prosjekter', value: String(results.length) },
            { label: 'Total NPV', value: fmt(summary.totalNPV, pfState.currency) },
            { label: 'Lønnsomme prosjekter', value: `${summary.profitableCount} av ${results.length}` },
            { label: 'Beste prosjekt', value: summary.ranked[0]?.name ?? '—' },
            { label: 'Beste NPV', value: fmt(summary.ranked[0]?.npv ?? 0, pfState.currency) },
            { label: 'Total I₀', value: fmt(summary.totalI0, pfState.currency) },
          ],
        });
      }
    }

    try {
      const r = computeScenario(scenState.base, {
        netDebt: scenState.netDebt, shares: scenState.shares,
        tvMethod: scenState.tvMethod, exitMultiple: scenState.exitMultiple,
      });
      out.push({
        title: 'Scenarioanalyse', color: '#e05a52', icon: 'scale', tool: 'scenario',
        rows: [
          { label: 'Base EV', value: fmt(r.ev, scenState.currency) },
          { label: 'Base egenkapital', value: fmt(r.equity, scenState.currency) },
          { label: 'WACC', value: (r.wacc * 100).toFixed(1) + '%' },
          { label: 'Terminal g', value: (r.g * 100).toFixed(1) + '%' },
          { label: 'TV-andel', value: r.tvPct.toFixed(0) + '%' },
          { label: 'Verdi per aksje', value: fmt(r.perShare, scenState.currency.replace('M', '')) },
        ],
      });
    } catch {
      // WACC <= g i base-scenariet — utelat kortet stille
    }

    return out;
  }, [dcfState, invState, pfState, scenState, mcState.lastSummary]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="card-title" style={{ marginBottom: 4 }}>Analyseresultater</div>
      <p style={{ fontSize: 12, color: 'var(--t-mid)', marginBottom: 16 }}>
        Oversikt over nøkkeltall fra alle verktøy. Klikk på et kort for å åpne fanen.
      </p>

      {sections.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--t-mid)', fontSize: 13, border: '1px dashed #2e4444', borderRadius: 8 }}>
          Kjør en analyse for å se nøkkeltall her.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {sections.map((s) => (
            <div key={s.title} onClick={() => setTool(s.tool)}
              style={{ background: '#182828', border: '1px solid #2e4444', borderTop: `3px solid ${s.color}`, borderRadius: 8, padding: 14, cursor: 'pointer' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name={s.icon} color={s.color} /> {s.title}
              </div>
              {s.rows.map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', borderBottom: '1px solid #1a2b2b' }}>
                  <span style={{ fontSize: 11, color: 'var(--t-mid)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-body)' }}>{r.value}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: '#3a5555', marginTop: 8, textAlign: 'right' }}>Klikk for å åpne →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
