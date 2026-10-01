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
    }
  };
}

/**
 * That side's games in each set.
 *
 * ── The tiebreak as a RAISED digit, on the side that lost it, and nowhere else ──
 *
 * CA, 2026-09-30 (note 11/12): *"the free score and dial pad should be using superscript for the
 * tiebreak score (and only show the lower tiebreak score via superscript)"*. So a 7-6(3) reads `7`
 * above `6³`: the loser's points raised beside their games, and nothing beside the winner's — the
 * convention a printed draw sheet uses, and what Dynamic Sets shows once a set folds. The winner's
 * points used to appear too, as `7(7)`, which said nothing the `7` did not.
 *
 * A match tiebreak has no games to raise the points beside — its games are 0-0 by construction and its
 * cells ARE the points — so it reads plainly, `10` above `8`.
 *
 * A real `<sup>` rather than a Unicode superscript digit: `¹⁰` has to be composed from two glyphs, and
 * a tiebreak can easily run to two digits. Nothing at all rather than a row of zeroes when no score has
 * been entered — an empty column says "nothing yet" more honestly than `0 0 0` does.
 */
function write(element: HTMLElement, sideNumber: SideNumber, sets: SetScore[]): void {
  element.replaceChildren();
  const spoken: string[] = [];

  for (const [index, set] of sets.entries()) {
    const mine = sideNumber === 1 ? set.side1TiebreakScore : set.side2TiebreakScore;
    const theirs = sideNumber === 1 ? set.side2TiebreakScore : set.side1TiebreakScore;
    const games = sideNumber === 1 ? set.side1Score : set.side2Score;
    const matchTiebreak = !set.side1Score && !set.side2Score && mine !== undefined && theirs !== undefined;

    // `?? 0` and not `|| 0`: a genuine 0 is a set lost to love, and both reach here as a number.
    const base = String(matchTiebreak ? mine : (games ?? 0));
    // Only the LOWER of the two points shows. When only one was recorded it is the loser's, because
    // that is what a score line carries.
    const raised = !matchTiebreak && mine !== undefined && (theirs === undefined || mine < theirs);

    if (index > 0) element.append('  ');
    element.append(base);
    if (raised) {
      const mark = document.createElement('sup');
      mark.className = 'chc-sec-tb-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = String(mine);
      element.append(mark);
    }
    spoken.push(raised ? `${base} tiebreak ${mine}` : base);
  }

  // The accessible name carries the whole sentence, because `6  6` read aloud is not a score, and a
  // raised `3` read after a `6` is two numbers with no stated relationship.
  element.setAttribute(
    'aria-label',
    spoken.length ? `Side ${sideNumber}: ${spoken.join(', ')}` : `Side ${sideNumber}: no score`
  );
}
