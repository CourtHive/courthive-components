/**
 * The score-entry card: the geometry every approach shares.
 *
 * ── Why this exists as one thing ──
 *
 * The four score-entry approaches each rendered their own complete dialog — their own header, their
 * own endings controls, their own winner question, their own submit gate. That is how they came to
 * disagree about the walkover rule, about which endings existed, about when Submit was live, and
 * about what a saved result reopened as. Every one of those was a divergence between renderers, not a
 * hard problem.
 *
 * So the card owns everything that is the same in all three, and the score region is the ONLY part
 * that varies:
 *
 *     header          title · context · format chip · approach switcher · close
 *     participant rows  name, seed, the score region's cells, the per-side "ended early" control
 *     score region      ← the only variable part: per-set inputs, a text field, or a keypad
 *     endings row     the seven match-level endings, three privileged and the rest behind Other…
 *     result band     what will be submitted, said before it is
 *     footer          Cancel left, Clear + Submit right
 *
 * A region supplies either `rowCells` (Dynamic Sets: one input per set, inside the participant rows)
 * or `block` (Free Score: one field; Dial Pad: a keypad) beneath them. Both is allowed; neither
 * renders a card with no score entry, which is legitimate for a walkover-only view.
 *
 * ── What this module does NOT do ──
 *
 * No outcome logic. Every question about what the card means is answered by `scoreEntryState.ts`,
 * which in turn asks `resolveIrregularEnding`. This file decides where things sit and what they are
 * called, and nothing else. If a rule appears here, it is in the wrong file.
 */

import { statusCodeSubtext, statusCodeDisplay, codesForStatus } from './logic/statusCodes';
import { ENTRY_SIDE, hasCommandModifier, otherSide } from './keyboard';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { scoreEntrySummary } from './logic/scoreEntrySummary';
import { endingLabels } from './logic/irregularEnding';
import {
  emptyScoreEntryState,
  toggleBothSidesOut,
  offersBothSidesOut,
  matchEndingOptions,
  chooseMatchEnding,
  resolveReportedEnding,
  resolveScoreEntry,
  chooseSideEnding,
  chooseReasonCode,
  sideEndingOptions,
  reasonCodeStatus
} from './logic/scoreEntryState';

import type { ScoreEntryState, ScoreEntryResolution, SideNumber } from './logic/scoreEntryState';
import type { StatusCodeGroups } from './logic/statusCodes';

import './scoreEntryCard.css';

const { RETIRED, WALKOVER, DEFAULTED } = matchUpStatusConstants;

/** Class names and attribute names used often enough that a typo in one would be silent. */
const CLS_BTN = 'chc-sec-btn';
const CLS_BTN_PILL = 'chc-sec-btn chc-sec-btn-pill';
const CLS_BTN_ICON = 'chc-sec-btn chc-sec-btn-icon';
const CLS_CHECK = 'chc-sec-check';
const CLS_MENU = 'chc-sec-other-menu';
const CLS_MENU_ITEM = 'chc-sec-other-item';
const ARIA_LABEL = 'aria-label';
const CLS_SPACER = 'chc-sec-spacer';
const CLS_BAND_HEADLINE = 'chc-sec-band-headline';
const CLS_BAND_DETAIL = 'chc-sec-band-detail';
/** What the band says once `[Clear]` has emptied a recorded outcome. Overridable via `labels`. */
const CLEARED_HEADLINE = 'The recorded result will be removed — Submit to clear it.';
const ARIA_PRESSED = 'aria-pressed';
const ARIA_EXPANDED = 'aria-expanded';
const CHECK_PATH = 'M20 6 9 17l-5-5';

/**
 * The row grid's fixed columns, in px.
 *
 * Named because the header row and the participant rows must use the SAME track widths or the headings
 * stop sitting over the cells they describe. `renderRows` builds one template string from these and
 * assigns it to both, which is the single source that makes the correspondence structural rather than
 * something to eyeball.
 *
 * Centring within a track is a separate guarantee, and it is why `.chc-sec-col-head` and
 * `.chc-sec-set-input` both use `justify-self`/`justify-content: center` rather than one using
 * `text-align` and the other `margin: 0 auto`. Two mechanisms that happen to agree today can diverge
 * under one edit; the same property on both cannot.
 *
 * There is no trailing action track: the per-side ending control lives inside the `1fr` name cell.
 */
const SCORE_COLUMN_PX = 62;

/**
 * How many score columns can sit BESIDE the participant names before the names have to move.
 *
 * CA, 2026-09-28: *"If I have 9 timed Bolts the width will make the entry columns collide with the
 * participant names; in such a case the upper participant name should float to a row above the cells
 * and the lower participant name should float/wrap to a row beneath the cells."*
 *
 * Six, and the number is a consequence rather than a taste: conventional tennis never asks for more.
 * Best-of-five is five games columns plus at most one transient tiebreak column, so every racquet
 * format in the ecosystem stays inline and the stacked layout is reserved for the formats that
 * genuinely cannot fit — a nine-bolt timed match needs 558px of columns, which leaves nothing usable
 * for a name inside the dialog's 780.
 *
 * Counted rather than measured because a count is the same answer in happy-dom as in a browser. A
 * `getBoundingClientRect` threshold would be untestable in the suite that is this package's only DOM
 * evidence, and would silently choose the inline layout there — where every width is zero.
 */
const MAX_INLINE_SCORE_COLUMNS = 6;

/**
 * The three endings the design privileges as buttons in the match-level row. The rest go behind
 * "Other…". Their presence is what tells an operator the row is about the match rather than a side,
 * which is why the caption that used to say so is gone.
 */
const PRIVILEGED_MATCH_ENDINGS = ['IN_PROGRESS', 'AWAITING_RESULT', 'SUSPENDED'];

/** One-line hints for the per-side endings, which are the choice an operator gets wrong most often. */
const SIDE_ENDING_HINTS: Record<string, string> = {
  [WALKOVER]: 'Did not play at all — no score',
  [RETIRED]: 'Started, could not finish — score kept',
  [DEFAULTED]: 'Removed by the referee'
};

/**
 * One letter per side ending, and the CASE names the row.
 *
 * CA, 2026-09-28: *"in all scoring modes 'w' should be a WALKOVER to the lower participant and 'W'
 * should be a WALKOVER to the upper participant; same for 'r/R' and 'd/D' => pressing these keys
 * toggles the appropriate irregular ending pane below the appropriate participant."*
 *
 * The same three endings the row panels offer, so the keyboard cannot reach an ending the pointer
 * cannot — the letters are a shortcut to the existing control, never a second way to record an
 * outcome. Case rather than a modifier because it needs no second key: lower case is the lower row,
 * which is the same mnemonic as the digits.
 */
const SIDE_ENDING_KEYS: Record<string, string> = {
  w: WALKOVER,
  r: RETIRED,
  d: DEFAULTED
};

/**
 * One column the region contributes to the participant rows.
 *
 * `heading` and `width` travel TOGETHER deliberately. The header row and the participant rows are
 * built from this one array, so a heading can never end up over a column it does not describe — the
 * correspondence is structural rather than two lists that have to be kept the same length by hand.
 * CA asked for that alignment explicitly (2026-09-27) and this is what makes it hold rather than a
 * rule someone has to remember.
 *
 * A column with no `heading` renders no header cell, and a region whose columns are all unheaded gets
 * no header row at all — which is what Free Score and the Dial Pad want, since their single readout
 * column needs no label.
 */
export type ScoreColumn = {
  /** The heading above this column, e.g. `1st`. Omit for an unlabelled column. */
  heading?: string;
  /** A CSS grid track size. Defaults to the standard score-column width. */
  width?: string;
};

export type ScoreRegion = {
  /** The columns this region contributes to each participant row. */
  columns?: () => ScoreColumn[];
  /** The cells to place in one side's row. Must return one per column. */
  rowCells?: (sideNumber: SideNumber) => HTMLElement[];
  /** A block beneath the rows — a text field, or a keypad. */
  block?: () => HTMLElement;
  /** The score as it currently stands, for the result band. */
  scoreString?: () => string | undefined;
  /** Whether that score is a finished result. The region's judgement, never the card's. */
  isComplete?: () => boolean;
  /** The winner the score implies, when no ending overrides it. */
  winningSide?: () => SideNumber | undefined;
  /**
   * A matchUpStatus the region itself parsed out of what was typed — Free Score only.
   *
   * Used ONLY when the operator has selected no ending. See `resolveReportedEnding` for why that
   * precedence and not the other.
   */
  matchUpStatus?: () => string | undefined;
  /**
   * A compact control the region wants in the result band's right edge rather than in a row of its own.
   *
   * CA, 2026-09-27, on the smart-complements checkbox: *"I don't think '[] Smart Complements' should take
   * up a whole row of the modal. I think it can be a little icon to the far right side of the row where you
   * have 'No result entered yet'. Just (Smart) maybe, something compact that toggles."*
   *
   * It stays a REGION concern — it is a Dynamic Sets behaviour and nothing else reads it — so the region
   * supplies the element and the card only decides where it sits. Putting the knowledge of it in the card
   * would imply it applied to Free Score and the Dial Pad too.
   */
  bandControl?: () => HTMLElement | undefined;
  /**
   * Something wrong with the score as entered, in words for the operator.
   *
   * The card refuses to submit while this is set and shows it in the result band. A score that cannot be
   * right must not reach the factory, and it must say so while the operator is still looking at the field
   * they typed it into.
   */
  error?: () => string | undefined;

  /**
   * Discard everything the region holds.
   *
   * `[Clear]` cleared the card's ENDING state and nothing else, so the typed sets stayed exactly where
   * they were and the button read as broken — CA, 2026-09-28: *"[Clear] button not working"*. The card
   * cannot do this itself: only the region knows what it is holding and how to redraw its own cells.
   */
  clear?: () => void;

  /**
   * Put focus where entry begins, selecting what is there.
   *
   * Selecting matters as much as focusing: the old dialog's `focusAndSelect` is why typing into a cell
   * that already holds a score REPLACES it. Used after `[Clear]`, and by a host opening the dialog.
   */
  focusFirst?: () => void;

  /**
   * Whether ANYTHING has been entered, complete or not.
   *
   * Deliberately not derivable from `getSets()`: a region reports only sets whose BOTH sides are in,
   * because one value is not a set score. So a lone `6` typed with complements switched off is real
   * entry that `getSets()` cannot see — and a host asking "is there anything to lose here?" before
   * dismissing the dialog would be told no, and discard it.
   */
  hasEntry?: () => boolean;
};

/** One entry in the approach switcher's menu. */
export type ApproachOption = {
  /** Reported to `onSelectApproach`. The host's own name for the approach. */
  key: string;
  label: string;
};

/**
 * What the card reports when Submit is pressed.
 *
 * `winningSide` is the ending's where one was recorded and the SCORE's otherwise. Both are real answers
 * and a host needs whichever applies: measured 2026-09-27, this carried only the ending's, so an
 * ordinary 6-4 6-3 submitted as `{ matchUpStatus: undefined, winningSide: undefined }` — the 95% case
 * reporting nothing at all about who won.
 */
export type ScoreEntryOutcome = {
  matchUpStatus?: string;
  winningSide?: number;
  reasonCode?: string;
  /** The score as the region formats it, which is what a host stores alongside the outcome. */
  score?: string;
  /**
   * The operator cleared a recorded outcome and submitted the empty result — REMOVE what is stored.
   *
   * Only ever `true`, never `false`, so a host that does not know about it is unaffected. It exists
   * because an empty outcome is otherwise indistinguishable from a submission that says nothing, and
   * the two must not be treated alike: one erases a stored score and the other must not.
   */
  cleared?: boolean;
};

export type ScoreEntryCardParams = {
  sides: [{ participantName: string; seed?: string }, { participantName: string; seed?: string }];
  matchUpFormat?: string;
  /** e.g. `'R16 · Court 3'`. */
  context?: string;
  title?: string;
  /** The score region for the active approach. */
  region: ScoreRegion;
  /** The policy's reason-code groups, if the tournament has a scoring policy attached. */
  statusCodeGroups?: StatusCodeGroups;
  /** Ending labels, so a locale can supply them. */
  labels?: Record<string, string>;
  /** The approach switcher's current label, e.g. `'Dynamic Sets'`. Omit to hide the switcher. */
  approachLabel?: string;
  /**
   * Offered when the switcher should present a CHOICE. The label of the active approach stays
   * `approachLabel`; these are what it can become.
   */
  approaches?: ApproachOption[];
  /** Called with the chosen approach's key. Wire to a host that swaps the region through `update`. */
  onSelectApproach?: (key: string) => void;
  /** Offered instead of `approaches` when the host drives switching from its own control. */
  onSwitchApproach?: () => void;
  /** Offered when the host can edit the scoring format. Omit and the format chip stays inert text. */
  onEditFormat?: () => void;
  onCancel?: () => void;
  /** An ending already recorded, for reopening an outcome. Build it with `hydrateScoreEntryState`. */
  initialState?: ScoreEntryState;
  onClear?: () => void;
  onSubmit?: (outcome: ScoreEntryOutcome) => void;
  onClose?: () => void;
};

/** A card instance: its element, plus the handle the host needs to react to score-region changes. */
/** Per-card, so two cards on one page do not both claim `#chc-sec-title-1`. */
let cardSequence = 0;

export type ScoreEntryCard = {
  element: HTMLElement;
  /** Re-render the band and the submit gate. Call when the score region's value changes. */
  refresh: () => void;
  /** Rebuild everything, including the region's cells. Call when the region's COLUMNS change. */
  rerender: () => void;
  /**
   * Change the region (an approach switch) or the scoring format, keeping the ENDING state.
   *
   * Both inputs change while the dialog is open and both invalidate the region's cells, so they share one
   * mutator. What they must NOT invalidate is the ending: a walkover recorded against a row is a fact
   * about the match, not about the approach used to type it or the format the score is read under, and
   * an operator who corrects `SET3-S:6/TB7` to `SET3-S:6/TB7@5` has not retracted it.
   */
  update: (next: { region?: ScoreRegion; matchUpFormat?: string; approachLabel?: string }) => void;
  /** The current ending state, for a host that needs to inspect it. */
  getState: () => ScoreEntryState;
  /** The DOM id of the card's heading, for a host's `aria-labelledby`. */
  titleId: string;
};

export function renderScoreEntryCard(params: ScoreEntryCardParams): ScoreEntryCard {
  const labels = params.labels ?? endingLabels();
  /**
   * The active score region, replaceable through `setRegion`.
   *
   * Held in a variable rather than read off `params` so the approach switcher can swap Dynamic Sets for
   * Free Score or the Dial Pad WITHOUT rebuilding the card — the endings the operator has chosen, the
   * reason code and the open panel all survive, which is the whole point of the switcher being live.
   */
  let region = params.region;
  /** The scoring format, which the host can change through `update` — see `onEditFormat`. */
  let matchUpFormat = params.matchUpFormat;
  /** The switcher's label: which approach is showing. Changed through `update` alongside the region. */
  let approachLabel = params.approachLabel;
  /**
   * The ending state. Seeded from `initialState` when a host is reopening a recorded outcome.
   *
   * The card takes STATE rather than a matchUp deliberately: it knows sides, a format and a region, and
   * nothing about tournament records. `hydrateScoreEntryState` does that translation for the host.
   */
  let state: ScoreEntryState = params.initialState ?? emptyScoreEntryState;
  /**
   * Whether the card OPENED on something — a score, an ending, or a reason code.
   *
   * Read once, before the operator can touch anything, because it is the question *"is there a
   * recorded outcome to remove?"* and the answer must not change as they type and delete.
   *
   * `holdsEntry` is a function declaration and hoists, so this call is safe here; `state` and `region`
   * are both already assigned above.
   */
  const openedOnRecordedOutcome = holdsEntry();
  /**
   * `[Clear]` was pressed at some point.
   *
   * Deliberately never reset. A reset on re-entry was written first and then DELETED, because
   * falsification showed it changed nothing: `submitsAClear` already requires the card to be empty,
   * so the flag is never read while a score exists. Carrying an untested line that looks load-bearing
   * is worse than not having it.
   */
  let clearedRecordedOutcome = false;
  /** Which side's ending panel is open, if any. Presentation only — not part of the outcome. */
  let openPanelSide: SideNumber | undefined;
  let otherMenuOpen = false;
  let approachMenuOpen = false;
  const titleId = `chc-sec-title-${(cardSequence += 1)}`;

  const element = div('chc-sec');
  element.dataset.component = 'scoreEntryCard';

  const headerContainer = div('chc-sec-header');
  const rowsContainer = div('chc-sec-rows');
  const endingsContainer = div('chc-sec-endings');
  const band = div('chc-sec-band');
  const blockContainer = div('chc-sec-score-region');
  const submitButton = button('Submit', 'chc-sec-btn chc-sec-btn-primary');
  const clearButton = button('Clear', CLS_BTN);

  element.append(headerContainer, body(), band, footer());

  /**
   * Enter submits, when Submit is live.
   *
   * The old dialog did this from its input handler; it belongs on the CARD, because it should hold for
   * every approach and because the card is what owns the gate. Listening on the card rather than on the
   * fields also means it works from the endings row and the reason chips, where an operator who has just
   * clicked a walkover reasonably expects Enter to confirm.
   *
   * It does nothing while Submit is disabled — the same gate, not a second opinion about it.
   */
  element.addEventListener('keydown', (event) => {
    if (hasCommandModifier(event)) return;
    if (endingShortcut(event)) return;

    if (event.key !== 'Enter' || submitButton.disabled) return;
    // Not from inside an open menu, where Enter is choosing the item under the cursor.
    if ((event.target as HTMLElement)?.closest('.chc-sec-other-menu')) return;

    event.preventDefault();
    submitButton.click();
  });

  render();

  return {
    element,
    // `refresh` updates ONLY the derived parts — the band and the submit gate. It deliberately does
    // NOT re-render the rows.
    //
    // A score region calls this on every keystroke, and `renderRows` asks the region for fresh cells
    // via `rowCells()`. Re-rendering there would replace the very input being typed into on each
    // character: the value survives (the region holds it) but the ELEMENT does not, so focus and the
    // caret are lost and the operator can enter exactly one digit per click. `refreshDerived` is the
    // seam that keeps a live band from costing a usable keyboard.
    refresh: refreshDerived,
    // A FULL render, for when the region's own structure changes — a tiebreak column appearing, the
    // next set being revealed. Distinct from `refresh` on purpose: this one rebuilds the rows and
    // therefore replaces the region's cells, so a caller must restore focus itself. That is not a
    // hardship where it is used, because a column appearing is exactly when focus should MOVE.
    rerender: render,
    update: (next) => {
      if (next.region) region = next.region;
      if (next.matchUpFormat) matchUpFormat = next.matchUpFormat;
      if (next.approachLabel) approachLabel = next.approachLabel;
      render();
    },
    getState: () => state,
    titleId
  };

  // ── Structure ────────────────────────────────────────────────────────

  /**
   * The header, rebuilt on every render rather than built once.
   *
   * It was build-once, and three things in it are live: the switcher's label, the format chip and the
   * approach menu. Measured 2026-09-27 — the menu never appeared, the label never changed and a format
   * chosen in the picker showed the OLD code, all from the same cause. A control whose state changes
   * cannot live outside the render.
   */
  function renderHeader(): void {
    const bar = headerContainer;
    bar.replaceChildren();
    const heading = text('chc-sec-title', params.title ?? 'Score Entry');
    // A stable id, assigned HERE because the header is rebuilt on every render: an id set from outside
    // would survive exactly until the first approach switch. A host uses it for `aria-labelledby`, so a
    // screen reader announces the dialog by its heading rather than as an unnamed region.
    heading.id = titleId;
    bar.append(heading);
    if (params.context) bar.append(text('chc-sec-context', params.context));
    bar.append(div(CLS_SPACER));
    if (matchUpFormat) bar.append(formatChip(matchUpFormat));

    if (approachLabel) bar.append(approachSwitcher(approachLabel));

    const close = button('', CLS_BTN_ICON);
    close.dataset.action = 'close';
    close.setAttribute(ARIA_LABEL, 'Close');
    close.append(icon('M18 6 6 18M6 6l12 12'));
    close.addEventListener('click', () => params.onClose?.());
    bar.append(close);
  }

  /**
   * The approach switcher, and the menu it opens.
   *
   * The menu is built HERE rather than by the host for the same reason the endings menu is: it shares
   * `.chc-sec-other-menu`'s markup, its check mark and its `aria-pressed`, and a host that rebuilt it
   * would be reimplementing all three. A host that genuinely wants its own control omits `approaches`
   * and gets `onSwitchApproach` instead — the switcher then reports a click and nothing more.
   *
   * The active approach is listed and marked rather than hidden: a menu whose current state is missing
   * from it makes the operator infer what they are looking at from what is absent.
   */
  function approachSwitcher(label: string): HTMLElement {
    const switcher = button(label, CLS_BTN);
    switcher.dataset.action = 'switchApproach';

    if (!params.approaches?.length) {
      switcher.addEventListener('click', () => params.onSwitchApproach?.());
      return switcher;
    }

    // A positioned wrapper, because `.chc-sec-other-menu` anchors to its nearest positioned ancestor and
    // the header itself is not one.
    const anchor = div('chc-sec-approach-anchor');
    switcher.setAttribute('aria-expanded', String(approachMenuOpen));
    switcher.setAttribute('aria-haspopup', 'menu');
    switcher.addEventListener('click', () => {
      approachMenuOpen = !approachMenuOpen;
      otherMenuOpen = false;
      render();
    });
    anchor.append(switcher);

    if (approachMenuOpen) {
      const menu = div(`${CLS_MENU} chc-sec-approach-menu`);
      menu.setAttribute('role', 'menu');
      for (const option of params.approaches) {
        const selected = option.label === label;
        const item = button('', CLS_MENU_ITEM);
        item.dataset.approach = option.key;
        item.setAttribute('role', 'menuitemradio');
        item.setAttribute(ARIA_PRESSED, String(selected));
        const mark = div(CLS_CHECK);
        if (selected) mark.append(icon(CHECK_PATH, 3));
        item.append(mark, text('', option.label));
        item.addEventListener('click', () => {
          approachMenuOpen = false;
          // Rendered BEFORE the callback, so a host that swaps the region through `update` — itself a
          // render — is not racing this one to close the menu.
          render();
          if (!selected) params.onSelectApproach?.(option.key);
        });
        menu.append(item);
      }
      anchor.append(menu);
    }

    return anchor;
  }

  /**
   * The format code, as a button when the host offers an editor and as plain text otherwise.
   *
   * A button only when it does something: a chip that looks pressable and is not is worse than one that
   * looks inert. The accessible name says what editing it means, since `SET3-S:6/TB7` read aloud is not a
   * sentence.
   */
  function formatChip(matchUpFormat: string): HTMLElement {
    if (!params.onEditFormat) return text('chc-sec-format', matchUpFormat);

    const chip = button(matchUpFormat, 'chc-sec-format chc-sec-format-button');
    chip.dataset.action = 'editFormat';
    chip.setAttribute(ARIA_LABEL, `Scoring format ${matchUpFormat} — edit`);
    chip.title = 'Edit the scoring format';
    chip.addEventListener('click', () => params.onEditFormat?.());
    return chip;
  }

  function body(): HTMLElement {
    const main = div('chc-sec-body');
    main.append(rowsContainer, blockContainer, endingsContainer);
    return main;
  }

  function footer(): HTMLElement {
    const bar = div('chc-sec-footer');

    const cancel = button('Cancel', CLS_BTN);
    cancel.dataset.action = 'cancel';
    cancel.addEventListener('click', () => params.onCancel?.());

    clearButton.dataset.action = 'clear';
    clearButton.addEventListener('click', () => {
      // The REGION first: the card owns the ending, the region owns the score, and clearing one without
      // the other is what made this button look broken.
      region.clear?.();
      state = emptyScoreEntryState;
      openPanelSide = undefined;
      otherMenuOpen = false;
      // Only meaningful when there WAS something to remove; see `submitsAClear`.
      clearedRecordedOutcome = true;
      params.onClear?.();
      render();
      // Straight back to where entry begins, as the old dialog does after its reset.
      region.focusFirst?.();
    });

    submitButton.dataset.action = 'submit';
    submitButton.addEventListener('click', () => {
      // An emptied card submits the REMOVAL of what it opened on, and says so rather than leaving a
      // host to infer it from four undefined fields.
      if (submitsAClear()) {
        params.onSubmit?.({ cleared: true });
        return;
      }

      const resolution = currentResolution();
      params.onSubmit?.({
        matchUpStatus: resolution.matchUpStatus,
        // The ending's winner where there is one; the score's otherwise. An ending always wins, because
        // a walkover recorded against a side is an instruction and a completed score is an inference.
        winningSide: resolution.hasEnding ? resolution.winningSide : region.winningSide?.(),
        reasonCode: state.reasonCode,
        // Omitted rather than emptied where the ending clears the score, so a host cannot store a score
        // the card has just said is being discarded.
        score: resolution.clearsScore ? undefined : region.scoreString?.()
      });
    });

    bar.append(cancel, div(CLS_SPACER), clearButton, submitButton);
    return bar;
  }

  // ── Render ───────────────────────────────────────────────────────────

  /** A full render, including the score region's cells. Used on mount and on any ending change. */
  function render(): void {
    const resolution = currentResolution();

    renderHeader();
    renderRows(resolution.winningSide);
    renderBlock();
    renderMatchEndings();
    renderDerived();
  }

  /**
   * A walkover cannot have a score, so while one is selected the score cannot be TYPED.
   *
   * CA, 2026-09-29: *"when I open a modal that already has a WALKOVER I shouldn't also then be able to
   * enter a score, because a WALKOVER by definition can have no score."* The card already knew — it
   * dropped the score at submit (`resolution.clearsScore ? undefined : …`) and the band said "no score
   * recorded" — but the cells stayed live, so an operator could type a set and watch it be silently
   * discarded. Saying it afterwards is not the same as not accepting it.
   *
   * Read from the operator's SELECTION, never from `currentResolution()`. A region can REPORT a
   * score-clearing ending out of text the operator is still typing — Free Score's whole purpose is
   * that `6-4 ret` and a walkover are things you write — and locking that field on what it has parsed
   * so far would lock somebody out of their own sentence mid-word.
   *
   * The ending controls stay live on purpose. Un-selecting the walkover is the way back, and a lock
   * with no way out is a trap rather than a guard.
   *
   * Called from `renderDerived`, so it is recomputed on every keystroke rather than only on a full
   * render. That is what makes the paragraph above TRUE rather than accidental: with the lock on
   * `render()` alone it could not have fired on typed text either way, and the Free Score case would
   * have been protected by an omission instead of by a decision.
   */
  function lockScoreEntry(): void {
    const locked = resolveScoreEntry(state).clearsScore;
    element.dataset.scoreLocked = locked ? 'true' : 'false';

    // The per-set cells live in the ROWS, beside the ending controls, so they are named precisely
    // rather than disabled wholesale — a blanket lock on the row would take the way out with it.
    for (const input of rowsContainer.querySelectorAll<HTMLInputElement>('input.chc-sec-set-input')) {
      applyLock(input, locked);
    }

    // The block is score and nothing else: Free Score's field, the Dial Pad's keypad.
    for (const control of blockContainer.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
      'input, button, textarea, select'
    )) {
      applyLock(control, locked);
    }
  }

  /**
   * Disable a control for the lock, and re-enable ONLY what the lock disabled.
   *
   * `control.disabled = locked` was the first version and it was wrong in the unlock direction: it
   * cleared disabled states the REGION had set for its own reasons. Measured — the Dial Pad disables
   * its `[Tiebreak]` key on a tiebreak-only format, because the cells already are the tiebreak, and
   * unlocking handed that key back. A story caught it, which is the argument for the story.
   *
   * So the lock records what it took and gives back only that.
   */
  function applyLock(control: HTMLInputElement | HTMLButtonElement, locked: boolean): void {
    if (locked) {
      if (control.disabled) return;
      control.disabled = true;
      control.dataset.lockedByEnding = 'true';
      return;
    }

    if (!control.dataset.lockedByEnding) return;
    control.disabled = false;
    delete control.dataset.lockedByEnding;
  }

  /**
   * The resolution in force: the operator's selection, or failing that whatever the region parsed.
   *
   * A selected ending always wins. Only when nothing is selected does a region-reported status apply,
   * which is what keeps Free Score's "6-4 ret" working without letting parsed text override a click.
   */
  function currentResolution(): ScoreEntryResolution {
    const selected = resolveScoreEntry(state);
    if (selected.hasEnding) return selected;

    return resolveReportedEnding(region.matchUpStatus?.(), region.winningSide?.());
  }

  /**
   * Everything that follows from the current state without rebuilding a control.
   *
   * Safe to call on every keystroke, which is the whole reason it is separate.
   */
  function refreshDerived(): void {
    renderDerived();
  }

  /**
   * Whether pressing Submit now means *"remove the recorded outcome"*.
   *
   * Three conditions, and all three are load-bearing:
   *
   *   - `clearedRecordedOutcome` — the operator pressed `[Clear]`. Arriving at an empty card by
   *     backspacing is not the same act, and the shipping modal does not treat it as one either.
   *   - `openedOnRecordedOutcome` — there was something to remove. Submitting blank on a matchUp that
   *     never had a score is a no-op, not a clear, and offering it would be offering nothing.
   *   - `!holdsEntry()` — the card is still empty. This is what makes a clear-then-retype submit the
   *     SCORE rather than a deletion, and it is why `clearedRecordedOutcome` needs no reset.
   *
   * Mirrors `scoringModal.ts`'s `wasCleared && hadExistingScore`, deliberately: this is the behaviour
   * CA asked for by name — *"the current scoring modals allow for an empty score to be submitted which
   * clears a submitted score in the factory for the matchUp being modified"* — so it is the shipping
   * rule reproduced, not a second opinion about it.
   */
  function submitsAClear(): boolean {
    return clearedRecordedOutcome && openedOnRecordedOutcome && !holdsEntry();
  }

  function renderDerived(): void {
    lockScoreEntry();

    const resolution = currentResolution();
    renderBand(resolution);

    // ── The submit gate ──
    //
    // Live when an ending resolves, OR when the score region says the score is a finished result. The
    // OR is the point: the 95% case is a played-out match with no ending at all, and gating on the
    // ending alone would make Submit dead for it. Gating on the score alone would make a walkover
    // unsubmittable, which is the bug the four approaches each fixed differently.
    //
    // A region-reported ERROR closes it regardless. An impossible score stays impossible however it was
    // qualified: a 3-7 is not made submittable by also being marked Suspended.
    const scoreIsResult = !!region.isComplete?.();
    const scoreError = region.error?.();
    submitButton.disabled =
      !!scoreError || !(submitsAClear() || resolution.isValid || (!resolution.hasEnding && scoreIsResult));

    // Nothing to clear is not the same as a clear that does nothing: the old dialog disables the button,
    // which is the honest signal. An ENDING counts as something to clear even with no score typed.
    clearButton.disabled = !holdsEntry();
  }

  /** Whether anything at all has been entered — a score, or an ending. */
  function holdsEntry(): boolean {
    return !!(state.sideEnding || state.matchEnding || state.reasonCode || region.hasEntry?.());
  }

  // ── The per-side ending shortcuts: w/W, r/R, d/D ──────────────────────

  /**
   * Record a side ending from a letter, and open that row's panel.
   *
   * Returns whether the key was consumed, so the caller leaves Enter alone.
   *
   * A TOGGLE, like every control in the card: `chooseSideEnding` clears an ending already selected on
   * that side, so pressing `w` twice leaves the card exactly where it started and closes the panel
   * with it. That is what CA asked for in the word "toggles", and it is the same reachable-empty-state
   * rule the buttons already follow.
   *
   * The panel is OPENED rather than merely marked, because the reason codes live inside it and a
   * walkover recorded with no way to say why is half the entry. Focus follows to the ending that was
   * just selected — the render replaces every control in the card, so without this an operator who
   * typed `w` from a score cell would be left on the document body.
   */
  function endingShortcut(event: KeyboardEvent): boolean {
    if (event.key.length !== 1) return false;
    if (consumesLetters(event.target)) return false;

    const status = SIDE_ENDING_KEYS[event.key.toLowerCase()];
    if (!status) return false;

    // Upper case names the UPPER row. Read from the character rather than from `shiftKey`, so Caps
    // Lock means the same thing as Shift — the operator is looking at a capital either way.
    const sideNumber: SideNumber = event.key === event.key.toUpperCase() ? otherSide(ENTRY_SIDE) : ENTRY_SIDE;

    event.preventDefault();
    state = chooseSideEnding(state, sideNumber, status);
    openPanelSide = state.sideEnding ? sideNumber : undefined;
    otherMenuOpen = false;
    render();
    focusAfterShortcut(sideNumber, status);
    return true;
  }

  /**
   * Where focus goes once a shortcut has redrawn the card.
   *
   * On the ending just chosen, inside the panel, so the reason chips are one Tab away. On the row's
   * opener when the press cleared the ending instead, which is where the operator was conceptually
   * standing and keeps a second press of the same letter working.
   */
  function focusAfterShortcut(sideNumber: SideNumber, status: string): void {
    const selector = state.sideEnding
      ? `[data-panel-side="${sideNumber}"] button[data-ending="${status}"]`
      : `button[data-action="endedEarly"][data-side="${sideNumber}"]`;
    element.querySelector<HTMLElement>(selector)?.focus();
  }

  /**
   * Whether the focused element is a field that letters legitimately belong in.
   *
   * The per-set cells are digits-only — `digitsOnly` strips anything else — so a `w` there means
   * nothing and is free to be a shortcut, which is what makes the letters work while entering a score
   * in Dynamic Sets. Free Score's field is the opposite case: `6-4 ret` is the entire reason that
   * approach exists, so its letters must reach the field. An operator in Free Score reaches the
   * shortcuts by tabbing out of the field, exactly as they reach any other control in the card.
   */
  function consumesLetters(target: EventTarget | null): boolean {
    const focused = target as HTMLElement | null;
    if (!focused) return false;
    if (focused.isContentEditable) return true;
    if (focused.tagName === 'TEXTAREA') return true;
    if (focused.tagName !== 'INPUT') return false;

    return !focused.classList.contains('chc-sec-set-input');
  }

  function renderRows(winningSide?: number): void {
    rowsContainer.replaceChildren();

    const columns = region.columns?.() ?? [];
    const scoreTracks = columns.map((column) => column.width ?? `${SCORE_COLUMN_PX}px`).join(' ');
    // Past the point where a name fits beside them, the columns take the whole row and the name floats
    // onto a line of its own — above its cells for the upper participant, beneath them for the lower.
    const stacked = columns.length > MAX_INLINE_SCORE_COLUMNS;
    // No trailing action track: the ending control moved into the name cell (see `participantRow`), which
    // returns its width to the participant and stops the row ending in something shaped like an overflow
    // menu.
    const template = stacked ? scoreTracks : `1fr ${scoreTracks}`;

    // A header row only when at least one column is labelled. Free Score and the Dial Pad have a
    // single unlabelled readout column, and an empty header strip above it would be furniture.
    if (columns.some((column) => column.heading)) {
      const head = div('chc-sec-row-head');
      head.style.gridTemplateColumns = template;
      // No PLAYER label once the names are not in a column — it would head a track that holds scores.
      const headings = columns.map((column) => columnHeading(column.heading ?? ''));
      head.append(...(stacked ? headings : [text('', 'PLAYER'), ...headings]));
      rowsContainer.append(head);
    }

    for (const sideNumber of [1, 2] as SideNumber[]) {
      rowsContainer.append(participantRow(sideNumber, template, winningSide, stacked));
      if (openPanelSide === sideNumber) rowsContainer.append(sidePanel(sideNumber));
    }
  }

  /**
   * One participant's row.
   *
   * ── The ending control lives IN the name cell, not in a column of its own ──
   *
   * It used to occupy a dedicated 56px track at the row's end, holding a warning triangle. CA,
   * 2026-09-27: *"is the /!\ strictly necessary on both participant lines? ... I'm just trying to be a
   * bit more different ... and also limit the width of the dialog"*. The elision is a comparison to
   * another vendor's dialog, which has no place in this codebase.
   *
   * The answer to the first part is that the ROW is the mechanism — an ending chosen here names the side
   * it happened to, which is what deletes the separate winner question — so it cannot become a single
   * control beside the match-level endings without that question coming back. But the COLUMN can go, and
   * that addresses both of CA's concerns at once: 62px of width returns to the name, and a trailing
   * icon button at the row's end is exactly the shape that read as an overflow menu.
   *
   * So the participant's name IS the control. Unselected it is a quiet button with a chevron; selected it
   * carries a solid pill naming the ending, which is the language the walkover artboard already used —
   * the triangle was only ever the unselected face of the same thing.
   */
  function participantRow(
    sideNumber: SideNumber,
    template: string,
    winningSide?: number,
    stacked = false
  ): HTMLElement {
    const side = params.sides[sideNumber - 1];

    // ── A double exit happened to BOTH sides, so both rows say so ──
    //
    // CA, 2026-09-27: "If 'no one advances' is selected shouldn't (Defaulted) or (Walkover) chip appear
    // next to the other player as well?" Yes. The ending is RECORDED against one row because that is how
    // it is entered, but "neither appeared" is a statement about both of them — showing it on one row
    // implied the other had merely lost, which is the opposite of what a double exit means.
    const selected = state.sideEnding;
    const ending = selected && (selected.sideNumber === sideNumber || state.bothSidesOut) ? selected : undefined;

    const row = div('chc-sec-row');
    row.style.gridTemplateColumns = template;
    row.dataset.side = String(sideNumber);
    row.dataset.stacked = String(stacked);
    // `ended` still marks only the row the ending was entered against: it drives the strike-through, and
    // striking BOTH names through would read as neither having played rather than neither advancing.
    row.dataset.ended = String(selected?.sideNumber === sideNumber);
    row.dataset.bothOut = String(!!state.bothSidesOut);
    row.dataset.winner = String(winningSide === sideNumber);

    const participant = div('chc-sec-participant');
    const check = div(CLS_CHECK);
    if (winningSide === sideNumber) check.append(icon(CHECK_PATH, 3));

    // `data-action="endedEarly"` is kept from the icon-button version, so tests and any journey that
    // learned the hook keep working across the move.
    const opener = button('', 'chc-sec-opener');
    opener.dataset.action = 'endedEarly';
    opener.dataset.side = String(sideNumber);
    opener.title = 'How did this match end for them?';
    // Both the name and the function, because the label REPLACES the visible text for a screen reader —
    // "ended early" alone would read identically on both rows, and the name alone would not say what the
    // button does.
    const named = side.seed ? `${side.participantName} ${side.seed}` : side.participantName;
    opener.setAttribute(ARIA_LABEL, `${named} — ended early`);
    opener.setAttribute(ARIA_EXPANDED, String(openPanelSide === sideNumber));
    opener.setAttribute(ARIA_PRESSED, String(!!ending));

    opener.append(text('chc-sec-name', side.participantName));
    if (side.seed) opener.append(text('chc-sec-seed', side.seed));
    opener.append(icon('m6 9 6 6 6-6', 2.5));
    opener.addEventListener('click', () => {
      openPanelSide = openPanelSide === sideNumber ? undefined : sideNumber;
      otherMenuOpen = false;
      render();
    });

    participant.append(check, opener);

    // The selected ending, named on the row it belongs to. This is what the warning triangle was standing
    // in for, and saying it outright means the row reports its own state instead of relying on a strike-
    // through nobody reads as "walkover".
    if (ending) {
      const pill = div('chc-sec-row-ending');
      pill.dataset.rowEnding = ending.status;
      pill.textContent = labels[ending.status] ?? ending.status;
      participant.append(pill);
    }

    const cells = region.rowCells?.(sideNumber) ?? [];

    // ── Stacked: the name straddles the columns, on the side of them its row faces ──
    //
    // Order alone places it, because `.chc-sec-participant` spans every track when stacked: put it
    // FIRST and the cells flow onto the grid line beneath it, put it LAST and they flow above. So the
    // upper participant's name sits over its own scores and the lower participant's under theirs,
    // which keeps each name adjacent to the row it names rather than both drifting to one edge.
    if (stacked && sideNumber === ENTRY_SIDE) row.append(...cells, participant);
    else row.append(participant, ...cells);

    return row;
  }

  function sidePanel(sideNumber: SideNumber): HTMLElement {
    const side = params.sides[sideNumber - 1];
    const panel = div('chc-sec-side-panel');
    panel.dataset.panelSide = String(sideNumber);
    panel.append(text('chc-sec-side-panel-head', `What happened to ${side.participantName}?`));

    const inner = div('chc-sec-side-panel-body');

    for (const status of sideEndingOptions()) {
      const selected = state.sideEnding?.sideNumber === sideNumber && state.sideEnding.status === status;
      const option = button('', 'chc-sec-btn chc-sec-side-option');
      option.dataset.ending = status;
      option.setAttribute(ARIA_PRESSED, String(selected));

      const stack = div('chc-sec-side-option-label');
      stack.append(text('', labels[status] ?? status));
      const hint = SIDE_ENDING_HINTS[status];
      if (hint) stack.append(text('chc-sec-side-option-hint', hint));
      option.append(stack);

      option.addEventListener('click', () => {
        state = chooseSideEnding(state, sideNumber, status);
        render();
      });
      inner.append(option);
    }

    const reasonStatus = reasonCodeStatus(state);
    const codes =
      state.sideEnding?.sideNumber === sideNumber ? codesForStatus(params.statusCodeGroups, reasonStatus) : [];
    if (codes.length) {
      // No " - USTA" or " - USTA Policy" beside the heading (CA, 2026-09-27): the codes on offer come
      // from whatever policy is attached, and naming a governing body here would be wrong the moment
      // it is a different one.
      inner.append(text('chc-sec-reason-head', 'REASON'));
      const chips = div('chc-sec-reasons');
      for (const entry of codes) {
        const code = entry.matchUpStatusCode;
        const chip = button(statusCodeDisplay(entry), CLS_BTN_PILL);
        chip.dataset.reason = code;
        chip.setAttribute(ARIA_PRESSED, String(state.reasonCode === code));
        const subtext = statusCodeSubtext(entry);
        if (subtext) chip.title = subtext;
        chip.addEventListener('click', () => {
          state = chooseReasonCode(state, code);
          render();
        });
        chips.append(chip);
      }
      inner.append(chips);
    }

    if (state.sideEnding?.sideNumber === sideNumber && offersBothSidesOut(state)) {
      const other = params.sides[sideNumber === 1 ? 1 : 0];
      const label = document.createElement('label');
      label.className = 'chc-sec-both-out';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!state.bothSidesOut;
      box.dataset.action = 'bothSidesOut';
      box.addEventListener('change', () => {
        state = toggleBothSidesOut(state);
        render();
      });
      label.append(box, text('', `${other.participantName} did not appear either — no one advances`));
      inner.append(label);
    }

    panel.append(inner);
    return panel;
  }

  function renderBlock(): void {
    blockContainer.replaceChildren();
    const block = region.block?.();
    if (block) blockContainer.append(block);
  }

  function renderMatchEndings(): void {
    endingsContainer.replaceChildren();

    const all = matchEndingOptions();
    const privileged = all.filter((status) => PRIVILEGED_MATCH_ENDINGS.includes(status));
    const others = all.filter((status) => !PRIVILEGED_MATCH_ENDINGS.includes(status));

    for (const status of privileged) {
      endingsContainer.append(matchEndingButton(status, labels[status] ?? status));
    }

    if (!others.length) return;

    const otherSelected = !!state.matchEnding && others.includes(state.matchEnding);
    const other = button('Other…', CLS_BTN_PILL);
    other.dataset.action = 'other';
    // Solid when the selection was made INSIDE it, so the row still shows one selection whether it
    // came from a privileged button or from the menu.
    other.setAttribute(ARIA_PRESSED, String(otherSelected));
    other.setAttribute(ARIA_EXPANDED, String(otherMenuOpen));
    other.append(icon('m6 9 6 6 6-6', 2.5));
    other.addEventListener('click', () => {
      otherMenuOpen = !otherMenuOpen;
      render();
    });
    endingsContainer.append(other);

    if (!otherMenuOpen) return;

    const menu = div(CLS_MENU);
    for (const status of others) {
      const selected = state.matchEnding === status;
      const item = button('', CLS_MENU_ITEM);
      item.dataset.ending = status;
      item.setAttribute(ARIA_PRESSED, String(selected));
      const mark = div(CLS_CHECK);
      if (selected) mark.append(icon(CHECK_PATH, 3));
      item.append(mark, text('', labels[status] ?? status));
      item.addEventListener('click', () => {
        state = chooseMatchEnding(state, status);
        otherMenuOpen = false;
        render();
      });
      menu.append(item);
    }
    endingsContainer.append(menu);
  }

  function matchEndingButton(status: string, label: string): HTMLButtonElement {
    const control = button(label, CLS_BTN_PILL);
    control.dataset.ending = status;
    control.setAttribute(ARIA_PRESSED, String(state.matchEnding === status));
    control.addEventListener('click', () => {
      state = chooseMatchEnding(state, status);
      otherMenuOpen = false;
      render();
    });
    return control;
  }

  function renderBand(resolution: ReturnType<typeof resolveScoreEntry>): void {
    // An integrity failure outranks everything else the band might say. Reporting "not a finished result"
    // for a 3-7 would be true and useless; the operator needs to know WHICH set is wrong and why.
    const scoreError = region.error?.();
    if (scoreError) {
      band.replaceChildren();
      band.dataset.tone = 'warn';
      band.setAttribute('role', 'status');
      band.append(text(CLS_BAND_HEADLINE, scoreError));
      // The control stays reachable while the score is wrong: switching complements off is one of the ways
      // an operator FIXES a score they did not mean to accept.
      appendBandControl(true);
      return;
    }

    // An emptied card that opened on an outcome is NOT "no result entered yet" — that headline is what
    // a blank new entry says, and it would leave the operator reading the same words for "nothing here"
    // and "about to delete what was here". The band is where this card says what Submit will do.
    //
    // ONE line, and CA's own words for it (2026-09-29): *"It's enough to state: 'The recorded result
    // will be removed — Submit to clear it.'"* A first draft added a second clause, "Enter a score to
    // keep it", which the card already demonstrates the moment anything is typed. Kept as a single
    // headline with no detail, so it reads as one statement rather than an instruction with a caveat.
    if (submitsAClear()) {
      band.replaceChildren();
      band.dataset.tone = 'warn';
      band.setAttribute('role', 'status');
      band.append(text(CLS_BAND_HEADLINE, labels.clearedHeadline ?? CLEARED_HEADLINE));
      appendBandControl(true);
      return;
    }

    const reasonStatus = reasonCodeStatus(state);
    const entry = codesForStatus(params.statusCodeGroups, reasonStatus).find(
      (candidate) => candidate.matchUpStatusCode === state.reasonCode
    );

    const summary = scoreEntrySummary({
      resolution,
      sideNames: [params.sides[0].participantName, params.sides[1].participantName],
      scoreString: region.scoreString?.(),
      scoreComplete: region.isComplete?.(),
      scoreWinningSide: region.winningSide?.(),
      reasonDisplay: entry ? statusCodeDisplay(entry) : undefined,
      labels
    });

    band.replaceChildren();
    band.dataset.tone = summary.tone;
    // `role="status"` so the band is announced when it changes — it is the confirmation that a
    // part-score is about to be discarded, and a sighted-only confirmation is not one.
    band.setAttribute('role', 'status');
    band.append(text(CLS_BAND_HEADLINE, summary.headline));
    if (summary.detail) {
      band.append(div(CLS_SPACER), text(CLS_BAND_DETAIL, summary.detail));
    }
    appendBandControl(!summary.detail);
  }

  /**
   * The region's compact control, on the band's right edge.
   *
   * Rendered last so it sits after the detail text, and given its own spacer when there is no detail to
   * push it over — otherwise it would sit against the headline rather than at the edge.
   */
  function appendBandControl(needsSpacer: boolean): void {
    const control = region.bandControl?.();
    if (!control) return;
    if (needsSpacer) band.append(div(CLS_SPACER));
    band.append(control);
  }
}

// ── Small DOM helpers ──────────────────────────────────────────────────

function div(className: string): HTMLDivElement {
  const element = document.createElement('div');
  if (className) element.className = className;
  return element;
}

function text(className: string, content: string): HTMLDivElement {
  const element = div(className);
  element.textContent = content;
  return element;
}

/**
 * A score-column heading, centred by the same property the input under it uses.
 *
 * Previously `text-align: center` on a stretched grid item. That aligned with the input's
 * `margin: 0 auto` only because both happened to centre in the same track — a coincidence of two
 * unrelated mechanisms, and the kind that survives review and then breaks under an unrelated edit.
 */
function columnHeading(content: string): HTMLDivElement {
  return text('chc-sec-col-head', content);
}

function button(label: string, className: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  if (label) element.textContent = label;
  return element;
}

/** An inline stroke SVG. Never emoji, and never a font icon. */
function icon(path: string, strokeWidth = 2): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // Decorative: the accessible name is on the button, so a duplicate here would be read twice.
  svg.setAttribute('aria-hidden', 'true');
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  node.setAttribute('d', path);
  svg.append(node);
  return svg;
}
