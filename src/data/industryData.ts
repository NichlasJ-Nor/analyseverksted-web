/**
 * D2/D3: Norske referansedata og bransjemultipler.
 * Portert fra HTML-appens REF_RF/INDUSTRY_COMPS/D3-nedtrekkslister.
 * Kilde (som i originalen): Norges Bank / Damodaran / Fernandez-estimater 2025 — statiske
 * referanseverdier, ikke live data. Juster ved behov.
 */

export const REF_RF = 0.038; // Norges Bank 10-år, 2025
export const REF_KD = 0.055; // typisk norsk lånerente, investment grade

export interface IndustryReference {
  key: string;
  label: string;
  beta: number;
  erp: number;
}

export const INDUSTRY_REFERENCES: IndustryReference[] = [
  { key: 'energi', label: 'Energi — Olje & Gass', beta: 1.30, erp: 0.055 },
  { key: 'fornybar', label: 'Fornybar energi / Kraft', beta: 0.95, erp: 0.050 },
  { key: 'sjomat', label: 'Sjømat / Havbruk', beta: 1.15, erp: 0.050 },
  { key: 'shipping', label: 'Shipping / Transport', beta: 1.40, erp: 0.055 },
  { key: 'finans', label: 'Finans / Bank', beta: 0.85, erp: 0.045 },
  { key: 'eiendom', label: 'Eiendom / Proptech', beta: 0.70, erp: 0.045 },
  { key: 'industri', label: 'Industri / Produksjon', beta: 1.00, erp: 0.050 },
  { key: 'tech', label: 'Teknologi / IT / SaaS', beta: 1.25, erp: 0.055 },
  { key: 'helse', label: 'Helse / Farmasi', beta: 0.80, erp: 0.045 },
  { key: 'konsum', label: 'Konsum / Detaljhandel', beta: 0.85, erp: 0.050 },
  { key: 'telecom', label: 'Telekommunikasjon', beta: 0.75, erp: 0.045 },
  { key: 'media', label: 'Media / Underholdning', beta: 0.90, erp: 0.050 },
  { key: 'bygg', label: 'Bygg & Anlegg', beta: 1.10, erp: 0.050 },
  { key: 'annet', label: 'Annet / Diversifisert', beta: 1.00, erp: 0.050 },
];

export interface IndustryComp {
  name: string;
  evEbitda: number;
  evRev: number;
}

export const INDUSTRY_COMPS: Record<string, IndustryComp[]> = {
  tech: [
    { name: 'Nordic SaaS A', evEbitda: 24, evRev: 7.2 },
    { name: 'Nordic SaaS B', evEbitda: 19, evRev: 5.5 },
    { name: 'Nordic Tech C', evEbitda: 22, evRev: 6.0 },
  ],
  industri: [
    { name: 'Industri A', evEbitda: 9.5, evRev: 1.3 },
    { name: 'Industri B', evEbitda: 8.2, evRev: 1.1 },
    { name: 'Industri C', evEbitda: 10, evRev: 1.5 },
  ],
  energi: [
    { name: 'Olje&Gass A', evEbitda: 5.5, evRev: 1.4 },
    { name: 'Olje&Gass B', evEbitda: 6.2, evRev: 1.7 },
    { name: 'Olje&Gass C', evEbitda: 5.0, evRev: 1.2 },
  ],
  fornybar: [
    { name: 'Fornybar A', evEbitda: 15, evRev: 4.0 },
    { name: 'Fornybar B', evEbitda: 13, evRev: 3.5 },
    { name: 'Fornybar C', evEbitda: 17, evRev: 4.8 },
  ],
  sjomat: [
    { name: 'Havbruk A', evEbitda: 10, evRev: 1.5 },
    { name: 'Havbruk B', evEbitda: 8.5, evRev: 1.3 },
    { name: 'Havbruk C', evEbitda: 11, evRev: 1.7 },
  ],
  shipping: [
    { name: 'Shipping A', evEbitda: 7.5, evRev: 1.4 },
    { name: 'Shipping B', evEbitda: 6.0, evRev: 1.1 },
    { name: 'Shipping C', evEbitda: 8.5, evRev: 1.6 },
  ],
  eiendom: [
    { name: 'Eiendom A', evEbitda: 18, evRev: 10 },
    { name: 'Eiendom B', evEbitda: 16, evRev: 9 },
    { name: 'Eiendom C', evEbitda: 20, evRev: 11 },
  ],
  helse: [
    { name: 'Helse A', evEbitda: 16, evRev: 4.2 },
    { name: 'Helse B', evEbitda: 14, evRev: 3.5 },
    { name: 'Helse C', evEbitda: 18, evRev: 4.8 },
  ],
  konsum: [
    { name: 'Retail A', evEbitda: 10, evRev: 1.0 },
    { name: 'Retail B', evEbitda: 8.5, evRev: 0.8 },
    { name: 'Retail C', evEbitda: 11, evRev: 1.2 },
  ],
  telecom: [
    { name: 'Telecom A', evEbitda: 8.5, evRev: 2.2 },
    { name: 'Telecom B', evEbitda: 7.5, evRev: 1.9 },
    { name: 'Telecom C', evEbitda: 9.5, evRev: 2.5 },
  ],
  bygg: [
    { name: 'Bygg A', evEbitda: 8, evRev: 0.7 },
    { name: 'Bygg B', evEbitda: 7, evRev: 0.6 },
    { name: 'Bygg C', evEbitda: 9, evRev: 0.8 },
  ],
  finans: [
    { name: 'Bank A', evEbitda: 12, evRev: 3.5 },
    { name: 'Bank B', evEbitda: 10, evRev: 3.0 },
    { name: 'Bank C', evEbitda: 13, evRev: 3.8 },
  ],
  media: [
    { name: 'Media A', evEbitda: 13, evRev: 2.5 },
    { name: 'Media B', evEbitda: 11, evRev: 2.2 },
    { name: 'Media C', evEbitda: 14, evRev: 2.8 },
  ],
};
