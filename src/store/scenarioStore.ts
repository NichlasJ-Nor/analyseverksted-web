import { create } from 'zustand';
import type { TerminalMethod } from '../calc/dcf';
import type { Scenario } from '../calc/scenario';
import { deriveScenariosFromBase } from '../calc/scenario';

const initialScenarios = deriveScenariosFromBase(0.095, 0.025, [280, 310, 345, 380, 415]);

export interface ScenarioState {
  id: string | null;
  name: string;
  currency: string;
  netDebt: number;
  shares: number; // i tusen
  tvMethod: TerminalMethod;
  exitMultiple: number;
  bear: Scenario;
  base: Scenario;
  bull: Scenario;

  setName: (name: string) => void;
  setCurrency: (c: string) => void;
  setNetDebt: (v: number) => void;
  setShares: (v: number) => void;
  setTvMethod: (m: TerminalMethod) => void;
  setExitMultiple: (v: number) => void;
  setScenarioField: (id: 'bear' | 'base' | 'bull', field: 'name' | 'wacc' | 'g', value: string | number) => void;
  setScenarioFcf: (id: 'bear' | 'base' | 'bull', yearIndex: number, value: number) => void;
  addYear: () => void;
  removeYear: () => void;
  syncFromBase: () => void;
  reset: () => void;
  loadFromState: (id: string, name: string, state: SerializableScenarioState) => void;
}

export type SerializableScenarioState = Pick<
  ScenarioState, 'currency' | 'netDebt' | 'shares' | 'tvMethod' | 'exitMultiple' | 'bear' | 'base' | 'bull'
>;

const initial = {
  id: null as string | null,
  name: 'Ny scenarioanalyse',
  currency: 'MNOK',
  netDebt: 30,
  shares: 1000,
  tvMethod: 'gordon' as TerminalMethod,
  exitMultiple: 8,
  ...initialScenarios,
};

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  ...initial,
  setName: (name) => set({ name }),
  setCurrency: (currency) => set({ currency }),
  setNetDebt: (netDebt) => set({ netDebt }),
  setShares: (shares) => set({ shares }),
  setTvMethod: (tvMethod) => set({ tvMethod }),
  setExitMultiple: (exitMultiple) => set({ exitMultiple }),
  setScenarioField: (id, field, value) =>
    set((s) => ({ [id]: { ...s[id], [field]: value } } as Partial<ScenarioState>)),
  setScenarioFcf: (id, yearIndex, value) =>
    set((s) => ({
      [id]: { ...s[id], fcfs: s[id].fcfs.map((v, i) => (i === yearIndex ? value : v)) },
    } as Partial<ScenarioState>)),
  addYear: () =>
    set((s) => ({
      bear: { ...s.bear, fcfs: [...s.bear.fcfs, 0] },
      base: { ...s.base, fcfs: [...s.base.fcfs, 0] },
      bull: { ...s.bull, fcfs: [...s.bull.fcfs, 0] },
    })),
  removeYear: () =>
    set((s) => {
      const n = s.base.fcfs.length;
      if (n <= 1) return {};
      return {
        bear: { ...s.bear, fcfs: s.bear.fcfs.slice(0, -1) },
        base: { ...s.base, fcfs: s.base.fcfs.slice(0, -1) },
        bull: { ...s.bull, fcfs: s.bull.fcfs.slice(0, -1) },
      };
    }),
  syncFromBase: () => {
    const s = get();
    const derived = deriveScenariosFromBase(s.base.wacc, s.base.g, s.base.fcfs);
    set({ bear: { ...derived.bear, name: s.bear.name }, bull: { ...derived.bull, name: s.bull.name } });
  },
  reset: () => set({ ...initial, ...deriveScenariosFromBase(0.095, 0.025, [280, 310, 345, 380, 415]) }),
  loadFromState: (id, name, state) => set({ ...state, id, name }),
}));

export function getSerializableScenarioState(s: ScenarioState): SerializableScenarioState {
  const { currency, netDebt, shares, tvMethod, exitMultiple, bear, base, bull } = s;
  return { currency, netDebt, shares, tvMethod, exitMultiple, bear, base, bull };
}
