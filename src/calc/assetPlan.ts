/**
 * D5: Aktivaplan — kobler CapEx-investeringer til lineær avskrivningsplan (D&A).
 * Portert fra HTML-appens calcActivaPlan().
 */
export interface Asset {
  name: string;
  cost: number;   // investeringsbeløp
  yr: number;      // investeringsår (0 = i dag/år 0)
  life: number;    // brukstid i år
}

export interface AssetPlanResult {
  years: number[];           // 1..maxYr (D&A-år)
  daPerYear: Record<number, number>;    // total årlig avskrivning
  capexPerYear: Record<number, number>; // total CapEx i investeringsåret (0..maxYr)
}

/** Beregner samlet D&A og CapEx per år for en liste eiendeler (lineær avskrivning). */
export function calcAssetPlan(assets: Asset[], minYears = 5): AssetPlanResult {
  const maxYr = Math.max(...assets.map((a) => a.yr + a.life), minYears);

  const daPerYear: Record<number, number> = {};
  for (let y = 1; y <= maxYr; y++) daPerYear[y] = 0;
  assets.forEach((a) => {
    const annualDep = a.life > 0 ? a.cost / a.life : 0;
    for (let y = a.yr + 1; y <= a.yr + a.life; y++) {
      if (daPerYear[y] !== undefined) daPerYear[y] += annualDep;
    }
  });

  const capexPerYear: Record<number, number> = {};
  for (let y = 0; y <= maxYr; y++) capexPerYear[y] = 0;
  assets.forEach((a) => { if (capexPerYear[a.yr] !== undefined) capexPerYear[a.yr] += a.cost; });

  const years = Object.keys(daPerYear).map(Number).sort((a, b) => a - b);
  return { years, daPerYear, capexPerYear };
}
