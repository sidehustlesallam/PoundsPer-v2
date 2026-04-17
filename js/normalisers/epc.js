import { formatDateIso, toFloat, toInt } from "../utils/format.js";
import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { pricePerSqft, pricePerSqm, sqmToSqft } from "../utils/math.js";

export function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Normalise EPC search row or certificate row.
 * @param {Record<string, unknown>} raw
 */
export function normaliseEpcRow(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const floorAreaSqm = toFloat(
    r["floor-area"] ?? r.floorArea ?? r.total_floor_area ?? 0
  );
  const floorAreaSqft = sqmToSqft(floorAreaSqm);
  const postcode = formatPostcode(normalizePostcode(r.postcode ?? ""));
  const uprn = safeStr(r.uprn ?? "");
  const lmk = safeStr(r["lmk-key"] ?? r.lmkKey ?? "");
  const assetRating = toInt(r["asset-rating"] ?? r.assetRating ?? 0);
  const energyRating = safeStr(r["energy-rating"] ?? r.energyRating ?? "");
  const lodgementDate = formatDateIso(
    r["lodgement-date"] ?? r.lodgementDate ?? ""
  );
  const tenure = safeStr(r.tenure ?? "");
  const propertyType = safeStr(r["property-type"] ?? r.propertyType ?? "");
  const builtForm = safeStr(r["built-form"] ?? r.builtForm ?? "");

  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    uprn,
    lmkKey: lmk,
    floorAreaSqm,
    floorAreaSqft,
    assetRating,
    energyRating,
    lodgementDate,
    tenure,
    propertyType,
    builtForm,
    address: safeStr(r.address ?? r.address1 ?? ""),
    localAuthority: safeStr(r["local-authority"] ?? r.localAuthority ?? ""),
  };
}

export function normaliseEpcSearchResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const rows = Array.isArray(o.rows) ? o.rows : [];
  return {
    rows: rows.map((x) => normaliseEpcRow(x)),
    rowCount: rows.length,
    message: safeStr(o.message ?? ""),
  };
}

export function normaliseEpcCertificateResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const row = o.row || o.rows?.[0] || o;
  const base = normaliseEpcRow(row);
  const price = toInt(
    row["transaction-price"] ?? row.transactionPrice ?? row.price ?? 0
  );
  return {
    ...base,
    transactionPrice: price,
    pricePerSqm: pricePerSqm(price, base.floorAreaSqm),
    pricePerSqft: pricePerSqft(price, base.floorAreaSqft),
    co2Emissions: toFloat(row["co2-emissions"] ?? row.co2Emissions ?? 0),
    heatingCostCurrent: toInt(
      row["heating-cost-current"] ?? row.heatingCostCurrent ?? 0
    ),
    hotWaterCostCurrent: toInt(
      row["hot-water-cost-current"] ?? row.hotWaterCostCurrent ?? 0
    ),
  };
}
