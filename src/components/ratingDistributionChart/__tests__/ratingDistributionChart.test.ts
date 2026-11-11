import { donutModel, histogramModel } from '../chartModel';
import { expect, it, describe } from 'vitest';

// constants and types
import type { RatingDistributionStats } from 'tods-competition-factory';

/**
 * The chart's geometry and labels, from `../chartModel`, which `buildRatingDistributionChart` draws. The
 * drawn SVG — its element, class, size and aria-label, the count labels `showCounts` turns on and off,
 * and the geometry as the browser lays it out — is asserted by `RatingDistributionChartTests.stories.ts`.
 */

// the defaults `buildRatingDistributionChart` passes
const HISTOGRAM = { width: 480, height: 200, margin: { top: 12, right: 12, bottom: 28, left: 32 }, showMean: true };
const DONUT = { size: 280, margin: { top: 12, right: 12, bottom: 12, left: 12 } };

function buildStats(overrides: Partial<RatingDistributionStats> = {}): RatingDistributionStats {
  return {
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
    max: 5.5,
    ...overrides
  };
}

const withZeroBin = () =>
  buildStats({
    histogram: [
      { binStart: 4, binEnd: 4.5, count: 0 },
      { binStart: 4.5, binEnd: 5, count: 5 }
    ],
    count: 5
  });

const EMPTY = { histogram: [], count: 0, mean: 0 };

describe('histogramModel', () => {
  it('has one bar per histogram bin', () => {
    const model = histogramModel({ ...HISTOGRAM, stats: buildStats() })!;
    expect(model.bars.map((bar) => bar.label)).toEqual(['4.0–4.5', '4.5–5.0', '5.0–5.5']);
  });

  it('sizes each bar in proportion to its count, from the baseline', () => {
    const model = histogramModel({ ...HISTOGRAM, stats: buildStats() })!;
    const [three, five, two] = model.bars;
    // a bar stands on the baseline: its top plus its height is the inner height
    for (const bar of model.bars) expect(bar.y + bar.height).toBeCloseTo(model.innerHeight);
    expect(five.height / three.height).toBeCloseTo(5 / 3);
    expect(two.height / three.height).toBeCloseTo(2 / 3);
    // the tallest bar reaches the top of the (niced) y domain [0, 5]
    expect(five.height).toBeCloseTo(model.innerHeight);
  });

  it('lays the bars left to right in equal bands inside the plot', () => {
    const model = histogramModel({ ...HISTOGRAM, stats: buildStats() })!;
    const widths = new Set(model.bars.map((bar) => bar.width));
    expect(widths.size).toBe(1);
    for (let index = 1; index < model.bars.length; index++) {
      expect(model.bars[index].x).toBeGreaterThan(model.bars[index - 1].x + model.bars[index - 1].width);
    }
    expect(model.bars[0].x).toBeGreaterThanOrEqual(0);
    const last = model.bars.at(-1)!;
    expect(last.x + last.width).toBeLessThanOrEqual(model.innerWidth);
    // the inner plot is the chart less its margins
    expect(model.innerWidth).toBe(480 - 32 - 12);
    expect(model.innerHeight).toBe(200 - 12 - 28);
  });

  it('labels each bar with its count, centred above it', () => {
    const model = histogramModel({ ...HISTOGRAM, stats: buildStats() })!;
    expect(model.bars.map((bar) => bar.countText)).toEqual(['3', '5', '2']);
    for (const bar of model.bars) {
      expect(bar.countX).toBeCloseTo(bar.x + bar.width / 2);
      expect(bar.countY).toBeLessThan(bar.y);
    }
  });

  it('leaves a zero-count bin’s label empty', () => {
    const model = histogramModel({ ...HISTOGRAM, stats: withZeroBin() })!;
    expect(model.bars.map((bar) => bar.countText)).toEqual(['', '5']);
    expect(model.bars[0].height).toBe(0);
  });

  it('places the mean line at the mean’s fraction of the bins’ range', () => {
    const model = histogramModel({ ...HISTOGRAM, stats: buildStats() })!;
    // 4.65 across [4, 5.5]
    expect(model.meanX).toBeCloseTo(((4.65 - 4) / 1.5) * model.innerWidth);
  });

  it('omits the mean line when mean is outside histogram range', () => {
    expect(histogramModel({ ...HISTOGRAM, stats: buildStats({ mean: 7 }) })!.meanX).toBeUndefined();
    expect(histogramModel({ ...HISTOGRAM, stats: buildStats({ mean: 3.9 }) })!.meanX).toBeUndefined();
  });

  it('omits the mean line when showMean=false', () => {
    expect(histogramModel({ ...HISTOGRAM, showMean: false, stats: buildStats() })!.meanX).toBeUndefined();
  });

  it('respects custom binColor function', () => {
    const model = histogramModel({ ...HISTOGRAM, binColor: () => '#ff00ff', stats: buildStats() })!;
    expect(model.bars.map((bar) => bar.fill)).toEqual(['#ff00ff', '#ff00ff', '#ff00ff']);
  });

  it('CONTROL — the default colours run from the low token to the high token', () => {
    const fills = histogramModel({ ...HISTOGRAM, stats: buildStats() })!.bars.map((bar) => bar.fill);
    expect(fills[0]).toContain('--chc-rating-low');
    expect(fills[2]).toContain('--chc-rating-high');
  });

  it('shows every axis label when they fit, else only the first and last', () => {
    expect(histogramModel({ ...HISTOGRAM, stats: buildStats() })!.tickValues).toEqual([
      '4.0–4.5',
      '4.5–5.0',
      '5.0–5.5'
    ]);
    // 3 bins across 480 - 44 = 436 px is 145 px a bin; at 120 px wide (76 inner) it is 25 px a bin
    expect(histogramModel({ ...HISTOGRAM, width: 120, stats: buildStats() })!.tickValues).toEqual([
      '4.0–4.5',
      '5.0–5.5'
    ]);
  });

  it('has nothing to draw when histogram is empty', () => {
    expect(histogramModel({ ...HISTOGRAM, stats: buildStats(EMPTY) })).toBeUndefined();
  });
});

describe('donutModel', () => {
  it('has one slice per non-empty bin, swept in proportion to its count around the full circle', () => {
    const model = donutModel({ ...DONUT, stats: buildStats() })!;
    expect(model.slices.map((slice) => slice.labelText)).toEqual(['3', '5', '2']);
    const sweeps = model.slices.map((slice) => slice.end - slice.start);
    expect(sweeps[0]).toBeCloseTo((3 / 10) * 2 * Math.PI);
    expect(sweeps[1]).toBeCloseTo((5 / 10) * 2 * Math.PI);
    expect(sweeps[2]).toBeCloseTo((2 / 10) * 2 * Math.PI);
    // contiguous, from 12 o'clock all the way round
    expect(model.slices[0].start).toBe(0);
    expect(model.slices[1].start).toBe(model.slices[0].end);
    expect(model.slices.at(-1)!.end).toBeCloseTo(2 * Math.PI);
  });

  it('rings the centre between the inner and outer radius, inside the margins', () => {
    const model = donutModel({ ...DONUT, stats: buildStats() })!;
    expect(model.cx).toBe(140);
    expect(model.cy).toBe(140);
    // usable 280 - 24 = 256, radius 128
    expect(model.outer).toBeCloseTo(128 * 0.9);
    expect(model.inner).toBeCloseTo(128 * 0.6);
    for (const slice of model.slices) {
      const distance = Math.hypot(slice.labelX - model.cx, slice.labelY - model.cy);
      expect(distance).toBeCloseTo((model.outer + model.inner) / 2);
    }
  });

  it('skips zero-count bins (no slice)', () => {
    const model = donutModel({ ...DONUT, stats: withZeroBin() })!;
    expect(model.slices.map((slice) => slice.labelText)).toEqual(['5']);
    // the one slice is the whole ring: drawn as two closed circles (outer, then the hole), never as one
    // arc from a point back to itself, which SVG omits
    expect(model.slices[0].end - model.slices[0].start).toBeCloseTo(2 * Math.PI);
    expect(model.slices[0].d.match(/M /g)).toHaveLength(2);
    expect(model.slices[0].d.match(/A /g)).toHaveLength(4);
  });

  it('has the participant count for its centre', () => {
    expect(donutModel({ ...DONUT, stats: buildStats() })!.centerText).toBe('10');
  });

  it('has nothing to draw when count is zero', () => {
    expect(donutModel({ ...DONUT, stats: buildStats(EMPTY) })).toBeUndefined();
    expect(donutModel({ ...DONUT, stats: buildStats({ count: 0 }) })).toBeUndefined();
  });
});
