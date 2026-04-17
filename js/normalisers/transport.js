import { metresToMiles } from "../utils/math.js";
import { safeStr } from "./epc.js";

export function normaliseTransportResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const stops = Array.isArray(o.stops) ? o.stops : [];
  return {
    lat: Number(o.lat) || 0,
    lon: Number(o.lon) || 0,
    stops: stops.map((s) => {
      const x = s && typeof s === "object" ? s : {};
      const distM = Number(x.distanceMetres ?? x.walkingDistanceM ?? 0) || 0;
      return {
        name: safeStr(x.name ?? ""),
        mode: safeStr(x.mode ?? x.type ?? ""),
        distanceMiles: distM > 0 ? metresToMiles(distM) : Number(x.distanceMiles) || 0,
      };
    }),
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}
