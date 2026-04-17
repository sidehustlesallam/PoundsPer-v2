import { getJson } from "../utils/fetch.js";

export function getGeo(postcode) {
  const pc = encodeURIComponent(String(postcode || "").replace(/\s+/g, ""));
  return getJson(`/geo?postcode=${pc}`);
}

export function getAddress(uprn) {
  return getJson(`/address?uprn=${encodeURIComponent(String(uprn))}`);
}
