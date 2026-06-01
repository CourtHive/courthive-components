/**
 * Bracket minimap — a narrow sticky strip that mirrors the full elimination
 * bracket as connector lines only. Quarters are clickable hit targets and a
 * viewport rect tracks the main bracket's scroll position.
 *
 * Returns a DOM element with no behaviour wired. The caller (typically TMX
 * `renderDrawView`) attaches scroll + click handlers against the live DOM
 * after morphdom completes, using the data attributes documented below.
 *
 * The SVG uses a normalised `viewBox` (x in [0, 100], y in [0, round1Count])
 * with `preserveAspectRatio="none"` so it stretches to fill its container.
 * Strokes are sized in pixels via `vector-effect="non-scaling-stroke"`.
 *
 * Data-attribute contract (consumed by callers post-mount):
 *   - root element: `.chc-minimap[data-quarters="<n>"][data-round1-count="<N>"]`
 *   - quarter hit rects: `[data-quarter="<index>"]`
 *   - viewport indicator: `.chc-minimap-viewport`
 */
import type { MatchUp } from '../../types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX_W = 100;

export interface StructureMinimapOptions {
  matchUps: MatchUp[];
  width?: number;
  quarterCount?: number;
}

function groupByRound(matchUps: MatchUp[]): Map<number, MatchUp[]> {
  const byRound = new Map<number, MatchUp[]>();
  for (const mu of matchUps) {
    const rn = (mu as any)?.roundNumber;
    if (typeof rn !== 'number') continue;
    let bucket = byRound.get(rn);
    if (!bucket) {
      bucket = [];
      byRound.set(rn, bucket);
    }
    bucket.push(mu);
  }
  return byRound;
}

function createLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(x1));
  line.setAttribute('y1', String(y1));
  line.setAttribute('x2', String(x2));
  line.setAttribute('y2', String(y2));
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  line.classList.add('chc-minimap-line');
  return line;
}

function createQuarterBand(y: number, h: number, index: number, alt: boolean): SVGRectElement {
  const band = document.createElementNS(SVG_NS, 'rect');
  band.setAttribute('x', '0');
  band.setAttribute('y', String(y));
  band.setAttribute('width', String(VIEWBOX_W));
  band.setAttribute('height', String(h));
  band.classList.add('chc-minimap-quarter');
  if (alt) band.classList.add('chc-minimap-quarter--alt');
  band.dataset.quarter = String(index);
  return band;
}

function paintConnectors(svg: SVGSVGElement, roundCount: number, N: number) {
  const xPad = 6;
  const xRange = Math.max(0, VIEWBOX_W - 2 * xPad);
  const xStep = roundCount > 1 ? xRange / (roundCount - 1) : 0;

  for (let rIdx = 0; rIdx < roundCount; rIdx++) {
    const x = xPad + rIdx * xStep;
    const slotsPerMatchUp = Math.pow(2, rIdx);
    const matchUpsInRound = Math.floor(N / slotsPerMatchUp);
    const isFinalRound = rIdx === roundCount - 1;
    const nextX = isFinalRound ? Math.min(VIEWBOX_W - xPad, x + xStep * 0.5) : xPad + (rIdx + 1) * xStep;

    for (let p = 0; p < matchUpsInRound; p++) {
      const yCenter = (p + 0.5) * slotsPerMatchUp;
      svg.appendChild(createLine(x, yCenter, nextX, yCenter));
    }

    if (!isFinalRound) {
      for (let p = 0; p < matchUpsInRound; p += 2) {
        const yTop = (p + 0.5) * slotsPerMatchUp;
        const yBot = (p + 1.5) * slotsPerMatchUp;
        svg.appendChild(createLine(nextX, yTop, nextX, yBot));
      }
    }
  }
}

export function buildStructureMinimap({
  matchUps,
  width = 56,
  quarterCount = 4
}: StructureMinimapOptions): HTMLDivElement | null {
  if (!Array.isArray(matchUps) || !matchUps.length) return null;

  const byRound = groupByRound(matchUps);
  const roundNumbers = [...byRound.keys()].sort((a, b) => a - b);
  if (roundNumbers.length < 2) return null;

  const round1 = byRound.get(roundNumbers[0]);
  const N = round1?.length ?? 0;
  if (N < quarterCount) return null;

  const roundCount = roundNumbers.length;

  const wrapper = document.createElement('div');
  wrapper.className = 'chc-minimap';
  wrapper.style.width = `${width}px`;
  wrapper.dataset.quarters = String(quarterCount);
  wrapper.dataset.round1Count = String(N);

  const svg = document.createElementNS(SVG_NS, 'svg');
  // Explicit width/height attributes so the SVG has intrinsic dimensions even
  // before CSS resolution — Safari + some flex layouts collapse SVGs that only
  // declare a viewBox. CSS in `.chc-minimap-svg` overrides these to fill the
  // wrapper, but the attributes guarantee a non-zero box.
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${VIEWBOX_W} ${N}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('chc-minimap-svg');

  // Quarter bands first so connector lines render on top.
  const quarterSize = N / quarterCount;
  for (let q = 0; q < quarterCount; q++) {
    svg.appendChild(createQuarterBand(q * quarterSize, quarterSize, q, q % 2 === 1));
  }

  paintConnectors(svg, roundCount, N);

  // Viewport indicator — caller updates y + height via scroll listener.
  const viewport = document.createElementNS(SVG_NS, 'rect');
  viewport.setAttribute('x', '0');
  viewport.setAttribute('y', '0');
  viewport.setAttribute('width', String(VIEWBOX_W));
  viewport.setAttribute('height', '0');
  viewport.setAttribute('vector-effect', 'non-scaling-stroke');
  viewport.classList.add('chc-minimap-viewport');
  svg.appendChild(viewport);

  wrapper.appendChild(svg);
  return wrapper;
}
