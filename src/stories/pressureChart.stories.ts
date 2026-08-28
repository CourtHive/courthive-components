import { buildPressureSmallMultiples } from '../components/pressureChart/pressureSmallMultiples';
import { buildPathDifficultyBar } from '../components/pressureChart/pathDifficultyBar';
import { buildPressureSeries } from '../components/pressureChart/buildPressureSeries';
import { buildPressureChart } from '../components/pressureChart/pressureChart';
import { buildPressureTable } from '../components/pressureChart/pressureTable';

// constants and types
import { mocksEngine, tournamentEngine } from 'tods-competition-factory';
import type { PressureSeries } from '../components/pressureChart/types';

export default { title: 'Charts/Pressure' };

const CFS_PARTICIPANTS_PROFILE = {
  convertExtensions: true,
  withScaleValues: true,
  withGroupings: true,
};

/**
 * Seeded exactly the way courthive-public receives a draw: `withScaleValues` is
 * load-bearing, because without it `participant.ratings` is present but empty.
 */
function seededMatchUps({
  drawSize = 16,
  participantsCount,
  completeAllMatchUps = false,
  rated = true,
}: {
  drawSize?: number;
  participantsCount?: number;
  completeAllMatchUps?: boolean;
  rated?: boolean;
} = {}): any[] {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize, participantsCount, drawType: 'SINGLE_ELIMINATION' }],
    participantsProfile: { category: { ratingType: 'WTN' } },
    completeAllMatchUps,
    setState: true,
    nonRandom: 1,
  });
  const { eventData }: any = tournamentEngine.getEventData({
    eventId: tournamentRecord.events[0].eventId,
    participantsProfile: rated ? CFS_PARTICIPANTS_PROFILE : { withGroupings: true },
    contextProfile: { withCompetitiveness: true },
    hydrateParticipants: true,
  });
  return Object.values(eventData.drawsData[0].structures[0].roundMatchUps).flat() as any[];
}

function panel(title: string, note?: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.padding = '1rem';
  wrapper.style.maxWidth = '860px';
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

function hardestSlot(series: PressureSeries[]): PressureSeries {
  return series
    .filter((entry) => entry.slotDifficulty !== null)
    .toSorted((a, b) => (b.slotDifficulty as number) - (a.slotDifficulty as number))[0];
}

export const ProjectedOnly = () => {
  const { series, scaleName } = buildPressureSeries({ matchUps: seededMatchUps() });
  const wrapper = panel(
    'Projected path — draw made, nothing played',
    'The band spans the opponents who could arrive; it narrows round by round and collapses to a point once the opponent is known.',
  );
  buildPressureChart(wrapper, hardestSlot(series), { scaleName });
  return wrapper;
};

export const ProjectedVsActual = () => {
  const { series, scaleName } = buildPressureSeries({
    matchUps: seededMatchUps({ completeAllMatchUps: true }),
  });
  const champion = series.find((entry) => entry.points.at(-1)?.won === true) ?? series[0];
  const wrapper = panel(
    'Projected vs actual — completed draw',
    'Marker fill is the scoreline: green competitive, blue routine, purple decisive. Position is difficulty; fill is closeness. Never a second axis.',
  );
  buildPressureChart(wrapper, champion, { scaleName });
  return wrapper;
};

export const WithByes = () => {
  const { series, scaleName } = buildPressureSeries({
    matchUps: seededMatchUps({ drawSize: 16, participantsCount: 12 }),
  });
  const withBye = series.find((entry) => entry.points.some((point) => point.bye)) ?? series[0];
  const wrapper = panel('A path that opens with a bye', 'A bye carries no opponent and so contributes no pressure.');
  buildPressureChart(wrapper, withBye, { scaleName });
  return wrapper;
};

export const RankedPathDifficulty = () => {
  const { series } = buildPressureSeries({ matchUps: seededMatchUps({ drawSize: 32 }) });
  const wrapper = panel(
    'Ranked path difficulty — the all-players entry point',
    'Diverging around an even match: right = this slot must play up. Sorted on slot difficulty, which is what exposes draw imbalance.',
  );
  buildPathDifficultyBar(wrapper, series, { width: 520 });
  return wrapper;
};

export const RankedWithActual = () => {
  const { series } = buildPressureSeries({
    matchUps: seededMatchUps({ drawSize: 32, completeAllMatchUps: true }),
  });
  const wrapper = panel(
    'Ranked path difficulty with what was actually faced',
    'The tick marks the difficulty actually met, against the projected bar.',
  );
  buildPathDifficultyBar(wrapper, series, { width: 520, showActual: true });
  return wrapper;
};

export const SmallMultiples = () => {
  const { series, scaleName } = buildPressureSeries({
    matchUps: seededMatchUps({ drawSize: 32, completeAllMatchUps: true }),
  });
  const wrapper = panel(
    'Small multiples — every player, one shared scale',
    'A grid, not a 32-series overlay: identity comes from the label, so colour keeps meaning only closeness.',
  );
  buildPressureSmallMultiples(wrapper, series, { scaleName });
  return wrapper;
};

export const TableView = () => {
  const { series } = buildPressureSeries({ matchUps: seededMatchUps({ completeAllMatchUps: true }) });
  const wrapper = panel(
    'Table view',
    'Required, not optional: the chart encodes closeness as colour, which is exactly what a colour-blind or screen-reader user cannot recover.',
  );
  buildPressureTable(wrapper, series[0]);
  return wrapper;
};

export const UnratedField = () => {
  const { series } = buildPressureSeries({ matchUps: seededMatchUps({ rated: false }) });
  const wrapper = panel(
    'Unrated field — refuses rather than guesses',
    'No ratings means no chart. A fabricated default would look identical to a real measurement, which is worse than nothing.',
  );
  buildPressureChart(wrapper, series[0]);
  buildPathDifficultyBar(wrapper, series);
  return wrapper;
};
