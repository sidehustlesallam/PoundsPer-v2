/** @param {string} id */
export function el(id) {
  const n = document.getElementById(id);
  return n;
}

export function setHidden(node, hidden) {
  if (!node) return;
  node.classList.toggle("hidden", !!hidden);
}

export function clearChildren(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}
