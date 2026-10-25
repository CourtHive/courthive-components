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
export const SCORE_ENTRY_TEXT = {
  // ── The card's frame ──
  title: 'Score Entry',
  submit: 'Submit',
  clear: 'Clear',
  cancel: 'Cancel',
  player: 'PLAYER',
  formatEditTitle: 'Edit the scoring format',
  formatEditAria: 'Scoring format {{format}} — edit',

  // ── Approaches ──
  approachDynamicSets: 'Dynamic Sets',
  approachFreeScore: 'Free Score',
  approachDialPad: 'Dial Pad',

  // ── Endings ──
  other: 'Other…',
  otherBase: 'Other',
  endedEarlyTitle: 'How did this match end for them?',
  endedEarlyAria: '{{name}} — ended early',
  sidePanelHead: 'What happened to {{name}}?',
  hintWalkover: 'Did not play at all — no score',
  hintRetired: 'Started, could not finish — score kept',
  hintDefaulted: 'Removed by the referee',
  reason: 'REASON',
  bothSidesOut: '{{name}} did not appear either — no one advances',
  endingNeedsScore: 'No score yet — {{status}} keeps the score that was played',
  endingAfterCompleteScore: 'The score is complete — {{status}} cannot follow it',
  doubleWalkover: 'Double walkover',
  doubleDefault: 'Double default',
  doubleExitWarning: '{{ending}} — neither side advances, and a walkover propagates to the next round.',

  // ── The band ──
  defeated: '{{winner}} def. {{loser}} {{score}}',
  advancesTo: 'advances to {{round}}',
  notFinished: '{{score}} — not a finished result',
  noResultYet: 'No result entered yet',
  neitherAdvances: '{{status}} — neither side advances',
  sideAdvances: '{{status}} — {{name}} advances',
  noScoreRecorded: 'no score recorded',
  partScoreCleared: '{{status}} — the part-score of {{score}} has been cleared',
  nobodyAdvances: 'nobody advances',
  scoreRecorded: '{{status}} — {{score}} recorded',
  noWinnerYet: '{{status}} — no winner yet',
  notReadyToSubmit: 'not ready to submit',
  clearedHeadline: 'The recorded result will be removed — Submit to clear it.',
  clearRefused: 'Enter a replacement score: a later match depends on this result.',

  // ── Score problems ──
  setPrefix: '{{ordinal}} set:',
  sideFallback: 'side {{side}}',
  tiebreakContradiction: '{{set}} {{name}} won it, so they must win the tiebreak',
  setHasNoScore: '{{set}} has no score',
  setNotFinished: '{{set}} is not finished',

  // ── Dynamic Sets ──
  setHeading: '{{ordinal}}',
  tiebreakHeading: 'TB',
  editSet: 'Click to edit this set',
  gamesAria: '{{ordinal}} set, side {{side}} games',
  tiebreakAria: '{{ordinal}} set tiebreak, side {{side}} points',
  enteredSetAria: '{{ordinal}} set, side {{side}}: {{entered}} — edit',
  gamesEntered: '{{games}} games',
  gamesAndTiebreakEntered: '{{games}} games, tiebreak {{points}}',
  tiebreakSpoken: 'tiebreak {{points}}',
  smartComplements: 'Smart',
  smartComplementsExplain: 'Smart complements — fill the opposing score from the one you type',

  // ── Free Score ──
  typeTheScore: 'TYPE THE SCORE',
  notAScore: 'Not a score this format allows',
  completeMatch: 'A complete match under {{format}}',

  // ── Dial Pad ──
  tiebreak: 'Tiebreak',
  backspace: 'Backspace',

  // ── The score readout (screen readers) ──
  readoutAria: 'Side {{side}}: {{score}}',
  readoutNoScore: 'Side {{side}}: no score'
} as const;

export type ScoreEntryTextKey = keyof typeof SCORE_ENTRY_TEXT;

/** A host's translations: any of the keys above, plus the status names, each optional. */
export type ScoreEntryLabels = Partial<Record<ScoreEntryTextKey, string>> & Record<string, string | undefined>;

/**
 * The host's string for `key`, or the English, with `{{placeholders}}` filled.
 *
 * A placeholder with no value is left as written, so a missing variable shows up as `{{name}}` in
 * review rather than vanishing from the sentence.
 */
export function scoreEntryText(
  labels: Record<string, string | undefined> | undefined,
  key: ScoreEntryTextKey,
  values: Record<string, string | number | undefined> = {}
): string {
  const template = labels?.[key] || SCORE_ENTRY_TEXT[key];
  return template.replaceAll(/{{\s*(\w+)\s*}}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}
