import { el } from "../utils/dom.js";

export function renderPanelRisk(state) {
  const root = el("panel-risk");
  if (!root) return;

  const err = state.errors?.risk;
  if (state.loading && !state.normalised?.flood?.postcode) {
    root.innerHTML = `<div class="animate-pulse h-6 bg-[#1F242D] rounded"></div>`;
    return;
  }
  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const flood = state.normalised?.flood || {};
  const radon = state.normalised?.radon || {};

  const floodClass =
    flood.riskLevel === "HIGH"
      ? "text-[#F87171]"
      : flood.riskLevel === "MEDIUM"
        ? "text-[#FACC15]"
        : "text-[#4ADE80]";

  const radonClass =
    radon.riskLevel === "HIGH"
      ? "text-[#F87171]"
      : radon.riskLevel === "MEDIUM"
        ? "text-[#FACC15]"
        : "text-[#4ADE80]";

  root.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div class="rounded border border-[#1F242D] p-3">
        <h4 class="text-xs uppercase text-[#8E95A3] mb-2">Flood</h4>
        <p class="font-mono ${floodClass}">Level: ${escapeHtml(flood.riskLevel || "—")}</p>
        <p class="text-xs text-[#8E95A3] mt-2">${escapeHtml(flood.meta?.note || "")}</p>
      </div>
      <div class="rounded border border-[#1F242D] p-3">
        <h4 class="text-xs uppercase text-[#8E95A3] mb-2">Radon</h4>
        <p class="font-mono text-[#C7CBD4]">Band: ${escapeHtml(radon.band || "—")}</p>
        <p class="font-mono ${radonClass} mt-1">Risk: ${escapeHtml(radon.riskLevel || "—")}</p>
        <p class="text-xs text-[#8E95A3] mt-2">${escapeHtml(radon.meta?.note || "")}</p>
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
