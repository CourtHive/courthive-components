/**
 * Pressure Horizon — play-function tests.
 *
 * The DOM layer of the draw-order game. Its decisions (reorder, reveal, scoring,
 * derangement) live in pure modules and are covered by 55 vitest cases under
 * `components/pressureHorizon/__tests__/`; what is left here is what only a real
 * browser can answer — does the rendered tree keep the answer hidden, does the
 * keyboard path actually move a row, does the reveal agree with the score it
 * printed.
 *
 * The anonymity cases are the ones that matter most. Anonymity is not a visual
 * property — a name that never appears on screen but sits in a `data-` attribute
 * or a `<title>` is still the answer, handed to anybody who opens dev tools.
 * Nothing except a rendered-DOM assertion can catch that.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` (one terminal) +
 *                    `pnpm test-storybook -- --testPathPatterns PressureHorizonTests` (other)
 */

import type { Meta, StoryObj } from '@storybook/html-vite';
import { userEvent, expect } from 'storybook/test';

import { buildPressureSeries } from '../components/pressureChart/buildPressureSeries';
import { buildDrawOrderGame } from '../components/pressureHorizon/drawOrderGame';
import { buildPressureHorizon, HORIZON_VARIANT } from '../components/pressureHorizon/pressureHorizon';
import { seededDraw } from './pressureChartFixture';

const meta: Meta = {
  title: 'Charts/Pressure Horizon/Tests/DrawOrderGame'
};
export default meta;

// ── Selectors ────────────────────────────────────────────────────────────

const ROW = '.chc-dog__row';
const REVEAL = '.chc-dog__reveal';
const SLOT = '.chc-dog__slot';
const SCORE_HEADLINE = '.chc-dog__score-headline';
const SCORE_EXACT = '.chc-dog__score-exact';
const META = '.chc-dog__meta';
const HORIZON_ROW = '.chc-ph__row';
const TRACE = '.chc-ph__trace';
const FAN = '.chc-ph__fan';
const LEGEND_LABEL = '.chc-ph__legend-label';

const DRAW_SIZE = 16;
const SEED = 20260831;
const CHECK_BUTTON = 'Check my order';

function fixtureSeries(drawSize = DRAW_SIZE) {
  const fixture = seededDraw({ drawSize, seedsCount: 4 });
  const { series, scaleName, projection } = buildPressureSeries({ matchUps: fixture.matchUps });
  return { series, scaleName, projection };
}

/** Names present in the field — nothing that identifies them may reach the board. */
function participantNames(series: ReturnType<typeof fixtureSeries>['series']): string[] {
  return series.map((entry) => entry.participantName).filter((name): name is string => Boolean(name));
}

function mountGame(canvasElement: HTMLElement, drawSize = DRAW_SIZE) {
  const { series, scaleName } = fixtureSeries(drawSize);
  const host = document.createElement('div');
  canvasElement.appendChild(host);
  buildDrawOrderGame(host, series, { seed: SEED, scaleName, width: 380, rowHeight: 20 });
  return { host, names: participantNames(series) };
}

async function findButton(canvasElement: HTMLElement, label: string): Promise<HTMLButtonElement> {
  const match = [...canvasElement.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) => element.textContent === label
  );
  await expect(match).toBeTruthy();
  return match as HTMLButtonElement;
}

// ── Anonymity ────────────────────────────────────────────────────────────

export const HidesEveryIdentityBeforeReveal: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const { names } = mountGame(canvasElement);
    const rows = canvasElement.querySelectorAll(ROW);
    await expect(rows).toHaveLength(DRAW_SIZE);

    // Nothing named, nothing revealed.
    await expect(canvasElement.querySelectorAll(REVEAL)).toHaveLength(0);
    const markup = canvasElement.innerHTML;
    for (const name of names) await expect(markup).not.toContain(name);

    // Not in an attribute either — the failure mode a visual check cannot see.
    for (const row of rows) {
      await expect((row as HTMLElement).dataset.slot).toBeTruthy();
      await expect((row as HTMLElement).dataset.participantId).toBeUndefined();
    }
    await expect(canvasElement.querySelectorAll('title')).toHaveLength(0);
  }
};

/**
 * The falsification of the case above: the stacked view over the SAME fixture
 * does render names and titles. Without this, "no name found" could just mean the
 * assertion was looking in the wrong place.
 */
export const StackedViewDoesShowIdentities: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const { series, scaleName } = fixtureSeries();
    buildPressureHorizon(canvasElement, series, { scaleName, width: 380 });

    const rows = canvasElement.querySelectorAll(HORIZON_ROW);
    await expect(rows).toHaveLength(DRAW_SIZE);
    const markup = canvasElement.innerHTML;
    const names = participantNames(series);
    await expect(names.length).toBeGreaterThan(0);
    await expect(markup).toContain(names[0]);
    await expect(canvasElement.querySelectorAll('title').length).toBeGreaterThan(0);
  }
};

// ── Reordering ───────────────────────────────────────────────────────────

export const KeyboardMovesARow: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    mountGame(canvasElement);
    const rowOf = (slot: number) => canvasElement.querySelector<HTMLElement>(`${ROW}[data-slot="${slot}"]`);

    const first = rowOf(0);
    await expect(first).toBeTruthy();
    const firstShape = first?.querySelector('svg')?.innerHTML;
    const secondShape = rowOf(1)?.querySelector('svg')?.innerHTML;
    await expect(firstShape).not.toEqual(secondShape);

    first?.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

    // The two paths have exchanged slots, and the slot column still counts 1..n.
    await expect(rowOf(0)?.querySelector('svg')?.innerHTML).toEqual(secondShape);
    await expect(rowOf(1)?.querySelector('svg')?.innerHTML).toEqual(firstShape);
    await expect(canvasElement.querySelector(META)?.textContent).toContain('1 moves');

    const slots = [...canvasElement.querySelectorAll(SLOT)].map((node) => node.textContent);
    await expect(slots).toEqual(Array.from({ length: DRAW_SIZE }, (_, index) => String(index + 1)));
  }
};

export const BareArrowMovesFocusNotTheRow: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    mountGame(canvasElement);
    const rowOf = (slot: number) => canvasElement.querySelector<HTMLElement>(`${ROW}[data-slot="${slot}"]`);
    const firstShape = rowOf(0)?.querySelector('svg')?.innerHTML;

    rowOf(0)?.focus();
    await userEvent.keyboard('{ArrowDown}');

    await expect(rowOf(0)?.querySelector('svg')?.innerHTML).toEqual(firstShape);
    await expect(canvasElement.querySelector(META)?.textContent).toContain('0 moves');
    await expect(document.activeElement).toEqual(rowOf(1));
  }
};

// ── Reveal ───────────────────────────────────────────────────────────────

export const RevealAgreesWithTheScoreItPrints: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const { names } = mountGame(canvasElement);
    await userEvent.click(await findButton(canvasElement, CHECK_BUTTON));

    const headline = canvasElement.querySelector(SCORE_HEADLINE)?.textContent ?? '';
    await expect(headline).toMatch(/^\d+%$/);

    // Every row now carries an identity...
    await expect(canvasElement.querySelectorAll(REVEAL)).toHaveLength(DRAW_SIZE);
    await expect(canvasElement.innerHTML).toContain(names[0]);

    // ...and the ticks on the board match the count the panel claims.
    const exactText = canvasElement.querySelector(SCORE_EXACT)?.textContent ?? '';
    const claimed = Number.parseInt(exactText, 10);
    const marked = canvasElement.querySelectorAll(`${REVEAL}.is-correct`).length;
    await expect(marked).toEqual(claimed);
  }
};

export const RevealedBoardIsFrozen: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    mountGame(canvasElement);
    await userEvent.click(await findButton(canvasElement, CHECK_BUTTON));

    const rowOf = (slot: number) => canvasElement.querySelector<HTMLElement>(`${ROW}[data-slot="${slot}"]`);
    const firstShape = rowOf(0)?.querySelector('svg')?.innerHTML;
    await expect(rowOf(0)?.draggable).toBe(false);

    rowOf(0)?.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await expect(rowOf(0)?.querySelector('svg')?.innerHTML).toEqual(firstShape);
  }
};

export const PlayAgainDealsAFreshBoard: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    mountGame(canvasElement);
    const orderShapes = () =>
      [...canvasElement.querySelectorAll(ROW)].map((row) => row.querySelector('svg')?.innerHTML);

    const before = orderShapes();
    await userEvent.click(await findButton(canvasElement, CHECK_BUTTON));
    await userEvent.click(await findButton(canvasElement, 'Play again'));

    await expect(canvasElement.querySelectorAll(SCORE_HEADLINE)).toHaveLength(0);
    await expect(canvasElement.querySelectorAll(REVEAL)).toHaveLength(0);
    await expect(orderShapes()).not.toEqual(before);
  }
};

// ── Ribbon variant ───────────────────────────────────────────────────────

/**
 * The ribbon introduces an anonymity risk the walls do not have: it needs a
 * per-row `<linearGradient>` id. An id derived from a participantId would sit in the
 * defs of an otherwise anonymous board and hand over the answer to anyone who
 * opened dev tools. Nothing but a rendered-DOM assertion catches that.
 */
export const RibbonBoardLeaksNothingThroughGradientIds: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const { series, scaleName, projection } = fixtureSeries();
    const host = document.createElement('div');
    canvasElement.appendChild(host);
    buildDrawOrderGame(host, series, {
      seed: SEED,
      scaleName,
      projection,
      variant: HORIZON_VARIANT.RIBBON,
      width: 380,
      rowHeight: 28
    });

    const gradients = [...canvasElement.querySelectorAll('linearGradient')];
    await expect(gradients).toHaveLength(DRAW_SIZE);

    const markup = canvasElement.innerHTML;
    for (const entry of series) {
      await expect(markup).not.toContain(entry.participantId);
      if (entry.participantName) await expect(markup).not.toContain(entry.participantName);
    }
    for (const gradient of gradients) {
      await expect(gradient.id).toMatch(/^chc-ph-grad-\d+$/);
    }
    await expect(canvasElement.querySelectorAll('title')).toHaveLength(0);
  }
};

export const RibbonDrawsATraceAndBothFansPerRow: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const { series, scaleName, projection } = fixtureSeries();
    buildPressureHorizon(canvasElement, series, {
      scaleName,
      projection,
      variant: HORIZON_VARIANT.RIBBON,
      width: 420
    });

    // Non-degenerate before anything is concluded from it.
    await expect(canvasElement.querySelectorAll(HORIZON_ROW)).toHaveLength(DRAW_SIZE);
    await expect(canvasElement.querySelectorAll(TRACE)).toHaveLength(DRAW_SIZE);
    await expect(canvasElement.querySelectorAll(FAN)).toHaveLength(DRAW_SIZE * 2);

    // Every fan path must reference its row's gradient, or the fold is not painted.
    const fans = [...canvasElement.querySelectorAll<SVGPathElement>(FAN)];
    await expect(fans.every((fan) => (fan.getAttribute('fill') ?? '').startsWith('url(#chc-ph-grad-'))).toBe(true);
  }
};

/**
 * The walls carry direction by which edge a block grows from; the ribbon carries it
 * by which side of the centre line the trace sits on. A legend that described the
 * walls' anchoring on a ribbon chart would be documenting a chart that is not there.
 */
export const RibbonLegendDescribesTheRibbonNotTheWalls: StoryObj = {
  render: () => document.createElement('div'),
  play: async ({ canvasElement }) => {
    const { series, scaleName, projection } = fixtureSeries();

    const ribbon = document.createElement('div');
    canvasElement.appendChild(ribbon);
    buildPressureHorizon(ribbon, series, {
      scaleName,
      projection,
      variant: HORIZON_VARIANT.RIBBON,
      width: 380
    });
    const ribbonLabels = [...ribbon.querySelectorAll(LEGEND_LABEL)].map((node) => node.textContent ?? '');
    await expect(ribbonLabels).toHaveLength(2);
    await expect(ribbonLabels.join(' ')).toContain('centre line');
    await expect(ribbonLabels.join(' ')).not.toContain('baseline');

    // Control: the walls legend over the SAME data still says baseline, so the
    // assertion above is reading the variant rather than a string that never appears.
    const walls = document.createElement('div');
    canvasElement.appendChild(walls);
    buildPressureHorizon(walls, series, { scaleName, variant: HORIZON_VARIANT.WALLS, width: 380 });
    const wallLabels = [...walls.querySelectorAll(LEGEND_LABEL)].map((node) => node.textContent ?? '');
    await expect(wallLabels.join(' ')).toContain('baseline');
    await expect(wallLabels.join(' ')).not.toContain('centre line');
  }
};
