import { create } from 'zustand';

export type Tool = 'dcf' | 'invest' | 'portfolio' | 'montecarlo' | 'scenario';

interface UiState {
  tool: Tool;
  setTool: (tool: Tool) => void;
}

/** Delt fane-state, slik at én fane kan bytte til en annen (f.eks. «Send til Invest» fra DCF). */
export const useUiStore = create<UiState>((set) => ({
  tool: 'dcf',
  setTool: (tool) => set({ tool }),
}));
