import { el } from "../utils/dom.js";
import { formatGbp, formatNumber } from "../utils/format.js";

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
  const first = search.rows?.[0];

  const title =
    addr.line1 ||
    first?.address ||
    state.selection?.label ||
    "Registered asset";

  const rows = [];
  rows.push(row("Postcode", escapeHtml(first?.postcode || state.selection?.postcode || "—")));
  rows.push(row("UPRN", escapeHtml(first?.uprn || addr.uprn || "—")));
  rows.push(row("EPC rating", escapeHtml(cert.energyRating || first?.energyRating || "—")));
  rows.push(row("Floor area", `${formatNumber(cert.floorAreaSqm || first?.floorAreaSqm || 0, 1)} m²`));
  rows.push(
    row(
      "£/m² (if price)",
      cert.transactionPrice
        ? formatGbp(cert.pricePerSqm)
        : "—"
    )
  );
  rows.push(row("Tenure", escapeHtml(first?.tenure || "—")));
  rows.push(row("Lodgement", escapeHtml(first?.lodgementDate || "—")));

  root.innerHTML = `
    <h3 class="text-sm font-medium text-[#C7CBD4] mb-3">${escapeHtml(title)}</h3>
    <div class="text-xs">${rows.join("")}</div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
