import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { mapRiskLevel } from "../utils/math.js";
import { safeStr } from "./epc.js";

export function normaliseFloodResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const postcode = formatPostcode(normalizePostcode(o.postcode ?? ""));
  const riskLevel = mapRiskLevel(o.riskLevel ?? o.risk ?? "");

  const floodRisk = Array.isArray(o.floodRisk) ? o.floodRisk : [];
  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    riskLevel: riskLevel === "UNKNOWN" ? "LOW" : riskLevel,
    floodRisk: floodRisk.map((f) => {
      const x = f && typeof f === "object" ? f : {};
      return {
        type: safeStr(x.type ?? x.source ?? ""),
        level: mapRiskLevel(x.level ?? x.risk ?? ""),
        description: safeStr(x.description ?? ""),
      };
    }),
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}
