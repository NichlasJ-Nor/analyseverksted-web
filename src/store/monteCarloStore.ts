import { create } from 'zustand';
import type { McItem, McEvent, DistType, SimMode } from '../calc/montecarlo';

const DEFAULT_ITEMS: McItem[] = [
  { name: 'Omsetning', opt: 250, ml: 300, pess: 340, timing: 'annual' },
  { name: 'Driftskostnader', opt: -180, ml: -160, pess: -145, timing: 'annual' },
  { name: 'Investering', opt: -220, ml: -200, pess: -180, timing: 'upfront' },
];

const DEFAULT_EVENTS: McEvent[] = [
  { name: 'Regulatorisk risiko', prob: 0.2, opt: -10, ml: -30, pess: -60, year: 2 },
];

export interface McSummary {
  p50: number;
  p85: number;
  p90: number;
  mean: number;
  n: number;
  unit: string;
  probPos: number | null;
}

export interface MonteCarloState {
  id: string | null;
  name: string;
  currency: string;
  numSims: number;
  dist: DistType;
  mode: SimMode;
  years: number;
  rate: number;
  items: McItem[];
  events: McEvent[];
  lastSummary: McSummary | null; // ikke persistert — kun for hjemskjermens dashboard-kort

  setName: (name: string) => void;
  setLastSummary: (summary: McSummary | null) => void;
  setCurrency: (c: string) => void;
  setNumSims: (n: number) => void;
  setDist: (d: DistType) => void;
  setMode: (m: SimMode) => void;
  setYears: (n: number) => void;
  setRate: (r: number) => void;
  setItemField: (index: number, field: keyof McItem, value: string | number) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  setEventField: (index: number, field: keyof McEvent, value: string | number) => void;
  addEvent: () => void;
  removeEvent: (index: number) => void;
  reset: () => void;
  loadFromState: (id: string, name: string, state: SerializableMcState) => void;
}

export type SerializableMcState = Pick<
  MonteCarloState, 'currency' | 'numSims' | 'dist' | 'mode' | 'years' | 'rate' | 'items' | 'events'
>;

const initial = {
  id: null as string | null,
  name: 'Ny Monte Carlo-simulering',
  currency: 'MNOK',
  numSims: 10000,
  dist: 'pert' as DistType,
  mode: 'npv' as SimMode,
  years: 5,
  rate: 0.10,
  items: DEFAULT_ITEMS,
  events: DEFAULT_EVENTS,
  lastSummary: null as McSummary | null,
};

export const useMonteCarloStore = create<MonteCarloState>((set) => ({
  ...initial,
  setName: (name) => set({ name }),
  setLastSummary: (lastSummary) => set({ lastSummary }),
  setCurrency: (currency) => set({ currency }),
  setNumSims: (numSims) => set({ numSims }),
  setDist: (dist) => set({ dist }),
  setMode: (mode) => set({ mode }),
  setYears: (years) => set({ years }),
  setRate: (rate) => set({ rate }),
  setItemField: (index, field, value) =>
    set((s) => ({ items: s.items.map((it, i) => (i !== index ? it : { ...it, [field]: value })) })),
  addItem: () =>
    set((s) => ({ items: [...s.items, { name: `Item ${s.items.length + 1}`, opt: 0, ml: 0, pess: 0, timing: 'annual' }] })),
  removeItem: (index) => set((s) => ({ items: s.items.length > 1 ? s.items.filter((_, i) => i !== index) : s.items })),
  setEventField: (index, field, value) =>
    set((s) => ({ events: s.events.map((ev, i) => (i !== index ? ev : { ...ev, [field]: value })) })),
  addEvent: () =>
    set((s) => ({ events: [...s.events, { name: `Hendelse ${s.events.length + 1}`, prob: 0.2, opt: 0, ml: 0, pess: 0, year: 1 }] })),
  removeEvent: (index) => set((s) => ({ events: s.events.filter((_, i) => i !== index) })),
  reset: () => set({ ...initial }),
  loadFromState: (id, name, state) => set({ ...state, id, name }),
}));

export function getSerializableMcState(s: MonteCarloState): SerializableMcState {
  const { currency, numSims, dist, mode, years, rate, items, events } = s;
  return { currency, numSims, dist, mode, years, rate, items, events };
}
