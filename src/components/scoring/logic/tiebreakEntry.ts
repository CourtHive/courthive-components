/**
 * Entering a set that IS a tiebreak — a match tiebreak.
 *
 * CA, 2026-09-28: *"For tiebreaks the lower score should always be entered first. that could be 1 then
 * 1 or shift+1 then shift+1; if the lower score is equal to or greater than the tiebreakTo value, the
 * complement is +2."*
 *
 * ── What that rule removes ──
 *
 * A tiebreak-only set has two cells and no games to say who won, so a keypad alternating between them
 * cannot tell `1` then `0` (a ten) from `1` then `0` (a one and a nothing). Every way of guessing is
 * wrong for some real score: an earlier attempt allowed a second digit only where the pair landed near
 * the target, which read `10-8` correctly and read the perfectly legal `10-1` as an eleven.
 *
 * CA's rule deletes the ambiguity rather than narrowing it. **The operator types ONE number — the lower
 * score — and the winner's is derived.** So digits simply accumulate into the cell being typed, `1`
 * then `1` is eleven because nothing else could be meant by it, and `Shift` chooses which row the lower
 * score belongs to rather than which row the next digit lands in.
 *
 * ── The complement is the factory's, and CA's rule is exactly what it computes ──
 *
 * Measured 2026-09-28 across TB7 (low 0–11) and TB10 (low 0–14): `getTiebreakComplement` returns
 * `max(tiebreakTo, lowValue + 2)` at every value, with no exceptions. CA's *"equal to or greater than
 * the tiebreakTo value → +2"* is the upper half of that, and the lower half is the win-by-2 margin
 * doing the same job one step earlier — in a TB7 a low of **6** completes to **8**, not to 7, because
 * 7-6 is not a tiebreak anyone won.
 *
 * So this delegates and does not restate the arithmetic. A local `Math.max` would agree today and would
 * be a second copy of a rule the factory owns — which is how the three entry approaches came to
 * disagree about everything else.
 */

import { scoreGovernor } from 'tods-competition-factory';
import { isSetTiebreakOnly } from './dynamicSetsLogic';

import type { SetFormat } from './dynamicSetsLogic';
import type { SideNumber } from './scoreEntryState';

/** The points a tiebreak-only set is played to, or `undefined` if this set is not one. */
export function tiebreakOnlyTarget(setFormat?: SetFormat): number | undefined {
  return isSetTiebreakOnly(setFormat) ? setFormat?.tiebreakSet?.tiebreakTo : undefined;
}

/**
 * Both sides' points, from the LOWER score and the side it was entered on.
 *
 * `undefined` when the set carries no target to complete against, or when the factory declines — never
 * a guess. The caller leaves what was typed alone in that case rather than inventing the other half.
 */
export function completeTiebreakOnly(
  lowValue: number,
  lowSide: SideNumber,
  setFormat?: SetFormat
): { side1: number; side2: number } | undefined {
  const tiebreakTo = tiebreakOnlyTarget(setFormat);
  if (tiebreakTo === undefined || !Number.isFinite(lowValue)) return undefined;

  const pair = scoreGovernor.getTiebreakComplement({
    lowValue,
    tiebreakTo,
    // `tiebreakNoAd`, and NOT `noAd`. Measured 2026-09-28: a low of 6 in a TB7 returns `[6, 8]` with
    // `noAd: true` — identical to passing nothing — and `[6, 7]` with `tiebreakNoAd: true`. The wrong
    // name is accepted silently and does nothing, which is the shape that ships a dead field.
    tiebreakNoAd: setFormat?.tiebreakSet?.noAd,
    // `isSide1` says which slot the LOW value occupies: `true` gives `[low, high]`.
    isSide1: lowSide === 1
  });
  if (!pair) return undefined;

  const [side1, side2] = pair;
  if (side1 === undefined || side2 === undefined) return undefined;

  return { side1, side2 };
}
