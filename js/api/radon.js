import { getJson } from "../utils/fetch.js";

export function getRadon(postcode) {
  const pc = encodeURIComponent(String(postcode || "").replace(/\s+/g, ""));
  return getJson(`/radon?postcode=${pc}`);
}
