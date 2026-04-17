/** @param {unknown} v */
export function toInt(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9.-]/g, ""), 10);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** @param {unknown} v */
export function toFloat(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** YYYY-MM-DD */
export function formatDateIso(d) {
  if (!d && d !== 0) return "";
  const s = String(d).trim();
  if (!s) return "";
  const iso = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

export function formatGbp(n) {
  const v = toInt(n);
  if (v === 0) return "—";
  return `£${v.toLocaleString("en-GB")}`;
}

export function formatNumber(n, digits = 0) {
  const v = toFloat(n);
  return v.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
