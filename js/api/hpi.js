import { getJson } from "../utils/fetch.js";

export function getHpi(la, month) {
  const q = new URLSearchParams();
  if (la) q.set("la", la);
  if (month) q.set("month", month);
  return getJson(`/hpi?${q.toString()}`);
}
