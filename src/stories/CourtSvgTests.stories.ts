/**
 * Courts — `createCourtSvg` play-function tests.
 *
 * Moved from an emulated-DOM unit test; the sport resolution beside it (`sportFromMatchUpFormat`,
 * `resolveCourtSport`) stays a node test. A court is drawn landscape whatever its factory's orientation: a
 * portrait viewBox is swapped and its content rotated into it. The play checks that geometry as the browser
 * lays it out, not just the attribute: the rendered court has the landscape aspect and its lines fall
 * inside it.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import type { CourtSport } from '../components/courts/courtSvgUtil';
import { createCourtSvg } from '../components/courts/courtSvgUtil';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Foundations/Assets/Courts/Tests/Create Court Svg',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

// every factory, and the viewBox it draws in (tennis, hockey, pickleball, badminton and padel are portrait)
const SPORTS: [CourtSport, string][] = [
  ['tennis', '0 0 360 780'],
  ['basketball', '0 0 500 470'],
  ['baseball', '0 0 500 440'],
  ['hockey', '0 0 850 2000'],
  ['pickleball', '0 0 200 440'],
  ['badminton', '0 0 200 440'],
  ['padel', '0 0 100 200']
];
const WIDTH = 300;

export const CourtsAreLandscape: StoryObj = {
  render: () => {
    const outer = document.createElement('div');
    outer.style.cssText = 'display:flex; flex-direction:column; gap:12px; padding:12px;';
    for (const [sport] of SPORTS) {
      const frame = document.createElement('div');
      frame.dataset.testid = sport;
      frame.style.width = `${WIDTH}px`;
      const svg = createCourtSvg(sport, sport === 'tennis' ? 'extra-class' : '');
      if (svg) frame.appendChild(svg);
      outer.appendChild(frame);
    }
    return outer;
  },
  play: async ({ canvasElement }) => {
    for (const [sport, factoryViewBox] of SPORTS) {
      const svg = canvasElement.querySelector<SVGSVGElement>(`[data-testid="${sport}"] svg`)!;
      await expect(svg, sport).toBeVisible();

      const [, , factoryW, factoryH] = factoryViewBox.split(' ').map(Number);
      const [, , w, h] = svg.getAttribute('viewBox')!.split(/\s+/).map(Number);
      // landscape, and the same court: a portrait viewBox is swapped, a landscape one kept
      await expect(w, sport).toBeGreaterThanOrEqual(h);
      await expect(
        [w, h].toSorted((a, b) => a - b),
        sport
      ).toEqual([factoryW, factoryH].toSorted((a, b) => a - b));

      // as laid out: the full width of its frame, at the viewBox's aspect
      const box = svg.getBoundingClientRect();
      await expect(box.width, sport).toBeCloseTo(WIDTH, 0);
      await expect(box.width / box.height, sport).toBeCloseTo(w / h, 1);

      // a ROTATED court's boundary — its largest line, measured as laid out — fills the drawn court: a
      // rotation without its translate would put it off to the left, outside the svg. (A landscape factory
      // is drawn as it is; its lines, such as a centre circle on the half-court line, may run past the edge.)
      if (factoryH <= factoryW) continue;
      const content = svg.firstElementChild!;
      await expect(content.tagName, sport).toBe('g');
      const boundary = Array.from(content.children)
        .map((child) => child.getBoundingClientRect())
        .reduce((widest, rect) => (rect.width * rect.height > widest.width * widest.height ? rect : widest));
      await expect(boundary.left, sport).toBeCloseTo(box.left, -1);
      await expect(boundary.right, sport).toBeCloseTo(box.right, -1);
      await expect(boundary.top, sport).toBeCloseTo(box.top, -1);
      await expect(boundary.bottom, sport).toBeCloseTo(box.bottom, -1);
    }
  }
};

export const SportClassAndUnknownSports: StoryObj = {
  render: () => document.createElement('div'),
  play: async () => {
    const tennis = createCourtSvg('tennis', 'extra-class');
    await expect(tennis?.tagName.toLowerCase()).toBe('svg');
    await expect(tennis).toBeInstanceOf(SVGSVGElement);
    await expect(tennis?.getAttribute('class')).toBe('court--tennis extra-class');
    await expect(createCourtSvg('basketball')?.getAttribute('class')).toBe('court--basketball');

    await expect(createCourtSvg('cricket')).toBeUndefined();
    await expect(createCourtSvg(undefined)).toBeUndefined();
  }
};
