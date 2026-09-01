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

/**
 * The arm labels are per-variant because the second channel IS per-variant. The
 * walls carry direction by which edge the block grows from; the ribbon carries it by
 * which side of the centre line the trace sits on. A legend describing the wrong one
 * is worse than none — it documents a chart that is not on screen.
 */
const ARM_LABELS: Record<string, [string, string]> = {
  walls: ['playing up — wall rises from the baseline', 'playing down — wall hangs from the top'],
  ribbon: ['playing up — trace above the centre line', 'playing down — trace below the centre line']
};

const ARMS: HorizonDirection[] = [HORIZON_DIRECTION.HARD, HORIZON_DIRECTION.EASY];

function el(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
}

/**
 * One arm's steps, stepped in depth as well as hue so the ramp reads as ordered.
 *
 * `centred` mirrors the ribbon's geometry — steps grow from the middle rather than
 * from an edge — so the glyph matches the chart it is keying.
 */
export function buildArmSwatch(direction: HorizonDirection, bands: number, centred = false): SVGElement {
  const width = SWATCH_SIZE * bands + (bands - 1) * SWATCH_GAP;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'chc-ph__swatch');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(SWATCH_SIZE));
  svg.setAttribute('viewBox', `0 0 ${width} ${SWATCH_SIZE}`);
  svg.setAttribute('aria-hidden', 'true');

  for (let bandIndex = 0; bandIndex < bands; bandIndex++) {
    const full = SWATCH_SIZE * ((bandIndex + 1) / bands);
    const height = centred ? full / 2 : full;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', `chc-ph__wall chc-ph__wall--${direction}-${bandIndex}`);
    rect.setAttribute('x', String(bandIndex * (SWATCH_SIZE + SWATCH_GAP)));
    const hard = direction === HORIZON_DIRECTION.HARD;
    const centre = SWATCH_SIZE / 2;
    rect.setAttribute('y', String(centred ? (hard ? centre - height : centre) : hard ? SWATCH_SIZE - height : 0));
    rect.setAttribute('width', String(SWATCH_SIZE));
    rect.setAttribute('height', String(height));
    svg.appendChild(rect);
  }
  return svg;
}

/** Default note per variant. The ribbon has a fan to explain; the walls do not. */
function defaultNote(variant: string | undefined, unit: string): string {
  if (variant === 'ribbon') {
    return (
      `The line is the expected opponent; the shading is who could actually arrive — ` +
      `solid for the likely middle, faint for the full range. Deeper colour means a larger ${unit} gap.`
    );
  }
  return `Deeper, darker bands mean a larger ${unit} gap. Rows share one domain.`;
}

export function buildHorizonLegend({
  bands,
  scaleName,
  note,
  variant
}: {
  bands: number;
  scaleName?: string;
  note?: string;
  variant?: string;
}): HTMLElement {
  const legend = el('div', 'chc-ph__legend');

  const ribbon = variant === 'ribbon';
  const labels = ARM_LABELS[ribbon ? 'ribbon' : 'walls'];

  for (const [index, direction] of ARMS.entries()) {
    const item = el('div', 'chc-ph__legend-item');
    item.appendChild(buildArmSwatch(direction, bands, ribbon));
    const label = el('span', 'chc-ph__legend-label');
    label.textContent = labels[index];
    item.appendChild(label);
    legend.appendChild(item);
  }

  const unit = scaleName ? `${scaleName}-equivalent rating` : 'rating';
  const caption = el('div', 'chc-ph__legend-note');
  caption.textContent = note ?? defaultNote(variant, unit);
  legend.appendChild(caption);
  return legend;
}
