import { getJson } from "../utils/fetch.js";

export function searchEpcByPostcode(postcode) {
  const pc = encodeURIComponent(String(postcode || "").replace(/\s+/g, ""));
  return getJson(`/epc/search?postcode=${pc}`);
}

export function searchEpcByUprn(uprn) {
  return getJson(`/epc/search?uprn=${encodeURIComponent(String(uprn))}`);
}

export function getEpcCertificate(rrn) {
  return getJson(`/epc/certificate?rrn=${encodeURIComponent(String(rrn))}`);
}
