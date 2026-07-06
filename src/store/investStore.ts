import { create } from 'zustand';
import type { InvestAlternative } from '../calc/invest';

const DEFAULT_ALTS: InvestAlternative[] = [
  { name: 'Alternativ A', i0: 100, cfs: [30, 40, 45, 45, 45] },
  { name: 'Alternativ B', i0: 150, cfs: [50, 55, 60, 60, 60] },
];

export interface InvestState {
  id: string | null;
  name: string;
  currency: string;
  rate: number; // avkastningskrav, desimal
  alternatives: InvestAlternative[];

  setName: (name: string) => void;
  setRate: (rate: number) => void;
  setCurrency: (currency: string) => void;
  setAltField: (index: number, field: 'name' | 'i0', value: string | number) => void;
  setAltCf: (altIndex: number, yearIndex: number, value: number) => void;
  addYear: () => void;
  removeYear: () => void;
  addAlternative: () => void;
  removeAlternative: (index: number) => void;
  reset: () => void;
  loadFromState: (id: string, name: string, state: SerializableInvestState) => void;
}

export type SerializableInvestState = Pick<InvestState, 'currency' | 'rate' | 'alternatives'>;

const initial = {
  id: null as string | null,
  name: 'Ny investeringsanalyse',
  currency: 'MNOK',
  rate: 0.10,
  alternatives: DEFAULT_ALTS,
};

export const useInvestStore = create<InvestState>((set) => ({
  ...initial,
  setName: (name) => set({ name }),
  setRate: (rate) => set({ rate }),
  setCurrency: (currency) => set({ currency }),
  setAltField: (index, field, value) =>
    set((s) => ({
      alternatives: s.alternatives.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    })),
  setAltCf: (altIndex, yearIndex, value) =>
    set((s) => ({
      alternatives: s.alternatives.map((a, i) =>
        i !== altIndex ? a : { ...a, cfs: a.cfs.map((cf, yi) => (yi === yearIndex ? value : cf)) }
      ),
    })),
  addYear: () =>
    set((s) => ({ alternatives: s.alternatives.map((a) => ({ ...a, cfs: [...a.cfs, 0] })) })),
  removeYear: () =>
    set((s) => ({
      alternatives: s.alternatives.map((a) => ({
        ...a,
        cfs: a.cfs.length > 1 ? a.cfs.slice(0, -1) : a.cfs,
      })),
    })),
  addAlternative: () =>
    set((s) => ({
      alternatives: [
        ...s.alternatives,
        { name: `Alternativ ${s.alternatives.length + 1}`, i0: 100, cfs: s.alternatives[0]?.cfs.map(() => 0) ?? [0, 0, 0, 0, 0] },
      ],
    })),
  removeAlternative: (index) =>
    set((s) => ({
      alternatives: s.alternatives.length > 1 ? s.alternatives.filter((_, i) => i !== index) : s.alternatives,
    })),
  reset: () => set({ ...initial }),
  loadFromState: (id, name, state) => set({ ...state, id, name }),
}));

export function getSerializableInvestState(s: InvestState): SerializableInvestState {
  const { currency, rate, alternatives } = s;
  return { currency, rate, alternatives };
}
