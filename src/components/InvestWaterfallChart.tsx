import { Bar } from 'react-chartjs-2';

/** Kontantstrøm-waterfall for ett investeringsalternativ. Portert fra renderWaterfall() i HTML-appen. */
export default function InvestWaterfallChart({ i0, cfs, cur }: { i0: number; cfs: number[]; cur: string }) {
  const allCFs = [-i0, ...cfs];
  const labels = ['I₀', ...cfs.map((_, i) => `År ${i + 1}`), 'Total'];
  const POSITIVE = 'rgba(82,235,176,0.75)';
  const NEGATIVE = 'rgba(224,90,82,0.75)';
  const TOTAL = 'rgba(92,138,138,0.80)';

  const ranges: [number, number][] = [];
  const colors: string[] = [];
  let running = 0;
  allCFs.forEach((cf) => {
    const start = running;
    const end = running + cf;
    ranges.push([Math.min(start, end), Math.max(start, end)]);
    colors.push(cf >= 0 ? POSITIVE : NEGATIVE);
    running = end;
  });
  const totalVal = running;
  ranges.push([Math.min(0, totalVal), Math.max(0, totalVal)]);
  colors.push(TOTAL);

  function fmt(v: number) {
    if (!isFinite(v)) return '—';
    const sign = v < 0 ? '−' : '';
    return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
  }

  return (
    <div style={{ height: 260 }}>
      <Bar
        data={{ labels, datasets: [{ data: ranges, backgroundColor: colors, borderRadius: 3, barPercentage: 0.6 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const i = ctx.dataIndex;
                  const val = i === labels.length - 1 ? totalVal : allCFs[i];
                  return fmt(val);
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#8aafaf', font: { size: 11 } } },
            y: { grid: { color: '#2e4444' }, ticks: { color: '#8aafaf' } },
          },
        }}
      />
    </div>
  );
}
