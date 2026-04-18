import { formatDateIso, toInt } from "../utils/format.js";
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
    };
  });

  return {
    postcode,
    postcodeNormalized: normalizePostcode(postcode),
    transactions,
    meta: o.meta && typeof o.meta === "object" ? o.meta : {},
  };
}
