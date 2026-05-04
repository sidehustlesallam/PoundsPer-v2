import { formatPostcode, normalizePostcode } from "../utils/postcode.js";

export function normaliseNearbyPostcodesResponse(raw, activePostcode = "") {
  const o = raw && typeof raw === "object" ? raw : {};
  const rows = Array.isArray(o.result) ? o.result : [];
  const activeNorm = normalizePostcode(activePostcode);
  const seen = new Set();
  const postcodes = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const pcNorm = normalizePostcode(row.postcode ?? "");
    if (!pcNorm) continue;
    if (pcNorm === activeNorm) continue;
    if (seen.has(pcNorm)) continue;
    seen.add(pcNorm);
    postcodes.push({
      postcode: formatPostcode(pcNorm),
      postcodeNormalized: pcNorm,
      distanceMetres: Number(row.distance) || 0,
    });
    if (postcodes.length >= 4) break;
  }

  return {
    activePostcode: formatPostcode(activeNorm),
    postcodes,
  };
}
