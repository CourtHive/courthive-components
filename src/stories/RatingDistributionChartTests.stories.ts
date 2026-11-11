/**
 * Charts — `buildRatingDistributionChart` play-function tests: the chart as the browser lays it out.
 *
 * Moved from an emulated-DOM unit test that counted elements and never looked at geometry. The geometry itself is
 * computed by `chartModel` and node-tested there; these plays check that the drawn SVG matches it on screen —
 * bars stand on one baseline at heights proportional to their counts, in equal bands left to right, with
 * their counts above them; the mean line sits where the mean falls; each donut slice covers its own label
 * point and the hole stays empty.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { buildRatingDistributionChart } from '../components/ratingDistributionChart';
import type { RatingDistributionStats } from 'tods-competition-factory';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Charts/Rating Distribution/Tests/Geometry',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const BAR = 'rect.chc-rdc-bar';
const COUNT = 'text.chc-rdc-count';
const SLICE = 'path.chc-rdc-slice';
const SLICE_LABEL = 'text.chc-rdc-slice-label';
const MEAN = 'line.chc-rdc-mean';

const stats: RatingDistributionStats = {
  histogram: [
    { binStart: 4, binEnd: 4.5, count: 3 },
    { binStart: 4.5, binEnd: 5, count: 5 },
    { binStart: 5, binEnd: 5.5, count: 2 }
  ],
  gaps: [],
  count: 10,
  mean: 4.65,
  median: 4.65,
  stddev: 0.4,
  iqr: 0.5,
  min: 4,
  max: 5.5
};

function charts(entries: [string, SVGSVGElement][]): HTMLElement {
  const outer = document.createElement('div');
  outer.style.cssText = 'display:flex; flex-direction:column; gap:12px; padding:12px;';
  for (const [testid, svg] of entries) {
    const frame = document.createElement('div');
    frame.dataset.testid = testid;
    frame.appendChild(svg);
    outer.appendChild(frame);
  }
  return outer;
}

const chart = (canvasElement: HTMLElement, testid: string) =>
  canvasElement.querySelector<SVGSVGElement>(`[data-testid="${testid}"] svg`)!;
const rects = (svg: SVGSVGElement, selector: string) =>
  Array.from(svg.querySelectorAll(selector), (el) => el.getBoundingClientRect());

export const Histogram: StoryObj = {
  render: () =>
    charts([
      ['default', buildRatingDistributionChart(stats)],
      ['labelled', buildRatingDistributionChart(stats, { ariaLabel: 'Pool A distribution', showCounts: false })],
      ['mean-outside', buildRatingDistributionChart({ ...stats, mean: 7 })],
      ['no-mean', buildRatingDistributionChart(stats, { showMean: false })],
      ['empty', buildRatingDistributionChart({ ...stats, histogram: [], count: 0, mean: 0 })]
    ]),
  play: async ({ canvasElement }) => {
    const svg = chart(canvasElement, 'default');
    await expect(svg).toBeInstanceOf(SVGSVGElement);
    await expect(svg.classList.contains('chc-rating-distribution-chart')).toBe(true);
    await expect(svg.getAttribute('aria-label')).toBe('Participant rating distribution');
    // laid out at its default size
    const box = svg.getBoundingClientRect();
    await expect(box.width).toBeCloseTo(480, 0);
    await expect(box.height).toBeCloseTo(200, 0);

    // one bar per bin, standing on one baseline, heights in proportion to the counts 3 : 5 : 2
    const bars = rects(svg, BAR);
    await expect(bars).toHaveLength(3);
    for (const bar of bars) await expect(bar.bottom).toBeCloseTo(bars[0].bottom, 1);
    await expect(bars[1].height / bars[0].height).toBeCloseTo(5 / 3, 2);
    await expect(bars[2].height / bars[0].height).toBeCloseTo(2 / 3, 2);
    // in equal bands, left to right, inside the chart
    await expect(bars[1].width).toBeCloseTo(bars[0].width, 1);
    await expect(bars[2].width).toBeCloseTo(bars[0].width, 1);
    await expect(bars[1].left).toBeGreaterThan(bars[0].right);
    await expect(bars[2].left).toBeGreaterThan(bars[1].right);
    await expect(bars[0].left).toBeGreaterThanOrEqual(box.left);
    await expect(bars[2].right).toBeLessThanOrEqual(box.right);

    // each count is centred above its bar
    const counts = Array.from(svg.querySelectorAll<SVGTextElement>(COUNT));
    await expect(counts.map((text) => text.textContent)).toEqual(['3', '5', '2']);
    for (const [index, text] of counts.entries()) {
      await expect(text).toBeVisible();
      const label = text.getBoundingClientRect();
      await expect(label.left + label.width / 2).toBeCloseTo(bars[index].left + bars[index].width / 2, 0);
      await expect(label.bottom).toBeLessThanOrEqual(bars[index].top + 1);
    }

    // the mean line at 4.65 falls inside the second bin's band [4.5, 5.0]
    const mean = svg.querySelector(MEAN)!;
    const meanX = mean.getBoundingClientRect().left;
    await expect(meanX).toBeGreaterThan(bars[1].left - bars[1].width * 0.2);
    await expect(meanX).toBeLessThan(bars[1].left + bars[1].width / 2);

    const labelled = chart(canvasElement, 'labelled');
    await expect(labelled.getAttribute('aria-label')).toBe('Pool A distribution');
    await expect(labelled.querySelectorAll(COUNT)).toHaveLength(0);
    await expect(labelled.querySelectorAll(BAR)).toHaveLength(3);

    await expect(chart(canvasElement, 'mean-outside').querySelector(MEAN)).toBeNull();
    await expect(chart(canvasElement, 'no-mean').querySelector(MEAN)).toBeNull();
    await expect(chart(canvasElement, 'empty').querySelectorAll(BAR)).toHaveLength(0);
  }
};

/** Whether a point given in the svg's user units lies inside a path's fill. */
const covers = (path: SVGPathElement, x: number, y: number) => path.isPointInFill(new DOMPoint(x, y));

export const Donut: StoryObj = {
  render: () =>
    charts([
      ['donut', buildRatingDistributionChart(stats, { mode: 'DONUT' })],
      ['donut-no-counts', buildRatingDistributionChart(stats, { mode: 'DONUT', showCounts: false })],
      [
        'donut-one-bin',
        buildRatingDistributionChart(
          {
            ...stats,
            histogram: [
              { binStart: 4, binEnd: 4.5, count: 0 },
              { binStart: 4.5, binEnd: 5, count: 5 }
            ],
            count: 5
          },
          { mode: 'DONUT' }
        )
      ],
      ['donut-empty', buildRatingDistributionChart({ ...stats, histogram: [], count: 0 }, { mode: 'DONUT' })]
    ]),
  play: async ({ canvasElement }) => {
    const svg = chart(canvasElement, 'donut');
    const slices = Array.from(svg.querySelectorAll<SVGPathElement>(SLICE));
    const labels = Array.from(svg.querySelectorAll<SVGTextElement>(SLICE_LABEL));
    await expect(slices).toHaveLength(3);
    await expect(labels.map((text) => text.textContent)).toEqual(['3', '5', '2']);

    // each slice covers its own label point, and no other slice does
    for (const [index, label] of labels.entries()) {
      const x = Number(label.getAttribute('x'));
      const y = Number(label.getAttribute('y'));
      await expect(slices.map((slice) => covers(slice, x, y))).toEqual(slices.map((_, i) => i === index));
      await expect(label).toBeVisible();
    }
    // the hole is empty: nothing covers the centre, where the count sits
    await expect(slices.some((slice) => covers(slice, 140, 140))).toBe(false);
    const center = svg.querySelector<SVGTextElement>('text.chc-rdc-center-count')!;
    await expect(center.textContent).toBe('10');
    await expect(center).toBeVisible();
    const box = svg.getBoundingClientRect();
    const centerBox = center.getBoundingClientRect();
    await expect(centerBox.left + centerBox.width / 2).toBeCloseTo(box.left + box.width / 2, 0);

    const noCounts = chart(canvasElement, 'donut-no-counts');
    await expect(noCounts.querySelectorAll(SLICE)).toHaveLength(3);
    await expect(noCounts.querySelectorAll(SLICE_LABEL)).toHaveLength(0);

    // a pool in one bin is one slice, and it is the whole ring
    const oneBin = Array.from(chart(canvasElement, 'donut-one-bin').querySelectorAll<SVGPathElement>(SLICE));
    await expect(oneBin).toHaveLength(1);
    const ringRadius = ((280 - 24) / 2) * 0.75;
    await expect(covers(oneBin[0], 140, 140 - ringRadius)).toBe(true);
    await expect(covers(oneBin[0], 140, 140 + ringRadius)).toBe(true);

    await expect(chart(canvasElement, 'donut-empty').querySelectorAll(SLICE)).toHaveLength(0);
  }
};
