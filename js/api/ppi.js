import { getJson } from "../utils/fetch.js";

export function getPpiRecent(postcode) {
  const pc = encodeURIComponent(String(postcode || "").replace(/\s+/g, ""));
  return getJson(`/ppi/recent?postcode=${pc}`);
}
