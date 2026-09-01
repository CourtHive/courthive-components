/**
 * Horizon legend — shared by the stacked view and the game.
 *
 * Not optional, and not decoration. The palest step of each arm sits at ~2.1:1
 * against the surface, below the 3:1 rule for a data mark; the data-viz standard
 * allows that for an ordinal ramp only with relief, and a visible key is the
 * relief. The game needs it at least as much as the stack does — its rows carry
 * no labels at all, so the swatches are the only thing naming the encoding.
 *
 * The swatches are drawn with the arms' real anchoring — red sitting on the
 * baseline, blue hanging from the top — because that anchoring is the second
 * channel carrying direction, and a legend that flattened it would document a
 * chart other than the one on screen.
 */

// constants and types
import { HORIZON_DIRECTION } from './types';
import type { HorizonDirection } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SWATCH_SIZE = 12;
const SWATCH_GAP = 2;

const ARMS: [HorizonDirection, string][] = [
  [HORIZON_DIRECTION.HARD, 'playing up — wall rises from the baseline'],
  [HORIZON_DIRECTION.EASY, 'playing down — wall hangs from the top']
];

function el(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/** One arm's steps, stepped in depth as well as hue so the ramp reads as ordered. */
export function buildArmSwatch(direction: HorizonDirection, bands: number): SVGElement {
  const width = SWATCH_SIZE * bands + (bands - 1) * SWATCH_GAP;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'chc-ph__swatch');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(SWATCH_SIZE));
  svg.setAttribute('viewBox', `0 0 ${width} ${SWATCH_SIZE}`);
  svg.setAttribute('aria-hidden', 'true');

  for (let bandIndex = 0; bandIndex < bands; bandIndex++) {
    const height = SWATCH_SIZE * ((bandIndex + 1) / bands);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', `chc-ph__wall chc-ph__wall--${direction}-${bandIndex}`);
    rect.setAttribute('x', String(bandIndex * (SWATCH_SIZE + SWATCH_GAP)));
    rect.setAttribute('y', String(direction === HORIZON_DIRECTION.HARD ? SWATCH_SIZE - height : 0));
    rect.setAttribute('width', String(SWATCH_SIZE));
    rect.setAttribute('height', String(height));
    svg.appendChild(rect);
  }
  return svg;
}

export function buildHorizonLegend({
  bands,
  scaleName,
  note
}: {
  bands: number;
  scaleName?: string;
  note?: string;
}): HTMLElement {
  const legend = el('div', 'chc-ph__legend');

  for (const [direction, text] of ARMS) {
    const item = el('div', 'chc-ph__legend-item');
    item.appendChild(buildArmSwatch(direction, bands));
    const label = el('span', 'chc-ph__legend-label');
    label.textContent = text;
    item.appendChild(label);
    legend.appendChild(item);
  }

  const unit = scaleName ? `${scaleName}-equivalent rating` : 'rating';
  const caption = el('div', 'chc-ph__legend-note');
  caption.textContent = note ?? `Deeper, darker bands mean a larger ${unit} gap. Rows share one domain.`;
  legend.appendChild(caption);
  return legend;
}
