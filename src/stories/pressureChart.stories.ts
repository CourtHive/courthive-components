import { buildPressureSmallMultiples, sharedYDomain } from '../components/pressureChart/pressureSmallMultiples';
import { buildPathDifficultyBar } from '../components/pressureChart/pathDifficultyBar';
import { buildPressureSeries } from '../components/pressureChart/buildPressureSeries';
import { buildPressureChart } from '../components/pressureChart/pressureChart';
import { buildPressureTable } from '../components/pressureChart/pressureTable';
import { seededDraw } from './pressureChartFixture';

// constants and types
import type { PressureSeries } from '../components/pressureChart/types';

export default { title: 'Charts/Pressure' };

const MAX_WIDTH = '880px';

function panel(title: string, note?: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.padding = '1rem';
  wrapper.style.maxWidth = MAX_WIDTH;
  const heading = document.createElement('h3');
  heading.style.margin = '0 0 0.25rem';
  heading.style.font = '600 0.9rem system-ui, sans-serif';
  heading.textContent = title;
  wrapper.appendChild(heading);
  if (note) {
    const caption = document.createElement('p');
    caption.style.margin = '0 0 0.75rem';
    caption.style.font = '400 0.75rem system-ui, sans-serif';
    caption.style.opacity = '0.7';
    caption.textContent = note;
    wrapper.appendChild(caption);
  }
  return wrapper;
}

function pick(series: PressureSeries[], participantId?: string): PressureSeries {
  return series.find((entry) => entry.participantId === participantId) ?? series[0];
}

export const TopSeedPath = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'The top seed — what good seeding looks like',
    'Seeding exists to give the strongest player the easiest early road. That reads here as a curve well below the even line that climbs toward the final as the possible opponents get stronger.',
  );
  // Same domain as the UnseededPath story so the two can be read against each
  // other — the comparison the caption invites is only honest if the scales match.
  buildPressureChart(wrapper, pick(series, fixture.topSeedId), { scaleName, yDomain: sharedYDomain(series) });
  return wrapper;
};

export const UnseededPath = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'An unseeded player in the top seed’s half',
    'The same draw, the other side of the same coin: this player is projected to play up from the start. Compare the y-position against the story above — the two are on the same scale.',
  );
  buildPressureChart(wrapper, pick(series, fixture.unseededId), { scaleName, yDomain: sharedYDomain(series) });
  return wrapper;
};

export const ProjectedVsActual = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true, upsetsInRounds: [2] });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const champion = series.find((entry) => entry.points.at(-1)?.won === true) ?? series[0];
  const wrapper = panel(
    'Projected vs actual — results follow form, with one upset planted in round 2',
    'Marker fill is the scoreline: green competitive, blue routine, purple decisive. Position is difficulty, fill is closeness — two measures, one axis, never two scales.',
  );
  buildPressureChart(wrapper, champion, { scaleName });
  return wrapper;
};

export const UpsetVictim = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true, upsetsInRounds: [2] });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const beaten = series.find((entry) => entry.points.some((point) => point.won === false)) ?? series[0];
  const wrapper = panel(
    'A path that ends in an upset',
    'The line stops where the player was knocked out. The last marker is filled green — the scoreline was competitive — so this was a close loss to an opponent the draw rated as an even match, not a collapse.',
  );
  buildPressureChart(wrapper, beaten, { scaleName });
  return wrapper;
};

export const WithByes = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4, participantsCount: 12 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const withBye = series.find((entry) => entry.points.some((point) => point.bye)) ?? series[0];
  const wrapper = panel(
    'A path that opens with a bye',
    'Seeds get the byes, which is the point of them. A bye carries no opponent and so contributes no pressure.',
  );
  buildPressureChart(wrapper, withBye, { scaleName });
  return wrapper;
};

export const RankedPathDifficulty = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
  const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Ranked path difficulty — and a check that the seeding worked',
    'Sorted hardest slot first, diverging around an even match. In a correctly seeded draw the seeds fill the bottom of this list: they are the players projected to play down. Anyone appearing out of order is a seeding question worth asking.',
  );
  buildPathDifficultyBar(wrapper, series, { width: 560 });
  return wrapper;
};

export const RankedWithActual = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8, play: true, upsetsInRounds: [1, 3] });
  const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Ranked path difficulty against what was actually faced',
    'The bar is what the draw threatened; the tick is what the player actually met. The gap between them is the interesting part.',
  );
  buildPathDifficultyBar(wrapper, series, { width: 560, showActual: true });
  return wrapper;
};

export const SmallMultiples = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8, play: true, upsetsInRounds: [2] });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Small multiples — every player, one shared scale',
    'A grid, not a 32-series overlay: identity comes from the label, which leaves colour meaning only closeness. Ordered hardest slot first, so the shape of the field is legible top-left to bottom-right.',
  );
  buildPressureSmallMultiples(wrapper, series, { scaleName });
  return wrapper;
};

export const TableView = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true, upsetsInRounds: [2] });
  const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Table view',
    'Required, not optional: the chart encodes closeness as colour, which is exactly what a colour-blind or screen-reader user cannot recover.',
  );
  buildPressureTable(wrapper, pick(series, fixture.topSeedId));
  return wrapper;
};

export const UnratedField = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4, rated: false });
  const { series } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Unrated field — refuses rather than guesses',
    'A seeded draw with no ratings still produces no chart. A fabricated default would look identical to a real measurement, which is worse than nothing.',
  );
  buildPressureChart(wrapper, series[0]);
  buildPathDifficultyBar(wrapper, series);
  return wrapper;
};
