import { getJson } from "../utils/fetch.js";

export function getBroadband(postcode) {
  const pc = encodeURIComponent(String(postcode || "").replace(/\s+/g, ""));
  return getJson(`/broadband?postcode=${pc}`);
}
