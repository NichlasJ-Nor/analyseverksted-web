import { Bar } from 'react-chartjs-2';
import type { CompRange } from '../calc/comparables';

/** Football-field / verdsettelsesspenn. Portert fra HTML-appens drawFootball(). */
export default function FootballChart({
  dcfEq, dcfWacc, dcfG, fcf, netDebt, minority, otherAdj,
  terminalMethod, exitMultiple, lastEbitda,
  compEbEq, compRevEq, ebRange, revRange, cur,
}: {
  dcfEq: number;
  dcfWacc: number;
  dcfG: number;
  fcf: number[];
  netDebt: number;
  minority: number;
  otherAdj: number;
  terminalMethod: 'gordon' | 'exit';
  exitMultiple: number;
  lastEbitda: number;
  compEbEq: number;
  compRevEq: number;
  ebRange: CompRange;
  revRange: CompRange;
  cur: string;
}) {
  const n = fcf.length;
  const lastFcf = fcf[n - 1] ?? 0;

  function calcEq(w: number, g: number): number {
    let pv = 0;
    fcf.forEach((cf, i) => { pv += cf / Math.pow(1 + w, i + 1); });
    let tv: number;
    if (terminalMethod === 'exit') {
      tv = lastEbitda * exitMultiple;
    } else {
      if (w <= g) return NaN;
      tv = (lastFcf * (1 + g)) / (w - g);
    }
    pv += tv / Math.pow(1 + w, n);
    return pv - netDebt - minority + otherAdj;
  }

  const dcfLo = calcEq(dcfWacc + 0.02, dcfG - 0.01);
  const dcfHi = calcEq(dcfWacc - 0.02, dcfG + 0.01);

  const labels = ['DCF', 'EV/EBITDA', 'EV/Omsetning'];
  const ebLo = Math.min(ebRange.lo, ebRange.hi);
  const ebHi = Math.max(ebRange.lo, ebRange.hi);
  const revLo = Math.min(revRange.lo, revRange.hi);
  const revHi = Math.max(revRange.lo, revRange.hi);

  const lo = [Math.min(dcfLo, dcfEq), ebLo, revLo];
  const hi = [Math.max(dcfHi, dcfEq), ebHi, revHi];
  const mid = [dcfEq, compEbEq, compRevEq];

  function fmt(v: number) {
    if (!isFinite(v)) return '—';
    const sign = v < 0 ? '−' : '';
    return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
  }

  return (
    <div className="card">
      <div className="card-title">Verdsettelsesspenn (football field)</div>
      <div style={{ height: 220 }}>
        <Bar
          data={{
            labels,
            datasets: [
              { data: lo, backgroundColor: 'transparent', borderWidth: 0, barPercentage: 0.5 },
              {
                data: hi.map((v, i) => v - lo[i]),
                backgroundColor: ['rgba(82,235,176,.5)', 'rgba(92,138,138,.5)', 'rgba(92,138,138,.5)'],
                borderRadius: 4,
                barPercentage: 0.5,
              },
            ],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  title: (items) => labels[items[0].dataIndex],
                  label: (item) =>
                    item.datasetIndex === 1
                      ? `${fmt(lo[item.dataIndex])} — ${fmt(hi[item.dataIndex])} (midt: ${fmt(mid[item.dataIndex])})`
                      : '',
                },
              },
            },
            scales: {
              x: { stacked: true, grid: { color: '#2e4444' }, ticks: { color: '#8aafaf' } },
              y: { stacked: true, grid: { display: false }, ticks: { color: '#e8f5f5', font: { size: 13 } } },
            },
          }}
        />
      </div>
    </div>
  );
}
