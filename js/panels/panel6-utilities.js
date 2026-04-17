import { el } from "../utils/dom.js";
import { formatNumber } from "../utils/format.js";

export function renderPanelUtilities(state) {
  const root = el("panel-utilities");
  if (!root) return;

  const err = state.errors?.utilities;
  if (state.loading && !state.normalised?.broadband?.postcode) {
    root.innerHTML = `<div class="animate-pulse h-6 bg-[#1F242D] rounded"></div>`;
    return;
  }
  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const b = state.normalised?.broadband || {};
  const dl =
    b.maxDownloadMbps === null || b.maxDownloadMbps === undefined
      ? "—"
      : `${formatNumber(b.maxDownloadMbps, 0)} Mbps`;
  const ul =
    b.maxUploadMbps === null || b.maxUploadMbps === undefined
      ? "—"
      : `${formatNumber(b.maxUploadMbps, 0)} Mbps`;

  root.innerHTML = `
    <dl class="grid grid-cols-1 gap-2 text-sm">
      <div class="flex justify-between border-b border-[#1F242D] py-1"><dt class="text-[#8E95A3]">Postcode</dt><dd class="font-mono text-[#C7CBD4]">${escapeHtml(b.postcode || "—")}</dd></div>
      <div class="flex justify-between border-b border-[#1F242D] py-1"><dt class="text-[#8E95A3]">Downlink (max)</dt><dd class="font-mono text-[#4ADE80]">${dl}</dd></div>
      <div class="flex justify-between border-b border-[#1F242D] py-1"><dt class="text-[#8E95A3]">Uplink (max)</dt><dd class="font-mono text-[#60A5FA]">${ul}</dd></div>
    </dl>
    <p class="text-xs text-[#8E95A3] mt-3">${escapeHtml(b.meta?.note || "")}</p>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
