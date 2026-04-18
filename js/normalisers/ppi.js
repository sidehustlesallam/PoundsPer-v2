import { formatDateIso, toFloat, toInt } from "../utils/format.js";
import { formatPostcode, normalizePostcode } from "../utils/postcode.js";
import { pricePerSqft, pricePerSqm, sqmToSqft } from "../utils/math.js";

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function normalisePpiResponse(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const txs = Array.isArray(o.transactions) ? o.transactions : [];
  const postcode = formatPostcode(
    normalizePostcode(o.postcode ?? "")
  );

  const transactions = txs.map((t) => {
    const x = t && typeof t === "object" ? t : {};
    const price = toInt(x.price ?? x.amount ?? 0);
    const date = formatDateIso(x.date ?? x.transferDate ?? "");
    const sqm = Number(x.sqm ?? x.floorAreaSqm ?? 0) || 0;
    const sqft = Number(x.sqft ?? x.floorAreaSqft ?? 0) || sqmToSqft(sqm);
    const addrFromParts = [
      x.paon,
      x.saon,
      x.street,
      x.town,
    ]
      .filter((p) => p && String(p).trim())
      .join(", ");
    const displayAddress = safeStr(x.address ?? addrFromParts);
    const epcRating = safeStr(x.epcRating ?? x.epcEnergyRating ?? "")
      .trim()
      .toUpperCase();
    const adjRaw = x.adjustedPrice;
    const adjustedPrice =
      adjRaw === null || adjRaw === undefined || adjRaw === ""
        ? null
        : toInt(adjRaw);
    return {
      date,
      price,
      propertyType: safeStr(x.propertyType ?? x.type ?? ""),
      tenure: safeStr(x.tenure ?? ""),
      floorAreaSqm: sqm,
      floorAreaSqft: sqft,
      pricePerSqm: pricePerSqm(price, sqm),
      pricePerSqft: pricePerSqft(price, sqft),
      postcode: formatPostcode(normalizePostcode(x.postcode ?? postcode)),
      displayAddress,
      epcRating,
      localAuthority: safeStr(x.localAuthority ?? ""),
      saleMonth: safeStr(x.saleMonth ?? (date.length >= 7 ? date.slice(0, 7) : "")),
      hpiSale:
        x.hpiSale === null || x.hpiSale === undefined || x.hpiSale === ""
          ? null
          : toFloat(x.hpiSale),
      hpiNow:
        x.hpiNow === null || x.hpiNow === undefined || x.hpiNow === ""
          ? null
          : toFloat(x.hpiNow),
      factor:
        x.factor === null || x.factor === undefined || x.factor === ""
          ? null
          : toFloat(x.factor),
      adjustedPrice: adjustedPrice > 0 ? adjustedPrice : null,
      hpiReferenceMonth: safeStr(x.hpiReferenceMonth ?? ""),
      hpiRegionSlug: safeStr(x.hpiRegionSlug ?? ""),
      hpiTier: safeStr(x.hpiTier ?? ""),
      hpiMatchedRegion: safeStr(x.hpiMatchedRegion ?? ""),
    };
  });

  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    transactions,
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}
