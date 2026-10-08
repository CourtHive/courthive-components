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
 * ── An approach switch is a no-op on the score ──
 *
 * S5 of the state-engine extraction. ONE `ScoreEntryStore` is made here and handed to the card and to
 * every region this dialog builds, so switching from Dynamic Sets to Free Score builds a new renderer
 * over the same model and translates nothing: no `getSets()` harvest, no formatted string re-parsed.
 * The ending survives for the same reason — it is `model.ending`, not a region's. What a switch CAN
 * lose is text the model cannot represent, a half-typed `6-4 re` in Free Score, and that is the honest
 * answer: the alternative is replacing what the operator is typing now with a score they moved past.
 */

import { endingLabels, isDoubleExitStatus } from './logic/irregularEnding';
import { getMatchUpFormatModal } from '../matchUpFormat/matchUpFormat';
import { createDynamicSetsRegion } from './regions/dynamicSetsRegion';
import { enteredSets, isComplete } from './logic/scoreEntrySelectors';
import { createFreeScoreRegion } from './regions/freeScoreRegion';
import { createScoreEntryStore } from './logic/scoreEntryStore';
import { createDialPadRegion } from './regions/dialPadRegion';
import { switchApproach } from './logic/scoreEntryModel';
import { scoreGovernor } from 'tods-competition-factory';
import { toEngineOutcome } from './logic/engineOutcome';
import { renderScoreEntryCard } from './scoreEntryCard';
import { cModal } from '../modal/cmodal';

import type { EngineOutcome } from './logic/engineOutcome';
import type { SetScore } from './types';
import type {
  ScoreEntryCard,
  ScoreEntryCardParams,
  ScoreEntryOutcome,
  ApproachOption,
  ScoreRegion
} from './scoreEntryCard';

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
  'region' | 'approachLabel' | 'approaches' | 'onSelectApproach' | 'onSwitchApproach' | 'onEditFormat' | 'onSubmit'
> & {
  /**
   * Called with the outcome, then the dialog closes.
   *
   * `sets` is added to what the card reports, because the dialog knows its regions carry them and a
   * host saving to the factory needs the structured sets rather than only the formatted string.
   *
   * `outcome` is the same result in the shape the factory reads — hand it to
   * `tournamentEngine.setMatchUpStatus({ drawId, matchUpId, outcome })` as is (pass a copy if you keep
   * what you sent: the engine writes its derived score strings into it). The score as `score.sets`, a
   * chosen reason as positional `matchUpStatusCodes`, a clear as the empty-sets outcome that actually
   * clears, and a format changed through the chip as `matchUpFormat`. See `logic/engineOutcome.ts`.
   */
  onSubmit?: (outcome: ScoreEntryOutcome & { sets: SetScore[]; outcome: EngineOutcome }) => void;
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
  /**
   * Called when a format change DISCARDS part of the score, with what was lost and why.
   *
   * Only when something was actually discarded — a change that costs the operator nothing says
   * nothing. `discarded` carries the sets themselves rather than a count, because a host that means to
   * tell the operator has to quote them in their own numbers, and `reason` is the factory validator's
   * own words about the first casualty.
   */
  onScoreDiscarded?: (discarded: {
    sets: SetScore[];
    discarded: SetScore[];
    reason?: string;
    matchUpFormat: string;
  }) => void;
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
  openFormatPicker?: (params: {
    existingMatchUpFormat: string;
    callback: (matchUpFormat: string) => void;
    /** Called however the picker closes; the dialog is inert until then. */
    onClose?: () => void;
  }) => void;
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

/** A field where Delete and Backspace edit text, so they must not also clear the card. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  );
}

/** Cmd/Ctrl/Alt chords belong to the browser and the OS (Cmd+Backspace deletes a line). */
function hasCommandModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

export function openScoreEntryDialog(params: ScoreEntryDialogParams): ScoreEntryDialog {
  const offered = params.approaches?.length ? params.approaches : ALL_APPROACHES;
  const labels = params.labels ?? endingLabels();
  let approach: ScoreEntryApproach = params.approach ?? offered[0];
  let matchUpFormat = params.matchUpFormat ?? params.matchUp?.matchUpFormat;
  const openedFormat = matchUpFormat;
  let closed = false;
  let notified = false;

  // The ONE model. Seeded from the sets and the recorded ending of a matchUp being reopened — CA,
  // 2026-09-28: *"we need to be able to open existing outcomes!"* — and every region opens on it, so all
  // three approaches show the same score whichever one opens first. (Free Score used to be seeded with
  // text and opened EMPTY on a scored matchUp, measured 2026-09-28; it now reads the model.)
  const store = createScoreEntryStore({
    matchUpFormat,
    approach,
    sets: params.sets ?? params.matchUp?.score?.sets,
    matchUp: params.matchUp
  });
  // Decided ONCE, at open, from what was handed in: a reopened result is read before it is edited, and
  // the way back into a finished set is clicking it, not a caret the dialog placed.
  const openedOnResult = reopensResult();
  let currentRegion = buildRegion(approach);

  const card = renderScoreEntryCard({
    ...params,
    labels,
    matchUpFormat,
    store,
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
      const sets = enteredSets(store.get());
      // the format rides along only when the operator changed it here; an unchanged one is the engine's own
      const changedFormat = matchUpFormat !== openedFormat ? matchUpFormat : undefined;
      params.onSubmit?.({ ...outcome, sets, outcome: toEngineOutcome({ ...outcome, sets }, changedFormat) });
      close();
    }
  });

  cModal.open({
    content: card.element,
    config: {
      maxWidth: DIALOG_MAX_WIDTH,
      // A stray backdrop click must not discard a half-entered score. Cancel (or Escape) and Submit are
      // the ways out.
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
   * The region for an approach, rendering the one store.
   *
   * `onChange` refreshes the band and the gate WITHOUT rebuilding the rows, which is what protects the
   * caret of the input being typed into; `onStructureChange` is the full render, for when the columns
   * themselves change.
   */
  function buildRegion(next: ScoreEntryApproach): ScoreRegion {
    const onChange = () => card.refresh();

    if (next === 'freeScore') return createFreeScoreRegion({ store, onChange });
    if (next === 'dialPad') return createDialPadRegion({ store, onChange });
    return createDynamicSetsRegion({
      store,
      sideNames: [params.sides[0].participantName, params.sides[1].participantName],
      onChange,
      onStructureChange: () => card.rerender()
    });
  }

  /**
   * Switch approach: one transition on the model, and a new renderer over it.
   *
   * No harvest. The dialog used to translate the score through `getSets()` and `scoreString()`, and a
   * fallback in that translation once brought a cleared score BACK — CA, 2026-09-30: choose `Other: Dead
   * Rubber` in Free Score, switch to Dynamic Sets, *"the score reappears"*. With one model there is
   * nothing to translate and nothing to fall back to.
   */
  function setApproach(next: ScoreEntryApproach): void {
    if (next === approach) return;
    store.set(switchApproach(store.get(), next));
    approach = next;
    currentRegion = buildRegion(next);
    card.update({ region: currentRegion, approachLabel: APPROACH_LABELS[next] });
    // The new region begins where entry begins in it, exactly as it would had the dialog opened on it.
    // Without this a switch left focus on the menu item that had just been removed from the document,
    // so Free Score in particular had to be clicked into before it would take a keystroke — CA,
    // 2026-09-28: *"Free Score should give the one entry field focus automatically rather than a user
    // having to click into it."*
    focusEntry();
    params.onApproachChange?.(next);
  }

  /**
   * Change the scoring format, keeping every set the new format has not invalidated.
   *
   * ── The three behaviours this has had, and why it ended here ──
   *
   * It first carried the whole score across, on the reasoning that games already played stay played.
   * CA replaced that with CLEAR EVERYTHING (2026-09-28) — *"any change of matchUpFormat should clear
   * the score... but we'll do something interesting later"* — because carrying a score between formats
   * quietly produces sets belonging to neither: a 7-6(3) re-read under `S:6/TB7@5`, a games score
   * surviving into a tiebreak-only set.
   *
   * This is the "later". CA, 2026-09-28: *"There are situations where someone starts entering sets and
   * then realizes that the third set is a tiebreak set and changes from SET3-S:6/TB7 to
   * SET3-S:6NOAD/TB7-F:TB10 => obviously the first two sets don't need to change at all in this
   * scenario! But if a partial 3rd set was entered it would need to be trimmed away."*
   *
   * ── The judgement is the FACTORY's, not this dialog's ──
   *
   * `scoreGovernor.retainScoreForFormat` decides what survives; this only applies the answer. That is
   * the same reason `scoreLine`, the complements and the integrity checks all delegate — a second
   * opinion about what a format allows is how the entry approaches came to disagree about everything
   * else.
   *
   * ── A half-typed set is discarded, and that is a decision ──
   *
   * `getSets()` reports only sets whose BOTH sides are entered — deliberately, because including a
   * half-entered one made the band claim a `6-0` nobody typed. So a part-entered set never reaches the
   * factory here and is lost on any format change. CA, 2026-09-29, asked directly: *"i think it is
   * fine for half-typed sets to be discarded."* Recorded so it reads as settled rather than as an
   * omission someone should come back and fix.
   *
   * ── `previousMatchUpFormat` is load-bearing, and the case is not the obvious one ──
   *
   * For a set that is complete AND legal it changes nothing: "its rule did not change" and "it is
   * still legal" agree. The case it exists for is a complete but **ILLEGAL** set — a 3-7, which the
   * band reports and `getSets()` still carries. Measured 2026-09-29 under a change touching only the
   * deciding set: with the previous format the 3-7 is KEPT, without it the validator discards it.
   *
   * Keeping it is right. The operator typed it, the card is already telling them it is wrong, and a
   * format change that does not touch that set has no business silently deleting their work — which is
   * exactly what *"trim only what the new format invalidates"* means for a score that was invalid
   * before the change.
   *
   * The ENDING is untouched either way. A walkover recorded against a row is a fact about the match,
   * not about the format the score is read under — the same reason `card.update` keeps it across an
   * approach switch.
   */
  function setMatchUpFormat(next: string): void {
    if (next === matchUpFormat) return;

    const previousMatchUpFormat = matchUpFormat;
    // The REPORT of what the change costs, in the factory's words. The change itself is the model's
    // (`changeFormat`, through `card.update`), which asks the same factory function; this call exists
    // so the host can be told WHICH sets went and why.
    const held = enteredSets(store.get());
    const retained = scoreGovernor.retainScoreForFormat({ sets: held, matchUpFormat: next, previousMatchUpFormat });

    matchUpFormat = next;
    // The format FIRST, because a region reads the set count off the model when it is built.
    card.update({ matchUpFormat: next });
    currentRegion = buildRegion(approach);
    card.update({ region: currentRegion });
    focusEntry();

    // Said, not discovered. The band already refuses to discard a part-score silently, and a score
    // thrown away by a format change is the same event with a different trigger.
    if (retained.discarded.length) params.onScoreDiscarded?.({ ...retained, matchUpFormat: next });

    params.onFormatChange?.(next);
  }

  /**
   * The format picker opens ABOVE the card, and the card is inert until it closes — CA, 2026-10-08:
   * *"actions in the ScoreEntry dialog can still be taken while the matchUpFormat dialog is open"*. cModal
   * draws no backdrop that catches clicks: the picker's container is only as wide as the picker, so the
   * card's cells, endings and Submit stayed live on either side of it. `inert` takes the whole card out of
   * pointer, keyboard and focus reach at once, and the picker's `onClose` (Select, Cancel or any other way
   * it is closed) gives it back.
   */
  function editFormat(): void {
    const open = params.openFormatPicker ?? getMatchUpFormatModal;
    const section = ownSection();
    if (section) section.inert = true;
    open({
      existingMatchUpFormat: matchUpFormat ?? 'SET3-S:6/TB7',
      callback: (chosen: string) => {
        if (chosen) setMatchUpFormat(chosen);
      },
      onClose: () => {
        if (section) section.inert = false;
        focusEntry();
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
   * where that starts. Without this, opening the dialog leaves focus
   * on whatever was behind it, so a keyboard user has to tab INTO the dialog before they can begin.
   *
   * The Dial Pad has no text inputs at all, so its first digit key is the entry point. Failing both, the
   * section itself takes focus: cModal already gives it `tabIndex = -1`, so the dialog is at least
   * entered and Escape and the tab order start from inside it.
   */
  function focusEntry(): void {
    if (params.autoFocus === false) return;

    // A reopened RESULT focuses no entry cell. CA, 2026-10-01: *"a reopened completed matchUp should
    // not focus any entry cell at all."* Measured before this: the caret landed in set 1's lower cell,
    // and the region never folds the set under edit, so a completed match reopened with set 1 pulled
    // open while every later set was folded — the fold CA asked for (*"the way back in is simply
    // clicking the completed representation of the set"*) undone by the dialog's own focus. The
    // section takes focus instead, so Escape and the tab order still begin inside the dialog.
    if (openedOnResult) {
      ownSection()?.focus();
      return;
    }

    // The region places it when it can: `focusFirst` also SELECTS what is there, so a score already in
    // the cell is replaced by typing rather than appended to.
    if (currentRegion.focusFirst) {
      currentRegion.focusFirst();
      return;
    }

    const field = card.element.querySelector<HTMLElement>('input:not([disabled]), button[data-digit]');
    (field ?? ownSection())?.focus();
  }

  /**
   * Whether the dialog opened on a RECORDED result: a winner, a double exit, or a score that decides
   * the match by itself. A part-score with no winner — a suspension, a match still being entered — is
   * not one, and keeps the caret, because the operator is there to finish it.
   */
  function reopensResult(): boolean {
    const recorded = params.matchUp;
    if (!recorded) return false;
    return !!recorded.winningSide || isDoubleExitStatus(recorded.matchUpStatus) || isComplete(store.get());
  }

  function ownSection(): HTMLElement | null {
    return card.element.closest<HTMLElement>('section[id^="cmdl-"]');
  }

  /**
   * Escape is `[Cancel]`; Delete and Backspace are `[Clear]` — CA, 2026-10-08: *"I'd like ESC to be the
   * equivalent of the [Cancel] button and DEL/BKSP key to be the equivalent of [Clear] button."*
   *
   * Each key PRESSES its button rather than repeating what the button does, so the key can never do more
   * or less than the click: Escape runs the host's `onCancel` and closes, holding a score or not; Clear
   * stays a no-op while its button is disabled (nothing to remove).
   *
   * This replaces the earlier Escape rule, which closed only an EMPTY dialog so that a stray key could not
   * discard a typed score. CA chose Escape-as-Cancel over that guard. A mis-aimed CLICK on the backdrop is
   * still ignored (`clickAway: false`, held by `__tests__/dismissGuard.test.ts`); a key press is deliberate.
   *
   * Delete and Backspace clear only when nothing else took the key. In a score cell or the Free Score field
   * they edit text, and the Dial Pad's keypad keeps Backspace for removing its last digit (it calls
   * `preventDefault`), so the key reaches this handler only from the dialog itself, a button, or an
   * endings chip. And only from inside THIS dialog: a Backspace typed in the host page must not clear it.
   *
   * Only when this is the TOP dialog: the format picker opens above, has no keyboard handling of its own,
   * and acting on the card from under it would leave the picker standing over nothing.
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (closed || !isTopMostDialog()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      // One Escape, one step back: an open menu closes first, and only the next Escape cancels.
      if (card.closeMenus()) return;
      footerButton('cancel')?.click();
      return;
    }

    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (event.defaultPrevented || hasCommandModifier(event) || isEditable(event.target)) return;
    if (!ownSection()?.contains(event.target as Node)) return;

    const clear = footerButton('clear');
    if (!clear || clear.disabled) return;
    event.preventDefault();
    clear.click();
  }

  function footerButton(action: 'cancel' | 'clear'): HTMLButtonElement | null {
    return card.element.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);
  }

  function isTopMostDialog(): boolean {
    const own = ownSection();
    if (!own) return false;
    return [...document.querySelectorAll('section[id^="cmdl-"]')].at(-1) === own;
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
