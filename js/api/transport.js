import { getJson } from "../utils/fetch.js";

export function getTransport(lat, lon) {
  const q = new URLSearchParams();
  q.set("lat", String(lat));
  q.set("lon", String(lon));
  return getJson(`/transport?${q.toString()}`);
}
