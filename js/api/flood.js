import { getJson } from "../utils/fetch.js";

export function getFlood(postcode) {
  const pc = encodeURIComponent(String(postcode || "").replace(/\s+/g, ""));
  return getJson(`/flood?postcode=${pc}`);
}
