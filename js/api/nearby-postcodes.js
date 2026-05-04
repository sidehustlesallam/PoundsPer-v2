const POSTCODES_IO_BASE = "https://api.postcodes.io";

export async function getNearbyPostcodes(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return { result: [] };
  }

  const q = new URLSearchParams({
    lat: String(la),
    lon: String(lo),
  });
  const res = await fetch(`${POSTCODES_IO_BASE}/postcodes?${q.toString()}`);
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { result: [] };
  }
  if (!res.ok) {
    throw new Error(body?.error || "Failed to load nearby postcodes");
  }
  return body;
}
