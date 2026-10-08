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

import { NON_DIRECTING_ENDINGS, NO_SCORE_STATUSES, endingLabels } from './logic/irregularEnding';
import { chooseEnding, changeFormat, clearScore, clearAll } from './logic/scoreEntryModel';
import { statusCodeSubtext, statusCodeDisplay, codesForStatus } from './logic/statusCodes';
import { ENTRY_SIDE, hasCommandModifier, otherSide } from './keyboard';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { createScoreEntryStore } from './logic/scoreEntryStore';
import { scoreEntrySummary } from './logic/scoreEntrySummary';
import {
  discardedScore,
  resolveEnding,
  scoreString,
  winningSide,
  isComplete,
  hasEntry,
  error
} from './logic/scoreEntrySelectors';
import {
  offersBothSidesOut,
  matchEndingOptions,
  resolveReportedEnding,
  sideEndingOptions,
  reasonCodeStatus
} from './logic/scoreEntryState';

import type { ScoreEntryState, ScoreEntryResolution, SideNumber } from './logic/scoreEntryState';
import type { ScoreEntryModel, EndingIntent } from './logic/scoreEntryModel';
import type { ScoreEntryStore } from './logic/scoreEntryStore';
import type { StatusCodeGroups } from './logic/statusCodes';

import './scoreEntryCard.css';

const { RETIRED, WALKOVER, DEFAULTED } = matchUpStatusConstants;

/** Class names and attribute names used often enough that a typo in one would be silent. */
const CLS_BTN = 'chc-sec-btn';
const CLS_BTN_PILL = 'chc-sec-btn chc-sec-btn-pill';
const CLS_CHECK = 'chc-sec-check';
const CLS_MENU = 'chc-sec-other-menu';
const CLS_MENU_ITEM = 'chc-sec-other-item';
const ARIA_LABEL = 'aria-label';
const CLS_SPACER = 'chc-sec-spacer';
/** What the endings chip reads while nothing has been chosen from its menu. */
const OTHER_LABEL = 'Other…';
/** The same word without the ellipsis, for `Other: Cancelled` — an ellipsis promises a dialog, not a value. */
const OTHER_LABEL_BASE = 'Other';
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
 * The phone breakpoint, the same query the stylesheet uses for every other phone rule.
 *
 * Below it the rows take the STACKED layout whatever the column count — CA, 2026-10-08, a screenshot of
 * Dynamic Sets on a phone: each row had collapsed to a name over one input stretched across the whole
 * width, with the set headings hidden. That was the stylesheet flattening the grid to a single column.
 * The stacked layout already solves the same problem for formats too wide to sit beside a name: the name
 * takes its own line and the cells keep their 52px columns under their headings, which fit a 390px
 * screen up to best-of-five.
 *
 * A media query rather than a measurement, for the reason the column count is counted: it gives the same
 * answer in happy-dom (stubbed) as in a browser. Read at every render, so a rotation is picked up by the
 * next keystroke rather than needing a listener the card would have to remove.
 */
const PHONE_QUERY = '(width <= 560px)';

function isPhoneViewport(): boolean {
  return globalThis.matchMedia?.(PHONE_QUERY).matches ?? false;
}

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

/**
 * What a score region IS, now that the card holds the model: render, and intent.
 *
 * S5 of the state-engine extraction. This contract used to carry fourteen members, six of which were
 * ANSWERS — `scoreString`, `isComplete`, `winningSide`, `error`, `hasEntry`, `getSets` — computed by each
 * region on the spot from its private copy of the score. Those are selectors over the model now, asked
 * by the card, and a region that still answered them would be a second opinion the card ignores.
 *
 * What is left is what a region genuinely knows and the model cannot: how to DRAW the score (cells,
 * a block, a control for the band), where entry begins, what is its own to reset after the model was
 * emptied, and — for Free Score only — what the TEXT says that the model cannot represent: an ending
 * parsed out of it, and a half-typed field.
 */
export type ScoreRegion = {
  /**
   * The store the region renders, when it made its own.
   *
   * A region built standalone — the behavioural tests, or a host placing a card inline — creates a store
   * from its params, and the card adopts it so the two share one model. A host that opens the dialog
   * gives the same store to the card and every region, and this is never consulted.
   */
  store?: ScoreEntryStore;
  /** The columns this region contributes to each participant row. */
  columns?: () => ScoreColumn[];
  /** The cells to place in one side's row. Must return one per column. */
  rowCells?: (sideNumber: SideNumber) => HTMLElement[];
  /** A block beneath the rows — a text field, or a keypad. */
  block?: () => HTMLElement;
  /**
   * A compact control the region wants in the result band's right edge rather than in a row of its own.
   *
   * CA, 2026-09-27, on the smart-complements checkbox: *"I don't think '[] Smart Complements' should take
   * up a whole row of the modal. I think it can be a little icon to the far right side of the row where you
   * have 'No result entered yet'. Just (Smart) maybe, something compact that toggles."*
   *
   * It stays a REGION concern — it is a Dynamic Sets behaviour and nothing else reads it — so the region
   * supplies the element and the card only decides where it sits.
   */
  bandControl?: () => HTMLElement | undefined;
  /**
   * A matchUpStatus the region itself parsed out of what was typed — Free Score only.
   *
   * REPORTED, not selected: an inference about the text, which never enters the model's `ending`. Used
   * ONLY when the operator has selected no ending. See `resolveReportedEnding` for why that precedence
   * and not the other.
   */
  matchUpStatus?: () => string | undefined;
  /**
   * Reset what is the region's own after the card has emptied the model: a text field, a keypad mode,
   * the set under edit. The score itself is already gone by the time this is called.
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
   * Entry the MODEL cannot see — Free Score's half-typed text. The card asks the model first and this
   * second, so a `6-4 re` mid-word still counts as something to lose.
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
  /**
   * The model, when the host holds it — the dialog does, and shares it with every region it builds.
   * Omitted, the card adopts the region's own store, or makes one.
   */
  store?: ScoreEntryStore;
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
};

/** A card instance: its element, plus the handle the host needs to react to score-region changes. */
/** Per-card, so two cards on one page do not both claim `#chc-sec-title-1`. */
let cardSequence = 0;

export type ScoreEntryCard = {
  element: HTMLElement;
  /**
   * Close an open menu (the approach switcher's or Other's) and report whether one was open. The dialog's
   * Escape calls it first, wherever focus is, so one Escape closes the menu and a second one cancels.
   */
  closeMenus: () => boolean;
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
  /** The store the card renders, for a host that builds regions on it. */
  store: ScoreEntryStore;
  /** The model as it stands. */
  getModel: () => ScoreEntryModel;
  /** The current ending state — `getModel().ending` — for a host that needs to inspect it. */
  getState: () => ScoreEntryState;
  /** Whether anything at all has been entered: a score, an ending, or text the model cannot see. */
  holdsEntry: () => boolean;
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
   * The one model, in the store the host gave, or the region made, or — a card with neither — one of
   * its own. `initialState` seeds the ENDING when a host is reopening a recorded outcome; the card takes
   * state rather than a matchUp deliberately, because it knows sides, a format and a region, and nothing
   * about tournament records. `hydrateScoreEntryState` does that translation for the host.
   */
  let store: ScoreEntryStore =
    params.store ?? params.region.store ?? createScoreEntryStore({ matchUpFormat: params.matchUpFormat });
  if (params.initialState) store.set({ ...store.get(), ending: params.initialState });
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
  /**
   * The score an ending discarded, kept for the BAND alone.
   *
   * Never re-entered into the region and never submitted: it is a past tense, not a value.
   */
  let scoreDiscardedByEnding: string | undefined;
  /** Which side's ending panel is open, if any. Presentation only — not part of the outcome. */
  let openPanelSide: SideNumber | undefined;
  let otherMenuOpen = false;
  /** The reposition handler while the endings menu is open, so it can be removed when it closes. */
  let trackedEndingsMenu: (() => void) | undefined;
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
   * While a menu is open, a click anywhere else in the card CLOSES the menu and does nothing else — CA,
   * 2026-10-08: *"other actions can still be taken while the mode selector is open!"* Capture phase, so the
   * click is stopped before it reaches the control under it; a menu's own items and the two buttons that
   * open the menus are let through (a trigger switches menus or closes its own). Pointer-down is stopped
   * too, so the click cannot first move focus into a score cell.
   */
  const MENU_PARTS = `.${CLS_MENU}, [data-action="other"], [data-action="switchApproach"]`;
  const shieldMenus = (event: Event) => {
    if (!approachMenuOpen && !otherMenuOpen) return;
    if ((event.target as HTMLElement | null)?.closest(MENU_PARTS)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'click') closeMenus();
  };
  element.addEventListener('pointerdown', shieldMenus, true);
  element.addEventListener('mousedown', shieldMenus, true);
  element.addEventListener('click', shieldMenus, true);

  /** Close whichever menu is open; whether one was. The dialog calls this on Escape, before Cancel. */
  function closeMenus(): boolean {
    if (!approachMenuOpen && !otherMenuOpen) return false;
    approachMenuOpen = false;
    otherMenuOpen = false;
    render();
    return true;
  }

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
    if (tabFromScoreToSubmit(event)) return;

    if (event.key !== 'Enter' || submitButton.disabled) return;
    // Not from inside an open menu, where Enter is choosing the item under the cursor.
    if ((event.target as HTMLElement)?.closest('.chc-sec-other-menu')) return;

    event.preventDefault();
    submitButton.click();
  });

  render();

  return {
    element,
    closeMenus,
    // `refresh` updates ONLY the derived parts — the band and the submit gate. It deliberately does
    // NOT re-render the rows.
    //
    // A score region calls this on every keystroke, and `renderRows` asks the region for fresh cells
    // via `rowCells()`. Re-rendering there would replace the very input being typed into on each
    // character: the value survives (the region holds it) but the ELEMENT does not, so focus and the
    // caret are lost and the operator can enter exactly one digit per click. `refreshDerived` is the
    // seam that keeps a live band from costing a usable keyboard.
    refresh: onScoreChanged,
    // A FULL render, for when the region's own structure changes — a tiebreak column appearing, the
    // next set being revealed. Distinct from `refresh` on purpose: this one rebuilds the rows and
    // therefore replaces the region's cells, so a caller must restore focus itself. That is not a
    // hardship where it is used, because a column appearing is exactly when focus should MOVE.
    rerender: render,
    update: (next) => {
      if (next.matchUpFormat) {
        matchUpFormat = next.matchUpFormat;
        // The MODEL changes format, keeping what the new format has not invalidated — the factory's
        // judgement, through `changeFormat`. Pass the format BEFORE a region built for it, since a region
        // reads the set count off the model when it is made.
        //
        // A HALF-TYPED set survives where its rule is unchanged. CA had allowed its loss on 2026-09-29
        // (*"i think it is fine for half-typed sets to be discarded"*) when the dialog harvested only
        // whole sets; asked again on 2026-10-01, with the model able to keep it, he chose to keep it —
        // which is `retainScoreForFormat`'s rule 2, written for exactly the operator who corrects the
        // decider mid-set.
        store.set(changeFormat(model(), next.matchUpFormat));
      }
      if (next.region) {
        region = next.region;
        // A host that built the new region on a store of its own carries the score itself; the ENDING
        // is the card's and goes with it, because a walkover recorded against a row is a fact about the
        // match, not about the approach used to type it.
        if (next.region.store && next.region.store !== store) {
          next.region.store.set({ ...next.region.store.get(), ending: chosen() });
          store = next.region.store;
        }
      }
      if (next.approachLabel) approachLabel = next.approachLabel;
      render();
    },
    store,
    getModel: model,
    getState: chosen,
    holdsEntry,
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
    // No [X]. CA, 2026-10-08: "do we need the [X] at all given we have both ESC for computer and [Cancel]
    // in both views?" It did exactly what Cancel does, and on a phone it wrapped to the middle of the header.
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
      // The MODEL first — score and ending together, which is what made this button look broken when
      // they lived apart — then the region resets what is its own.
      store.set(clearAll(model()));
      region.clear?.();
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
        winningSide: resolution.hasEnding ? resolution.winningSide : winningSide(model()),
        reasonCode: chosen().reasonCode,
        // Omitted rather than emptied where the ending clears the score, so a host cannot store a score
        // the card has just said is being discarded.
        score: resolution.clearsScore ? undefined : scoreString(model())
      });
    });

    bar.append(cancel, div(CLS_SPACER), clearButton, submitButton);
    return bar;
  }

  // ── The model ────────────────────────────────────────────────────────

  function model(): ScoreEntryModel {
    return store.get();
  }

  /** The operator's ending selection — `model.ending`, the existing engine folded in. */
  function chosen(): ScoreEntryState {
    return model().ending;
  }

  /** Every ending control goes through here: one transition, one new model. */
  function choose(intent: EndingIntent): void {
    store.set(chooseEnding(model(), intent));
  }

  /**
   * Whether the SCORE is a finished result.
   *
   * The model's `isComplete`, with the parser's rule kept for Free Score: a region-reported ending means
   * the text is not claiming a finished match — `6-4 6-3 ret` is a retirement with a score — so the
   * score stops being a result the moment the text says how the match ended instead.
   */
  function scoreIsFinished(): boolean {
    return isComplete(model()) && !region.matchUpStatus?.();
  }

  /** The model's integrity message, naming the participants rather than "side 1". */
  function scoreError(): string | undefined {
    return error(model(), { sideNames: [params.sides[0].participantName, params.sides[1].participantName] });
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
    const locked = resolveEnding(model()).clearsScore;
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
   * Tab out of the score and straight to `[Submit]`, then on to the status chips.
   *
   * CA, 2026-09-30: *"Can the tab order go from the free score entry field or the last dynamic sets
   * entry field directly to [Submit] (when submit is active)? and then to the other status chips?"*
   *
   * Reading `event.defaultPrevented` is what makes this work for all three approaches without a new
   * region contract. Dynamic Sets already owns Tab — it walks DOWN each column rather than across the
   * row, because the DOM order of the grid is wrong for entry — and it calls `preventDefault` on every
   * step it takes. The ONE Tab it does not take is the one off the end of the run, which is exactly the
   * Tab meant here. Free Score never takes any, so its single field reaches this on the first press.
   *
   * Restricted to fields. The Dial Pad's keypad lives in the same block and tabbing between its keys
   * must keep working, so a button is never treated as the end of a score.
   *
   * Forward only. Shift+Tab is left to the browser: reversing this would mean deciding which cell "the
   * last one" was, and a wrong guess there is worse than the native order. The consequence — the path
   * forward is not the path back — is a real cost and is stated rather than hidden.
   */
  function tabFromScoreToSubmit(event: KeyboardEvent): boolean {
    if (event.key !== 'Tab' || event.shiftKey || event.defaultPrevented) return false;

    const target = event.target as HTMLElement | null;
    if (!target) return false;

    if (isScoreField(target)) {
      // Nothing to jump to while the gate is shut; the native order still reaches the endings.
      if (submitButton.disabled) return false;
      event.preventDefault();
      submitButton.focus();
      return true;
    }

    if (target === submitButton) {
      // The first chip that can take focus: on a finished score the leading endings are refused and
      // disabled (`refreshEndingAvailability`), and a disabled button cannot be focused.
      const firstChip = endingsContainer.querySelector<HTMLElement>('button:not([disabled])');
      if (!firstChip) return false;
      event.preventDefault();
      firstChip.focus();
      return true;
    }

    return false;
  }

  /** A field a score is TYPED into: a set cell, or Free Score's one field. Never a keypad key. */
  function isScoreField(target: HTMLElement): boolean {
    if (target.classList.contains('chc-sec-set-input')) return true;
    const typable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    return typable && blockContainer.contains(target);
  }

  /**
   * Discard the typed score when the chosen ending cannot have one.
   *
   * CA, 2026-09-30: *"when I enter set score(s) and then select (Walkover) the set score(s) should
   * clear."* The card already refused to SUBMIT the score (`resolution.clearsScore ? undefined : …`)
   * and said "no score recorded" in the band, and `lockScoreEntry` stops further typing — but the
   * digits stayed in the cells, so the operator read a walkover with a 6-4 beside it.
   *
   * Irreversible, and deliberately so: there is no undo here, and toggling the walkover back off does
   * not bring the score back. That matches `[Clear]`, which is also final, and the alternative — a
   * remembered score that silently reappears — is worse.
   *
   * Driven by `carriesNoScore` through `resolveScoreEntry`, so the set of endings that clear is the
   * one place it is already declared: WALKOVER, DOUBLE_WALKOVER, CANCELLED, DEAD_RUBBER. **DEFAULTED
   * is NOT in it**, and that is now CA's ruling rather than an open question (2026-10-04): *"keep the
   * score (and then refuse Defaulted on a complete score)"*. A default DURING a match keeps the score
   * it was defaulted at; the refusal half lives in `endingOffered` and
   * `retractEndingContradictedByScore`, below.
   */
  function clearScoreWhenEndingCarriesNone(): void {
    if (!resolveEnding(model()).clearsScore) {
      scoreDiscardedByEnding = undefined;
      return;
    }

    // Remembered ONLY so the band can still name what it took. Four existing tests assert that
    // Cancelled quotes the part-score it discards — "the part-score of 6-4 has been cleared" — and
    // clearing the cells destroys the very string that message is made of. Dropping the message would
    // have been the easy way to make them pass, and would have removed the confirmation that a
    // part-score was lost at the one moment it matters.
    //
    // Decided in S5, deliberately: this stays a PRESENTATION past tense in the card, and the model's sets
    // are emptied for real through `clearScore`. The alternative — keep the sets and let the selectors
    // suppress them — would bring the score back on an approach switch, which CA reported as a bug on
    // 2026-09-30 and `clearedScoreStaysCleared.test.ts` forbids.
    const held = discardedScore(model());
    if (held) scoreDiscardedByEnding = held;
    store.set(clearScore(model()));
    region.clear?.();
  }

  /**
   * Whether an ending can be chosen at all, given the score.
   *
   * CA, 2026-09-30: *"I should not be able to select (Retired) if the score is actually complete!"* A
   * retirement means the match did not finish, and a finished score says it did.
   *
   * CA, 2026-10-04, on DEFAULTED: *"keep the score (and then refuse Defaulted on a complete score)"*.
   * A default keeps the part-score it was given at, so it is the same contradiction as a retirement
   * and is refused the same way. DOUBLE_DEFAULT is not offered on its own — it is DEFAULTED with "no
   * one advances" ticked — so refusing DEFAULTED refuses it too.
   *
   * The match-level endings that resolve nobody (Suspended, Abandoned, Incomplete, In Progress,
   * Awaiting Result) say the same thing about the match — it did not finish — and keep the score
   * beside them, so a finished score refuses them too. Before this, finishing the score and THEN
   * clicking Suspended submitted SUSPENDED with a complete score: the retraction below only ran when
   * the score changed, so the other order walked straight past it.
   *
   * NOT refused: the endings that carry no score at all — a walkover, Cancelled, Dead Rubber. Choosing
   * one on a complete score CLEARS it (`clearScoreWhenEndingCarriesNone`), which resolves the
   * contradiction the other way instead of leaving it standing.
   */
  function endingOffered(status: string): boolean {
    // A retirement keeps the score that was played; with nothing played there is nothing to keep, and
    // the result would be a walkover wearing the wrong name (CA, 2026-10-08: "Retired is only supposed
    // to be enabled once there is a score present"). A default is different: a player can be defaulted
    // before the first ball, so it stays offered.
    if (status === RETIRED && !scoreEntered()) return false;
    if (!contradictsFinishedScore(status)) return true;
    return !scoreIsFinished();
  }

  /** Whether any score has been entered — in the model, or as text the region holds that the model cannot see yet. */
  function scoreEntered(): boolean {
    return hasEntry(model()) || !!region.hasEntry?.();
  }

  /** The endings that say the match did not finish AND keep the score that says it did. */
  function contradictsFinishedScore(status: string): boolean {
    if (status === RETIRED || status === DEFAULTED) return true;
    return NON_DIRECTING_ENDINGS.has(status) && !NO_SCORE_STATUSES.has(status);
  }

  /**
   * Disable every ending control the score currently refuses, and re-enable it when it no longer does.
   *
   * Called from `renderDerived`, so it follows the score on every keystroke rather than only on a full
   * render: the match-ending buttons, the Other… menu and the side panel are all built by `render()`,
   * and a score that finishes as it is typed only reaches `refreshDerived`. Without this a control
   * rendered while the score was partial stayed live after it finished.
   *
   * A SELECTED control is never disabled: clicking it again is how it is un-chosen, and a lock with no
   * way out is a trap. In practice a selected refused ending does not survive to here —
   * `retractEndingContradictedByScore` drops it the moment the score finishes — so this is the guard
   * for that, not a state the operator should ever see.
   */
  function refreshEndingAvailability(): void {
    const controls = element.querySelectorAll<HTMLButtonElement>(
      '.chc-sec-endings button[data-ending], .chc-sec-side-option[data-ending]'
    );
    for (const control of controls) {
      const status = control.dataset.ending ?? '';
      const refused = !endingOffered(status) && control.getAttribute(ARIA_PRESSED) !== 'true';
      control.disabled = refused;
      if (refused) control.title = refusalReason(status);
      else control.removeAttribute('title');
    }
  }

  function refusalReason(status: string): string {
    const label = labels[status] ?? status;
    if (status === RETIRED && !scoreEntered()) return `No score yet — ${label} keeps the score that was played`;
    return `The score is complete — ${label} cannot follow it`;
  }

  /**
   * Retract an ending the score has just contradicted.
   *
   * CA, 2026-09-30: *"If I click (Suspended) and then complete the score the Suspended status should
   * disappear. A completed score should cause matchUpStatus to change to COMPLETED."*
   *
   * Applies to every ending that resolves nobody — Suspended, Abandoned, Incomplete — and to a side
   * RETIRED or DEFAULTED, which is the same contradiction reached from the other direction:
   * `endingOffered` refuses it when the score is already complete, and this refuses it when the score
   * becomes complete after. A rule enforced on only one of those orders is a rule an operator can walk
   * around.
   *
   * Returns whether anything changed, because the ending chip lives in the participant rows and its
   * removal needs a full render rather than a derived refresh.
   */
  function retractEndingContradictedByScore(): boolean {
    if (!scoreIsFinished()) return false;

    const current = chosen();
    if (current.matchEnding && NON_DIRECTING_ENDINGS.has(current.matchEnding)) {
      choose({ kind: 'match', status: current.matchEnding });
      otherMenuOpen = false;
      return true;
    }

    const sideStatus = current.sideEnding?.status;
    if (current.sideEnding && (sideStatus === RETIRED || sideStatus === DEFAULTED)) {
      choose({ kind: 'side', sideNumber: current.sideEnding.sideNumber, status: current.sideEnding.status });
      openPanelSide = undefined;
      return true;
    }

    return false;
  }

  /**
   * What the region calls when the typed score changes.
   *
   * It was `refreshDerived` directly. A score that has just become complete now also RETRACTS an
   * ending that says the match did not finish, and that changes the ROWS, so it needs the full render
   * the derived refresh deliberately avoids.
   */
  function onScoreChanged(): void {
    if (retractEndingContradictedByScore()) {
      render();
      return;
    }
    refreshDerived();
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
    const selected = resolveEnding(model());
    if (selected.hasEnding) return selected;

    return resolveReportedEnding(region.matchUpStatus?.(), winningSide(model()));
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
    refreshEndingAvailability();

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
    submitButton.disabled =
      !!scoreError() || !(submitsAClear() || resolution.isValid || (!resolution.hasEnding && scoreIsFinished()));

    // Nothing to clear is not the same as a clear that does nothing: the old dialog disables the button,
    // which is the honest signal. An ENDING counts as something to clear even with no score typed.
    clearButton.disabled = !holdsEntry();
  }

  /** Whether anything at all has been entered — a score, an ending, or text the model cannot see. */
  function holdsEntry(): boolean {
    const current = chosen();
    return !!(
      current.sideEnding ||
      current.matchEnding ||
      current.reasonCode ||
      hasEntry(model()) ||
      region.hasEntry?.()
    );
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

    // Refused for the same reason the panel button is disabled — a key must not reach a state the
    // control it stands for cannot.
    if (!endingOffered(status)) {
      event.preventDefault();
      return true;
    }

    event.preventDefault();
    choose({ kind: 'side', sideNumber, status });
    clearScoreWhenEndingCarriesNone();
    openPanelSide = chosen().sideEnding ? sideNumber : undefined;
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
    const selector = chosen().sideEnding
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
    const stacked = columns.length > MAX_INLINE_SCORE_COLUMNS || isPhoneViewport();
    // No trailing action track: the ending control moved into the name cell (see `participantRow`), which
    // returns its width to the participant and stops the row ending in something shaped like an overflow
    // menu.
    // Stacked, a trailing `1fr` filler gives the name — which spans every track — the row's full width; with
    // score tracks alone, one set on a phone left the name 62px to wrap in. The cells stay left, under it.
    const template = stacked ? `${scoreTracks} 1fr` : `1fr ${scoreTracks}`;

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
    const selected = chosen().sideEnding;
    const ending = selected && (selected.sideNumber === sideNumber || chosen().bothSidesOut) ? selected : undefined;

    const row = div('chc-sec-row');
    row.style.gridTemplateColumns = template;
    row.dataset.side = String(sideNumber);
    row.dataset.stacked = String(stacked);
    // `ended` still marks only the row the ending was entered against: it drives the strike-through, and
    // striking BOTH names through would read as neither having played rather than neither advancing.
    row.dataset.ended = String(selected?.sideNumber === sideNumber);
    row.dataset.bothOut = String(!!chosen().bothSidesOut);
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
      const selected = chosen().sideEnding?.sideNumber === sideNumber && chosen().sideEnding?.status === status;
      const option = button('', 'chc-sec-btn chc-sec-side-option');
      option.dataset.ending = status;
      option.setAttribute(ARIA_PRESSED, String(selected));

      const stack = div('chc-sec-side-option-label');
      stack.append(text('', labels[status] ?? status));
      const hint = SIDE_ENDING_HINTS[status];
      if (hint) stack.append(text('chc-sec-side-option-hint', hint));
      option.append(stack);

      // A retirement or a default cannot follow a finished score; the control says so rather than
      // accepting and then contradicting itself in the band. Set here for the first paint and kept
      // current by `refreshEndingAvailability` as the score changes.
      option.disabled = !endingOffered(status) && !selected;
      if (option.disabled) option.title = refusalReason(status);

      option.addEventListener('click', () => {
        choose({ kind: 'side', sideNumber, status });
        clearScoreWhenEndingCarriesNone();
        render();
      });
      inner.append(option);
    }

    const reasonStatus = reasonCodeStatus(chosen());
    const codes =
      chosen().sideEnding?.sideNumber === sideNumber ? codesForStatus(params.statusCodeGroups, reasonStatus) : [];
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
        chip.setAttribute(ARIA_PRESSED, String(chosen().reasonCode === code));
        const subtext = statusCodeSubtext(entry);
        if (subtext) chip.title = subtext;
        chip.addEventListener('click', () => {
          choose({ kind: 'reasonCode', code });
          render();
        });
        chips.append(chip);
      }
      inner.append(chips);
    }

    if (chosen().sideEnding?.sideNumber === sideNumber && offersBothSidesOut(chosen())) {
      const other = params.sides[sideNumber === 1 ? 1 : 0];
      const label = document.createElement('label');
      label.className = 'chc-sec-both-out';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!chosen().bothSidesOut;
      box.dataset.action = 'bothSidesOut';
      box.addEventListener('change', () => {
        choose({ kind: 'bothSidesOut' });
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

    const otherSelected = !!chosen().matchEnding && others.includes(chosen().matchEnding);
    // ── The chip says what was CHOSEN, not that a choice exists ──
    //
    // CA, 2026-09-30: *"I think the Chip's label should change from Other when for example (Cancelled)
    // is selected... it isn't helpful for it to just be highlighted saying (Other) ... even though the
    // text below does state the state, it would be better UX for it to change label on the selector"*.
    //
    // Only when the selection came from INSIDE this menu. A privileged ending has its own button and
    // shows itself there; if this chip echoed that too, the row would read as two selections.
    const chosenInMenu =
      otherSelected && chosen().matchEnding ? (labels[chosen().matchEnding] ?? chosen().matchEnding) : undefined;

    // `Other: Cancelled`, on CA's wording (2026-09-30): *"how about 'Other: Cancelled' which is more
    // compact"*. It keeps the control's own identity in the label instead of trading it for the
    // selection, which is what the first version did.
    const other = button(chosenInMenu ? `${OTHER_LABEL_BASE}: ${chosenInMenu}` : OTHER_LABEL, CLS_BTN_PILL);
    other.dataset.action = 'other';
    // Solid when the selection was made INSIDE it, so the row still shows one selection whether it
    // came from a privileged button or from the menu.
    other.setAttribute(ARIA_PRESSED, String(otherSelected));
    other.setAttribute(ARIA_EXPANDED, String(otherMenuOpen));

    // No `aria-label`, deliberately, and it is CA's wording that removed the need for one.
    //
    // The first version showed "Cancelled" alone and carried `aria-label="Cancelled — Other endings"`
    // so a screen reader user would still know the control opened a menu. An accessible name that does
    // not CONTAIN the visible label breaks WCAG 2.5.3 Label in Name — "Other: Cancelled" is not a
    // substring of "Cancelled — Other endings" — and voice control users would be left naming something
    // they cannot see. `Other: Cancelled` says both things in the text itself, so the content is the
    // accessible name and there is nothing to keep in sync.
    other.append(icon('m6 9 6 6 6-6', 2.5));
    other.addEventListener('click', () => {
      otherMenuOpen = !otherMenuOpen;
      // One menu at a time: the approach menu stayed open beside this one (CA's screenshot, 2026-10-08).
      approachMenuOpen = false;
      render();
    });
    endingsContainer.append(other);

    if (!otherMenuOpen) {
      releaseEndingsMenu();
      return;
    }

    const menu = div(CLS_MENU);
    for (const status of others) {
      const selected = chosen().matchEnding === status;
      const item = button('', CLS_MENU_ITEM);
      item.dataset.ending = status;
      item.setAttribute(ARIA_PRESSED, String(selected));
      const mark = div(CLS_CHECK);
      if (selected) mark.append(icon(CHECK_PATH, 3));
      item.append(mark, text('', labels[status] ?? status));
      item.addEventListener('click', () => {
        choose({ kind: 'match', status });
        clearScoreWhenEndingCarriesNone();
        otherMenuOpen = false;
        render();
      });
      menu.append(item);
    }
    endingsContainer.append(menu);
    trackEndingsMenu(menu, other);
  }

  /**
   * Place the endings menu against its chip, in VIEWPORT coordinates.
   *
   * CA reported the `Other…` chip twice: *"The (Other) chip is not working on any of the stories"*, and
   * then *"(Other) is not working anywhere that I can see"*. It always worked — the menu opens, records
   * the chosen ending and closes, all asserted. It could not be SEEN.
   *
   * `.chc-sec-endings` sits inside `.chc-sec-body`, which is `overflow-y: auto` so the footer stays put
   * on a short viewport. A box with `overflow-y: auto` and `overflow-x: visible` computes its
   * `overflow-x` to `auto` as well, so the body clips on both axes — and `.chc-sec` above it is
   * `overflow: hidden` outright. The endings row is the LAST block in the body, so an absolutely
   * positioned menu dropping below it lands outside both boxes. The approach switcher's identical menu
   * works for exactly this reason: its anchor is in the HEADER, a sibling of the scrolling body.
   *
   * The first attempt at this flipped the menu upward in CSS. That is not a fix, it is a bet that there
   * is room above — and a bet is what put it under the fold to begin with. `position: fixed` takes the
   * menu out of every ancestor's clipping box outright, because its containing block is the viewport.
   *
   * That only holds while no ancestor establishes a containing block for fixed descendants. Checked
   * 2026-09-30: `cmodalStyles.ts` sets no `transform`, `filter`, `perspective`, `contain` or
   * `will-change`, and the card's only `transform` is on a chevron `svg` inside a button. If a modal
   * animation ever arrives, this is the line it will break.
   */
  function placeEndingsMenu(menu: HTMLElement, anchor: HTMLElement): void {
    const GAP = 6;
    const rect = anchor.getBoundingClientRect();
    const height = menu.offsetHeight;
    const roomBelow = globalThis.innerHeight - rect.bottom;

    // Below by default, above when there is not room and there is room above — the ordinary behaviour
    // of a dropdown near the bottom of a screen, rather than a fixed direction.
    const openUp = roomBelow < height + GAP && rect.top > height + GAP;

    menu.style.position = 'fixed';
    menu.style.left = `${rect.left}px`;
    menu.style.top = openUp ? `${rect.top - height - GAP}px` : `${rect.bottom + GAP}px`;

    // `bottom` and `right` are cleared, not merely left alone. The stylesheet positions this menu for
    // its OTHER use — the approach switcher, which is still `absolute` — and a `bottom` surviving
    // beside an inline `top` does not move a fixed box, it SIZES it: with both offsets set and height
    // auto, the height becomes the distance between them. That is what CA saw as "about 2px of the top"
    // of a menu he reasonably read as obscured. It was not obscured, it was collapsed.
    menu.style.bottom = 'auto';
    menu.style.right = 'auto';
  }

  /**
   * Keep the menu against its chip while it is open, and stop when it closes.
   *
   * A fixed element does not move with the scroll of the box it came from, so a body that scrolls
   * beneath it would leave it hanging. Listeners are attached only while the menu exists and removed
   * when it does not, because the card has no destroy hook and a listener that outlives its card is a
   * leak per dialog opened.
   *
   * `scroll` in the CAPTURE phase: the scrolling element is `.chc-sec-body`, and a scroll event from an
   * element does not bubble.
   */
  function trackEndingsMenu(menu: HTMLElement, anchor: HTMLElement): void {
    placeEndingsMenu(menu, anchor);

    releaseEndingsMenu();
    trackedEndingsMenu = () => placeEndingsMenu(menu, anchor);
    globalThis.addEventListener('scroll', trackedEndingsMenu, true);
    globalThis.addEventListener('resize', trackedEndingsMenu);
  }

  function releaseEndingsMenu(): void {
    if (!trackedEndingsMenu) return;
    globalThis.removeEventListener('scroll', trackedEndingsMenu, true);
    globalThis.removeEventListener('resize', trackedEndingsMenu);
    trackedEndingsMenu = undefined;
  }

  function matchEndingButton(status: string, label: string): HTMLButtonElement {
    const control = button(label, CLS_BTN_PILL);
    control.dataset.ending = status;
    control.setAttribute(ARIA_PRESSED, String(chosen().matchEnding === status));
    control.addEventListener('click', () => {
      choose({ kind: 'match', status });
      clearScoreWhenEndingCarriesNone();
      otherMenuOpen = false;
      render();
    });
    return control;
  }

  function renderBand(resolution: ScoreEntryResolution): void {
    // An integrity failure outranks everything else the band might say. Reporting "not a finished result"
    // for a 3-7 would be true and useless; the operator needs to know WHICH set is wrong and why.
    const problem = scoreError();
    if (problem) {
      band.replaceChildren();
      band.dataset.tone = 'warn';
      band.setAttribute('role', 'status');
      band.append(text(CLS_BAND_HEADLINE, problem));
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

    const reasonStatus = reasonCodeStatus(chosen());
    const entry = codesForStatus(params.statusCodeGroups, reasonStatus).find(
      (candidate) => candidate.matchUpStatusCode === chosen().reasonCode
    );

    const summary = scoreEntrySummary({
      resolution,
      sideNames: [params.sides[0].participantName, params.sides[1].participantName],
      // `scoreDiscardedByEnding` is what a score-clearing ending took, so the band can still name it
      // once the cells are empty. Consulted only when the region has nothing, so a live score wins.
      scoreString: scoreString(model()) || scoreDiscardedByEnding,
      scoreComplete: scoreIsFinished(),
      scoreWinningSide: winningSide(model()),
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
