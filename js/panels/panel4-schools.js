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
  const rows = list.slice(0, 10).map((s) => {
    const ofsted = s.ofsted ? escapeHtml(s.ofsted) : "—";
    const report = s.lastReport ? escapeHtml(s.lastReport) : "—";
    const nameCell = s.reportUrl
      ? `<a class="text-[#60A5FA] hover:underline" href="${escapeHtml(s.reportUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a>`
      : escapeHtml(s.name);
    return `
    <tr class="border-b border-[#1F242D]">
      <td class="py-2 pr-2 text-xs text-[#C7CBD4]">${nameCell}</td>
      <td class="py-2 pr-2 text-xs text-[#8E95A3]">${escapeHtml(s.phase)}</td>
      <td class="py-2 pr-2 font-mono text-xs text-[#FACC15]">${ofsted}</td>
      <td class="py-2 pr-2 font-mono text-xs text-[#4ADE80]">${formatNumber(s.distanceMiles, 2)} mi</td>
      <td class="py-2 text-xs text-[#8E95A3]">${report}</td>
    </tr>`;
  });

  root.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs min-w-[420px]">
        <thead><tr class="text-[#8E95A3]"><th class="pb-2">School</th><th class="pb-2">Category</th><th class="pb-2">Ofsted</th><th class="pb-2">Dist</th><th class="pb-2">Last report</th></tr></thead>
        <tbody>${rows.length ? rows.join("") : `<tr><td colspan="5" class="text-[#8E95A3] py-2">No schools returned.</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
