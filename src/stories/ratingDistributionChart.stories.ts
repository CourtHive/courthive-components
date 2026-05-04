import { buildRatingDistributionChart } from '../components/ratingDistributionChart';

// constants and types
import { RatingDistributionStats } from 'tods-competition-factory';

export default { title: 'Charts/Rating Distribution' };

const tightPool: RatingDistributionStats = {
  histogram: [
    { binStart: 4, binEnd: 4.5, count: 4 },
    { binStart: 4.5, binEnd: 5, count: 7 },
    { binStart: 5, binEnd: 5.5, count: 9 },
    { binStart: 5.5, binEnd: 6, count: 6 },
    { binStart: 6, binEnd: 6.5, count: 2 },
  ],
  gaps: [],
  count: 28,
  mean: 5.1,
  median: 5.0,
  stddev: 0.5,
  iqr: 0.7,
  min: 4,
  max: 6.5,
};

const widePool: RatingDistributionStats = {
  histogram: [
    { binStart: 3, binEnd: 3.5, count: 2 },
    { binStart: 3.5, binEnd: 4, count: 4 },
    { binStart: 4, binEnd: 4.5, count: 6 },
    { binStart: 4.5, binEnd: 5, count: 4 },
    { binStart: 5, binEnd: 5.5, count: 5 },
    { binStart: 5.5, binEnd: 6, count: 7 },
    { binStart: 6, binEnd: 6.5, count: 4 },
    { binStart: 6.5, binEnd: 7, count: 2 },
  ],
  gaps: [],
  count: 34,
  mean: 4.95,
  median: 5,
  stddev: 1.05,
  iqr: 1.5,
  min: 3,
  max: 7,
};

const bimodalPool: RatingDistributionStats = {
  histogram: [
    { binStart: 3, binEnd: 3.5, count: 6 },
    { binStart: 3.5, binEnd: 4, count: 5 },
    { binStart: 4, binEnd: 4.5, count: 1 },
    { binStart: 4.5, binEnd: 5, count: 0 },
    { binStart: 5, binEnd: 5.5, count: 0 },
    { binStart: 5.5, binEnd: 6, count: 4 },
    { binStart: 6, binEnd: 6.5, count: 7 },
    { binStart: 6.5, binEnd: 7, count: 3 },
  ],
  gaps: [{ start: 4.4, end: 5.7, size: 1.3 }],
  count: 26,
  mean: 4.85,
  median: 5,
  stddev: 1.4,
  iqr: 2.5,
  min: 3,
  max: 7,
};

function withCaption(svg: SVGSVGElement, caption: string): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 24px; background: var(--chc-bg-secondary, #f7f7f9); display: inline-block;';
  container.appendChild(svg);
  const p = document.createElement('p');
  p.textContent = caption;
  p.style.cssText = 'color: var(--chc-text-secondary, #555); margin: 8px 0 0; font-size: 13px;';
  container.appendChild(p);
  return container;
}

export const HistogramTightPool = {
  render: () => withCaption(buildRatingDistributionChart(tightPool), '28 participants, narrow rating spread'),
};

export const HistogramWidePool = {
  render: () => withCaption(buildRatingDistributionChart(widePool), '34 participants, wide rating spread'),
};

export const HistogramBimodal = {
  render: () =>
    withCaption(
      buildRatingDistributionChart(bimodalPool),
      '26 participants, bimodal — gap visible between juniors and adults',
    ),
};

export const HistogramCompact = {
  render: () =>
    withCaption(
      buildRatingDistributionChart(tightPool, { width: 320, height: 140, showAxis: false }),
      'Compact / no-axis variant for sidebar embedding',
    ),
};

export const DonutTightPool = {
  render: () => withCaption(buildRatingDistributionChart(tightPool, { mode: 'DONUT' }), '28 participants — donut mode'),
};

export const DonutWidePool = {
  render: () => withCaption(buildRatingDistributionChart(widePool, { mode: 'DONUT' }), '34 participants — donut mode'),
};

export const DonutCompact = {
  render: () =>
    withCaption(
      buildRatingDistributionChart(tightPool, { mode: 'DONUT', width: 200, showCounts: false }),
      'Compact donut — labels suppressed',
    ),
};

export const Empty = {
  render: () =>
    withCaption(
      buildRatingDistributionChart({
        histogram: [],
        gaps: [],
        count: 0,
        mean: 0,
        median: 0,
        stddev: 0,
        iqr: 0,
        min: 0,
        max: 0,
      }),
      'Empty pool — graceful no-data render',
    ),
};
