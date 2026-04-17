import { el } from "../utils/dom.js";
import { formatGbp, formatNumber } from "../utils/format.js";

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
  const txs = ppi.transactions || [];

  const rows = txs.slice(0, 8).map(
    (t) => `
    <tr class="border-b border-[#1F242D]">
      <td class="py-2 pr-2 font-mono text-xs text-[#C7CBD4]">${escapeHtml(t.date || "—")}</td>
      <td class="py-2 pr-2 font-mono text-xs text-[#4ADE80]">${formatGbp(t.price)}</td>
      <td class="py-2 font-mono text-xs text-[#8E95A3]">${formatGbp(t.pricePerSqm)}/m²</td>
    </tr>`
  );

  const hpiNote =
    hpi.index !== null && hpi.index !== undefined
      ? formatNumber(hpi.index, 2)
      : "—";

  root.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 class="text-xs uppercase tracking-wide text-[#8E95A3] mb-2">Recent transactions (PPD)</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead><tr class="text-[#8E95A3]"><th class="pb-2">Date</th><th class="pb-2">Price</th><th class="pb-2">£/m²</th></tr></thead>
            <tbody>${rows.length ? rows.join("") : `<tr><td colspan="3" class="text-[#8E95A3] py-2">No transactions returned.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div>
        <h4 class="text-xs uppercase tracking-wide text-[#8E95A3] mb-2">HPI context</h4>
        <p class="font-mono text-sm text-[#C7CBD4]">Index: <span class="text-[#60A5FA]">${hpiNote}</span></p>
        <p class="text-xs text-[#8E95A3] mt-2">${escapeHtml(hpi.meta?.note || "")}</p>
        <p class="text-xs text-[#8E95A3] mt-2">${escapeHtml(ppi.meta?.note || "")}</p>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
