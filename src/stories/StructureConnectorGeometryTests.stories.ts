/**
 * Structure — connector geometry play-function tests (the gate for structure rendering vNext item 10).
 *
 * Connectors no longer get heights from JS. Each elimination matchUp sits in a cell; a round is a grid of
 * equal rows, so a cell in round r + 1 spans exactly the two cells it is fed by; the connector is drawn
 * from the cell as percentages of its height. These tests measure what is DRAWN, in pixels, for every
 * variant, rather than reading any property the implementation sets:
 *
 * - the line out of a matchUp leaves at its card's divider (between the two sides);
 * - a pair's two vertical halves meet, at the boundary between their cells;
 * - the next round's card divider, and the line into it, sit on that junction;
 * - the horizontal gap between rounds is spanned exactly (out + in = the gap).
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Composition } from '../types';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Connector Geometry',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'connector-geometry-host';
const TOLERANCE = 1.5;
const CELL = '.chc-cell';

type Line = { y: number; top: number; bottom: number; left: number; right: number };

/** The rendered box of a cell's pseudo-element, in viewport pixels. */
function pseudoBox(cell: HTMLElement, pseudo: '::before' | '::after'): Line | undefined {
  const style = getComputedStyle(cell, pseudo);
  if (style.content === 'none' || style.display === 'none') return undefined;
  const height = Number.parseFloat(style.height);
  const width = Number.parseFloat(style.width);
  if (!width) return undefined;
  const rect = cell.getBoundingClientRect();
  const top = rect.top + Number.parseFloat(style.top);
  const left = rect.left + Number.parseFloat(style.left);
  const borderTop = Number.parseFloat(style.borderTopWidth);
  const borderBottom = Number.parseFloat(style.borderBottomWidth);
  // the horizontal stroke: the top border, or the bottom border for a line that rises to the junction
  const y = borderTop ? top : top + height - borderBottom;
  return { y, top, bottom: top + height, left, right: left + width };
}

/**
 * The top of the card's divider stroke: the 1px border that ends where side 2 (or the second centre-info row)
 * begins. Compared with the top of the connector's stroke, so both sides of the comparison are strokes.
 */
function dividerY(cell: HTMLElement): number {
  const lower =
    cell.querySelector<HTMLElement>('.tmx-ci[sidenumber="2"]') ??
    (cell.querySelector<HTMLElement>('.tmx-sd[sidenumber="2"]') as HTMLElement);
  return lower.getBoundingClientRect().top - 1;
}

const near = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE;

function checkStructure(structure: HTMLElement): string[] {
  const problems: string[] = [];
  const rounds = [...structure.querySelectorAll<HTMLElement>('.tmx-rd')];
  const cellsByRound = rounds.map((round) => [...round.querySelectorAll<HTMLElement>(CELL)]);

  cellsByRound.forEach((cells, roundIndex) => {
    cells.forEach((cell, index) => {
      const id = `r${roundIndex + 1}c${index + 1}`;
      const out = pseudoBox(cell, '::after');
      const into = pseudoBox(cell, '::before');
      const divider = dividerY(cell);
      const cellRect = cell.getBoundingClientRect();

      if (out && !near(out.y, divider))
        problems.push(`${id}: line out at ${out.y.toFixed(1)}, divider ${divider.toFixed(1)}`);
      if (into && !near(into.y, divider))
        problems.push(`${id}: line in at ${into.y.toFixed(1)}, divider ${divider.toFixed(1)}`);
      if (into && !near(into.right, cellRect.left))
        problems.push(`${id}: line in ends ${into.right.toFixed(1)}, card at ${cellRect.left.toFixed(1)}`);

      // a pair: the top cell's vertical meets the bottom cell's at their shared boundary
      if (cell.classList.contains('chc-link--m1') && out) {
        const sibling = cells[index + 1];
        const siblingOut = sibling && pseudoBox(sibling, '::after');
        if (!siblingOut) {
          problems.push(`${id}: m1 without a sibling below`);
        } else {
          if (!near(out.bottom, cellRect.bottom))
            problems.push(`${id}: m1 vertical stops ${out.bottom.toFixed(1)} short of ${cellRect.bottom.toFixed(1)}`);
          if (!near(siblingOut.top, sibling.getBoundingClientRect().top))
            problems.push(`${id}: m2 vertical starts below its cell`);

          // the next round's card sits on the junction and the gap is spanned
          const next = cellsByRound[roundIndex + 1]?.[Math.floor(index / 2)];
          if (next) {
            const junction = cellRect.bottom;
            const nextInto = pseudoBox(next, '::before');
            if (!near(dividerY(next), junction))
              problems.push(`${id}: next divider ${dividerY(next).toFixed(1)}, junction ${junction.toFixed(1)}`);
            if (!nextInto) problems.push(`${id}: next card has no line in`);
            else if (!near(out.right, nextInto.left))
              problems.push(`${id}: gap ${out.right.toFixed(1)} → ${nextInto.left.toFixed(1)}`);
          }
        }
      }
    });
  });
  return problems;
}

type Variant = {
  name: string;
  args?: Record<string, any>;
  configuration?: Record<string, any>;
  initialRoundNumber?: number;
  structureIndex?: number;
  composition?: Composition;
};

const VARIANTS: Variant[] = [
  { name: 'singles 32' },
  { name: 'doubles 16', args: { drawSize: 16, eventType: 'DOUBLES' } },
  { name: 'schedule header', configuration: { scheduleInfo: true } },
  { name: 'centre info', configuration: { centerInfo: true } },
  { name: 'footer', configuration: { matchUpFooter: true } },
  { name: 'schedule header + footer', configuration: { scheduleInfo: true, matchUpFooter: true } },
  { name: 'address', configuration: { showAddress: true } },
  { name: 'scoped from round 2', initialRoundNumber: 2 },
  { name: 'rounded', configuration: { rounded: true, scheduleInfo: true } },
  { name: 'BasicCard', composition: compositions.BasicCard },
  { name: 'compact density', configuration: { density: 'compact', scheduleInfo: true } },
  { name: 'connector width 24', configuration: { connectorWidth: 24 } },
  { name: 'feed-in consolation', args: { drawSize: 16, drawType: 'FEED_IN_CHAMPIONSHIP' }, structureIndex: 1 },
  { name: 'qualifying', args: { drawSize: 16, addQualifying: true }, structureIndex: 0 }
];

function structureMatchUps(variant: Variant): any[] {
  const { eventData } = generateEventData({ drawSize: 32, completeAllMatchUps: true, ...variant.args }) || {};
  const structures = eventData?.drawsData?.[0]?.structures ?? [];
  const structure = structures[variant.structureIndex ?? 0];
  return structure?.roundMatchUps ? (Object.values(structure.roundMatchUps).flat() as any[]) : [];
}

export const ConnectorsMeetEverywhere: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.dataset.testid = HOST_TESTID;
    return container;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const report: Record<string, string[]> = {};

    for (const variant of VARIANTS) {
      const base = variant.composition ?? compositions.Australian;
      const composition = { ...base, configuration: { ...base.configuration, ...variant.configuration } };
      const matchUps = structureMatchUps(variant);
      host.innerHTML = '';
      const structure = renderStructure({ composition, matchUps, initialRoundNumber: variant.initialRoundNumber });
      host.appendChild(structure);

      // control: the variant rendered cells with connectors, so the checks below looked at something
      const cells = structure.querySelectorAll(CELL).length;
      const pairs = structure.querySelectorAll('.chc-link--m1').length;
      if (!cells || (!pairs && !variant.args?.drawType && !variant.args?.addQualifying)) {
        report[variant.name] = [`rendered ${cells} cells and ${pairs} pairs`];
        continue;
      }
      const problems = checkStructure(structure);
      if (problems.length) report[variant.name] = problems.slice(0, 5);
    }

    expect(report).toEqual({});
  }
};
