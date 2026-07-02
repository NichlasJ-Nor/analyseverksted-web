import { create } from 'zustand';
import type { PLYearInput } from '../calc/pl';
import type { TerminalMethod } from '../calc/dcf';

const DEFAULT_YEARS: PLYearInput[] = [
  { rev: 280, cogs: -140, opex: -80, da: -15, capex: -20, dwc: -5 },
  { rev: 310, cogs: -150, opex: -85, da: -18, capex: -22, dwc: -3 },
  { rev: 345, cogs: -162, opex: -90, da: -20, capex: -25, dwc: -4 },
  { rev: 380, cogs: -175, opex: -95, da: -22, capex: -28, dwc: -2 },
  { rev: 415, cogs: -188, opex: -100, da: -24, capex: -30, dwc: -3 },
];

export interface DcfState {
  name: string;
  currency: string;
  years: PLYearInput[];
  taxRate: number;         // desimal
  wacc: number;            // desimal
  terminalGrowth: number;  // desimal
  terminalMethod: TerminalMethod;
  exitMultiple: number;
  netDebt: number;
  minority: number;
  otherAdj: number;
  shares: number;          // i tusen
  i0: number;              // kjøpspris

  setName: (name: string) => void;
  setYearField: (index: number, field: keyof PLYearInput, value: number) => void;
  addYear: () => void;
  removeYear: () => void;
  setField: <K extends keyof DcfState>(field: K, value: DcfState[K]) => void;
  reset: () => void;
}

const initial = {
  name: 'Ny analyse',
  currency: 'MNOK',
  years: DEFAULT_YEARS,
  taxRate: 0.22,
  wacc: 0.095,
  terminalGrowth: 0.025,
  terminalMethod: 'gordon' as TerminalMethod,
  exitMultiple: 8,
  netDebt: 30,
  minority: 0,
  otherAdj: 0,
  shares: 1000,
  i0: 0,
};

export const useDcfStore = create<DcfState>((set) => ({
  ...initial,
  setName: (name) => set({ name }),
  setYearField: (index, field, value) =>
    set((s) => ({
      years: s.years.map((y, i) => (i === index ? { ...y, [field]: value } : y)),
    })),
  addYear: () =>
    set((s) => ({
      years: [...s.years, { rev: 0, cogs: 0, opex: 0, da: 0, capex: 0, dwc: 0 }],
    })),
  removeYear: () =>
    set((s) => ({ years: s.years.length > 1 ? s.years.slice(0, -1) : s.years })),
  setField: (field, value) => set({ [field]: value } as Partial<DcfState>),
  reset: () => set(initial),
}));
