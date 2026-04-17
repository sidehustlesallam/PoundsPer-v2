import { toFloat, toInt } from "./format.js";

export const SQFT_PER_SQM = 10.76391041671;

export function sqmToSqft(sqm) {
  return toFloat(sqm) * SQFT_PER_SQM;
}

export function sqftToSqm(sqft) {
  return toFloat(sqft) / SQFT_PER_SQM;
}

export function pricePerSqm(priceGbp, sqm) {
  const p = toInt(priceGbp);
  const a = toFloat(sqm);
  if (a <= 0) return 0;
  return Math.round(p / a);
}

export function pricePerSqft(priceGbp, sqft) {
  const p = toInt(priceGbp);
  const a = toFloat(sqft);
  if (a <= 0) return 0;
  return Math.round(p / a);
}

/** metres to miles */
export function metresToMiles(m) {
  return toFloat(m) / 1609.344;
}

/** Map generic risk strings to LOW | MEDIUM | HIGH */
export function mapRiskLevel(raw) {
  const s = String(raw || "").toLowerCase();
  if (/(high|severe|very)/i.test(s)) return "HIGH";
  if (/(medium|moderate)/i.test(s)) return "MEDIUM";
  if (/(low|minimal|none)/i.test(s)) return "LOW";
  if (s === "unknown" || s === "") return "UNKNOWN";
  return "MEDIUM";
}
