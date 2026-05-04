import { el } from "../utils/dom.js";
import {
  formatDateIso,
  formatGbp,
  formatNumber,
  toFloat,
  toInt,
} from "../utils/format.js";
import { sqmToSqft } from "../utils/math.js";
import {
  adjustPriceForHpi,
  hpiIndexForTransaction,
} from "../normalisers/hpi.js";

function row(k, v) {
  return `<div class="flex justify-between gap-2 py-1 border-b border-[#1F242D]"><span class="text-[#8E95A3]">${k}</span><span class="font-mono text-[#C7CBD4] text-right">${v}</span></div>`;
}

export function renderPanelIdentity(state) {
  const root = el("panel-identity");
  if (!root) return;

  const err = state.errors?.identity;
  if (state.loading && !state.normalised?.epcSearch?.rows?.length) {
    root.innerHTML = `<div class="animate-pulse space-y-2"><div class="h-4 bg-[#1F242D] rounded w-3/4"></div><div class="h-4 bg-[#1F242D] rounded w-1/2"></div></div>`;
    return;
  }

  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const cert = state.normalised?.epcCertificate || {};
  const addr = state.normalised?.address || {};
  const search = state.normalised?.epcSearch || {};
  const selLmk = state.selection?.lmkKey || "";
  const searchRows = search.rows || [];
  const matched =
    (selLmk &&
      searchRows.find((x) => x.lmkKey === selLmk)) ||
    searchRows[0];

  const title = propertyTitleWithPostcode(state, addr, matched);
  const matchedTx = findMatchedTransaction(state, addr, matched, title);

  const floorSqm =
    Number(cert.floorAreaSqm || matched?.floorAreaSqm || 0) || 0;
  const floorSqft =
    floorSqm > 0 ? sqmToSqft(floorSqm) : 0;
  const currentRating =
    cert.energyRating ||
    matched?.energyRating ||
    "";
  const potentialRating =
    cert.potentialEnergyRating ||
    matched?.potentialEnergyRating ||
    "";

  const rows = [];
  rows.push(row("UPRN", escapeHtml(matched?.uprn || addr.uprn || state.selection?.uprn || "—")));
  rows.push(row("Last sale", escapeHtml(lastSaleTextForProperty(matchedTx))));
  rows.push(
    row(
      "HPI projection",
      escapeHtml(hpiProjectionTextForProperty(state, matchedTx, floorSqft))
    )
  );
  rows.push(
    row(
      "EPC rating",
      `Current ${escapeHtml(currentRating || "—")} · Potential ${escapeHtml(potentialRating || "—")}`
    )
  );
  rows.push(
    row(
      "Floor area",
      floorSqm > 0
        ? `${formatNumber(floorSqm, 1)} m² · ${formatNumber(floorSqft, 0)} ft²`
        : "—"
    )
  );
  rows.push(
    row(
      "Date of EPC certificate",
      escapeHtml(
        matched?.certificateDate ||
          cert.certificateDate ||
          matched?.lodgementDate ||
          cert.lodgementDate ||
          "—"
      )
    )
  );

  root.innerHTML = `
    <h3 class="text-sm font-medium text-[#C7CBD4] mb-3">${escapeHtml(title)}</h3>
    <div class="text-xs">${rows.join("")}</div>
  `;
}

function propertyTitleWithPostcode(state, addr, matched) {
  const line = [addr?.line1, addr?.line2, addr?.line3]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
  const base =
    line ||
    String(matched?.address || "").trim() ||
    String(state.selection?.label || "").trim() ||
    "Property";
  const postcode =
    String(matched?.postcode || "").trim() ||
    String(addr?.postcode || "").trim() ||
    String(state.selection?.postcode || "").trim();
  if (!postcode) return base;
  if (String(base).toUpperCase().includes(String(postcode).toUpperCase())) {
    return base;
  }
  return `${base} — ${postcode}`;
}

function lastSaleTextForProperty(matchTx) {
  if (!matchTx) return "—";
  const saleDate = formatDateIso(matchTx.date || "");
  const salePrice = Number(matchTx.price) > 0 ? formatGbp(matchTx.price) : "";
  if (salePrice && saleDate) return `${salePrice} on ${saleDate}`;
  if (salePrice) return salePrice;
  if (saleDate) return saleDate;
  return "—";
}

function hpiProjectionTextForProperty(state, matchedTx, floorSqft) {
  const txs = Array.isArray(state.normalised?.ppi?.transactions)
    ? state.normalised.ppi.transactions
    : [];
  const hpi = state.normalised?.hpi || {};
  const hpiAdjusted = matchedTransactionAdjustedPrice(matchedTx, hpi);
  let hpiPart = "HPI-adjusted: —";
  if (hpiAdjusted != null && hpiAdjusted > 0) {
    hpiPart = `HPI-adjusted: ${formatGbp(hpiAdjusted)}`;
  }

  const marketAdjPerSqft = marketAverageAdjustedPerSqft(txs, hpi);
  const subjectSqft = toFloat(floorSqft);
  let areaPart = "Area-projected: —";
  if (marketAdjPerSqft != null && marketAdjPerSqft > 0 && subjectSqft > 0) {
    const projected = Math.round(marketAdjPerSqft * subjectSqft);
    areaPart = `Area-projected: ${formatGbp(projected)}`;
  }

  if (hpiPart.endsWith("—") && areaPart.endsWith("—")) return "—";
  return `${hpiPart} · ${areaPart}`;
}

function matchedTransactionAdjustedPrice(tx, hpi) {
  if (!tx || typeof tx !== "object") return null;
  const fromWorker = toInt(tx.adjustedPrice);
  if (fromWorker > 0) return fromWorker;

  const targetIdx =
    hpi?.index != null && hpi.index !== undefined && toFloat(hpi.index) > 0
      ? toFloat(hpi.index)
      : null;
  const saleMonth =
    tx.date && String(tx.date).length >= 7 ? String(tx.date).slice(0, 7) : "";
  const baseIdx = hpiIndexForTransaction(hpi?.series || [], saleMonth);
  const price = toInt(tx.price);
  if (!targetIdx || !baseIdx || baseIdx <= 0 || targetIdx <= 0 || price <= 0) {
    return null;
  }
  return adjustPriceForHpi(price, baseIdx, targetIdx);
}

function marketAverageAdjustedPerSqft(txs, hpi) {
  if (!Array.isArray(txs) || !txs.length) return null;
  let sumAdj = 0;
  let sumSqft = 0;
  for (const tx of txs) {
    const adj = matchedTransactionAdjustedPrice(tx, hpi);
    const sqft = toFloat(tx?.floorAreaSqft);
    if (adj != null && adj > 0 && sqft > 0) {
      sumAdj += adj;
      sumSqft += sqft;
    }
  }
  if (sumSqft <= 0) return null;
  return sumAdj / sumSqft;
}

function findMatchedTransaction(state, addr, matched, propertyTitle) {
  const txs = state.normalised?.ppi?.transactions || [];
  if (!Array.isArray(txs) || !txs.length) return null;
  const candidates = propertyAddressCandidates(state, addr, matched, propertyTitle);
  if (!candidates.length) return null;

  let best = null;
  let bestScore = 0;
  for (const tx of txs) {
    const txAddr = normAddr(tx?.displayAddress || "");
    if (!txAddr) continue;
    for (const c of candidates) {
      const score = addressSimilarityScore(c, txAddr);
      if (score > bestScore) {
        bestScore = score;
        best = tx;
      }
    }
  }
  return bestScore >= 8 ? best : null;
}

function propertyAddressCandidates(state, addr, matched, propertyTitle) {
  const out = [];
  const push = (v) => {
    const n = normAddr(v);
    if (!n) return;
    if (!out.includes(n)) out.push(n);
  };

  push(`${addr?.line1 || ""} ${addr?.line2 || ""} ${addr?.line3 || ""}`);
  push(matched?.address || "");
  push(propertyTitle || "");
  const selLabel = String(state.selection?.label || "");
  push(selLabel.split(" — ")[0] || "");
  return out;
}

function addressSimilarityScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 60;

  const ta = tokens(a);
  const tb = new Set(tokens(b));
  if (!ta.length || !tb.size) return 0;

  let score = 0;
  for (const t of ta) {
    if (tb.has(t)) score += t.length >= 4 ? 3 : 1;
  }

  const numsA = ta.filter((t) => /^\d+[a-z]?$/.test(t));
  if (numsA.length && numsA.some((n) => tb.has(n))) score += 4;
  return score;
}

function tokens(s) {
  return normAddr(s)
    .split(" ")
    .filter((t) => t && t.length > 1);
}

function normAddr(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
