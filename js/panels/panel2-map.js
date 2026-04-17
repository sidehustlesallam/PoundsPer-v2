import { el } from "../utils/dom.js";

let mapInstance = null;
let markerLayer = null;

export function renderPanelMap(state) {
  const root = el("panel-map");
  if (!root) return;

  const err = state.errors?.map;
  if (err) {
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const lat = state.selection?.lat ?? state.normalised?.geo?.lat ?? 0;
  const lon = state.selection?.lon ?? state.normalised?.geo?.lon ?? 0;

  if (!lat || !lon) {
    root.innerHTML = `<p class="text-[#8E95A3] text-sm">No coordinates for map.</p>`;
    return;
  }

  root.innerHTML = `<div id="leaflet-map" class="w-full h-64 rounded border border-[#1F242D] z-0"></div>`;

  const L = globalThis.L;
  if (!L) {
    root.innerHTML = `<p class="text-[#FACC15] text-sm">Map library not loaded.</p>`;
    return;
  }

  requestAnimationFrame(() => {
    const container = el("leaflet-map");
    if (!container) return;

    if (!mapInstance) {
      mapInstance = L.map(container).setView([lat, lon], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(mapInstance);
      markerLayer = L.layerGroup().addTo(mapInstance);
    } else {
      mapInstance.setView([lat, lon], 15);
      if (!markerLayer) {
        markerLayer = L.layerGroup().addTo(mapInstance);
      }
    }

    markerLayer.clearLayers();
    L.marker([lat, lon]).addTo(markerLayer);
    mapInstance.invalidateSize();
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
