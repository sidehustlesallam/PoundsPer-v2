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
  getNearbyPostcodes,
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
  normaliseNearbyPostcodesResponse,
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

function setLocateButtonBusy(isBusy) {
  const btn = $("locate-btn");
  if (!btn) return;
  btn.disabled = isBusy;
  btn.textContent = isBusy ? "Locating…" : "Use my location";
}

function setLocateStatus(message, tone = "muted") {
  const el = $("locate-status");
  if (!el) return;
  el.textContent = message || "";
  if (tone === "error") {
    el.className = "text-xs text-[#F87171] min-h-[1rem] md:ml-auto";
    return;
  }
  if (tone === "success") {
    el.className = "text-xs text-[#4ADE80] min-h-[1rem] md:ml-auto";
    return;
  }
  el.className = "text-xs text-[#8E95A3] min-h-[1rem] md:ml-auto";
}

async function postcodeFromDeviceLocation() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 120000,
    });
  });

  const lat = position.coords?.latitude;
  const lon = position.coords?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Could not read your location coordinates.");
  }

  const endpoint = `https://api.postcodes.io/postcodes?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error("Unable to look up postcode for your location.");
  }
  const body = await res.json();
  const nearest = body?.result?.[0]?.postcode || "";
  if (!nearest) {
    throw new Error("No postcode found near your location.");
  }
  return nearest;
}

function safeSelString(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s;
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
  const uprnRaw = $("uprn-input")?.value?.trim() || "";
  const postcodeRaw = $("search-input")?.value?.trim() || "";
  const uprnDigits = uprnRaw.replace(/\s+/g, "");
  const input =
    uprnDigits && /^\d{7,12}$/.test(uprnDigits) ? uprnDigits : postcodeRaw;
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

async function runResolveFromDeviceLocation() {
  clearErrors();
  setLocateButtonBusy(true);
  setLocateStatus("Using your device location…");
  try {
    const postcode = await postcodeFromDeviceLocation();
    const searchInput = $("search-input");
    if (searchInput) searchInput.value = postcode;
    const uprnInput = $("uprn-input");
    if (uprnInput) uprnInput.value = "";
    await runResolve();
    setLocateStatus(`Using nearby postcode: ${postcode}`, "success");
  } catch (e) {
    const message =
      e?.code === 1
        ? "Location permission denied. Allow location access and try again."
        : e?.message || "Could not use your device location.";
    setError("global", message);
    setLocateStatus(message, "error");
    renderAllPanels(state);
  } finally {
    setLocateButtonBusy(false);
  }
}

async function runResolveForPostcode(postcode) {
  const clean = String(postcode || "").trim();
  if (!clean) return;
  const searchInput = $("search-input");
  if (searchInput) searchInput.value = clean;
  const uprnInput = $("uprn-input");
  if (uprnInput) uprnInput.value = "";
  await runResolve();
}

function firstAddressLineFromResolveResult(result) {
  const label = String(result?.label || "").trim();
  if (!label) return "";
  const line = label.split(" — ")[0]?.trim() || "";
  return line;
}

async function enrichNearbyPostcodesWithFirstLine(nearbyPostcodes) {
  const list = Array.isArray(nearbyPostcodes) ? nearbyPostcodes : [];
  const enriched = await Promise.all(
    list.map(async (item) => {
      const postcode = String(item?.postcode || "").trim();
      if (!postcode) return { ...item, firstLine: "" };
      try {
        const raw = await resolveAddresses(postcode);
        const norm = normaliseResolveResponse(raw);
        const first = Array.isArray(norm.results) ? norm.results[0] : null;
        return {
          ...item,
          firstLine: firstAddressLineFromResolveResult(first),
        };
      } catch {
        return { ...item, firstLine: "" };
      }
    })
  );
  return enriched;
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
    { key: "hpi", run: () => getHpi(la, monthStr, postcode) },
    { key: "schools", run: () => getSchoolsNearby(postcode) },
    { key: "transport", run: () => getTransport(lat, lon) },
    { key: "broadband", run: () => getBroadband(postcode) },
    { key: "flood", run: () => getFlood(postcode) },
    { key: "radon", run: () => getRadon(postcode) },
    { key: "nearbyPostcodes", run: () => getNearbyPostcodes(lat, lon) },
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

  try {
    state.normalised.nearbyPostcodes = normaliseNearbyPostcodesResponse(
      state.raw.nearbyPostcodes || {},
      sel.postcodeNormalized || sel.postcode || ""
    );
    state.normalised.nearbyPostcodes.postcodes =
      await enrichNearbyPostcodesWithFirstLine(
        state.normalised.nearbyPostcodes.postcodes || []
      );
  } catch (e) {
    setError("nearbyPostcodes", e.message);
    state.normalised.nearbyPostcodes = normaliseNearbyPostcodesResponse({}, "");
  }

  // Secondary fetches: EPC certificate + address (prefer row chosen in /resolve)
  const lmkForCert =
    safeSelString(sel.lmkKey) ||
    state.normalised.epcSearch?.rows?.[0]?.lmkKey ||
    "";
  const uprn =
    safeSelString(sel.uprn) ||
    state.normalised.epcSearch?.rows?.[0]?.uprn ||
    "";

  try {
    if (lmkForCert) {
      const certRaw = await getEpcCertificate(lmkForCert);
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
  if (state.errors.nearbyPostcodes) {
    setError("nearbyPostcodes", state.errors.nearbyPostcodes);
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
  $("locate-btn")?.addEventListener("click", () => runResolveFromDeviceLocation());
  $("search-input")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") runResolve();
  });
  $("uprn-input")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") runResolve();
  });
  $("address-select")?.addEventListener("change", onAddressChange);
  document.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest("[data-nearby-postcode]");
    if (!chip) return;
    const postcode = chip.getAttribute("data-nearby-postcode") || "";
    runResolveForPostcode(postcode);
  });

  renderAllPanels(state);
}

init();
