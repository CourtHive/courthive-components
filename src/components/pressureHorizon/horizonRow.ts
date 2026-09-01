/**
 * One horizon row — the wall strip for a single participant.
 *
 * Hard-edged columns, one per round, with a surface gap between them. A round is
 * a wall to be punched through: the harder the projected opponent, the deeper the
 * band stack and the darker the paint.
 *
 * Direction is carried twice, on purpose. A HARD round grows up from the row's
 * baseline; an EASY round hangs down from its top edge. Hue says the same thing
 * a second time (red arm / blue arm). Either channel alone would read — together
 * they survive colour-vision deficiency, a greyscale print, and the fact that the
 * palest step of each arm sits below 3:1 against the surface.
 */

// constants and types
import { HORIZON_DIRECTION } from './types';
import type { HorizonCell, HorizonRow } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CLASS_ATTR = 'class';
const RECT = 'rect';

const WALL_CLASS = 'chc-ph__wall';
const DEFAULT_GAP = 2;
/** Below this a rounded corner eats the whole mark, so corners are squared instead. */
const MIN_ROUNDED_HEIGHT = 5;
const CORNER_RADIUS = 2;
/** Height of the "nothing here" sliver, centred so it also reads as the row's midline. */
const NEUTRAL_HEIGHT = 2;

export type HorizonRowOptions = {
  width: number;
  height: number;
  gap?: number;
  /**
   * Attach per-wall `<title>` tooltips and a descriptive aria-label. MUST stay
   * false in the game: a tooltip carrying the opponent rating hands over the
   * deduction the puzzle is asking for.
   */
  describe?: boolean;
  /** Used only when `describe` is true. */
  roundLabels?: (roundNumber: number, index: number, total: number) => string;
  scaleName?: string;
  /** Overrides the aria-label. In the game this is the slot number, never a name. */
  ariaLabel?: string;
};

function createElementNS(tag: string, className?: string): SVGElement {
  const element = document.createElementNS(SVG_NS, tag);
  if (className) element.setAttribute(CLASS_ATTR, className);
  return element;
}

function signed(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function describeCell(cell: HorizonCell, label: string, scaleName?: string): string {
  if (cell.bye) return `${label}: bye`;
  if (cell.value === null) return `${label}: no rated opponent`;
  const source = cell.fromActual ? 'faced' : 'projected';
  const unit = scaleName ? ` ${scaleName}-equivalent` : '';
  const capped = cell.clipped ? ' (capped at the top band)' : '';
  return `${label}: ${source} ${signed(cell.value)}${unit}${capped}`;
}

function appendWalls({
  group,
  cell,
  columnWidth,
  height
}: {
  group: SVGElement;
  cell: HorizonCell;
  columnWidth: number;
  height: number;
}): void {
  if (!cell.layers.length) {
    const neutral = createElementNS(RECT, `${WALL_CLASS} ${WALL_CLASS}--none`);
    neutral.setAttribute('x', '0');
    neutral.setAttribute('y', String((height - NEUTRAL_HEIGHT) / 2));
    neutral.setAttribute('width', String(columnWidth));
    neutral.setAttribute('height', String(NEUTRAL_HEIGHT));
    group.appendChild(neutral);
    return;
  }

  const hard = cell.direction === HORIZON_DIRECTION.HARD;
  for (const layer of cell.layers) {
    const layerHeight = Math.max(1, layer.fraction * height);
    const rect = createElementNS(RECT, `${WALL_CLASS} ${WALL_CLASS}--${cell.direction}-${layer.bandIndex}`);
    rect.setAttribute('x', '0');
    rect.setAttribute('y', String(hard ? height - layerHeight : 0));
    rect.setAttribute('width', String(columnWidth));
    rect.setAttribute('height', String(layerHeight));
    if (layerHeight >= MIN_ROUNDED_HEIGHT) rect.setAttribute('rx', String(CORNER_RADIUS));
    group.appendChild(rect);
  }
}

/** The strip for one participant. Columns are laid out on the row's own cell order. */
export function buildHorizonRowSvg(row: HorizonRow, options: HorizonRowOptions): SVGSVGElement {
  const { width, height, gap = DEFAULT_GAP, describe = false, roundLabels, scaleName } = options;
  const count = Math.max(1, row.cells.length);
  const columnWidth = Math.max(1, (width - gap * (count - 1)) / count);

  const svg = createElementNS('svg', 'chc-ph__svg') as SVGSVGElement;
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    options.ariaLabel ?? `Projected round-by-round path for ${row.participantName ?? row.participantId}`
  );

  row.cells.forEach((cell, index) => {
    const group = createElementNS('g', 'chc-ph__column');
    group.setAttribute('transform', `translate(${index * (columnWidth + gap)},0)`);
    appendWalls({ group, cell, columnWidth, height });

    if (describe) {
      const label = roundLabels?.(cell.roundNumber, index, count) ?? `R${index + 1}`;
      const title = createElementNS('title');
      title.textContent = describeCell(cell, label, scaleName);
      group.appendChild(title);
    }

    svg.appendChild(group);
  });

  return svg;
}
