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
