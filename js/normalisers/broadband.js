import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { toFloat } from "../utils/format.js";
import { safeStr } from "./epc.js";

export function normaliseBroadbandResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const postcode = formatPostcode(normalizePostcode(o.postcode ?? ""));
  const tech = Array.isArray(o.tech) ? o.tech.map((t) => safeStr(t)) : [];

  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    maxDownloadMbps:
      o.maxDownloadMbps === null || o.maxDownloadMbps === undefined
        ? null
        : toFloat(o.maxDownloadMbps),
    maxUploadMbps:
      o.maxUploadMbps === null || o.maxUploadMbps === undefined
        ? null
        : toFloat(o.maxUploadMbps),
    tech,
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}
