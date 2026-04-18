import { el } from "../utils/dom.js";
import { formatGbp, formatNumber, toFloat } from "../utils/format.js";
import {
  adjustPriceForHpi,
  hpiIndexForTransaction,
} from "../normalisers/hpi.js";

const MAX_TX = 5;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ellipsize(s, max) {
  const t = String(s || "").trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function hpiAdjustedForRow(t, hpi) {
  const targetIdx =
    hpi.index != null && hpi.index !== undefined && toFloat(hpi.index) > 0
      ? toFloat(hpi.index)
      : null;
  const saleMonth =
    t.date && String(t.date).length >= 7 ? String(t.date).slice(0, 7) : "";
  const baseIdx = hpiIndexForTransaction(hpi.series, saleMonth);
  if (
    targetIdx == null ||
    baseIdx == null ||
    baseIdx <= 0 ||
    targetIdx <= 0 ||
    !t.price
  ) {
    return null;
  }
  return adjustPriceForHpi(t.price, baseIdx, targetIdx);
}

function marketAverages(txs) {
  const n = txs.length;
  if (!n) {
    return {
      avgSqft: null,
      avgPrice: null,
      avgPricePerSqm: null,
      avgHpiAdj: null,
    };
  }
  let sumPrice = 0;
  let sumSqft = 0;
  let nSqft = 0;
  let sumSqm = 0;
  let sumPriceWithSqm = 0;
  let sumHpi = 0;
  let nHpi = 0;
  for (const t of txs) {
    sumPrice += t.price || 0;
    const sf = toFloat(t.floorAreaSqft);
    if (sf > 0) {
      sumSqft += sf;
      nSqft += 1;
    }
    const sm = toFloat(t.floorAreaSqm);
    if (sm > 0 && t.price) {
      sumSqm += sm;
      sumPriceWithSqm += t.price;
    }
  }
  const adjVals = txs
    .map((t) => t._hpiAdj)
    .filter((v) => v != null && v > 0);
  for (const v of adjVals) {
    sumHpi += v;
    nHpi += 1;
  }
  return {
    avgSqft: nSqft > 0 ? sumSqft / nSqft : null,
    avgPrice: sumPrice / n,
    avgPricePerSqm:
      sumSqm > 0 ? sumPriceWithSqm / sumSqm : null,
    avgHpiAdj: nHpi > 0 ? sumHpi / nHpi : null,
  };
}

export function renderPanelMarket(state) {
  const root = el("panel-market");
  if (!root) return;

  const err = state.errors?.market;
  if (state.loading && !state.normalised?.ppi?.transactions?.length) {
    root.innerHTML = `<div class="animate-pulse h-8 bg-[#1F242D] rounded"></div>`;
    return;
  }
  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const ppi = state.normalised?.ppi || {};
  const hpi = state.normalised?.hpi || {};
  const txsAll = ppi.transactions || [];
  const txs = txsAll.slice(0, MAX_TX).map((t) => {
    const adj = hpiAdjustedForRow(t, hpi);
    return { ...t, _hpiAdj: adj };
  });

  const av = marketAverages(txs);

  const rows = txs.map(
    (t) => `
    <tr class="border-b border-[#1F242D]">
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#C7CBD4] whitespace-nowrap">${escapeHtml(t.date || "—")}</td>
      <td class="py-2 pr-2 text-[10px] sm:text-xs text-[#C7CBD4] max-w-[140px] sm:max-w-[200px]" title="${escapeHtml(t.displayAddress || "")}">${escapeHtml(ellipsize(t.displayAddress, 42))}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-right text-[#C7CBD4]">${t.floorAreaSqft > 0 ? formatNumber(t.floorAreaSqft, 0) : "—"}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-center text-[#FACC15]">${escapeHtml(t.epcRating || "—")}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#4ADE80] whitespace-nowrap">${formatGbp(t.price)}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#8E95A3] whitespace-nowrap">${t.pricePerSqm > 0 ? `${formatGbp(t.pricePerSqm)}/m²` : "—"}</td>
      <td class="py-2 font-mono text-[10px] sm:text-xs text-[#60A5FA] whitespace-nowrap">${t._hpiAdj != null ? formatGbp(t._hpiAdj) : "—"}</td>
    </tr>`
  );

  const avgRow = `
    <tr class="border-t border-[#1F242D] bg-[#141820] font-medium">
      <td class="py-2 pr-2 text-[10px] sm:text-xs text-[#8E95A3]">—</td>
      <td class="py-2 pr-2 text-[10px] sm:text-xs text-[#C7CBD4]">Market average</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-right text-[#C7CBD4]">${av.avgSqft != null ? formatNumber(av.avgSqft, 0) : "—"}</td>
      <td class="py-2 pr-2 text-center text-[10px] sm:text-xs text-[#8E95A3]">—</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#4ADE80]">${av.avgPrice != null ? formatGbp(Math.round(av.avgPrice)) : "—"}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#8E95A3]">${av.avgPricePerSqm != null && av.avgPricePerSqm > 0 ? `${formatGbp(Math.round(av.avgPricePerSqm))}/m²` : "—"}</td>
      <td class="py-2 font-mono text-[10px] sm:text-xs text-[#60A5FA]">${av.avgHpiAdj != null ? formatGbp(Math.round(av.avgHpiAdj)) : "—"}</td>
    </tr>`;

  const hpiNote =
    hpi.index !== null && hpi.index !== undefined && toFloat(hpi.index) > 0
      ? formatNumber(toFloat(hpi.index), 2)
      : "—";

  const hpiMonth = escapeHtml(hpi.month || "");
  const hpiExplain = `Each sale is re-valued using the UKHPI for its completion month (base) versus the latest index for this area (${hpiMonth || "n/a"}: ${hpiNote}). Where the sale month is missing or outside the series, “—” is shown.`;

  root.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <h4 class="text-xs uppercase tracking-wide text-[#8E95A3] mb-2">Recent transactions (PPD)</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[10px] sm:text-xs min-w-[640px]">
            <thead>
              <tr class="text-[#8E95A3]">
                <th class="pb-2 pr-2 font-normal">Date</th>
                <th class="pb-2 pr-2 font-normal">Address</th>
                <th class="pb-2 pr-2 font-normal text-right">ft²</th>
                <th class="pb-2 pr-2 font-normal text-center">EPC</th>
                <th class="pb-2 pr-2 font-normal">Price</th>
                <th class="pb-2 pr-2 font-normal">£/m²</th>
                <th class="pb-2 font-normal">HPI adj.</th>
              </tr>
            </thead>
            <tbody>${
              rows.length
                ? `${rows.join("")}${avgRow}`
                : `<tr><td colspan="7" class="text-[#8E95A3] py-2">No transactions returned.</td></tr>`
            }</tbody>
          </table>
        </div>
      </div>
      <div>
        <h4 class="text-xs uppercase tracking-wide text-[#8E95A3] mb-2">HPI context</h4>
        <p class="font-mono text-sm text-[#C7CBD4]">Reference index (${hpiMonth || "—"}): <span class="text-[#60A5FA]">${hpiNote}</span></p>
        <p class="text-xs text-[#8E95A3] mt-2 leading-relaxed">${hpiExplain}</p>
        <p class="text-xs text-[#8E95A3] mt-2">${escapeHtml(hpi.meta?.note || "")}</p>
        <p class="text-xs text-[#8E95A3] mt-1">${escapeHtml(ppi.meta?.note || "")}</p>
      </div>
    </div>
  `;
}
