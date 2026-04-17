import { API_BASE } from "../api/resolve.js";

/**
 * GET JSON from the Worker API (path must start with /).
 */
export async function getJson(pathAndQuery) {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const res = await fetch(`${API_BASE}${path}`);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { parseError: true, raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export { API_BASE };
