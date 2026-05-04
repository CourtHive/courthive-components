// @vitest-environment happy-dom
import { buildRatingDistributionChart } from '../ratingDistributionChart';
import { expect, it, describe } from 'vitest';

// constants and types
import { RatingDistributionStats } from 'tods-competition-factory';

const BAR_SELECTOR = 'rect.chc-rdc-bar';
const COUNT_LABEL_SELECTOR = 'text.chc-rdc-count';
const MEAN_LINE_SELECTOR = 'line.chc-rdc-mean';
const SLICE_SELECTOR = 'path.chc-rdc-slice';

function buildStats(overrides: Partial<RatingDistributionStats> = {}): RatingDistributionStats {
  return {
    histogram: [
      { binStart: 4, binEnd: 4.5, count: 3 },
      { binStart: 4.5, binEnd: 5, count: 5 },
      { binStart: 5, binEnd: 5.5, count: 2 },
    ],
    gaps: [],
    count: 10,
    mean: 4.65,
    median: 4.65,
    stddev: 0.4,
    iqr: 0.5,
    min: 4,
    max: 5.5,
    ...overrides,
  };
}

describe('buildRatingDistributionChart — output shape', () => {
  it('returns an SVGSVGElement with the chc-rating-distribution-chart class', () => {
    const svg = buildRatingDistributionChart(buildStats());
    expect(svg.tagName.toLowerCase()).toEqual('svg');
    expect(svg.classList.contains('chc-rating-distribution-chart')).toBe(true);
  });

  it('defaults to HISTOGRAM mode with sensible default dimensions', () => {
    const svg = buildRatingDistributionChart(buildStats());
    expect(Number(svg.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(0);
    expect(svg.querySelectorAll(BAR_SELECTOR).length).toEqual(3);
  });

  it('defaults aria-label can be overridden', () => {
    const labeled = buildRatingDistributionChart(buildStats(), { ariaLabel: 'Pool A distribution' });
    expect(labeled.getAttribute('aria-label')).toEqual('Pool A distribution');
  });
});

describe('buildRatingDistributionChart — HISTOGRAM mode', () => {
  it('renders one bar per histogram bin', () => {
    const svg = buildRatingDistributionChart(buildStats(), { mode: 'HISTOGRAM' });
    const bars = svg.querySelectorAll(BAR_SELECTOR);
    expect(bars.length).toEqual(3);
  });

  it('respects showCounts=false (no count labels)', () => {
    const svg = buildRatingDistributionChart(buildStats(), { showCounts: false });
    expect(svg.querySelectorAll(COUNT_LABEL_SELECTOR).length).toEqual(0);
  });

  it('shows count labels by default', () => {
    const svg = buildRatingDistributionChart(buildStats(), { showCounts: true });
    expect(svg.querySelectorAll(COUNT_LABEL_SELECTOR).length).toEqual(3);
  });

  it('omits zero-count text labels (empty string)', () => {
    const stats = buildStats({
      histogram: [
        { binStart: 4, binEnd: 4.5, count: 0 },
        { binStart: 4.5, binEnd: 5, count: 5 },
      ],
      count: 5,
    });
    const svg = buildRatingDistributionChart(stats);
    const labels = Array.from(svg.querySelectorAll(COUNT_LABEL_SELECTOR)).map((n) => n.textContent ?? '');
    expect(labels).toContain('');
    expect(labels).toContain('5');
  });

  it('renders the mean reference line when mean is within histogram range', () => {
    const svg = buildRatingDistributionChart(buildStats());
    const meanLines = svg.querySelectorAll(MEAN_LINE_SELECTOR);
    expect(meanLines.length).toEqual(1);
  });

  it('omits the mean line when mean is outside histogram range', () => {
    const svg = buildRatingDistributionChart(buildStats({ mean: 7 }));
    expect(svg.querySelectorAll(MEAN_LINE_SELECTOR).length).toEqual(0);
  });

  it('omits the mean line when showMean=false', () => {
    const svg = buildRatingDistributionChart(buildStats(), { showMean: false });
    expect(svg.querySelectorAll(MEAN_LINE_SELECTOR).length).toEqual(0);
  });

  it('respects custom binColor function', () => {
    const svg = buildRatingDistributionChart(buildStats(), { binColor: () => '#ff00ff' });
    const bars = svg.querySelectorAll(BAR_SELECTOR);
    bars.forEach((bar) => expect(bar.getAttribute('fill')).toEqual('#ff00ff'));
  });

  it('returns an empty chart shell when histogram is empty', () => {
    const svg = buildRatingDistributionChart(buildStats({ histogram: [], count: 0, mean: 0 }));
    expect(svg.querySelectorAll(BAR_SELECTOR).length).toEqual(0);
  });
});

describe('buildRatingDistributionChart — DONUT mode', () => {
  it('renders one slice path per non-empty bin', () => {
    const svg = buildRatingDistributionChart(buildStats(), { mode: 'DONUT' });
    const slices = svg.querySelectorAll(SLICE_SELECTOR);
    expect(slices.length).toEqual(3);
  });

  it('skips zero-count bins (no slice rendered)', () => {
    const stats = buildStats({
      histogram: [
        { binStart: 4, binEnd: 4.5, count: 0 },
        { binStart: 4.5, binEnd: 5, count: 5 },
      ],
      count: 5,
    });
    const svg = buildRatingDistributionChart(stats, { mode: 'DONUT' });
    expect(svg.querySelectorAll(SLICE_SELECTOR).length).toEqual(1);
  });

  it('renders a center text label with the participant count', () => {
    const svg = buildRatingDistributionChart(buildStats(), { mode: 'DONUT' });
    const center = svg.querySelector('text.chc-rdc-center-count');
    expect(center?.textContent).toEqual('10');
  });

  it('renders one slice-count label per slice when showCounts=true', () => {
    const svg = buildRatingDistributionChart(buildStats(), { mode: 'DONUT', showCounts: true });
    expect(svg.querySelectorAll('text.chc-rdc-slice-label').length).toEqual(3);
  });

  it('omits slice-count labels when showCounts=false', () => {
    const svg = buildRatingDistributionChart(buildStats(), { mode: 'DONUT', showCounts: false });
    expect(svg.querySelectorAll('text.chc-rdc-slice-label').length).toEqual(0);
  });

  it('returns an empty chart shell when count is zero', () => {
    const svg = buildRatingDistributionChart(buildStats({ histogram: [], count: 0, mean: 0 }), { mode: 'DONUT' });
    expect(svg.querySelectorAll(SLICE_SELECTOR).length).toEqual(0);
  });
});
