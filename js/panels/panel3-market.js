import { el } from "../utils/dom.js";
import { formatGbp, formatNumber, toFloat, toInt } from "../utils/format.js";
import {
  adjustPriceForHpi,
  hpiIndexForTransaction,
} from "../normalisers/hpi.js";

const DEFAULT_TX = 3;
const EXPANDED_TX = 10;
const COLS = 8;
let isMarketExpanded = false;

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

/** Whole £/ft² (HPI columns use same rounding). */
function formatGbpPerSqft(ps) {
  const v = Math.round(toFloat(ps));
  if (v <= 0) return "—";
  return `£${v.toLocaleString("en-GB")}/ft²`;
}

function hpiAdjustedForRow(t, hpi) {
  const fromWorker = toInt(t.adjustedPrice);
  if (fromWorker > 0) return fromWorker;
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

function hpiAdjustedPerSqft(adjPrice, floorAreaSqft) {
  const sf = toFloat(floorAreaSqft);
  if (adjPrice == null || sf <= 0) return null;
  return adjPrice / sf;
}

function marketAverages(txs) {
  const n = txs.length;
  if (!n) {
    return {
      avgSqft: null,
      avgPrice: null,
      avgPricePerSqft: null,
      avgHpiAdj: null,
      avgHpiAdjPerSqft: null,
    };
  }
  let sumPrice = 0;
  let sumSqft = 0;
  let nSqft = 0;
  let sumPriceWithSqft = 0;
  let sumHpi = 0;
  let nHpi = 0;
  let sumHpiSqftDenom = 0;
  let sumHpiForPerSqft = 0;
  for (const t of txs) {
    sumPrice += t.price || 0;
    const sf = toFloat(t.floorAreaSqft);
    if (sf > 0) {
      sumSqft += sf;
      nSqft += 1;
      sumPriceWithSqft += t.price || 0;
    }
    if (t._hpiAdj != null && t._hpiAdj > 0) {
      sumHpi += t._hpiAdj;
      nHpi += 1;
      if (sf > 0) {
        sumHpiForPerSqft += t._hpiAdj;
        sumHpiSqftDenom += sf;
      }
    }
  }
  return {
    avgSqft: nSqft > 0 ? sumSqft / nSqft : null,
    avgPrice: sumPrice / n,
    avgPricePerSqft:
      sumSqft > 0 ? sumPriceWithSqft / sumSqft : null,
    avgHpiAdj: nHpi > 0 ? sumHpi / nHpi : null,
    avgHpiAdjPerSqft:
      sumHpiSqftDenom > 0 ? sumHpiForPerSqft / sumHpiSqftDenom : null,
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
  const canExpand = txsAll.length > DEFAULT_TX;
  const visibleCount = isMarketExpanded ? EXPANDED_TX : DEFAULT_TX;
  const txs = txsAll.slice(0, visibleCount).map((t) => {
    const adj = hpiAdjustedForRow(t, hpi);
    const adjPerFt =
      adj != null ? hpiAdjustedPerSqft(adj, t.floorAreaSqft) : null;
    return { ...t, _hpiAdj: adj, _hpiAdjPerSqft: adjPerFt };
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
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#8E95A3] whitespace-nowrap">${formatGbpPerSqft(t.pricePerSqft)}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#60A5FA] whitespace-nowrap">${t._hpiAdj != null ? formatGbp(t._hpiAdj) : "—"}</td>
      <td class="py-2 font-mono text-[10px] sm:text-xs text-[#60A5FA] whitespace-nowrap">${t._hpiAdjPerSqft != null ? formatGbpPerSqft(t._hpiAdjPerSqft) : "—"}</td>
    </tr>`
  );

  const avgRow = `
    <tr class="border-t border-[#1F242D] bg-[#141820] font-medium">
      <td class="py-2 pr-2 text-[10px] sm:text-xs text-[#8E95A3]">—</td>
      <td class="py-2 pr-2 text-[10px] sm:text-xs text-[#C7CBD4]">Market average</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-right text-[#C7CBD4]">${av.avgSqft != null ? formatNumber(av.avgSqft, 0) : "—"}</td>
      <td class="py-2 pr-2 text-center text-[10px] sm:text-xs text-[#8E95A3]">—</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#4ADE80]">${av.avgPrice != null ? formatGbp(Math.round(av.avgPrice)) : "—"}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#8E95A3]">${av.avgPricePerSqft != null && av.avgPricePerSqft > 0 ? formatGbpPerSqft(av.avgPricePerSqft) : "—"}</td>
      <td class="py-2 pr-2 font-mono text-[10px] sm:text-xs text-[#60A5FA]">${av.avgHpiAdj != null ? formatGbp(Math.round(av.avgHpiAdj)) : "—"}</td>
      <td class="py-2 font-mono text-[10px] sm:text-xs text-[#60A5FA]">${av.avgHpiAdjPerSqft != null && av.avgHpiAdjPerSqft > 0 ? formatGbpPerSqft(av.avgHpiAdjPerSqft) : "—"}</td>
    </tr>`;

  root.innerHTML = `
    <div>
      <h4 class="text-xs uppercase tracking-wide text-[#8E95A3] mb-2">Recent transactions (PPD)</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[10px] sm:text-xs min-w-[720px]">
          <thead>
            <tr class="text-[#8E95A3]">
              <th class="pb-2 pr-2 font-normal">Date</th>
              <th class="pb-2 pr-2 font-normal">Address</th>
              <th class="pb-2 pr-2 font-normal text-right">ft²</th>
              <th class="pb-2 pr-2 font-normal text-center">EPC</th>
              <th class="pb-2 pr-2 font-normal">Price</th>
              <th class="pb-2 pr-2 font-normal">£/ft²</th>
              <th class="pb-2 pr-2 font-normal">HPI adj. £</th>
              <th class="pb-2 font-normal">HPI adj. £/ft²</th>
            </tr>
          </thead>
          <tbody>${
            rows.length
              ? `${rows.join("")}${avgRow}`
              : `<tr><td colspan="${COLS}" class="text-[#8E95A3] py-2">No transactions returned.</td></tr>`
          }</tbody>
        </table>
      </div>
      ${
        canExpand
          ? `<div class="mt-3">
               <button
                 id="market-toggle-btn"
                 type="button"
                 class="text-xs text-[#60A5FA] hover:underline"
               >${isMarketExpanded ? "Show fewer" : "...see more..."}</button>
             </div>`
          : ""
      }
    </div>
  `;

  if (canExpand) {
    root.querySelector("#market-toggle-btn")?.addEventListener("click", () => {
      isMarketExpanded = !isMarketExpanded;
      renderPanelMarket(state);
    });
  }
}
