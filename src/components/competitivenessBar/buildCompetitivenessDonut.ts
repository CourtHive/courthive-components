/**
 * Competitiveness Donut — DOM factory.
 *
 * SVG donut that mirrors the API of `buildCompetitivenessBar`: returns an
 * element + an `update(buckets)` callback. The element is hidden until the
 * first update with a non-zero total. Each non-zero bucket renders as an arc
 * sized proportionally to its share.
 */

import { COMPETITIVENESS_BUCKETS, CompetitivenessBucket, CompetitivenessBuckets } from './types';
import { totalBuckets } from './aggregateCompetitiveness';

import './competitiveness-donut.css';

const LABEL_MAP: Record<CompetitivenessBucket, string> = {
  COMPETITIVE: 'Competitive',
  ROUTINE: 'Routine',
  DECISIVE: 'Decisive',
  WALKOVER: 'Walkover / Defaulted',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 96;
const THICKNESS = 16;
const CENTER = SIZE / 2;
const RADIUS_OUTER = CENTER - 1; // 1px breathing room so the stroke isn't clipped
const RADIUS_INNER = RADIUS_OUTER - THICKNESS;

export interface BuildCompetitivenessDonutResult {
  element: HTMLElement;
  update: (buckets: CompetitivenessBuckets) => void;
}

function polar(angle: number, radius: number): { x: number; y: number } {
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function arcPath(startAngle: number, endAngle: number): string {
  const startOuter = polar(startAngle, RADIUS_OUTER);
  const endOuter = polar(endAngle, RADIUS_OUTER);
  const startInner = polar(endAngle, RADIUS_INNER);
  const endInner = polar(startAngle, RADIUS_INNER);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${RADIUS_OUTER} ${RADIUS_OUTER} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${RADIUS_INNER} ${RADIUS_INNER} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function fullRingPath(): string {
  // SVG can't draw a full circle as a single arc (start == end is a no-op),
  // so render two half-arcs to make a complete donut ring.
  const top = polar(-Math.PI / 2, RADIUS_OUTER);
  const bottom = polar(Math.PI / 2, RADIUS_OUTER);
  const topInner = polar(-Math.PI / 2, RADIUS_INNER);
  const bottomInner = polar(Math.PI / 2, RADIUS_INNER);
  return [
    `M ${top.x} ${top.y}`,
    `A ${RADIUS_OUTER} ${RADIUS_OUTER} 0 1 1 ${bottom.x} ${bottom.y}`,
    `A ${RADIUS_OUTER} ${RADIUS_OUTER} 0 1 1 ${top.x} ${top.y}`,
    `L ${topInner.x} ${topInner.y}`,
    `A ${RADIUS_INNER} ${RADIUS_INNER} 0 1 0 ${bottomInner.x} ${bottomInner.y}`,
    `A ${RADIUS_INNER} ${RADIUS_INNER} 0 1 0 ${topInner.x} ${topInner.y}`,
    'Z',
  ].join(' ');
}

export function buildCompetitivenessDonut(): BuildCompetitivenessDonutResult {
  const element = document.createElement('div');
  element.className = 'chc-cd';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('class', 'chc-cd__svg');
  svg.setAttribute('role', 'img');

  const arcs: Record<CompetitivenessBucket, SVGPathElement> = {} as any;
  for (const bucket of COMPETITIVENESS_BUCKETS) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'chc-cd__arc');
    path.setAttribute('data-bucket', bucket);
    svg.appendChild(path);

    const title = document.createElementNS(SVG_NS, 'title');
    path.appendChild(title);

    arcs[bucket] = path;
  }

  const totalLabel = document.createElement('div');
  totalLabel.className = 'chc-cd__total';

  element.appendChild(svg);
  element.appendChild(totalLabel);

  const update = (buckets: CompetitivenessBuckets): void => {
    const total = totalBuckets(buckets);
    element.style.display = total > 0 ? 'inline-flex' : 'none';
    if (!total) return;

    // Identify the buckets that contribute. Special-case a single bucket holding
    // 100% so we draw a full ring instead of a zero-length arc.
    const nonZero = COMPETITIVENESS_BUCKETS.filter((b) => buckets[b] > 0);
    let cursor = -Math.PI / 2;

    for (const bucket of COMPETITIVENESS_BUCKETS) {
      const count = buckets[bucket];
      const path = arcs[bucket];
      const titleEl = path.querySelector('title');

      if (count === 0) {
        path.removeAttribute('d');
        if (titleEl) titleEl.textContent = '';
        continue;
      }

      if (nonZero.length === 1) {
        path.setAttribute('d', fullRingPath());
      } else {
        const fraction = count / total;
        const next = cursor + fraction * Math.PI * 2;
        path.setAttribute('d', arcPath(cursor, next));
        cursor = next;
      }

      if (titleEl) titleEl.textContent = `${LABEL_MAP[bucket]}: ${count}`;
    }

    totalLabel.textContent = String(total);
    svg.setAttribute('aria-label', `Competitiveness across ${total} matches`);
  };

  return { element, update };
}
