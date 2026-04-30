import { el } from "../utils/dom.js";
import { formatGbp, formatNumber, toFloat, toInt } from "../utils/format.js";
import {
  adjustPriceForHpi,
  hpiIndexForTransaction,
} from "../normalisers/hpi.js";

const MAX_TX_EXPLANATIONS = 5;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function matchedEpcRow(state) {
  const search = state.normalised?.epcSearch || {};
  const selLmk = state.selection?.lmkKey || "";
  const searchRows = search.rows || [];
  return (
    (selLmk && searchRows.find((x) => x.lmkKey === selLmk)) ||
    searchRows[0] ||
    null
  );
}

function tenureBlock(state) {
  const matched = matchedEpcRow(state);
  const value = escapeHtml(matched?.tenure || "—");
  return `
    <section>
      <h3 class="text-xs font-medium text-[#C7CBD4] uppercase tracking-wide mb-2">Tenure (EPC)</h3>
      <p class="text-xs text-[#8E95A3] leading-relaxed">
        On the energy certificate, tenure is self-reported (freehold, leasehold, or not known) and may not match Land Registry title records.
      </p>
      <p class="text-xs text-[#C7CBD4] mt-2 font-mono">This property: <span class="text-[#60A5FA]">${value}</span></p>
    </section>
  `;
}

function hpiBlock(state) {
  const hpi = state.normalised?.hpi || {};
  const ppi = state.normalised?.ppi || {};
  const hpiIdx =
    hpi.index != null && hpi.index !== undefined && toFloat(hpi.index) > 0
      ? formatNumber(toFloat(hpi.index), 2)
      : "—";
  const hpiMonth = escapeHtml(hpi.month || "");
  const hasSeries = Array.isArray(hpi.series) && hpi.series.length > 0;
  const hpiExplain = hasSeries
    ? `HPI-adjusted price revalues each sale to the reference period using UKHPI: sale price × (reference index ÷ index for the sale's calendar month). Adjusted £/ft² is that figure divided by floor area when ft² is known. Reference index (${hpiMonth || "n/a"}): ${hpiIdx}.`
    : `No UKHPI series loaded for this area — check worker /hpi (local authority or postcode). Adjusted columns need index values by month.`;

  const hpiNote = escapeHtml(hpi.meta?.note || "");
  const ppiNote = escapeHtml(ppi.meta?.note || "");
  const ppiHpiMeta =
    ppi.meta?.hpi && typeof ppi.meta.hpi === "object" ? ppi.meta.hpi : null;
  const ppiHpiNote = ppiHpiMeta?.hpiNote
    ? escapeHtml(String(ppiHpiMeta.hpiNote))
    : "";
  const txs = Array.isArray(ppi.transactions) ? ppi.transactions.slice(0, MAX_TX_EXPLANATIONS) : [];
  const targetIdx = toFloat(hpi.index);
  const targetMonth = hpi.month || "reference month";

  const adjustmentItems = txs
    .map((t, idx) => {
      const salePrice = toInt(t.price);
      const saleMonth = String(t.saleMonth || (t.date ? String(t.date).slice(0, 7) : "")).trim();
      const baseIdxWorker = toFloat(t.hpiSale);
      const baseIdxClient = hpiIndexForTransaction(hpi.series, saleMonth);
      const baseIdx = baseIdxWorker > 0 ? baseIdxWorker : baseIdxClient;
      const workerAdjusted = toInt(t.adjustedPrice);
      const fallbackAdjusted =
        salePrice > 0 && baseIdx > 0 && targetIdx > 0
          ? adjustPriceForHpi(salePrice, baseIdx, targetIdx)
          : null;
      const adjusted = workerAdjusted > 0 ? workerAdjusted : fallbackAdjusted;
      const factor = baseIdx > 0 && targetIdx > 0 ? targetIdx / baseIdx : null;
      const addr = escapeHtml(String(t.displayAddress || "Comparable sale"));

      if (!adjusted || !saleMonth || !Number.isFinite(baseIdx) || baseIdx <= 0 || targetIdx <= 0) {
        return `
          <li class="text-xs text-[#8E95A3] leading-relaxed">
            <span class="text-[#C7CBD4]">${idx + 1}. ${addr}:</span>
            no HPI adjustment could be calculated for this row because one or more required inputs were missing (sale price, sale month, sale-month index, or reference index).
          </li>
        `;
      }

      return `
        <li class="text-xs text-[#8E95A3] leading-relaxed">
          <span class="text-[#C7CBD4]">${idx + 1}. ${addr} (${escapeHtml(saleMonth)}):</span>
          sale price ${formatGbp(salePrice)} multiplied by (${formatNumber(targetIdx, 2)} reference index for ${escapeHtml(targetMonth)} ÷ ${formatNumber(baseIdx, 2)} index for ${escapeHtml(saleMonth)}) = multiplier ${formatNumber(factor, 4)}, giving adjusted price ${formatGbp(adjusted)}.
          <div class="mt-1 font-mono text-[11px] text-[#60A5FA]">
            ${formatGbp(salePrice)} × (${formatNumber(targetIdx, 2)} ÷ ${formatNumber(baseIdx, 2)}) = ${formatGbp(adjusted)}
          </div>
        </li>
      `;
    })
    .join("");

  const adjustmentBlock = txs.length
    ? `
      <section class="mt-4">
        <h4 class="text-xs font-medium text-[#C7CBD4] uppercase tracking-wide mb-2">Per-sale HPI adjustment maths</h4>
        <ol class="space-y-2">
          ${adjustmentItems}
        </ol>
      </section>
    `
    : "";

  return `
    <section>
      <h3 class="text-xs font-medium text-[#C7CBD4] uppercase tracking-wide mb-2">HPI &amp; market references</h3>
      <p class="font-mono text-sm text-[#C7CBD4] mb-2">Reference index (${hpiMonth || "—"}): <span class="text-[#60A5FA]">${hpiIdx}</span></p>
      <p class="text-xs text-[#8E95A3] leading-relaxed">${hpiExplain}</p>
      ${hpiNote ? `<p class="text-xs text-[#8E95A3] mt-2">${hpiNote}</p>` : ""}
      ${ppiNote ? `<p class="text-xs text-[#8E95A3] mt-1">${ppiNote}</p>` : ""}
      ${ppiHpiNote ? `<p class="text-xs text-[#8E95A3] mt-2">${ppiHpiNote}</p>` : ""}
      ${adjustmentBlock}
    </section>
  `;
}

function schoolsBlock(state) {
  const sch = state.normalised?.schools || {};
  const note = escapeHtml(sch.meta?.note || "");
  return `
    <section>
      <h3 class="text-xs font-medium text-[#C7CBD4] uppercase tracking-wide mb-2">Nearby schools (Ofsted)</h3>
      ${
        note
          ? `<p class="text-xs text-[#8E95A3] leading-relaxed">${note}</p>`
          : `<p class="text-xs text-[#8E95A3] leading-relaxed">Results come from the Ofsted reports site search for your postcode (worker <code class="font-mono text-[#C7CBD4]">/schools/nearby</code>).</p>`
      }
    </section>
  `;
}

export function renderFooterContext(state) {
  const root = el("page-data-context-body");
  if (!root) return;
  root.innerHTML = `
    <div class="space-y-6">
      ${tenureBlock(state)}
      ${hpiBlock(state)}
      ${schoolsBlock(state)}
    </div>
  `;
}
