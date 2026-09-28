/**
 * The score-entry card, in a modal — the unit a host actually opens.
 *
 * `renderScoreEntryCard` deliberately knows nothing about modals: it returns an element, which is what
 * lets it live inline in a schedule row as well as in a dialog. The consequence is that SOMETHING has to
 * own the four things a dialog needs, and until now that something was a Storybook story:
 *
 *   - the modal itself, at a width the card actually fits in (cModal defaults to 450px; the card needs
 *     the better part of 800 once it carries five set columns);
 *   - the close button, which the card only REPORTS a click on;
 *   - approach switching, which has to rebuild the region and carry the typed score across;
 *   - the format picker, which already exists in this package and was wired to nothing.
 *
 * Written as a module rather than left in the stories because TMX needs exactly this and would
 * otherwise write its own — and a second copy of "which approach carries which score" is how the three
 * entry approaches came to disagree in the first place. The stories now drive this module, so what is
 * reviewed in Storybook is what ships.
 *
 * ── Carrying the score across an approach switch ──
 *
 * Every region exposes `getSets()` and `scoreString()`, so a switch is a translation rather than a
 * reset: sets seed Dynamic Sets and the Dial Pad, the formatted string seeds Free Score. An operator who
 * has typed two sets and then decides the keypad is faster does not retype them. The ENDING survives
 * too, because it lives on the card rather than in the region — see `ScoreEntryCard.update`.
 */

import { getMatchUpFormatModal } from '../matchUpFormat/matchUpFormat';
import { createDynamicSetsRegion } from './regions/dynamicSetsRegion';
import { createFreeScoreRegion } from './regions/freeScoreRegion';
import { hydrateScoreEntryState } from './logic/scoreEntryState';
import { createDialPadRegion } from './regions/dialPadRegion';
import { renderScoreEntryCard } from './scoreEntryCard';
import { endingLabels } from './logic/irregularEnding';
import { cModal } from '../modal/cmodal';

import type { SetScore } from './types';
import type {
  ScoreEntryCard,
  ScoreEntryCardParams,
  ScoreEntryOutcome,
  ApproachOption,
  ScoreRegion
} from './scoreEntryCard';

/**
 * A region this dialog built, which is narrower than `ScoreRegion`.
 *
 * All three approaches expose `getSets`, and that is what makes carrying the score across a switch
 * possible. The base `ScoreRegion` does not require it — a region that only produces a string is
 * legitimate — so the dialog names the narrower thing rather than reaching for an optional call.
 */
type BuiltRegion = ScoreRegion & { getSets: () => SetScore[]; hasEntry: () => boolean };

/** The three entry approaches. The key is what `onSelectApproach` reports and what a host persists. */
export type ScoreEntryApproach = 'dynamicSets' | 'freeScore' | 'dialPad';

const APPROACH_LABELS: Record<ScoreEntryApproach, string> = {
  dynamicSets: 'Dynamic Sets',
  freeScore: 'Free Score',
  dialPad: 'Dial Pad'
};

const ALL_APPROACHES: ScoreEntryApproach[] = ['dynamicSets', 'freeScore', 'dialPad'];

/**
 * The card needs roughly this much room at three sets and a tiebreak column.
 *
 * cModal's 450px default clips it — the set inputs are 62px each and the participant column takes what
 * is left, so at 450 the names wrap to two lines and the endings row overflows. Not a round 800 because
 * the modal adds its own padding either side.
 */
const DIALOG_MAX_WIDTH = 780;

export type ScoreEntryDialogParams = Omit<
  ScoreEntryCardParams,
  | 'region'
  | 'approachLabel'
  | 'approaches'
  | 'onSelectApproach'
  | 'onSwitchApproach'
  | 'onEditFormat'
  | 'onClose'
  | 'onSubmit'
> & {
  /**
   * Called with the outcome, then the dialog closes.
   *
   * `sets` is added to what the card reports, because the dialog knows its regions carry them and a
   * host saving to the factory needs the structured sets rather than only the formatted string.
   */
  onSubmit?: (outcome: ScoreEntryOutcome & { sets: SetScore[] }) => void;
  /** Which approach opens. Defaults to Dynamic Sets. */
  approach?: ScoreEntryApproach;
  /** Which approaches the switcher offers. Defaults to all three; a single entry hides the menu. */
  approaches?: ScoreEntryApproach[];
  /** Sets already recorded, e.g. from a saved matchUp. Ignored when `matchUp` carries a score. */
  sets?: SetScore[];
  /**
   * A matchUp whose outcome is being REOPENED.
   *
   * Everything a recorded outcome needs comes from here: the sets, the format, the ending, and the
   * reason code — CA, 2026-09-28: *"we need to be able to open existing outcomes!"* Anything passed
   * explicitly wins, so a host can override one part without unpacking the rest.
   *
   * `sides` stays separate rather than being read off `matchUp.sides`, because the card wants display
   * names and a matchUp carries participants; that mapping belongs to the host, which already has it.
   */
  matchUp?: {
    matchUpFormat?: string;
    matchUpStatus?: string;
    winningSide?: number;
    score?: { sets?: SetScore[] };
    sideStatusCodes?: Record<number, string>;
    matchUpStatusCode?: string;
    matchUpStatusCodes?: unknown[];
  };
  /** Called with the chosen approach whenever it changes, so a host can remember the preference. */
  onApproachChange?: (approach: ScoreEntryApproach) => void;
  /** Called with a format chosen in the picker. Omit and the format chip stays inert text. */
  onFormatChange?: (matchUpFormat: string) => void;
  /** Called when the dialog closes, by `[X]`, by a footer button, or by `close()`. */
  onClose?: () => void;
  /**
   * Whether to focus the first entry field on open. Defaults to true.
   *
   * `false` for a host that opens the dialog as a side effect of something else, where stealing focus
   * would interrupt what the operator was actually doing.
   */
  autoFocus?: boolean;
  /** Overrides cModal's config. `maxWidth`, `clickAway` and `padding` have deliberate defaults. */
  modalConfig?: Record<string, any>;
  /**
   * The format picker. Defaults to this package's `getMatchUpFormatModal`.
   *
   * Injectable because a unit test has no business opening the real picker's modal — it is a second
   * dialog with its own state — and because a host may have its own.
   */
  openFormatPicker?: (params: { existingMatchUpFormat: string; callback: (matchUpFormat: string) => void }) => void;
};

export type ScoreEntryDialog = {
  /** The card, for a host that needs to read the state or drive it. */
  card: ScoreEntryCard;
  /** The approach currently shown. */
  approach: () => ScoreEntryApproach;
  /** Switch approach, carrying the typed score across. */
  setApproach: (approach: ScoreEntryApproach) => void;
  /** Change the scoring format, rebuilding the region under it. */
  setMatchUpFormat: (matchUpFormat: string) => void;
  /** Close the dialog. Runs `onClose` exactly once, however the close was triggered. */
  close: () => void;
};

export function openScoreEntryDialog(params: ScoreEntryDialogParams): ScoreEntryDialog {
  const offered = params.approaches?.length ? params.approaches : ALL_APPROACHES;
  const labels = params.labels ?? endingLabels();
  let approach: ScoreEntryApproach = params.approach ?? offered[0];
  let matchUpFormat = params.matchUpFormat ?? params.matchUp?.matchUpFormat;
  let sets = params.sets ?? params.matchUp?.score?.sets;
  let closed = false;
  let notified = false;

  let currentRegion = buildRegion(approach, { sets, text: undefined });

  const card = renderScoreEntryCard({
    ...params,
    labels,
    matchUpFormat,
    // The recorded ending, so reopening a scored matchUp shows what it holds rather than a blank card.
    initialState: params.initialState ?? hydrateScoreEntryState(params.matchUp),
    region: currentRegion,
    approachLabel: APPROACH_LABELS[approach],
    approaches: offered.length > 1 ? offered.map(approachOption) : undefined,
    onSelectApproach: (key) => setApproach(key as ScoreEntryApproach),
    // Only when the host wants to hear about it: without `onFormatChange` the chip stays inert text
    // rather than a button that opens a picker whose choice goes nowhere.
    onEditFormat: params.onFormatChange ? editFormat : undefined,
    // `[Cancel]` closes the dialog. The card only REPORTS the click — it has no idea it is in a modal —
    // and nothing was passed, so the button did nothing at all. A host's own `onCancel` still runs, and
    // runs first: it may want to know the operator backed out before the dialog goes.
    onCancel: () => {
      params.onCancel?.();
      close();
    },
    onSubmit: (outcome) => {
      // Harvested BEFORE the close, while the region is still the live one.
      params.onSubmit?.({ ...outcome, sets: currentRegion.getSets() });
      close();
    },
    onClose: close
  });

  cModal.open({
    content: card.element,
    config: {
      maxWidth: DIALOG_MAX_WIDTH,
      // A stray backdrop click must not discard a half-entered score. The `[X]` and the footer are the
      // ways out, and both are visible.
      clickAway: false,
      // The card draws its own padding, and cModal's default 1em on top of it detaches the header's
      // bottom border from the dialog's edge. '0' and not 0: cModal reads the value truthily, so a
      // numeric zero silently becomes the default.
      padding: '0',
      ...params.modalConfig
    },
    // Reached when cModal closes for its own reasons — a footer button, a nested-modal teardown — so the
    // host hears about it however it happened.
    onClose: () => {
      closed = true;
      notify();
    }
  });

  document.addEventListener('keydown', onKeyDown);
  describeDialog();
  focusEntry();

  function approachOption(key: ScoreEntryApproach): ApproachOption {
    return { key, label: APPROACH_LABELS[key] };
  }

  /**
   * The region for an approach, seeded from whatever has been entered so far.
   *
   * Dynamic Sets and the Dial Pad take sets; Free Score takes text. `onChange` refreshes the band and
   * the gate WITHOUT rebuilding the rows, which is what protects the caret of the input being typed
   * into; `onStructureChange` is the full render, for when the columns themselves change.
   */
  function buildRegion(next: ScoreEntryApproach, seed: { sets?: SetScore[]; text?: string }): BuiltRegion {
    const onChange = () => card.refresh();

    if (next === 'freeScore') {
      return createFreeScoreRegion({ matchUpFormat, initialText: seed.text, onChange });
    }
    if (next === 'dialPad') {
      return createDialPadRegion({ matchUpFormat, sets: seed.sets, onChange });
    }
    return createDynamicSetsRegion({
      matchUpFormat,
      sets: seed.sets,
      sideNames: [params.sides[0].participantName, params.sides[1].participantName],
      onChange,
      onStructureChange: () => card.rerender()
    });
  }

  /** What the current region holds, in both currencies, so either kind of region can be seeded from it. */
  function harvest(): { sets?: SetScore[]; text?: string } {
    const harvested = currentRegion.getSets();
    return { sets: harvested.length ? harvested : sets, text: currentRegion.scoreString?.() };
  }

  function setApproach(next: ScoreEntryApproach): void {
    if (next === approach) return;
    const seed = harvest();
    sets = seed.sets;
    approach = next;
    currentRegion = buildRegion(next, seed);
    card.update({ region: currentRegion, approachLabel: APPROACH_LABELS[next] });
    params.onApproachChange?.(next);
  }

  function setMatchUpFormat(next: string): void {
    if (next === matchUpFormat) return;
    matchUpFormat = next;
    // The score is carried across, not cleared. A format correction — `TB7` to `TB7@5` — is a statement
    // about how the set ENDS, and the games already entered are still the games that were played. Where
    // the new format makes them illegal the region's own integrity check says so, which is a better
    // answer than silently emptying the cells.
    const seed = harvest();
    currentRegion = buildRegion(approach, seed);
    card.update({ matchUpFormat: next, region: currentRegion });
    params.onFormatChange?.(next);
  }

  function editFormat(): void {
    const open = params.openFormatPicker ?? getMatchUpFormatModal;
    open({
      existingMatchUpFormat: matchUpFormat ?? 'SET3-S:6/TB7',
      callback: (chosen: string) => {
        if (chosen) setMatchUpFormat(chosen);
      }
    });
  }

  /**
   * Name the dialog, and say it is modal.
   *
   * cModal gives its section `role="dialog"` and `tabIndex = -1` and stops there — no `aria-modal`, and
   * nothing naming it — so a screen reader announces an unnamed dialog and does not say the rest of the
   * page is inert. Done here rather than in cModal because cModal is shared by every dialog in the
   * library and changing what all of them announce is not this workstream's call; recorded for it.
   */
  function describeDialog(): void {
    const section = ownSection();
    if (!section) return;

    section.setAttribute('aria-modal', 'true');
    section.setAttribute('aria-labelledby', card.titleId);
  }

  /**
   * Put the caret where the operator is about to type.
   *
   * A score-entry dialog opens because someone means to enter a score, and the first set's first cell is
   * where that starts — USTA Tournament Desk does the same. Without this, opening the dialog leaves focus
   * on whatever was behind it, so a keyboard user has to tab INTO the dialog before they can begin.
   *
   * The Dial Pad has no text inputs at all, so its first digit key is the entry point. Failing both, the
   * section itself takes focus: cModal already gives it `tabIndex = -1`, so the dialog is at least
   * entered and Escape and the tab order start from inside it.
   */
  function focusEntry(): void {
    if (params.autoFocus === false) return;

    // The region places it when it can: `focusFirst` also SELECTS what is there, so a score already in
    // the cell is replaced by typing rather than appended to.
    if (currentRegion.focusFirst) {
      currentRegion.focusFirst();
      return;
    }

    const field = card.element.querySelector<HTMLElement>('input:not([disabled]), button[data-digit]');
    (field ?? ownSection())?.focus();
  }

  function ownSection(): HTMLElement | null {
    return card.element.closest<HTMLElement>('section[id^="cmdl-"]');
  }

  /**
   * Escape closes an EMPTY dialog, and does nothing to one holding a score.
   *
   * cModal has no keyboard handling of its own — measured: not one `keydown` listener in it — so
   * without this a keyboard user's only way out is to reach the `[X]`. Escape is the standard
   * affordance, and an empty dialog has nothing to lose.
   *
   * With something entered it deliberately does NOTHING, which is not a new rule: this repo already
   * decided that a mis-aimed click must not discard a typed score (`clickAway: false`, held by
   * `__tests__/dismissGuard.test.ts`). Silent non-dismissal is exactly what that click guard does, so
   * Escape inherits it rather than inventing a confirm step. Cancel and Submit remain the deliberate
   * ways out, and both are visible.
   *
   * Only when this is the TOP dialog: the format picker opens above, has no Escape handling either, and
   * closing the card from under it would leave the picker standing over nothing.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || closed) return;
    if (!isTopMostDialog() || holdsEntry()) return;

    event.preventDefault();
    close();
  }

  function isTopMostDialog(): boolean {
    const own = ownSection();
    if (!own) return false;
    return [...document.querySelectorAll('section[id^="cmdl-"]')].at(-1) === own;
  }

  /**
   * Whether anything would be lost: a score entered, or an ending recorded.
   *
   * `hasEntry` and not `getSets()`. A region reports only sets whose both sides are in, so a lone `6`
   * typed with smart complements switched off is invisible to `getSets()` — measured, and it made the
   * first version of this guard discard exactly the keystroke it was written to protect. Typing with
   * complements ON hides the hole, because the complement fills the other side immediately.
   */
  function holdsEntry(): boolean {
    const state = card.getState();
    if (state.sideEnding || state.matchEnding || state.reasonCode) return true;

    return currentRegion.hasEntry();
  }

  function close(): void {
    // Two flags, not one. `closed` stops a second `cModal.close()`, which would pop a modal this dialog
    // does not own — a nested picker, or the host's own dialog underneath. `notified` stops a second
    // `onClose`, which for a host that reopens on close is a loop. Measured 2026-09-27: one flag
    // reported `[X]` twice, because cModal's own onClose fires inside `cModal.close()`.
    if (!closed) {
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      cModal.close();
    }
    notify();
  }

  function notify(): void {
    if (notified) return;
    notified = true;
    params.onClose?.();
  }

  return {
    card,
    approach: () => approach,
    setApproach,
    setMatchUpFormat,
    close
  };
}
