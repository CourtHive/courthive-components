/**
 * One ribbon row — the connected alternative to the walls.
 *
 * Same data, same domain, same palette; a different answer to "how do you show a
 * round-by-round path in one thin row".
 *
 *   line  -> the expected opponent, as a signed delta, across the rounds
 *   fan   -> where the possible opponents sit (inner = the weighted middle half,
 *            outer = the full range clearing the arrival threshold)
 *   hue   -> the same red/blue arms, applied along the ribbon as a gradient
 *
 * **Two things this fixes rather than merely restyles.** The walls discard the
 * opponent spread entirely — they read only `expected` — so the fan is new
 * information, not new decoration. And a near-zero delta paints as a ~1px sliver in
 * the walls, which makes "an even match" almost invisible; on a centred line it sits
 * plainly in the middle, which is where it belongs.
 *
 * **The fold, on a line.** A horizon chart folds magnitude by wrapping area into
 * bands. A line cannot wrap without becoming unreadable, so instead the position
 * clamps at the row edge and the COLOUR keeps going — the gradient steps into the
 * darker bands exactly as the walls do. Two rows pinned to the edge stay
 * distinguishable, and clipping is counted so the caption can admit it.
 *
 * **Why a gradient rather than per-round segments.** Colouring each round separately
 * would reintroduce the blockiness the ribbon exists to remove. One gradient per row,
 * with a stop at each round, keeps the fill continuous while still deepening where
 * the values are extreme.
 */

import { area as d3Area, line as d3Line, curveMonotoneX } from 'd3';

// constants and types
import type { HorizonCell, HorizonRow } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CLASS_ATTR = 'class';
const PATH = 'path';

/**
 * Gradient ids must be unique in the document and must carry NO identity — the
 * draw-order game renders ribbons with every name withheld, and an id built from a
 * participantId would hand the answer to anyone who opened the defs.
 */
let gradientSeq = 0;

/** Vertical breathing room so a clamped line is not sliced by the row edge. */
const EDGE_PAD = 1.5;

export type HorizonRibbonOptions = {
  width: number;
  height: number;
  domainMax: number;
  /** Colour bands across the domain. Must match the walls or the two stop reading alike. */
  bands?: number;
  /**
   * How many colour bands of the domain map to HALF the row height.
   *
   * This is the ribbon's version of the fold, and it is the setting that decides
   * whether the chart is readable. A centred line splits the row between the two
   * arms, so mapping the whole domain across it leaves a median value moving about
   * three pixels — measured on a 16-draw, `|delta|` has a median of 238 against a
   * 668 domain, which on a 22px row is 3.4px of travel. Mapping half the domain
   * instead doubles every amplitude and leaves roughly a third of cells saturating
   * at the row edge, where the gradient keeps them distinguishable.
   */
  positionBands?: number;
  /** Attach hover descriptions. MUST stay false in the game — a title names the answer. */
  describe?: boolean;
  roundLabels?: (roundNumber: number, index: number, total: number) => string;
  scaleName?: string;
  ariaLabel?: string;
  /** Draw the even-match reference line. */
  showZeroLine?: boolean;
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

/** The darkest band this cell reaches — the same step the walls would paint. */
function cellBandClass(cell: HorizonCell): string {
  const deepest = cell.layers.at(-1);
  if (!deepest || !cell.direction) return 'chc-ph__stop--none';
  return `chc-ph__stop--${cell.direction}-${deepest.bandIndex}`;
}

/**
 * A stop per round, so the fill deepens exactly where the walls would darken.
 * `userSpaceOnUse` keeps the stop offsets in the same coordinates as the vertices.
 */
function buildGradient(cells: HorizonCell[], x: (index: number) => number, width: number, id: string): SVGElement {
  const gradient = createElementNS('linearGradient');
  gradient.setAttribute('id', id);
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('y1', '0');
  gradient.setAttribute('x2', String(width));
  gradient.setAttribute('y2', '0');

  cells.forEach((cell, index) => {
    const stop = createElementNS('stop', cellBandClass(cell));
    stop.setAttribute('offset', String(width > 0 ? x(index) / width : 0));
    gradient.appendChild(stop);
  });

  // A single-round row would produce a one-stop gradient, which renders as nothing.
  if (cells.length === 1) {
    const tail = createElementNS('stop', cellBandClass(cells[0]));
    tail.setAttribute('offset', '1');
    gradient.appendChild(tail);
  }
  return gradient;
}

function describeCell(cell: HorizonCell, label: string, scaleName?: string): string {
  if (cell.bye) return `${label}: bye`;
  if (cell.value === null) return `${label}: no rated opponent`;
  const unit = scaleName ? ` ${scaleName}-equivalent` : '';
  const source = cell.fromActual ? 'faced' : 'projected';
  const spread = cell.spread
    ? ` · likely ${signed(cell.spread.innerLow)} to ${signed(cell.spread.innerHigh)}${
        cell.spread.weighted ? '' : ' (unweighted range)'
      }`
    : '';
  const capped = cell.clipped ? ' · capped at the top band' : '';
  return `${label}: ${source} ${signed(cell.value)}${unit}${spread}${capped}`;
}

export function buildHorizonRibbonSvg(row: HorizonRow, options: HorizonRibbonOptions): SVGSVGElement {
  const {
    width,
    height,
    domainMax,
    bands = 4,
    positionBands = 2,
    describe = false,
    roundLabels,
    scaleName,
    showZeroLine = true
  } = options;
  const count = Math.max(1, row.cells.length);
  const columnWidth = width / count;
  const x = (index: number) => (index + 0.5) * columnWidth;

  const centre = height / 2;
  const half = Math.max(1, height / 2 - EDGE_PAD);
  // Clamp is the whole overflow policy: position saturates, colour carries on.
  const positionMax = Math.max(1e-9, (domainMax / Math.max(1, bands)) * positionBands);
  const y = (value: number) => centre - Math.max(-1, Math.min(1, value / positionMax)) * half;

  const svg = createElementNS('svg', 'chc-ph__svg') as SVGSVGElement;
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    options.ariaLabel ?? `Projected round-by-round path for ${row.participantName ?? row.participantId}`
  );

  gradientSeq += 1;
  const gradientId = `chc-ph-grad-${gradientSeq}`;
  const defs = createElementNS('defs');
  defs.appendChild(buildGradient(row.cells, x, width, gradientId));
  svg.appendChild(defs);

  if (showZeroLine) {
    const zero = createElementNS('line', 'chc-ph__zero');
    zero.setAttribute('x1', '0');
    zero.setAttribute('x2', String(width));
    zero.setAttribute('y1', String(centre));
    zero.setAttribute('y2', String(centre));
    svg.appendChild(zero);
  }

  const indexed = row.cells.map((cell, index) => ({ cell, index }));
  const fill = `url(#${gradientId})`;

  for (const [key, className] of [
    ['outer', 'chc-ph__fan chc-ph__fan--outer'],
    ['inner', 'chc-ph__fan chc-ph__fan--inner']
  ] as const) {
    const band = d3Area<{ cell: HorizonCell; index: number }>()
      .curve(curveMonotoneX)
      .defined((entry) => entry.cell.spread !== null)
      .x((entry) => x(entry.index))
      .y0((entry) => y(key === 'outer' ? (entry.cell.spread?.outerLow ?? 0) : (entry.cell.spread?.innerLow ?? 0)))
      .y1((entry) => y(key === 'outer' ? (entry.cell.spread?.outerHigh ?? 0) : (entry.cell.spread?.innerHigh ?? 0)));

    const d = band(indexed);
    if (!d) continue;
    const path = createElementNS(PATH, className) as SVGPathElement;
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    svg.appendChild(path);
  }

  const trace = d3Line<{ cell: HorizonCell; index: number }>()
    .curve(curveMonotoneX)
    .defined((entry) => entry.cell.value !== null)
    .x((entry) => x(entry.index))
    .y((entry) => y(entry.cell.value ?? 0));

  const traced = trace(indexed);
  if (traced) {
    const path = createElementNS(PATH, 'chc-ph__trace') as SVGPathElement;
    path.setAttribute('d', traced);
    path.setAttribute('stroke', fill);
    svg.appendChild(path);
  }

  // Full-height hit targets per round: the ribbon has no per-round geometry to hover,
  // and a hover target should be bigger than the mark anyway.
  if (describe) {
    row.cells.forEach((cell, index) => {
      const hit = createElementNS('rect', 'chc-ph__hit');
      hit.setAttribute('x', String(index * columnWidth));
      hit.setAttribute('y', '0');
      hit.setAttribute('width', String(columnWidth));
      hit.setAttribute('height', String(height));
      const label = roundLabels?.(cell.roundNumber, index, count) ?? `R${index + 1}`;
      const title = createElementNS('title');
      title.textContent = describeCell(cell, label, scaleName);
      hit.appendChild(title);
      svg.appendChild(hit);
    });
  }

  return svg;
}
