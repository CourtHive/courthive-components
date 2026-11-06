/**
 * Every word the score entry dialog shows, in English, keyed so a host can translate it.
 *
 * A host passes translations through the dialog's `labels`, the same map that already carries the
 * status names (`RETIRED`, `WALKOVER`, …) and `statusUnavailable`. A key the host leaves out reads the
 * English below, so a partial translation degrades to English for the missing words rather than to a
 * key name or a blank.
 *
 * Placeholders are `{{name}}`, the i18next form, so a host using i18next can hand its catalog's strings
 * over untouched (`t(key, { skipInterpolation: true })`) and the dialog fills them in. Status names fill
 * `{{status}}` already translated, because they come from the same map.
 *
 * Two placeholders exist only for translators: set messages carry both `{{ordinal}}` (`1st`, English
 * only) and `{{number}}` (`1`). English uses the ordinal; a language that has no `1st` uses the number.
 *
 * Score strings (`6-4 6-3`), format codes and participant names are data and are never translated here.
 * Messages the factory itself returns (a set the engine refuses, a parse error) arrive in the factory's
 * words.
 */
export declare const SCORE_ENTRY_TEXT: {
    readonly title: "Score Entry";
    readonly submit: "Submit";
    readonly clear: "Clear";
    readonly cancel: "Cancel";
    readonly player: "PLAYER";
    readonly formatEditTitle: "Edit the scoring format";
    readonly formatEditAria: "Scoring format {{format}} — edit";
    readonly approachDynamicSets: "Dynamic Sets";
    readonly approachFreeScore: "Free Score";
    readonly approachDialPad: "Dial Pad";
    readonly other: "Other…";
    readonly otherBase: "Other";
    readonly endedEarlyTitle: "How did this match end for them?";
    readonly endedEarlyAria: "{{name}} — ended early";
    readonly sidePanelHead: "What happened to {{name}}?";
    readonly hintWalkover: "Did not play at all — no score";
    readonly hintRetired: "Started, could not finish — score kept";
    readonly hintDefaulted: "Removed by the referee";
    readonly pickPlayer: "Choose player";
    readonly pickPlayerPrompt: "{{status}} — click the player it applies to";
    readonly reason: "REASON";
    readonly bothSidesOut: "{{name}} did not appear either — no one advances";
    readonly endingNeedsScore: "No score yet — {{status}} keeps the score that was played";
    readonly endingAfterCompleteScore: "The score is complete — {{status}} cannot follow it";
    readonly doubleWalkover: "Double walkover";
    readonly doubleDefault: "Double default";
    readonly doubleExitWarning: "{{ending}} — neither side advances, and a walkover propagates to the next round.";
    readonly defeated: "{{winner}} def. {{loser}} {{score}}";
    readonly advancesTo: "advances to {{round}}";
    readonly notFinished: "{{score}} — not a finished result";
    readonly noResultYet: "No result entered yet";
    readonly neitherAdvances: "{{status}} — neither side advances";
    readonly sideAdvances: "{{status}} — {{name}} advances";
    readonly noScoreRecorded: "no score recorded";
    readonly partScoreCleared: "{{status}} — the part-score of {{score}} has been cleared";
    readonly nobodyAdvances: "nobody advances";
    readonly scoreRecorded: "{{status}} — {{score}} recorded";
    readonly noWinnerYet: "{{status}} — no winner yet";
    readonly notReadyToSubmit: "not ready to submit";
    readonly clearedHeadline: "The recorded result will be removed — Submit to clear it.";
    readonly clearRefused: "Enter a replacement score: a later match depends on this result.";
    readonly setPrefix: "{{ordinal}} set:";
    readonly sideFallback: "side {{side}}";
    readonly tiebreakContradiction: "{{set}} {{name}} won it, so they must win the tiebreak";
    readonly setHasNoScore: "{{set}} has no score";
    readonly setNotFinished: "{{set}} is not finished";
    readonly setHeading: "{{ordinal}}";
    readonly tiebreakHeading: "TB";
    readonly overtimeHeading: "OT{{period}}";
    readonly shootoutHeading: "SO";
    readonly editSet: "Click to edit this set";
    readonly gamesAria: "{{ordinal}} set, side {{side}} games";
    readonly tiebreakAria: "{{ordinal}} set tiebreak, side {{side}} points";
    readonly enteredSetAria: "{{ordinal}} set, side {{side}}: {{entered}} — edit";
    readonly gamesEntered: "{{games}} games";
    readonly gamesAndTiebreakEntered: "{{games}} games, tiebreak {{points}}";
    readonly tiebreakSpoken: "tiebreak {{points}}";
    readonly smartComplements: "Smart";
    readonly smartComplementsExplain: "Smart complements — fill the opposing score from the one you type";
    readonly typeTheScore: "TYPE THE SCORE";
    readonly notAScore: "Not a score this format allows";
    readonly completeMatch: "A complete match under {{format}}";
    readonly tiebreak: "Tiebreak";
    readonly backspace: "Backspace";
    readonly readoutAria: "Side {{side}}: {{score}}";
    readonly readoutNoScore: "Side {{side}}: no score";
};
export type ScoreEntryTextKey = keyof typeof SCORE_ENTRY_TEXT;
/** A host's translations: any of the keys above, plus the status names, each optional. */
export type ScoreEntryLabels = Partial<Record<ScoreEntryTextKey, string>> & Record<string, string | undefined>;
/**
 * The host's string for `key`, or the English, with `{{placeholders}}` filled.
 *
 * A placeholder with no value is left as written, so a missing variable shows up as `{{name}}` in
 * review rather than vanishing from the sentence.
 */
export declare function scoreEntryText(labels: Record<string, string | undefined> | undefined, key: ScoreEntryTextKey, values?: Record<string, string | number | undefined>): string;
