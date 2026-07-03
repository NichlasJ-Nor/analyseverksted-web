import { Bar } from 'react-chartjs-2';

/** EV → Egenkapital-bro. Portert fra HTML-appens drawWaterfall(). */
export default function WaterfallChart({
  fcf, wacc, pvTerminal, netDebt, minority, otherAdj, equity, cur,
}: {
  fcf: number[];
  wacc: number;
  pvTerminal: number;
  netDebt: number;
  minority: number;
  otherAdj: number;
  equity: number;
  cur: string;
}) {
  const pvYears = fcf.map((cf, i) => cf / Math.pow(1 + wacc, i + 1));

  const labels = [...pvYears.map((_, i) => `FCF År ${i + 1}`), 'PV Terminal', '= EV', '- Netto gjeld', '= Egenkapital'];
  const bases: number[] = [];
  const values: number[] = [];
  const colors: string[] = [];

  let running = 0;
  pvYears.forEach((pv) => {
    bases.push(running); values.push(pv); colors.push('rgba(82,235,176,.7)');
    running += pv;
  });
  bases.push(running); values.push(pvTerminal); colors.push('rgba(230,168,23,.7)');
  running += pvTerminal;
  const ev = running;
  bases.push(0); values.push(ev); colors.push('rgba(82,235,176,.35)');
  const debtAdj = -netDebt - minority + otherAdj;
  bases.push(ev); values.push(debtAdj); colors.push(netDebt > 0 ? 'rgba(224,90,82,.7)' : 'rgba(82,235,176,.7)');
  bases.push(0); values.push(equity); colors.push('rgba(240,255,255,.6)');

  function fmt(v: number) {
    if (!isFinite(v)) return '—';
    const sign = v < 0 ? '−' : '';
    return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
  }

  return (
    <div className="card">
      <div className="card-title">EV → Egenkapital (bro)</div>
      <div style={{ height: 300 }}>
        <Bar
          data={{
            labels,
            datasets: [
              { data: bases, backgroundColor: 'transparent', borderWidth: 0, barPercentage: 0.6 },
              { data: values, backgroundColor: colors, borderRadius: 3, barPercentage: 0.6 },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: (ctx) => (ctx.datasetIndex === 1 ? fmt(ctx.raw as number) : '') } },
            },
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { color: '#8aafaf', font: { size: 10 } } },
              y: { stacked: true, grid: { color: '#2e4444' }, ticks: { color: '#8aafaf' } },
            },
          }}
        />
      </div>
    </div>
  );
}
