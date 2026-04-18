import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { metresToMiles } from "../utils/math.js";
import { safeStr } from "./epc.js";

export function normaliseSchoolsResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const schools = Array.isArray(o.schools) ? o.schools : [];
  const postcode = formatPostcode(normalizePostcode(o.postcode ?? ""));

  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    lat: Number(o.lat) || 0,
    lon: Number(o.lon) || 0,
    schools: schools.map((s) => {
      const x = s && typeof s === "object" ? s : {};
      const distM = Number(x.distanceMetres ?? x.distance_m ?? x.dist ?? 0) || 0;
      return {
        name: safeStr(x.name ?? x.establishmentName ?? ""),
        phase: safeStr(x.phase ?? x.phaseOfEducation ?? ""),
        type: safeStr(x.type ?? x.establishmentType ?? ""),
        distanceMiles: distM > 0 ? metresToMiles(distM) : toMilesFromKm(x.distanceKm),
        ofsted: safeStr(x.ofstedRating ?? x.ofsted ?? ""),
        address: safeStr(x.address ?? ""),
        urn: safeStr(x.urn ?? ""),
        lastReport: safeStr(x.lastReport ?? ""),
        reportUrl: safeStr(x.reportUrl ?? ""),
      };
    }),
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}

function toMilesFromKm(km) {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * 0.621371;
}
