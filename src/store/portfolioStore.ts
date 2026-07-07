import { create } from 'zustand';
import type { PfProject } from '../calc/portfolio';

let counter = 0;
function newId() { counter += 1; return 'pf-' + counter; }

const DEFAULT_PROJECTS: PfProject[] = [
  { id: newId(), name: 'Prosjekt A', cat: 'Vekst', i0: 80, cfs: [30, 35, 40, 40], rate: 0.10, beta: 1.0, active: true, deps: [], exclGroup: null },
  { id: newId(), name: 'Prosjekt B', cat: 'Effektivisering', i0: 50, cfs: [20, 20, 20, 20], rate: 0.08, beta: 0.6, active: true, deps: [], exclGroup: null },
  { id: newId(), name: 'Prosjekt C', cat: 'Nyetablering', i0: 120, cfs: [10, 30, 50, 60], rate: 0.14, beta: 1.6, active: true, deps: [], exclGroup: null },
];

export interface PortfolioState {
  id: string | null;
  name: string;
  currency: string;
  globalRate: number;
  rf: number;
  erp: number;
  budget: number;
  projects: PfProject[];

  setName: (name: string) => void;
  setCurrency: (c: string) => void;
  setGlobalRate: (r: number) => void;
  setRf: (v: number) => void;
  setErp: (v: number) => void;
  setBudget: (v: number) => void;
  setProjectField: (id: string, field: 'name' | 'cat' | 'i0' | 'rate' | 'beta' | 'exclGroup', value: string | number | null) => void;
  setCf: (id: string, yearIndex: number, value: number) => void;
  addYear: () => void;
  removeYear: () => void;
  toggleActive: (id: string) => void;
  toggleDep: (id: string, depId: string) => void;
  addProject: () => void;
  importProject: (p: { name: string; i0: number; cfs: number[]; cat?: string; rate?: number }) => void;
  removeProject: (id: string) => void;
  reset: () => void;
  loadFromState: (id: string, name: string, state: SerializablePortfolioState) => void;
}

export type SerializablePortfolioState = Pick<PortfolioState, 'currency' | 'globalRate' | 'rf' | 'erp' | 'budget' | 'projects'>;

const initial = {
  id: null as string | null,
  name: 'Ny portefølje',
  currency: 'MNOK',
  globalRate: 0.10,
  rf: 0.04,
  erp: 0.05,
  budget: 0,
  projects: DEFAULT_PROJECTS,
};

export const usePortfolioStore = create<PortfolioState>((set) => ({
  ...initial,
  setName: (name) => set({ name }),
  setCurrency: (currency) => set({ currency }),
  setGlobalRate: (globalRate) => set({ globalRate }),
  setRf: (rf) => set({ rf }),
  setErp: (erp) => set({ erp }),
  setBudget: (budget) => set({ budget }),
  setProjectField: (id, field, value) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id !== id ? p : { ...p, [field]: value })) })),
  setCf: (id, yearIndex, value) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== id ? p : { ...p, cfs: p.cfs.map((cf, i) => (i === yearIndex ? value : cf)) }
      ),
    })),
  addYear: () => set((s) => ({ projects: s.projects.map((p) => ({ ...p, cfs: [...p.cfs, 0] })) })),
  removeYear: () =>
    set((s) => ({ projects: s.projects.map((p) => ({ ...p, cfs: p.cfs.length > 1 ? p.cfs.slice(0, -1) : p.cfs })) })),
  toggleActive: (id) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id !== id ? p : { ...p, active: !p.active })) })),
  toggleDep: (id, depId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== id ? p : { ...p, deps: p.deps.includes(depId) ? p.deps.filter((d) => d !== depId) : [...p.deps, depId] }
      ),
    })),
  addProject: () =>
    set((s) => ({
      projects: [
        ...s.projects,
        {
          id: newId(), name: `Prosjekt ${s.projects.length + 1}`, cat: 'Annet', i0: 50,
          cfs: s.projects[0]?.cfs.map(() => 0) ?? [0, 0, 0, 0],
          rate: s.globalRate, beta: 1, active: true, deps: [], exclGroup: null,
        },
      ],
    })),
  importProject: (p) =>
    set((s) => ({
      projects: [
        ...s.projects,
        {
          id: newId(), name: p.name, cat: p.cat ?? 'Invest-import', i0: p.i0, cfs: p.cfs,
          rate: p.rate ?? s.globalRate, beta: 1, active: true, deps: [], exclGroup: null,
        },
      ],
    })),
  removeProject: (id) =>
    set((s) => ({ projects: s.projects.length > 1 ? s.projects.filter((p) => p.id !== id) : s.projects })),
  reset: () => set({ ...initial }),
  loadFromState: (id, name, state) => set({ ...state, id, name }),
}));

export function getSerializablePortfolioState(s: PortfolioState): SerializablePortfolioState {
  const { currency, globalRate, rf, erp, budget, projects } = s;
  return { currency, globalRate, rf, erp, budget, projects };
}
