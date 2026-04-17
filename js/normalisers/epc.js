import { formatDateIso, toFloat, toInt } from "../utils/format.js";
import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { pricePerSqft, pricePerSqm, sqmToSqft } from "../utils/math.js";

export function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * @param {Record<string, unknown>} r
 * @param {string[]} keys
 */
function firstDefined(r, keys) {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null && r[k] !== "") {
      return r[k];
    }
  }
  return undefined;
}

/** EPC API uses hyphenated keys; CSV/glossary also uses TOTAL_FLOOR_AREA style. */
function pickFloorAreaSqm(r) {
  const v = firstDefined(r, [
    "total-floor-area",
    "floor-area",
    "total_floor_area",
    "floor_area",
    "TOTAL_FLOOR_AREA",
    "floorArea",
    "totalFloorArea",
  ]);
  return toFloat(v ?? 0);
}

/** Letter band A–G — current (as lodged). */
function pickCurrentEnergyRating(r) {
  const v = firstDefined(r, [
    "current-energy-rating",
    "energy-rating",
    "CURRENT_ENERGY_RATING",
    "ENERGY_RATING",
    "energyRating",
  ]);
  return safeStr(v ?? "");
}

/** Letter band A–G — potential if all recommendations implemented. */
function pickPotentialEnergyRating(r) {
  const v = firstDefined(r, [
    "potential-energy-rating",
    "POTENTIAL_ENERGY_RATING",
    "potentialEnergyRating",
  ]);
  return safeStr(v ?? "");
}

/**
 * Normalise EPC search row or certificate row.
 * @param {Record<string, unknown>} raw
 */
export function normaliseEpcRow(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const floorAreaSqm = pickFloorAreaSqm(r);
  const floorAreaSqft = sqmToSqft(floorAreaSqm);
  const postcode = formatPostcode(normalizePostcode(r.postcode ?? ""));
  const uprn = safeStr(r.uprn ?? "");
  const lmk = safeStr(r["lmk-key"] ?? r.lmkKey ?? "");
  const assetRating = toInt(
    firstDefined(r, [
      "asset-rating",
      "assetRating",
      "current-energy-efficiency",
      "CURRENT_ENERGY_EFFICIENCY",
    ]) ?? 0
  );
  const energyRating = pickCurrentEnergyRating(r);
  const potentialEnergyRating = pickPotentialEnergyRating(r);
  const lodgementDate = formatDateIso(
    firstDefined(r, ["lodgement-date", "lodgementDate", "lodgement-datetime"]) ??
      ""
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
    potentialEnergyRating,
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
  const row =
    o.row ||
    (Array.isArray(o.rows) ? o.rows[0] : null) ||
    o.certificate ||
    o.data ||
    o;
  const r = row && typeof row === "object" ? row : {};
  const base = normaliseEpcRow(r);
  const price = toInt(
    firstDefined(r, ["transaction-price", "transactionPrice", "price"]) ?? 0
  );
  return {
    ...base,
    transactionPrice: price,
    pricePerSqm: pricePerSqm(price, base.floorAreaSqm),
    pricePerSqft: pricePerSqft(price, base.floorAreaSqft),
    co2Emissions: toFloat(
      firstDefined(r, ["co2-emissions", "co2Emissions", "co2_emissions"]) ?? 0
    ),
    heatingCostCurrent: toInt(
      firstDefined(r, [
        "heating-cost-current",
        "heatingCostCurrent",
      ]) ?? 0
    ),
    hotWaterCostCurrent: toInt(
      firstDefined(r, [
        "hot-water-cost-current",
        "hotWaterCostCurrent",
      ]) ?? 0
    ),
  };
}
