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

let tooltipCleanup = null;

function row(k, v) {
  return `<div class="flex justify-between gap-2 py-1 border-b border-[#1F242D]"><span class="text-[#8E95A3]">${k}</span><span class="font-mono text-[#C7CBD4] text-right">${v}</span></div>`;
}

export function renderPanelIdentity(state) {
  const root = el("panel-identity");
  if (!root) return;
  if (typeof tooltipCleanup === "function") {
    tooltipCleanup();
    tooltipCleanup = null;
  }

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
  rows.push(row("Last sale", escapeHtml(lastSaleTextForProperty(state, title))));
  rows.push(
    row(
      "HPI projection",
      escapeHtml(hpiProjectionTextForProperty(state, title, floorSqft))
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
    <div class="mt-3">
      <button
        type="button"
        id="identity-hpi-info-btn"
        class="inline-flex items-center gap-2 text-xs text-[#8E95A3] hover:text-[#C7CBD4] transition-colors"
        aria-expanded="false"
        aria-controls="identity-hpi-info-tip"
      >
        <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#1F242D] font-mono text-[10px]">i</span>
        HPI projection explanation
      </button>
      <div
        id="identity-hpi-info-tip"
        class="hidden mt-2 rounded border border-[#1F242D] bg-[#0B0E13] p-2 text-xs text-[#8E95A3] leading-relaxed"
      >
        <span class="text-[#C7CBD4]">HPI-adjusted</span> revalues the matched last sale using the same UKHPI method as Market Evidence (worker value first, then HPI series fallback).
        <span class="text-[#C7CBD4]">Area-projected</span> uses market average HPI-adjusted £/ft² and multiplies it by this property's floor area.
      </div>
    </div>
  `;

  const infoBtn = root.querySelector("#identity-hpi-info-btn");
  const infoTip = root.querySelector("#identity-hpi-info-tip");
  if (infoBtn && infoTip) {
    const closeTip = () => {
      infoTip.classList.add("hidden");
      infoBtn.setAttribute("aria-expanded", "false");
    };

    infoBtn.addEventListener("click", () => {
      const isOpen = !infoTip.classList.contains("hidden");
      if (isOpen) {
        closeTip();
      } else {
        infoTip.classList.remove("hidden");
        infoBtn.setAttribute("aria-expanded", "true");
      }
    });

    const onDocPointerDown = (ev) => {
      const target = ev.target;
      if (!(target instanceof Node)) return;
      if (infoBtn.contains(target) || infoTip.contains(target)) return;
      closeTip();
    };

    const onDocKeyDown = (ev) => {
      if (ev.key === "Escape") closeTip();
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    tooltipCleanup = () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }
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

function lastSaleTextForProperty(state, propertyTitle) {
  const match = findMatchedTransaction(state, propertyTitle);
  if (!match) return "—";
  const saleDate = formatDateIso(match.date || "");
  const salePrice = Number(match.price) > 0 ? formatGbp(match.price) : "";
  if (salePrice && saleDate) return `${salePrice} on ${saleDate}`;
  if (salePrice) return salePrice;
  if (saleDate) return saleDate;
  return "—";
}

function hpiProjectionTextForProperty(state, propertyTitle, floorSqft) {
  const txs = Array.isArray(state.normalised?.ppi?.transactions)
    ? state.normalised.ppi.transactions
    : [];
  const hpi = state.normalised?.hpi || {};
  const match = findMatchedTransaction(state, propertyTitle);

  const hpiAdjusted = matchedTransactionAdjustedPrice(match, hpi);
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

function findMatchedTransaction(state, propertyTitle) {
  const txs = state.normalised?.ppi?.transactions || [];
  if (!Array.isArray(txs) || !txs.length) return null;
  const propertyKey = normAddr(propertyTitle);
  if (!propertyKey) return null;
  return (
    txs.find((t) => {
      const txAddr = normAddr(t?.displayAddress || "");
      if (!txAddr) return false;
      return txAddr.includes(propertyKey) || propertyKey.includes(txAddr);
    }) || null
  );
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
