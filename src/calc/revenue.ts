/** Omsetningsoppbygging — tre modeller, portert fra HTML-appens Revenue build-up. */

/** Vekstrate-drevet: basisår + årlig vekstrate (desimal) fra og med år 1. */
export function revenueFromGrowth(base: number, growthRates: number[]): number[] {
  let rev = base;
  return growthRates.map((g, i) => {
    if (i > 0) rev = rev * (1 + g);
    return rev;
  });
}

/** Pris × volum. prices og volumes må ha samme lengde. Volum i tusen enheter. */
export function revenueFromPriceVolume(prices: number[], volumesThousands: number[]): number[] {
  return prices.map((p, i) => (p * volumesThousands[i]) / 1000);
}

export interface RevenueSegment {
  name: string;
  vals: number[]; // manuelle tall per år
}

/** Segmenter: summer manuelt innlagte tall per år på tvers av segmenter. */
export function revenueFromSegments(segments: RevenueSegment[], years: number): number[] {
  return Array.from({ length: years }, (_, i) =>
    segments.reduce((sum, seg) => sum + (seg.vals[i] || 0), 0)
  );
}
