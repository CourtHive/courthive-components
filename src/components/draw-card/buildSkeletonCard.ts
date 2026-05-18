import { dcBodyStyle, dcSkeletonLineStyle, dcSkeletonStyle } from './styles';

/** Placeholder card for loading states. Render 3–6 of these in the grid wrap. */
export function buildDrawSkeletonCard(): HTMLElement {
  const card = document.createElement('div');
  card.className = dcSkeletonStyle();
  const body = document.createElement('div');
  body.className = dcBodyStyle();
  for (const width of ['70%', '40%', '85%']) {
    const line = document.createElement('div');
    line.className = dcSkeletonLineStyle();
    line.style.width = width;
    body.appendChild(line);
  }
  card.appendChild(body);
  return card;
}
