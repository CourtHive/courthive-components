import { ScoreEntryState, SideNumber } from './logic/scoreEntryState';
import { ScoreEntryModel } from './logic/scoreEntryModel';
import { ScoreEntryStore } from './logic/scoreEntryStore';
import { StatusCodeGroups } from './logic/statusCodes';
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
    sides: [{
        participantName: string;
        seed?: string;
    }, {
        participantName: string;
        seed?: string;
    }];
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
    /**
     * Translations: the status names (`RETIRED`, …) and every key of `SCORE_ENTRY_TEXT`. Anything left out
     * reads the English default.
     */
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
    /**
     * Whether a recorded outcome may be REMOVED. Only the draw knows whether a later match depends on the
     * result, so the host reads it from the engine (the factory's `CLEAR_SCORE` matchUp action) rather than
     * the dialog guessing. `false` disables submitting an empty replacement for a recorded result.
     * `[Clear]` still resets the entry form so the operator can type a replacement score.
     */
    clearable?: boolean;
    /** Scoped statuses refused by the factory SCORE action. */
    disabledMatchUpStatuses?: string[];
};
export type ScoreEntryCard = {
    element: HTMLElement;
    /**
     * Close an open menu (the approach switcher's or Other's) and report whether one was open. The dialog's
     * Escape calls it first, wherever focus is, so one Escape closes the menu and a second one cancels.
     */
    closeMenus: () => boolean;
    /** Release resources before removing an inline card or its modal. Safe to repeat. */
    destroy: () => void;
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
    update: (next: {
        region?: ScoreRegion;
        matchUpFormat?: string;
        approachLabel?: string;
    }) => void;
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
export declare function renderScoreEntryCard(params: ScoreEntryCardParams): ScoreEntryCard;
