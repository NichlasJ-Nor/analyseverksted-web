/**
 * Prosjektportefølje: NPV/IRR-rangering, avhengigheter/eksklusjon, budsjettoptimalisering (knapsack),
 * CAPM-risikojustert rangering. Portert fra HTML-appens runPortfolio()-familie.
 */
import { irr } from './finance';
import { calcNPV, calcPayback } from './invest';

export interface PfProject {
  id: string;
  name: string;
  cat: string;
  i0: number;
  cfs: number[];
  rate: number;   // avkastningskrav, desimal (kan avvike fra globalt krav per prosjekt)
  beta: number;    // for CAPM-rangering
  active: boolean;
  deps: string[];       // id-er til prosjekter denne er avhengig av
  exclGroup: string | null; // gjensidig utelukkende gruppe
}

export interface PfResult extends PfProject {
  npv: number;
  irr: number | null;
  payback: number | null;
  cumCFs: number[];
}

export function evaluatePfProject(p: PfProject): PfResult {
  const npv = calcNPV(p.i0, p.cfs, p.rate);
  const irrVal = irr([-p.i0, ...p.cfs]);
  const payback = calcPayback(p.i0, p.cfs);
  let cum = -p.i0;
  const cumCFs = p.cfs.map((cf) => { cum += cf; return cum; });
  return { ...p, npv, irr: irrVal, payback, cumCFs };
}

export interface DependencyWarning {
  message: string;
}

/** B17: sjekker at avhengigheter er aktive og at ikke flere prosjekter i samme eksklusjonsgruppe er aktive. */
export function checkDependencies(active: PfProject[], all: PfProject[] = active): DependencyWarning[] {
  const warnings: DependencyWarning[] = [];
  const activeIds = new Set(active.map((p) => p.id));
  const byId = new Map(all.map((p) => [p.id, p]));

  active.forEach((p) => {
    p.deps.forEach((depId) => {
      if (!activeIds.has(depId)) {
        const depName = byId.get(depId)?.name ?? '(ukjent)';
        warnings.push({ message: `${p.name} krever ${depName}, men det prosjektet er ikke aktivt.` });
      }
    });
  });

  const groups = new Map<string, string[]>();
  active.forEach((p) => {
    if (p.exclGroup) {
      const arr = groups.get(p.exclGroup) ?? [];
      arr.push(p.name);
      groups.set(p.exclGroup, arr);
    }
  });
  groups.forEach((names, grp) => {
    if (names.length > 1) warnings.push({ message: `Gruppe «${grp}» er gjensidig ekskluderende, men ${names.join(' og ')} er alle aktive.` });
  });

  return warnings;
}

export interface PortfolioSummary {
  totalNPV: number;
  totalI0: number;
  profitableCount: number;
  ranked: PfResult[];
}

export function summarizePortfolio(results: PfResult[]): PortfolioSummary {
  const ranked = [...results].sort((a, b) => b.npv - a.npv);
  const totalNPV = results.reduce((s, r) => s + r.npv, 0);
  const totalI0 = results.reduce((s, r) => s + r.i0, 0);
  const profitableCount = results.filter((r) => r.npv > 0).length;
  return { totalNPV, totalI0, profitableCount, ranked };
}

export interface RateSensitivityRow {
  rate: number;
  npvByProject: number[];
  total: number;
}

export function portfolioRateSensitivity(
  results: PfResult[], baseRate: number, offsets = [-0.05, -0.03, -0.01, 0, 0.01, 0.03, 0.05]
): RateSensitivityRow[] {
  return offsets
    .map((o) => baseRate + o)
    .filter((rate) => rate > 0)
    .map((rate) => {
      const npvByProject = results.map((r) => calcNPV(r.i0, r.cfs, rate));
      return { rate, npvByProject, total: npvByProject.reduce((s, v) => s + v, 0) };
    });
}

export interface CapmRankResult extends PfResult {
  capmRate: number;
  capmNPV: number;
  stdRank: number;
  capmRank: number;
}

/** B19: rangerer prosjekter etter CAPM-basert avkastningskrav (rf + beta*ERP) i stedet for felles krav. */
export function capmRanking(results: PfResult[], rf: number, erp: number): CapmRankResult[] {
  const withCapm = results.map((r) => {
    const capmRate = rf + r.beta * erp;
    const capmNPV = calcNPV(r.i0, r.cfs, capmRate);
    return { ...r, capmRate, capmNPV };
  });
  const stdRanked = [...withCapm].sort((a, b) => b.npv - a.npv);
  const capmRanked = [...withCapm].sort((a, b) => b.capmNPV - a.capmNPV);
  const stdRankOf = (name: string) => stdRanked.findIndex((r) => r.name === name) + 1;
  const capmRankOf = (name: string) => capmRanked.findIndex((r) => r.name === name) + 1;
  return capmRanked.map((r) => ({ ...r, stdRank: stdRankOf(r.name), capmRank: capmRankOf(r.name) }));
}

export interface BudgetOptimisationResult {
  selected: PfResult[];
  excluded: PfResult[];
  totalI0: number;
  totalNPV: number;
  unutilised: number;
  method: 'exact' | 'greedy';
}

function selectionValid(selected: PfResult[], all: PfResult[]): boolean {
  const selIds = new Set(selected.map((p) => p.id));
  const byId = new Map(all.map((p) => [p.id, p]));
  for (const p of selected) {
    for (const depId of p.deps) {
      if (!selIds.has(depId)) return false;
    }
  }
  const groups = new Set<string>();
  for (const p of selected) {
    if (p.exclGroup) {
      if (groups.has(p.exclGroup)) return false;
      groups.add(p.exclGroup);
    }
  }
  void byId; // deps/exclGroup already resolved via `selected`'s own fields
  return true;
}

/**
 * B16: velger kombinasjonen av prosjekter (respekterer avhengigheter/eksklusjon) som maksimerer
 * total NPV innenfor budsjettrammen. Eksakt (uttømmende søk) for <=20 prosjekter, ellers grådig
 * etter profitability index (NPV/I0).
 */
export function budgetOptimisation(results: PfResult[], budget: number): BudgetOptimisationResult {
  const items = results.filter((p) => p.i0 > 0 && p.i0 <= budget);

  let bestSet: PfResult[] = [];
  let bestNPV = 0;
  let method: 'exact' | 'greedy' = 'exact';

  if (items.length === 0) {
    return { selected: [], excluded: results, totalI0: 0, totalNPV: 0, unutilised: budget, method };
  }

  if (items.length <= 20) {
    bestNPV = -Infinity;
    const total = 1 << items.length;
    for (let mask = 0; mask < total; mask++) {
      let cost = 0, npvSum = 0;
      const sel: PfResult[] = [];
      for (let j = 0; j < items.length; j++) {
        if (mask & (1 << j)) { cost += items[j].i0; npvSum += items[j].npv; sel.push(items[j]); }
      }
      if (cost <= budget && npvSum > bestNPV && selectionValid(sel, items)) {
        bestNPV = npvSum;
        bestSet = sel;
      }
    }
    if (bestNPV === -Infinity) bestNPV = 0;
  } else {
    method = 'greedy';
    const sorted = [...items].sort((a, b) => b.npv / b.i0 - a.npv / a.i0);
    let remaining = budget;
    bestSet = [];
    bestNPV = 0;
    for (const p of sorted) {
      if (p.i0 <= remaining && selectionValid([...bestSet, p], items)) {
        bestSet.push(p);
        remaining -= p.i0;
        bestNPV += p.npv;
      }
    }
  }

  const totalI0 = bestSet.reduce((s, p) => s + p.i0, 0);
  const excluded = results.filter((p) => !bestSet.includes(p));
  return { selected: bestSet, excluded, totalI0, totalNPV: bestNPV, unutilised: budget - totalI0, method };
}
