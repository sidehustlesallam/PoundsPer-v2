import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { safeStr } from "./epc.js";
import { normaliseSchoolsResponse } from "./schools.js";
import { normaliseTransportResponse } from "./transport.js";
import { normaliseBroadbandResponse } from "./broadband.js";
import { normaliseFloodResponse } from "./flood.js";
import { normaliseRadonResponse } from "./radon.js";
import { normaliseNearbyPostcodesResponse } from "./nearby-postcodes.js";

/** Normalise /resolve response */
export function normaliseResolveResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const results = Array.isArray(o.results) ? o.results : [];
  return {
    results: results.map((r) => {
      const x = r && typeof r === "object" ? r : {};
      const pc = formatPostcode(normalizePostcode(x.postcode ?? ""));
      return {
        id: safeStr(x.id ?? ""),
        label: safeStr(x.label ?? pc),
        addressLine: safeStr(x.addressLine ?? ""),
        hasEpc: Boolean(x.hasEpc),
        postcode: pc,
        postcodeNormalized: normalizePostcode(pc),
        lat: Number(x.lat) || 0,
        lon: Number(x.lon) || 0,
        localAuthority: safeStr(x.localAuthority ?? ""),
        region: safeStr(x.region ?? ""),
        country: safeStr(x.country ?? ""),
        parliamentary_constituency: safeStr(x.parliamentary_constituency ?? ""),
        uprn: safeStr(x.uprn ?? ""),
        lmkKey: safeStr(x.lmkKey ?? ""),
      };
    }),
    query: safeStr(o.query ?? ""),
    hint: safeStr(o.hint ?? ""),
    notFound: Boolean(o.notFound),
  };
}

/** Normalise /geo response */
export function normaliseGeoResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const r = o.result && typeof o.result === "object" ? o.result : {};
  const pc = formatPostcode(normalizePostcode(r.postcode ?? ""));
  return {
    postcode: pc,
    postcodeNormalized: normalizePostcode(pc),
    lat: Number(r.lat) || 0,
    lon: Number(r.lon) || 0,
    localAuthority: safeStr(r.localAuthority ?? ""),
  };
}

export function normaliseAddressResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const a = o.address && typeof o.address === "object" ? o.address : {};
  return {
    uprn: safeStr(a.uprn ?? ""),
    line1: safeStr(a.line1 ?? ""),
    line2: safeStr(a.line2 ?? ""),
    line3: safeStr(a.line3 ?? ""),
    postcode: formatPostcode(normalizePostcode(a.postcode ?? "")),
    localAuthority: safeStr(a.localAuthority ?? ""),
    lmkKey: safeStr(a.lmkKey ?? ""),
    warning: safeStr(o.warning ?? ""),
  };
}

export {
  normaliseEpcRow,
  normaliseEpcSearchResponse,
  normaliseEpcCertificateResponse,
} from "./epc.js";
export { normalisePpiResponse } from "./ppi.js";
export {
  normaliseHpiResponse,
  adjustPriceForHpi,
  hpiIndexForTransaction,
} from "./hpi.js";
export { normaliseSchoolsResponse } from "./schools.js";
export { normaliseTransportResponse } from "./transport.js";
export { normaliseBroadbandResponse } from "./broadband.js";
export { normaliseFloodResponse } from "./flood.js";
export { normaliseRadonResponse } from "./radon.js";
export { normaliseNearbyPostcodesResponse } from "./nearby-postcodes.js";
