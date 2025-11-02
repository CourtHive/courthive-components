import { isString } from '../components/modal/cmodal';

export function getAttr({ element: node, attr }) {
  if (!isString(attr)) return;
  const attrs = attr.split('.');
  for (const a of attrs) {
    node = node?.[a];
    if (!node) return;
  }
  return node;
}
