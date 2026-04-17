import { resolveAddresses } from "./js/api/resolve.js";
import {
  searchEpcByPostcode,
  getEpcCertificate,
  getPpiRecent,
  getHpi,
  getSchoolsNearby,
  getTransport,
  getBroadband,
  getFlood,
  getRadon,
  getGeo,
  getAddress,
} from "./js/api/index.js";
import {
  normaliseResolveResponse,
  normaliseGeoResponse,
  normaliseAddressResponse,
  normaliseEpcSearchResponse,
  normaliseEpcCertificateResponse,
  normalisePpiResponse,
  normaliseHpiResponse,
  normaliseSchoolsResponse,
  normaliseTransportResponse,
  normaliseBroadbandResponse,
  normaliseFloodResponse,
  normaliseRadonResponse,
} from "./js/normalisers/index.js";
import {
  state,
  resetState,
  setSelection,
  setLoading,
  setError,
  clearErrors,
} from "./js/state/index.js";
import { renderAllPanels } from "./js/panels/index.js";

function $(id) {
  return document.getElementById(id);
}

function populateAddressSelect(results) {
  const sel = $("address-select");
  if (!sel) return;
  sel.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose address…";
  sel.appendChild(placeholder);

  for (const r of results) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.label || r.postcode;
    opt.dataset.payload = JSON.stringify(r);
    sel.appendChild(opt);
  }
  sel.disabled = results.length === 0;
}

async function runResolve() {
  const input = $("search-input")?.value?.trim() || "";
  if (!input) return;

  clearErrors();
  try {
    const raw = await resolveAddresses(input);
    const norm = normaliseResolveResponse(raw);
    populateAddressSelect(norm.results);
    if (!norm.results.length) {
      setError("global", norm.hint || "No results.");
    } else {
      setError("global", "");
    }
    renderAllPanels(state);
  } catch (e) {
    setError("global", e.message || "Resolve failed");
    renderAllPanels(state);
  }
}

async function loadDatasetForSelection(sel) {
  resetState();
  setSelection(sel);
  setLoading(true);
  clearErrors();
  renderAllPanels(state);

  const postcode = sel.postcodeNormalized || "";
  const lat = sel.lat;
  const lon = sel.lon;
  const la = sel.localAuthority || "";

  const month = new Date();
  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  const tasks = [
    { key: "geo", run: () => getGeo(postcode) },
    { key: "epcSearch", run: () => searchEpcByPostcode(postcode) },
    { key: "ppi", run: () => getPpiRecent(postcode) },
    { key: "hpi", run: () => getHpi(la, monthStr) },
    { key: "schools", run: () => getSchoolsNearby(postcode) },
    { key: "transport", run: () => getTransport(lat, lon) },
    { key: "broadband", run: () => getBroadband(postcode) },
    { key: "flood", run: () => getFlood(postcode) },
    { key: "radon", run: () => getRadon(postcode) },
  ];

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));

  settled.forEach((result, i) => {
    const key = tasks[i].key;
    if (result.status === "fulfilled") {
      state.raw[key] = result.value;
      setError(key, "");
    } else {
      state.raw[key] = {};
      const msg = result.reason?.message || String(result.reason);
      setError(key, msg);
    }
  });

  // Normalise core slices
  try {
    state.normalised.geo = normaliseGeoResponse(state.raw.geo || {});
  } catch (e) {
    setError("geo", e.message);
    state.normalised.geo = normaliseGeoResponse({});
  }

  try {
    state.normalised.epcSearch = normaliseEpcSearchResponse(
      state.raw.epcSearch || {}
    );
  } catch (e) {
    setError("identity", e.message);
    state.normalised.epcSearch = normaliseEpcSearchResponse({});
  }

  try {
    state.normalised.ppi = normalisePpiResponse(state.raw.ppi || {});
    state.normalised.hpi = normaliseHpiResponse(state.raw.hpi || {});
    state.normalised.schools = normaliseSchoolsResponse(state.raw.schools || {});
    state.normalised.transport = normaliseTransportResponse(
      state.raw.transport || {}
    );
    state.normalised.broadband = normaliseBroadbandResponse(
      state.raw.broadband || {}
    );
    state.normalised.flood = normaliseFloodResponse(state.raw.flood || {});
    state.normalised.radon = normaliseRadonResponse(state.raw.radon || {});
  } catch (e) {
    setError("market", e.message);
  }

  // Secondary fetches: EPC certificate + address
  const firstLmk = state.normalised.epcSearch?.rows?.[0]?.lmkKey || "";
  const uprn =
    state.normalised.epcSearch?.rows?.[0]?.uprn || sel.uprn || "";

  try {
    if (firstLmk) {
      const certRaw = await getEpcCertificate(firstLmk);
      state.raw.epcCertificate = certRaw;
      state.normalised.epcCertificate =
        normaliseEpcCertificateResponse(certRaw);
    } else {
      state.normalised.epcCertificate = normaliseEpcCertificateResponse({});
    }
  } catch (e) {
    setError("identity", e.message);
    state.normalised.epcCertificate = normaliseEpcCertificateResponse({});
  }

  try {
    if (uprn) {
      const addrRaw = await getAddress(uprn);
      state.raw.address = addrRaw;
      state.normalised.address = normaliseAddressResponse(addrRaw);
    } else {
      state.normalised.address = normaliseAddressResponse({});
    }
  } catch (e) {
    state.normalised.address = normaliseAddressResponse({});
  }

  // Map panel errors follow geo
  if (state.errors.geo) setError("map", state.errors.geo);
  if (state.errors.ppi || state.errors.hpi) {
    setError("market", state.errors.ppi || state.errors.hpi);
  }
  if (state.errors.schools) setError("schools", state.errors.schools);
  if (state.errors.transport) setError("transport", state.errors.transport);
  if (state.errors.broadband) setError("utilities", state.errors.broadband);
  if (state.errors.flood || state.errors.radon) {
    setError("risk", state.errors.flood || state.errors.radon);
  }

  setLoading(false);
  renderAllPanels(state);
}

function onAddressChange() {
  const sel = $("address-select");
  if (!sel || !sel.value) return;
  const opt = sel.selectedOptions[0];
  if (!opt?.dataset.payload) return;
  try {
    const selObj = JSON.parse(opt.dataset.payload);
    loadDatasetForSelection(selObj);
  } catch (e) {
    setError("global", "Invalid selection");
    renderAllPanels(state);
  }
}

function init() {
  $("search-btn")?.addEventListener("click", () => runResolve());
  $("search-input")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") runResolve();
  });
  $("address-select")?.addEventListener("change", onAddressChange);

  renderAllPanels(state);
}

init();
