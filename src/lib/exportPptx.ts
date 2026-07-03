import PptxGenJS from 'pptxgenjs';
import type { PLYearResult } from '../calc/pl';
import type { DcfResult } from '../calc/dcf';

const DARK = '293D3D';
const ACCENT = '52EBB0';
const LIGHT = 'F0FFFF';

function fmt(v: number, cur: string) {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toFixed(1)} ${cur}`;
}

export async function exportDcfToPptx(opts: {
  projectName: string;
  currency: string;
  plResults: PLYearResult[];
  wacc: number;
  terminalGrowth: number;
  result: DcfResult;
}) {
  const { projectName, currency, plResults, wacc, terminalGrowth, result } = opts;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'SPRINT', width: 13.333, height: 7.5 });
  pptx.layout = 'SPRINT';

  const title = pptx.addSlide();
  title.background = { color: DARK };
  title.addText(projectName || 'DCF-verdsettelse', {
    x: 0.6, y: 3.0, w: 12, h: 1, fontSize: 36, bold: true, color: LIGHT, fontFace: 'Arial',
  });
  title.addText('DCF-verdsettelse — Sprint Analyseverksted', {
    x: 0.6, y: 3.9, w: 12, h: 0.5, fontSize: 16, color: ACCENT, fontFace: 'Arial',
  });

  const summary = pptx.addSlide();
  summary.background = { color: DARK };
  summary.addText('Nøkkeltall', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: LIGHT, fontFace: 'Arial' });

  const tiles: [string, string][] = [
    ['Enterprise Value', fmt(result.ev, currency)],
    ['Egenkapitalverdi', fmt(result.equity, currency)],
    ['WACC', (wacc * 100).toFixed(1) + '%'],
    ['Terminal vekst (g)', (terminalGrowth * 100).toFixed(1) + '%'],
    ['TV andel av EV', result.tvPctOfEv.toFixed(0) + '%'],
    ['IRR', result.irr !== null ? (result.irr * 100).toFixed(1) + '%' : 'N/A'],
  ];
  tiles.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.2;
    const y = 1.4 + row * 2.0;
    summary.addShape('roundRect', { x, y, w: 3.9, h: 1.7, fill: { color: '1F2E2E' }, line: { color: '3A5555' }, rectRadius: 0.08 });
    summary.addText(label, { x: x + 0.25, y: y + 0.2, w: 3.4, h: 0.4, fontSize: 12, color: '8AAFAF', fontFace: 'Arial' });
    summary.addText(value, { x: x + 0.25, y: y + 0.6, w: 3.4, h: 0.8, fontSize: 24, bold: true, color: ACCENT, fontFace: 'Arial' });
  });

  const plSlide = pptx.addSlide();
  plSlide.background = { color: DARK };
  plSlide.addText('Resultatregnskap → Fri kontantstrøm', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: LIGHT, fontFace: 'Arial' });

  const rows = [
    ['Post', ...plResults.map((_, i) => `År ${i + 1}`)],
    ['Omsetning', ...plResults.map((r) => r.rev.toFixed(1))],
    ['EBITDA', ...plResults.map((r) => r.ebitda.toFixed(1))],
    ['EBIT', ...plResults.map((r) => r.ebit.toFixed(1))],
    ['Fri kontantstrøm (FCF)', ...plResults.map((r) => r.fcf.toFixed(1))],
  ];
  plSlide.addTable(
    rows.map((r, ri) => r.map((c) => ({
      text: c,
      options: { color: ri === 0 ? DARK : LIGHT, fill: { color: ri === 0 ? ACCENT : '1F2E2E' }, bold: ri === 0 || ri === rows.length - 1, fontSize: 12 },
    }))),
    { x: 0.5, y: 1.3, w: 12.3, fontFace: 'Arial', border: { type: 'solid', color: '3A5555', pt: 0.5 } }
  );

  await pptx.writeFile({ fileName: `${projectName || 'DCF'}.pptx` });
}
