import { el } from "../utils/dom.js";
import { formatNumber } from "../utils/format.js";

export function renderPanelNearbyPostcodes(state) {
  const root = el("panel-nearby-postcodes");
  if (!root) return;

  const err = state.errors?.nearbyPostcodes;
  if (state.loading && !(state.normalised?.nearbyPostcodes?.postcodes || []).length) {
    root.innerHTML = `<div class="animate-pulse h-6 bg-[#1F242D] rounded"></div>`;
    return;
  }
  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const nearby = state.normalised?.nearbyPostcodes || {};
  const list = Array.isArray(nearby.postcodes) ? nearby.postcodes : [];
  const active = nearby.activePostcode || state.selection?.postcode || "";

  if (!state.selection) {
    root.innerHTML = `<p class="text-xs text-[#8E95A3]">Select an address to see nearby postcodes.</p>`;
    return;
  }

  if (!list.length) {
    root.innerHTML = `
      <p class="text-xs text-[#8E95A3]">No nearby postcodes available for this location.</p>
      ${active ? `<p class="text-xs text-[#8E95A3] mt-2">Current postcode: <span class="font-mono text-[#C7CBD4]">${escapeHtml(active)}</span></p>` : ""}
    `;
    return;
  }

  const chips = list
    .map(
      (x) => `
      <button
        type="button"
        data-nearby-postcode="${escapeHtml(x.postcode)}"
        class="rounded-md border border-[#1F242D] bg-[#0B0E13] px-3 py-2 text-left hover:border-[#60A5FA]/60 transition-colors"
      >
        <div class="text-sm font-mono text-[#60A5FA]">${escapeHtml(x.postcode)}</div>
        ${
          x.firstLine
            ? `<div class="mt-0.5 text-xs text-[#C7CBD4]">${escapeHtml(x.firstLine)}</div>`
            : ""
        }
        ${
          x.distanceMetres > 0
            ? `<div class="mt-0.5 text-xs text-[#8E95A3]">~${formatNumber(x.distanceMetres, 0)}m</div>`
            : ""
        }
      </button>
    `
    )
    .join("");

  root.innerHTML = `
    <div class="space-y-3">
      <p class="text-xs text-[#8E95A3]">
        Try a nearby postcode to quickly re-run address resolve.
      </p>
      ${active ? `<p class="text-xs text-[#8E95A3]">Current postcode: <span class="font-mono text-[#C7CBD4]">${escapeHtml(active)}</span></p>` : ""}
      <div class="flex flex-wrap gap-2">${chips}</div>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
