import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { mapRiskLevel } from "../utils/math.js";
import { safeStr } from "./epc.js";

export function normaliseRadonResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const postcode = formatPostcode(normalizePostcode(o.postcode ?? ""));
  const band = safeStr(o.band ?? "");
  const riskLevel = mapRiskLevel(o.riskLevel ?? band ?? "");

  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    band: band || "UNKNOWN",
    riskLevel: riskLevel === "UNKNOWN" ? "LOW" : riskLevel,
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}
