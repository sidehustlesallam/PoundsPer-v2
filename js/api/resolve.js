/**
 * Single source of truth for Worker origin — all other API modules use utils/fetch + this base.
 */
export const API_BASE = "https://royal-bar-6cc5.sidehustlesallam.workers.dev";

export async function resolveAddresses(input) {
  const url = `${API_BASE}/resolve?input=${encodeURIComponent(input)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Resolve failed: ${res.status}`);
  }
  return res.json();
}
