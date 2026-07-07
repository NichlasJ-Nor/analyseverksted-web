import { describe, it, expect } from 'vitest';
import { computeScenario, deriveScenariosFromBase, type Scenario } from './scenario';

const globals = { netDebt: 30, shares: 1000, tvMethod: 'gordon' as const, exitMultiple: 8 };

describe('computeScenario', () => {
  it('beregner EV/equity/perShare konsistent med Gordon-vekst', () => {
    const scenario: Scenario = { id: 'base', name: 'Base', wacc: 0.10, g: 0.02, fcfs: [100, 100, 100] };
    const r = computeScenario(scenario, globals);
    expect(r.ev).toBeGreaterThan(0);
    expect(r.equity).toBeCloseTo(r.ev - globals.netDebt, 6);
    expect(r.perShare).toBeCloseTo(r.equity / (globals.shares / 1000), 6);
    expect(r.tvPct).toBeGreaterThan(0);
  });

  it('kaster feil hvis WACC <= g (Gordon-vekst divergerer)', () => {
    const scenario: Scenario = { id: 'base', name: 'Base', wacc: 0.02, g: 0.03, fcfs: [100] };
    expect(() => computeScenario(scenario, globals)).toThrow();
  });

  it('exit-multiple-metoden bruker siste FCF som EBITDA-proxy', () => {
    const scenario: Scenario = { id: 'base', name: 'Base', wacc: 0.10, g: 0.02, fcfs: [100, 100] };
    const r = computeScenario(scenario, { ...globals, tvMethod: 'exit', exitMultiple: 8 });
    const expectedTv = 100 * 8;
    expect(r.pvTv).toBeCloseTo(expectedTv / Math.pow(1.10, 2), 6);
  });
});

describe('deriveScenariosFromBase', () => {
  it('bear har høyere WACC, lavere g og lavere FCF enn base', () => {
    const { bear, base, bull } = deriveScenariosFromBase(0.095, 0.025, [100, 110, 120]);
    expect(bear.wacc).toBeGreaterThan(base.wacc);
    expect(bear.g).toBeLessThan(base.g);
    expect(bear.fcfs[0]).toBeLessThan(base.fcfs[0]);
    expect(bull.wacc).toBeLessThan(base.wacc);
    expect(bull.g).toBeGreaterThan(base.g);
    expect(bull.fcfs[0]).toBeGreaterThan(base.fcfs[0]);
  });

  it('bear-EV er lavere enn bull-EV gitt samme globale forutsetninger', () => {
    const { bear, base, bull } = deriveScenariosFromBase(0.095, 0.025, [100, 110, 120]);
    const rBear = computeScenario(bear, globals);
    const rBase = computeScenario(base, globals);
    const rBull = computeScenario(bull, globals);
    expect(rBear.ev).toBeLessThan(rBase.ev);
    expect(rBase.ev).toBeLessThan(rBull.ev);
  });
});
