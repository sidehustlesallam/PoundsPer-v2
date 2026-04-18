import { getJson } from "../utils/fetch.js";

export function getHpi(la, month, postcode) {
  const q = new URLSearchParams();
  if (la) q.set("la", la);
  if (month) q.set("month", month);
  if (postcode) q.set("postcode", postcode);
  return getJson(`/hpi?${q.toString()}`);
}
