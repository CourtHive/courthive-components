/**
 * Pressure Horizon — the density companion to Charts/Pressure.
 *
 * These stories exist to be read against `Charts/Pressure`, not instead of it.
 * The pressure chart answers "how hard is THIS player's road, exactly"; the
 * horizon answers "what does the whole draw look like at once", and gives up
 * precise magnitude to do it. Both ship.
 *
 * The fixture is the same rating-seeded draw the pressure chart stories use, so
 * anything you can see in one view you can go and find in the other.
 */

import { buildPressureHorizon, HORIZON_ORDER, HORIZON_VARIANT } from '../components/pressureHorizon/pressureHorizon';
import { buildDrawOrderGame } from '../components/pressureHorizon/drawOrderGame';
import { buildPressureSeries } from '../components/pressureChart/buildPressureSeries';
import { buildPressureChart } from '../components/pressureChart/pressureChart';
import { HORIZON_SOURCE } from '../components/pressureHorizon/types';
import { seededDraw } from './pressureChartFixture';

// constants and types
import type { PressureSeries } from '../components/pressureChart/types';

export default { title: 'Charts/Pressure Horizon' };

const MAX_WIDTH = '900px';

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
    caption.style.lineHeight = '1.5';
    caption.style.opacity = '0.75';
    caption.textContent = note;
    wrapper.appendChild(caption);
  }
  return wrapper;
}

export const StackedDraw = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'A whole 32-draw, in draw order',
    'One 16px row per entrant, stacked in draw order so the sheet reads top to bottom. Red walls rise from the ' +
      'baseline (projected to play up), blue walls hang from the top (projected to play down); deeper and darker ' +
      'means a bigger rating gap. The seeded slots are the pale rows that darken toward the final — which is what ' +
      'seeding is for.'
  );
  buildPressureHorizon(wrapper, series, { scaleName, width: 560 });
  return wrapper;
};

export const RankedByDifficulty = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'The same draw, hardest slot first',
    'Re-sorted on slotDifficulty. Read this as a shape check, not a ranking: slotDifficulty is dominated by the ' +
      'participant’s own rating (Spearman -0.986 against it on a real 99-entrant field), so the order is close ' +
      'to the rating order inverted. What it does show honestly is the gradient — how steeply the road gets ' +
      'harder as you go down the field.'
  );
  buildPressureHorizon(wrapper, series, { scaleName, width: 560, order: HORIZON_ORDER.DIFFICULTY });
  return wrapper;
};

export const TightlyPacked = () => {
  const fixture = seededDraw({ drawSize: 64, seedsCount: 16 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'A 64-draw at 10px per row, labels off',
    'The density argument. Sixty-four paths in about the vertical space the detail chart spends on three, and the ' +
      'block structure of the bracket is visible as banding. Nothing here supports reading a number off a row — ' +
      'that is what the detail chart is for, and the rows are clickable for exactly that reason.'
  );
  buildPressureHorizon(wrapper, series, {
    scaleName,
    width: 620,
    rowHeight: 10,
    rowGap: 1,
    showLabels: false
  });
  return wrapper;
};

export const PlayedDraw = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4, play: true, upsetsInRounds: [2, 3] });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Difficulty actually faced',
    'The same encoding reading the played result where there is one and the projection where there is not. Compare ' +
      'against the projected view above: where a wall changed, the draw did not go to form.'
  );
  buildPressureHorizon(wrapper, series, { scaleName, width: 460, source: HORIZON_SOURCE.ACTUAL });
  return wrapper;
};

export const StackToDetail = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Density view into detail view',
    'The intended pairing of the two charts. Pick a row out of the stack and the pressure chart draws that path ' +
      'properly — real y-axis, projected ribbon narrowing as the draw resolves, scoreline closeness on the ' +
      'markers. The horizon finds the row; the chart explains it.'
  );

  const detail = document.createElement('div');
  detail.style.marginTop = '1rem';
  detail.style.minHeight = '260px';

  const render = (entry: PressureSeries) => {
    detail.replaceChildren();
    const name = document.createElement('div');
    name.style.font = '600 0.8rem system-ui, sans-serif';
    name.style.margin = '0 0 0.25rem';
    name.textContent = `${entry.drawPosition}. ${entry.participantName ?? entry.participantId}`;
    detail.appendChild(name);
    buildPressureChart(detail, entry, { scaleName });
  };

  buildPressureHorizon(wrapper, series, { scaleName, width: 520, onSelect: render });
  wrapper.appendChild(detail);
  render(series.find((entry) => entry.drawPosition === 1) ?? series[0]);
  return wrapper;
};

export const DrawOrderGame = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Rebuild the draw',
    'Sixteen anonymous paths from one real draw, shuffled. Drag them into the order you think the sheet was in, ' +
      'then check. The score counts groupings rather than slot numbers, because a draw sheet is mirror-symmetric ' +
      'and getting the bracket right with the halves swapped is a right answer.'
  );
  buildDrawOrderGame(wrapper, series, { scaleName, seed: 20260831, width: 420, rowHeight: 22 });
  return wrapper;
};

export const DrawOrderGameLarge = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Rebuild the draw — 32 paths',
    'The same puzzle at twice the size. More rows is more evidence as well as more work: with 32 paths the ' +
      'round-1 mirror pairs are easier to spot, because a wrong pairing has to be wrong in both directions at once.'
  );
  buildDrawOrderGame(wrapper, series, { scaleName, seed: 7, width: 460, rowHeight: 16 });
  return wrapper;
};

// ── Ribbon variant ────────────────────────────────────────────────────────

export const Ribbon = () => {
  const fixture = seededDraw({ drawSize: 32, seedsCount: 8 });
  const { series, scaleName, projection } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'The same 32-draw, as ribbons',
    'The line is the expected opponent; the shading is who could actually arrive — solid for the likely ' +
      'middle half, faint for the full range. Two things this shows that the walls cannot: the fan pinches ' +
      'to a point at R1, because the first opponent is already known, and a near-even matchup sits visibly ' +
      'on the centre line instead of collapsing to a 1px sliver.'
  );
  buildPressureHorizon(wrapper, series, {
    scaleName,
    projection,
    variant: HORIZON_VARIANT.RIBBON,
    width: 560
  });
  return wrapper;
};

export const RibbonVersusWalls = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
  const { series, scaleName, projection } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Walls and ribbon, same draw, same domain',
    'Read them against each other. The walls win on density — they stay legible at 10px, where the ribbon ' +
      'needs about 22px. The ribbon wins on continuity and on carrying the opponent spread at all. Neither ' +
      'replaces the other, which is why both ship.'
  );

  for (const [heading, variant] of [
    ['Walls', HORIZON_VARIANT.WALLS],
    ['Ribbon', HORIZON_VARIANT.RIBBON]
  ] as const) {
    const section = document.createElement('div');
    section.style.marginBottom = '1.25rem';
    const label = document.createElement('div');
    label.style.font = '600 0.75rem system-ui, sans-serif';
    label.style.margin = '0 0 0.375rem';
    label.textContent = heading;
    section.appendChild(label);
    buildPressureHorizon(section, series, { scaleName, projection, variant, width: 460, showLegend: false });
    wrapper.appendChild(section);
  }
  return wrapper;
};

export const RibbonUnweightedFan = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
  const { series, scaleName } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'The fan without the projection — deliberately worse',
    'Identical call with `projection` withheld, so the fan falls back to `opponentEloRange`: a min/max over ' +
      'everyone with a 1% chance of arriving. One long shot stretches it, so almost every row claims "could ' +
      'meet almost anyone" and the shading stops discriminating. The caption says so rather than letting the ' +
      'wider band imply more knowledge than there is.'
  );
  buildPressureHorizon(wrapper, series, { scaleName, variant: HORIZON_VARIANT.RIBBON, width: 460 });
  return wrapper;
};

export const RibbonDrawOrderGame = () => {
  const fixture = seededDraw({ drawSize: 16, seedsCount: 4 });
  const { series, scaleName, projection } = buildPressureSeries({ matchUps: fixture.matchUps });
  const wrapper = panel(
    'Rebuild the draw — ribbon board',
    'The gentler board. Mirror pairs read as reflected curves, which is much easier to spot than comparing ' +
      'wall depths, so this is the assist mode and the walls are the hard one.'
  );
  buildDrawOrderGame(wrapper, series, {
    scaleName,
    projection,
    variant: HORIZON_VARIANT.RIBBON,
    seed: 20260901,
    width: 420,
    rowHeight: 32
  });
  return wrapper;
};
