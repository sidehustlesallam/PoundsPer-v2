export function normalizePostcode(pc) {
  if (pc === null || pc === undefined) return "";
  return String(pc).replace(/\s+/g, "").toUpperCase();
}

export function formatPostcode(pc) {
  const n = normalizePostcode(pc);
  if (n.length < 5) return n;
  return `${n.slice(0, -3)} ${n.slice(-3)}`;
}
