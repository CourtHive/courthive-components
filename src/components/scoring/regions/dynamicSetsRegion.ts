/**
 * The Dynamic Sets score region: one input per set per side, inside the card's participant rows.
 *
 * ── What a region is, and what it must not be ──
 *
 * The card owns the header, the participant rows, the endings groups, the result band and the footer.
 * A region owns ONLY the score. This one is the only region that fills cells inside the rows
 * (`rowCells`) rather than rendering a block beneath them, because per-set entry is a grid and the
 * participant names are its row headers.
 *
 * It computes no outcome. Every judgement it reports — is this set complete, who won it, is the match
 * complete, who won that, what does a typed digit imply for the other side — comes from
 * `dynamicSetsLogic.ts`, which was extracted for exactly this and is independently tested. If a rule
 * appears here it is in the wrong file, the same standing rule the card follows.
 *
 * ── Smart complements lives here, deliberately ──
 *
 * It is a Dynamic Sets behaviour and nothing else reads it, so the toggle sits in the region it
 * governs rather than in the card's shared chrome, where its presence would imply it applied to Free
 * Score and the Dial Pad too. `shouldApplySmartComplement` already takes the enabled flag as a
 * parameter, so this needs no cooperation from the card.
 *
 * The checkbox carries NO explanatory sub-text (CA, 2026-09-27). The draft said "type 6 → fills 6-4",
 * which is both clutter and backwards: `calculateComplement(6)` returns null — a 6 is ambiguous, it
 * could end 6-0 through 6-4 — while `calculateComplement(4)` returns 6.
 *
 * ── Why it never asks the card to re-render ──
 *
 * `onChange` calls the card's `refresh`, which updates the band and the submit gate and deliberately
 * does NOT rebuild the rows. Were it a full render, `rowCells` would be called again on every
 * keystroke and replace the very input being typed into — the value would survive, because this module
 * holds it, but focus and the caret would not.
 */

import {
  shouldApplySmartComplement,
  getSetFormatForIndex,
  isSetTiebreakOnly,
  matchUpConfigFor,
  getMatchWinner,
  isMatchComplete,
  buildSetScore,
  getSetWinner,
} from '../logic/dynamicSetsLogic';

import { ordinalSetLabel } from './setColumns';

import type { SideNumber } from '../logic/scoreEntryState';
import type { ScoreRegion } from '../scoreEntryCard';
import type { SetScore } from '../types';

export type DynamicSetsRegionParams = {
  matchUpFormat?: string;
  /** Sets already recorded, e.g. from a saved matchUp. Copied, never mutated. */
  sets?: SetScore[];
  /** Whether smart complements starts enabled. Defaults to on, which is the existing behaviour. */
  smartComplements?: boolean;
  /** Label for the smart-complements toggle, so a locale can supply it. */
  smartComplementsLabel?: string;
  /** Called after any change to the score. Wire this to the card's `refresh`. */
  onChange?: () => void;
};

export type DynamicSetsRegion = ScoreRegion & {
  /** The sets as they currently stand, for submission. A copy. */
  getSets: () => SetScore[];
  /** Whether smart complements is currently on. */
  smartComplementsEnabled: () => boolean;
};

export function createDynamicSetsRegion(params: DynamicSetsRegionParams): DynamicSetsRegion {
  const config = matchUpConfigFor(params.matchUpFormat);
  const setCount = config.exactly ?? config.bestOf;

  /**
   * Raw typed text per set per side, NOT parsed numbers.
   *
   * Kept as strings because an empty field and a zero are different things: `''` is "not entered" and
   * `'0'` is "lost that set to love". Storing numbers would make the two indistinguishable and a
   * cleared field would read as 0-0, which `isSetComplete` would then have an opinion about.
   */
  const typed: Record<string, string> = {};
  /** Tiebreak text per set, where the format has a tiebreak. */
  const tiebreaks: Record<number, string> = {};
  /**
   * Which sets have already had a complement applied.
   *
   * `shouldApplySmartComplement` needs this to fire once per set: without it, correcting a complement
   * by hand would have the correction complemented in turn, so the operator could never overrule it.
   */
  const complementsUsed = new Set<number>();
  let smartComplements = params.smartComplements !== false;

  seedFromSets(params.sets);

  /**
   * The live input element per cell, so a smart complement can write into the SIBLING cell.
   *
   * Note what this is NOT for. An earlier version returned a cached element from `cellFor` on the
   * reasoning that it kept focus across the card's `refresh`. That was false and the plant proved it:
   * removing the cache broke no test, because `refresh` updates only the band and the submit gate and
   * never calls `rowCells`. The caret is protected by the CARD, one layer up — see `refreshDerived` in
   * `scoreEntryCard.ts`. Keeping a cache here would have been dead code with a confident wrong comment
   * on it, which is worse than no comment.
   *
   * The map is still needed: `applyComplement` has to reach the opposing cell it did not receive the
   * keystroke in.
   */
  const inputs = new Map<string, HTMLInputElement>();

  const region: DynamicSetsRegion = {
    columns: () => Array.from({ length: setCount }, (_, index) => ({ heading: ordinalSetLabel(index + 1) })),
    rowCells: (sideNumber) => Array.from({ length: setCount }, (_, index) => cellFor(sideNumber, index)),
    block: () => smartComplementsToggle(),
    scoreString: () => formatScore(),
    isComplete: () => isMatchComplete(currentSets(), config.bestOf, config.exactly),
    winningSide: () => getMatchWinner(currentSets(), config.bestOf, config.exactly),
    getSets: () => currentSets(),
    smartComplementsEnabled: () => smartComplements,
  };

  return region;

  // ── State ────────────────────────────────────────────────────────────

  function key(sideNumber: SideNumber, setIndex: number): string {
    return `${setIndex}:${sideNumber}`;
  }

  function seedFromSets(sets?: SetScore[]): void {
    for (const [index, set] of (sets ?? []).entries()) {
      // `?? ''` and not `|| ''`: a legitimate 0 must survive seeding, and `0 || ''` is `''`.
      typed[key(1, index)] = set.side1Score === undefined ? '' : String(set.side1Score);
      typed[key(2, index)] = set.side2Score === undefined ? '' : String(set.side2Score);
      const tiebreak = set.side1TiebreakScore ?? set.side2TiebreakScore;
      if (tiebreak !== undefined) tiebreaks[index] = String(tiebreak);
    }
  }

  /**
   * The sets implied by what is typed, trailing empty sets dropped.
   *
   * Trailing empties are dropped because `isMatchComplete` counts sets: a best-of-3 that is 6-4 6-3
   * with an untouched third column is COMPLETE, and handing it a third empty set would make it look
   * like a match still in progress.
   */
  function currentSets(): SetScore[] {
    const built: SetScore[] = [];
    for (let index = 0; index < setCount; index += 1) {
      const side1 = typed[key(1, index)] ?? '';
      const side2 = typed[key(2, index)] ?? '';
      if (!side1 && !side2) continue;
      built.push(buildSetScore(index, side1, side2, tiebreaks[index], config));
    }
    return built;
  }

  // ── Rendering ────────────────────────────────────────────────────────

  function cellFor(sideNumber: SideNumber, setIndex: number): HTMLInputElement {
    const cellKey = key(sideNumber, setIndex);

    // A fresh element every call, seeded from `typed`. The card only calls this on a full render (mount
    // and any ending change), never while typing, so there is nothing to preserve and the value comes
    // back from state regardless.
    const input = document.createElement('input');
    input.type = 'text';
    // `inputMode` rather than `type="number"`: a number input on iOS shows a keypad but also spinners,
    // and it silently accepts `1e3` and `-` which a games column has no meaning for.
    input.inputMode = 'numeric';
    input.className = 'chc-sec-set-input';
    input.value = typed[cellKey] ?? '';
    input.dataset.side = String(sideNumber);
    input.dataset.set = String(setIndex + 1);
    // The visible heading is a bare ordinal (`1st`), which a screen reader would read out of context.
    // The accessible name says the whole thing.
    input.setAttribute('aria-label', `${ordinalSetLabel(setIndex + 1)} set, side ${sideNumber} games`);

    input.addEventListener('input', () => onTyped(sideNumber, setIndex, input));
    inputs.set(cellKey, input);
    return input;
  }

  function onTyped(sideNumber: SideNumber, setIndex: number, input: HTMLInputElement): void {
    // Keep digits only. Done here rather than by validation later, because a rejected character that
    // stays in the field reads as accepted.
    const cleaned = input.value.replace(/\D/g, '');
    if (cleaned !== input.value) input.value = cleaned;

    typed[key(sideNumber, setIndex)] = cleaned;

    if (cleaned.length) applyComplement(sideNumber, setIndex, Number(cleaned));

    params.onChange?.();
  }

  /**
   * Fill the opposing cell from a typed digit, where the format makes it unambiguous.
   *
   * `shouldApplySmartComplement` decides — including refusing when the digit has no single complement
   * and when this set has already had one. `field1Value` is the side that was typed into and
   * `field2Value` its opponent, so the mapping here is by which cell received the keystroke, never by
   * side number.
   */
  function applyComplement(sideNumber: SideNumber, setIndex: number, digit: number): void {
    if (!smartComplements) return;

    const result = shouldApplySmartComplement(
      digit,
      false,
      setIndex,
      currentSets(),
      config,
      complementsUsed,
      smartComplements,
    );
    if (!result.shouldApply) return;

    const otherSide: SideNumber = sideNumber === 1 ? 2 : 1;
    const otherKey = key(otherSide, setIndex);
    typed[otherKey] = String(result.field2Value);

    const otherInput = inputs.get(otherKey);
    if (otherInput) otherInput.value = typed[otherKey];

    complementsUsed.add(setIndex);
  }

  function smartComplementsToggle(): HTMLElement {
    const label = document.createElement('label');
    label.className = 'chc-sec-smart';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = smartComplements;
    box.dataset.action = 'smartComplements';
    box.addEventListener('change', () => {
      smartComplements = box.checked;
      // Turning it back on must not immediately complement sets already entered by hand, so the
      // per-set record is cleared rather than preserved: the next digit typed in a set is the one that
      // gets a complement, which is what an operator re-enabling it is asking for.
      complementsUsed.clear();
      params.onChange?.();
    });

    const text = document.createElement('span');
    // No sub-text explaining the mechanic (CA, 2026-09-27) — it was clutter, and the draft had the
    // rule backwards.
    text.textContent = params.smartComplementsLabel ?? 'Smart complements';

    label.append(box, text);
    return label;
  }

  // ── The score as text, for the result band ───────────────────────────

  /**
   * The sets as `6-4 6-3`, with a tiebreak in parentheses on the set it belongs to.
   *
   * Built from the same `currentSets()` the outcome uses, so the band can never quote a score that
   * differs from the one being submitted — which is the whole point of the band.
   */
  function formatScore(): string | undefined {
    const sets = currentSets();
    if (!sets.length) return undefined;

    return sets
      .map((set, index) => {
        const side1 = set.side1Score ?? 0;
        const side2 = set.side2Score ?? 0;
        const setFormat = getSetFormatForIndex(index, config);

        // A tiebreak-only set IS its tiebreak; there is no games score to bracket.
        if (isSetTiebreakOnly(setFormat)) return `${side1}-${side2}`;

        const base = `${side1}-${side2}`;
        const tiebreak = set.side1TiebreakScore ?? set.side2TiebreakScore;
        if (tiebreak === undefined) return base;

        // The loser's tiebreak points are what gets shown, which is the convention every score line in
        // the ecosystem uses. `getSetWinner` decides who lost rather than comparing games here, because
        // a timed or no-tiebreak set does not settle on "more games" alone.
        const winner = getSetWinner(index, { side1, side2, tiebreak }, config);
        const losing = winner === 1 ? set.side2TiebreakScore : set.side1TiebreakScore;
        return `${base}(${losing ?? tiebreak})`;
      })
      .join(' ');
  }
}
