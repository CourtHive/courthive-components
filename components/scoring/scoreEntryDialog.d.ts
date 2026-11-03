import { EngineOutcome } from './logic/engineOutcome';
import { SetScore } from './types';
import { ScoreEntryCard, ScoreEntryCardParams, ScoreEntryOutcome } from './scoreEntryCard';
/** The three entry approaches. The key is what `onSelectApproach` reports and what a host persists. */
export type ScoreEntryApproach = 'dynamicSets' | 'freeScore' | 'dialPad';
export type ScoreEntryDialogParams = Omit<ScoreEntryCardParams, 'region' | 'approachLabel' | 'approaches' | 'onSelectApproach' | 'onSwitchApproach' | 'onEditFormat' | 'onSubmit'> & {
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
    onSubmit?: (outcome: ScoreEntryOutcome & {
        sets: SetScore[];
        outcome: EngineOutcome;
    }) => void;
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
        score?: {
            sets?: SetScore[];
        };
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
export declare function openScoreEntryDialog(params: ScoreEntryDialogParams): ScoreEntryDialog;
