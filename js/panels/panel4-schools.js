import { el } from "../utils/dom.js";
import { formatNumber } from "../utils/format.js";

export function renderPanelSchools(state) {
  const root = el("panel-schools");
  if (!root) return;

  const err = state.errors?.schools;
  if (state.loading && !(state.normalised?.schools?.schools || []).length) {
    root.innerHTML = `<div class="animate-pulse h-6 bg-[#1F242D] rounded"></div>`;
    return;
  }
  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const sch = state.normalised?.schools || {};
  const list = sch.schools || [];
  const rows = list.slice(0, 10).map(
    (s) => `
    <tr class="border-b border-[#1F242D]">
      <td class="py-2 pr-2 text-xs text-[#C7CBD4]">${escapeHtml(s.name)}</td>
      <td class="py-2 pr-2 text-xs text-[#8E95A3]">${escapeHtml(s.phase)}</td>
      <td class="py-2 font-mono text-xs text-[#4ADE80]">${formatNumber(s.distanceMiles, 2)} mi</td>
    </tr>`
  );

  root.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead><tr class="text-[#8E95A3]"><th class="pb-2">School</th><th class="pb-2">Phase</th><th class="pb-2">Dist</th></tr></thead>
        <tbody>${rows.length ? rows.join("") : `<tr><td colspan="3" class="text-[#8E95A3] py-2">No schools returned.</td></tr>`}</tbody>
      </table>
    </div>
    <p class="text-xs text-[#8E95A3] mt-2">${escapeHtml(sch.meta?.note || "")}</p>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
