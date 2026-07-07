/**
 * Scenarioanalyse: Bear/Base/Bull DCF-verdsettelse side ved side.
 * Portert fra HTML-appens runScenarios()/syncScenariosFromDCF().
 */
import type { TerminalMethod } from './dcf';

export interface Scenario {
  id: 'bear' | 'base' | 'bull';
  name: string;
  wacc: number;
  g: number;
  fcfs: number[];
}

export interface ScenarioResult extends Scenario {
  ev: number;
  equity: number;
  perShare: number;
  pvFcf: number;
  pvTv: number;
  tvPct: number;
}

export interface ScenarioGlobalInputs {
  netDebt: number;
  shares: number; // i tusen
  tvMethod: TerminalMethod;
  exitMultiple: number;
}

/**
 * Enkel DCF for ett scenario. Bruker siste FCF som EBITDA-proxy ved exit-multiple-metoden
 * (scenariofanen har ingen egen EBITDA-linje, i tråd med HTML-originalen).
 */
export function computeScenario(scenario: Scenario, globals: ScenarioGlobalInputs): ScenarioResult {
  const { wacc, g, fcfs } = scenario;
  const { netDebt, shares, tvMethod, exitMultiple } = globals;
  const n = fcfs.length;

  let pvFcf = 0;
  fcfs.forEach((cf, i) => { pvFcf += cf / Math.pow(1 + wacc, i + 1); });

  const lastFcf = fcfs[n - 1];
  let tv: number;
  if (tvMethod === 'exit') {
    tv = lastFcf * exitMultiple;
  } else {
    if (wacc <= g) throw new Error(`WACC (${(wacc * 100).toFixed(1)}%) må være høyere enn g (${(g * 100).toFixed(1)}%) i ${scenario.name}-scenariet.`);
    tv = (lastFcf * (1 + g)) / (wacc - g);
  }
  const pvTv = tv / Math.pow(1 + wacc, n);

  const ev = pvFcf + pvTv;
  const equity = ev - netDebt;
  const perShare = equity / (shares / 1000);
  const tvPct = ev !== 0 ? (pvTv / ev) * 100 : 0;

  return { ...scenario, ev, equity, perShare, pvFcf, pvTv, tvPct };
}

/**
 * Genererer Bear/Bull fra et Base-scenario: Bear = WACC+2pp, g-1pp, FCF×0.8;
 * Bull = WACC-1.5pp, g+1pp, FCF×1.25 (identisk med syncScenariosFromDCF()).
 */
export function deriveScenariosFromBase(baseWacc: number, baseG: number, baseFcfs: number[]): {
  bear: Scenario; base: Scenario; bull: Scenario;
} {
  return {
    bear: {
      id: 'bear', name: 'Bear',
      wacc: baseWacc + 0.02,
      g: Math.max(0.005, baseG - 0.01),
      fcfs: baseFcfs.map((v) => +(v * 0.8).toFixed(2)),
    },
    base: { id: 'base', name: 'Base', wacc: baseWacc, g: baseG, fcfs: baseFcfs.slice() },
    bull: {
      id: 'bull', name: 'Bull',
      wacc: Math.max(0.03, baseWacc - 0.015),
      g: baseG + 0.01,
      fcfs: baseFcfs.map((v) => +(v * 1.25).toFixed(2)),
    },
  };
}
