import ExcelJS from 'exceljs';
import type { PLYearResult } from '../calc/pl';
import type { DcfResult } from '../calc/dcf';

export async function exportDcfToExcel(opts: {
  projectName: string;
  currency: string;
  plResults: PLYearResult[];
  wacc: number;
  terminalGrowth: number;
  result: DcfResult;
  netDebt: number;
  minority: number;
  otherAdj: number;
  i0: number;
}) {
  const { projectName, currency, plResults, wacc, terminalGrowth, result, netDebt, minority, otherAdj, i0 } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sprint Analyseverksted';
  wb.created = new Date(0);

  const pl = wb.addWorksheet('P&L');
  const headerRow = ['Post', ...plResults.map((_, i) => `År ${i + 1}`)];
  pl.addRow(headerRow).font = { bold: true };
  pl.addRow(['Omsetning', ...plResults.map((r) => r.rev)]);
  pl.addRow(['Varekostnad (COGS)', ...plResults.map((r) => r.cogs)]);
  pl.addRow(['Bruttofortjeneste', ...plResults.map((r) => r.gross)]);
  pl.addRow(['Driftskostnader', ...plResults.map((r) => r.opex)]);
  pl.addRow(['EBITDA', ...plResults.map((r) => r.ebitda)]);
  pl.addRow(['Avskrivninger', ...plResults.map((r) => r.da)]);
  pl.addRow(['EBIT', ...plResults.map((r) => r.ebit)]);
  pl.addRow(['Skatt', ...plResults.map((r) => r.tax)]);
  pl.addRow(['NOPAT', ...plResults.map((r) => r.nopat)]);
  pl.addRow(['CapEx', ...plResults.map((r) => r.capex)]);
  pl.addRow(['Δ Arbeidskapital', ...plResults.map((r) => r.dwc)]);
  pl.addRow(['Fri kontantstrøm (FCF)', ...plResults.map((r) => r.fcf)]).font = { bold: true };
  pl.columns.forEach((c) => { c.width = 16; });

  const dcf = wb.addWorksheet('DCF-verdsettelse');
  dcf.addRow(['Prosjekt', projectName]);
  dcf.addRow(['Valuta', currency]);
  dcf.addRow([]);
  dcf.addRow(['WACC', wacc]).getCell(2).numFmt = '0.0%';
  dcf.addRow(['Terminal vekst (g)', terminalGrowth]).getCell(2).numFmt = '0.0%';
  dcf.addRow(['Netto gjeld', netDebt]);
  dcf.addRow(['Minoritet', minority]);
  dcf.addRow(['Andre justeringer', otherAdj]);
  dcf.addRow(['Kjøpspris (I0)', i0]);
  dcf.addRow([]);
  dcf.addRow(['PV fri kontantstrøm', result.pvFcf]).font = { bold: true };
  dcf.addRow(['Terminalverdi', result.terminalValue]);
  dcf.addRow(['PV terminalverdi', result.pvTerminal]);
  dcf.addRow(['Enterprise Value (EV)', result.ev]).font = { bold: true };
  dcf.addRow(['Egenkapitalverdi', result.equity]).font = { bold: true };
  dcf.addRow(['TV andel av EV', result.tvPctOfEv / 100]).getCell(2).numFmt = '0.0%';
  dcf.addRow(['NPV (EV - I0)', result.npv]);
  dcf.addRow(['IRR', result.irr]).getCell(2).numFmt = '0.0%';
  dcf.getColumn(1).width = 26;
  dcf.getColumn(2).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'DCF'}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
