import { toFloat, toInt } from "../utils/format.js";

function str(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function normaliseHpiResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const series = Array.isArray(o.series) ? o.series : [];
  return {
    la: str(o.la),
    month: str(o.month),
    index: o.index === null || o.index === undefined ? null : toFloat(o.index),
    series: series.map((p) => {
      const x = p && typeof p === "object" ? p : {};
      return {
        month: str(x.month ?? x.period ?? ""),
        value: toFloat(x.value ?? x.index ?? 0),
      };
    }),
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}

/** HPI-adjusted value: price * (targetIndex / baseIndex), integer £ */
export function adjustPriceForHpi(priceGbp, baseIndex, targetIndex) {
  const p = toInt(priceGbp);
  const b = toFloat(baseIndex);
  const t = toFloat(targetIndex);
  if (p <= 0 || b <= 0 || t <= 0) return p;
  return Math.round((p * t) / b);
}

/**
 * UKHPI index value for a transaction completion month (YYYY-MM).
 * Uses latest series point on or before that month; if the sale predates the series, uses the earliest point.
 * If the sale month is after all data, uses the latest available index.
 */
export function hpiIndexForTransaction(series, saleYyyyMm) {
  if (!saleYyyyMm || !Array.isArray(series) || !series.length) return null;
  const pts = series
    .map((p) => ({
      month: str(p.month ?? p.period ?? ""),
      value: toFloat(p.value ?? p.index ?? 0),
    }))
    .filter((p) => /^\d{4}-\d{2}$/.test(p.month) && p.value > 0)
    .sort((a, b) => a.month.localeCompare(b.month));
  if (!pts.length) return null;
  const last = pts[pts.length - 1];
  if (saleYyyyMm > last.month) return last.value;
  let best = null;
  for (const p of pts) {
    if (p.month <= saleYyyyMm) best = p.value;
    else break;
  }
  if (best != null) return best;
  return pts[0].value;
}
