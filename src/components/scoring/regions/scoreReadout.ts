/**
 * The read-only per-side score readout, shared by Free Score and the Dial Pad.
 *
 * Both artboards put the same thing in the participant rows: not inputs, but a quiet run of that
 * side's set scores — `6  6` above `4  3` — with the entry surface below (a text field, or a keypad).
 * The rows stop being where you type and become where you READ, which is what lets one card carry
 * three quite different entry mechanics without the rows changing shape.
 *
 * ── Why this is a registry and not just a render function ──
 *
 * The card's `refresh` deliberately does NOT re-render the rows, because doing so would replace the
 * input being typed into and cost the caret. The consequence is that a region which puts anything LIVE
 * in the rows has to update it itself, in place — and a readout is exactly that. A plain
 * render-once function left both regions showing an empty readout however much was typed, which is how
 * this came to be a registry: six tests failed on `expected '' to contain '6'`.
 *
 * Shared rather than written twice because the two regions must agree. Same column, same grid position,
 * same heading-less header; two copies of "render a side's games" is how the set-entry approaches came
 * to disagree about everything else.
 */

import type { SideNumber } from '../logic/scoreEntryState';
import type { SetScore } from '../types';

/** The track width for the readout column, matching the artboards. */
export const READOUT_COLUMN_WIDTH = '200px';

export type ScoreReadouts = {
  /** The cell for a side's row. Registers it, so later `update` calls reach it. */
  cell: (sideNumber: SideNumber, sets: SetScore[]) => HTMLElement;
  /** Rewrite every registered readout from the current sets. */
  update: (sets: SetScore[]) => void;
};

export function createScoreReadouts(): ScoreReadouts {
  const cells = new Map<SideNumber, HTMLElement>();

  return {
    cell(sideNumber, sets) {
      const element = document.createElement('div');
      element.className = 'chc-sec-readout';
      element.dataset.readoutSide = String(sideNumber);
      write(element, sideNumber, sets);
      // Replaces any earlier element for this side: the card rebuilds the rows on a full render, and
      // the newest element is the one actually in the document.
      cells.set(sideNumber, element);
      return element;
    },
    update(sets) {
      for (const [sideNumber, element] of cells) write(element, sideNumber, sets);
    },
  };
}

/**
 * That side's games in each set.
 *
 * A tiebreak shows as a parenthetical on the side that lost it, the convention every score line in the
 * ecosystem uses. Nothing at all rather than a row of zeroes when no score has been entered — an empty
 * column says "nothing yet" more honestly than `0 0 0` does.
 */
function write(element: HTMLElement, sideNumber: SideNumber, sets: SetScore[]): void {
  const games = sets.map((set) => {
    const score = sideNumber === 1 ? set.side1Score : set.side2Score;
    const tiebreak = sideNumber === 1 ? set.side1TiebreakScore : set.side2TiebreakScore;
    // `?? 0` and not `|| 0`: a genuine 0 is a set lost to love, and both reach here as a number.
    const base = String(score ?? 0);
    return tiebreak === undefined ? base : `${base}(${tiebreak})`;
  });

  element.textContent = games.join('  ');
  // The accessible name carries the whole sentence, because `6  6` read aloud is not a score.
  element.setAttribute(
    'aria-label',
    games.length ? `Side ${sideNumber}: ${games.join(', ')}` : `Side ${sideNumber}: no score`,
  );
}
