import { el } from "../utils/dom.js";

let mapInstance = null;
let markerLayer = null;

function destroyMap() {
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch (_) {
      /* detached or already removed */
    }
    mapInstance = null;
    markerLayer = null;
  }
}

export function renderPanelMap(state) {
  const root = el("panel-map");
  if (!root) return;

  const err = state.errors?.map;
  if (err) {
    destroyMap();
    root.innerHTML = `<p class="text-[#F87171] text-sm">${escapeHtml(err)}</p>`;
    return;
  }

  const lat = state.selection?.lat ?? state.normalised?.geo?.lat ?? 0;
  const lon = state.selection?.lon ?? state.normalised?.geo?.lon ?? 0;

  if (!lat || !lon) {
    destroyMap();
    root.innerHTML = `<p class="text-[#8E95A3] text-sm">No coordinates for map.</p>`;
    return;
  }

  // Leaflet binds to a specific DOM node; replacing root.innerHTML orphans the map
  // while mapInstance still references the old node (e.g. second renderAllPanels after fetch).
  let container = root.querySelector("#leaflet-map");
  if (!container) {
    destroyMap();
    root.innerHTML = `<div id="leaflet-map" class="w-full h-64 rounded border border-[#1F242D] z-0"></div>`;
  }

  const L = globalThis.L;
  if (!L) {
    destroyMap();
    root.innerHTML = `<p class="text-[#FACC15] text-sm">Map library not loaded.</p>`;
    return;
  }

  requestAnimationFrame(() => {
    const mapEl = el("leaflet-map");
    if (!mapEl || !root.contains(mapEl)) return;

    if (mapInstance && mapInstance.getContainer() !== mapEl) {
      destroyMap();
    }

    if (!mapInstance) {
      mapInstance = L.map(mapEl).setView([lat, lon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(mapInstance);
      markerLayer = L.layerGroup().addTo(mapInstance);
    } else {
      mapInstance.setView([lat, lon], 16);
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
